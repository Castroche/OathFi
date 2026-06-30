from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.models.ai_translation import AITranslationCache
from app.services.translation_service import TranslationService


class FakeTranslationProvider:
    def generate_json(self, *, prompt, schema, model, timeout):
        return SimpleNamespace(
            ok=True,
            content={
                "translations": [
                    {"index": 0, "translated_text": "证据不足，无法生成交易假设。"},
                    {"index": 1, "translated_text": "未发起交易。"},
                ]
            },
            latency_ms=12,
            provider="deepseek",
            model=model,
        )


class TranslationServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(engine)
        self.session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
        self.service = TranslationService()
        self.service.registry.default_provider = lambda: "deepseek"
        self.service.registry.config_for = lambda name: SimpleNamespace(configured=True, default_model="deepseek-test")
        self.service.registry.provider_from_config = lambda config: FakeTranslationProvider()

    def tearDown(self) -> None:
        self.session.close()

    def test_duplicate_source_text_is_cached_once_and_returned_for_each_field(self) -> None:
        source = "Insufficient evidence to generate a trade hypothesis."
        translations = self.service.ensure_translations(
            self.session,
            {
                "summary": source,
                "structured_hypothesis.thesis_summary": source,
                "structured_hypothesis.entry_plan.confirmation_condition": "No trade initiated.",
            },
            target_language="zh-CN",
            provider="deepseek",
            model="deepseek-test",
        )

        self.assertEqual(translations["summary"], "证据不足，无法生成交易假设。")
        self.assertEqual(translations["structured_hypothesis.thesis_summary"], "证据不足，无法生成交易假设。")
        self.assertEqual(translations["structured_hypothesis.entry_plan.confirmation_condition"], "未发起交易。")
        rows = self.session.scalars(select(AITranslationCache)).all()
        self.assertEqual(len(rows), 2)


if __name__ == "__main__":
    unittest.main()
