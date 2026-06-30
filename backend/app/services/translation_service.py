from __future__ import annotations

import hashlib
import json
import re
from time import perf_counter
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import now_utc, prefixed_id
from app.models.ai_translation import AITranslationCache
from app.services.ai import AIProviderRegistry


TRANSLATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["translations"],
    "properties": {
        "translations": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["index", "translated_text"],
                "properties": {
                    "index": {"type": "integer"},
                    "translated_text": {"type": "string"},
                },
            },
        },
    },
}


class TranslationService:
    def __init__(self) -> None:
        self.registry = AIProviderRegistry()

    def cached_translations(self, db: Session, texts: dict[str, str], *, target_language: str) -> dict[str, str]:
        hashes = {field: self.translation_hash(text, target_language) for field, text in texts.items() if self.should_translate(text, target_language)}
        if not hashes:
            return {}
        rows = db.scalars(
            select(AITranslationCache).where(
                AITranslationCache.target_language == self.normalize_language(target_language),
                AITranslationCache.text_hash.in_(set(hashes.values())),
                AITranslationCache.status == "completed",
            )
        ).all()
        by_hash = {row.text_hash: row.translated_text for row in rows}
        return {field: by_hash[text_hash] for field, text_hash in hashes.items() if text_hash in by_hash}

    def ensure_translations(
        self,
        db: Session,
        texts: dict[str, str],
        *,
        target_language: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, str]:
        target = self.normalize_language(target_language)
        candidates = {field: text.strip() for field, text in texts.items() if self.should_translate(text, target)}
        if not candidates:
            return {}

        cached = self.cached_translations(db, candidates, target_language=target)
        missing = {field: text for field, text in candidates.items() if field not in cached}
        if not missing:
            return cached

        provider_name = (provider or self.registry.default_provider()).strip().lower()
        config = self.registry.config_for(provider_name)
        if config is None or not config.configured:
            return cached
        ai_provider = self.registry.provider_from_config(config)
        if ai_provider is None:
            return cached

        model_name = model or config.default_model
        source_rows: list[tuple[str, str]] = []
        fields_by_hash: dict[str, list[str]] = {}
        for field, source_text in missing.items():
            text_hash = self.translation_hash(source_text, target)
            fields_by_hash.setdefault(text_hash, []).append(field)
            if len(fields_by_hash[text_hash]) == 1:
                source_rows.append((field, source_text))

        prompt = self._build_prompt(source_rows, target)
        started = perf_counter()
        result = ai_provider.generate_json(
            prompt=prompt,
            schema=TRANSLATION_SCHEMA,
            model=model_name,
            timeout=settings.ai_timeout_seconds,
        )
        latency_ms = result.latency_ms or int((perf_counter() - started) * 1000)
        if not result.ok or not isinstance(result.content, dict):
            return cached

        translated_by_index = self._parse_translations(result.content)
        created: dict[str, str] = {}
        for index, (field, source_text) in enumerate(source_rows):
            translated = translated_by_index.get(index, "").strip()
            if not translated:
                continue
            text_hash = self.translation_hash(source_text, target)
            row = db.scalar(
                select(AITranslationCache).where(
                    AITranslationCache.text_hash == text_hash,
                    AITranslationCache.target_language == target,
                )
            )
            if row is None:
                row = AITranslationCache(
                    id=prefixed_id("trn"),
                    text_hash=text_hash,
                    source_language=self.detect_language(source_text),
                    target_language=target,
                    source_text=source_text,
                    translated_text=translated,
                    provider=result.provider or provider_name,
                    model=result.model or model_name,
                    status="completed",
                    error_message=None,
                    latency_ms=latency_ms,
                    is_mock=False,
                    created_at=now_utc(),
                    updated_at=now_utc(),
                )
                db.add(row)
            else:
                row.translated_text = translated
                row.provider = result.provider or provider_name
                row.model = result.model or model_name
                row.status = "completed"
                row.error_message = None
                row.latency_ms = latency_ms
                row.updated_at = now_utc()
            for duplicate_field in fields_by_hash.get(text_hash, [field]):
                created[duplicate_field] = translated
        db.flush()
        return {**cached, **created}

    @staticmethod
    def translation_hash(text: str, target_language: str) -> str:
        payload = json.dumps(
            {"text": text.strip(), "target_language": TranslationService.normalize_language(target_language)},
            ensure_ascii=False,
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @staticmethod
    def normalize_language(language: str) -> str:
        return "zh-CN" if str(language or "").lower().startswith("zh") else "en"

    @classmethod
    def detect_language(cls, text: str) -> str:
        return "zh-CN" if re.search(r"[\u4e00-\u9fff]", text or "") else "en"

    @classmethod
    def should_translate(cls, text: str, target_language: str) -> bool:
        raw = (text or "").strip()
        if len(raw) < 3:
            return False
        target = cls.normalize_language(target_language)
        source = cls.detect_language(raw)
        if source == target:
            return False
        if target == "zh-CN":
            return bool(re.search(r"[A-Za-z]{3,}", raw))
        return bool(re.search(r"[\u4e00-\u9fff]", raw))

    @staticmethod
    def _parse_translations(content: dict[str, Any]) -> dict[int, str]:
        rows = content.get("translations")
        if not isinstance(rows, list):
            return {}
        parsed: dict[int, str] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            try:
                index = int(row.get("index"))
            except (TypeError, ValueError):
                continue
            translated = str(row.get("translated_text") or "").strip()
            if translated:
                parsed[index] = translated
        return parsed

    @staticmethod
    def _build_prompt(items: list[tuple[str, str]], target_language: str) -> str:
        target_label = "Simplified Chinese" if target_language == "zh-CN" else "English"
        payload = [{"index": index, "field": field, "text": text} for index, (field, text) in enumerate(items)]
        return "\n".join(
            [
                "You translate OathFi AI trading research text for display only.",
                f"Target language: {target_label}.",
                "Preserve symbols, numbers, prices, ticker pairs, model names, provider names, JSON key names, HTX, USDT, RSI, MACD, MA20, MA50, REST, API, WebSocket.",
                "Do not add new trading advice, new facts, new risk approvals, or new conclusions.",
                "Translate the meaning faithfully and concisely. Keep audit-sensitive details unchanged.",
                "Return one JSON object with translations, each item containing the same index and translated_text.",
                json.dumps({"items": payload}, ensure_ascii=False),
            ]
        )
