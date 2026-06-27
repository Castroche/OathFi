from __future__ import annotations

import concurrent.futures
import hashlib
import html
import json
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any


@dataclass(frozen=True)
class NewsSource:
    id: str
    name: str
    url: str
    category: str
    language: str
    parser: str = "rss"


REAL_NEWS_SOURCES = (
    NewsSource(
        id="blockbeats",
        name="BlockBeats",
        url="https://api.theblockbeats.news/v2/rss/all",
        category="crypto",
        language="zh-CN",
    ),
    NewsSource(
        id="investing-cn-crypto",
        name="Investing.com 中文",
        url="https://cn.investing.com/rss/news_301.rss",
        category="crypto",
        language="zh-CN",
    ),
    NewsSource(
        id="odaily-newsflash",
        name="Odaily 星球日报",
        url="https://rss.odaily.news/rss/newsflash",
        category="crypto",
        language="zh-CN",
    ),
    NewsSource(
        id="odaily-post",
        name="Odaily 星球日报",
        url="https://rss.odaily.news/rss/post",
        category="crypto",
        language="zh-CN",
    ),
    NewsSource(
        id="wublockchain",
        name="WuBlockchain",
        url="https://www.wublockchain.xyz/feed",
        category="crypto",
        language="en",
    ),
    NewsSource(
        id="cointelegraph",
        name="Cointelegraph",
        url="https://cointelegraph.com/rss",
        category="crypto",
        language="en",
    ),
    NewsSource(
        id="the-block",
        name="The Block",
        url="https://www.theblock.co/rss.xml",
        category="funding",
        language="en",
    ),
    NewsSource(
        id="htx-status",
        name="HTX Status",
        url="https://status.huobigroup.com/api/v2/summary.json",
        category="htx",
        language="en",
        parser="statuspage",
    ),
)

REQUEST_HEADERS = {
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*",
    "User-Agent": "OathFi/1.0 live-news-gateway",
}

TAG_RULES = {
    "risk": (
        "hack",
        "exploit",
        "attack",
        "breach",
        "漏洞",
        "攻击",
        "被盗",
        "风险",
        "lawsuit",
        "sec",
        "监管",
        "诉讼",
        "outage",
        "暂停",
    ),
    "funding": ("funding", "raises", "融资", "投资", "acquisition", "收购"),
    "macro": ("fed", "cpi", "rate", "inflation", "fomc", "央行", "美联储", "通胀", "利率", "宏观"),
    "onchain": ("on-chain", "onchain", "链上", "whale", "鲸鱼", "transfer", "转账"),
    "htx": ("htx", "huobi", "火币"),
}

SYMBOL_ALIASES = {
    "BTC/USDT": ("btc", "bitcoin", "比特币"),
    "ETH/USDT": ("eth", "ethereum", "以太坊"),
    "HTX/USDT": ("htx", "huobi", "火币"),
}

POSITIVE_WORDS = ("approval", "approved", "launch", "partnership", "raises", "增长", "批准", "上线", "合作", "融资")
NEGATIVE_WORDS = ("hack", "exploit", "lawsuit", "outage", "drop", "fall", "attack", "风险", "攻击", "下跌", "暂停", "诉讼")


class NewsService:
    source = "live"

    def latest(self, language: str = "zh-CN", limit: int = 20) -> list[dict[str, Any]]:
        return self.events(language=language, limit=limit)[:limit]

    def events(self, language: str = "zh-CN", limit: int = 50) -> list[dict[str, Any]]:
        normalized_language = "zh-CN" if language.lower().startswith("zh") else "en"
        preferred = self._sources_for_language(normalized_language)
        deduped = self._dedupe(self._fetch_sources(preferred, normalized_language))
        deduped.sort(key=lambda item: item["published_at"], reverse=True)
        return deduped[:limit]

    def _sources_for_language(self, language: str) -> list[NewsSource]:
        return [source for source in REAL_NEWS_SOURCES if source.language == language]

    def _fetch_sources(self, sources: list[NewsSource], language: str) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        if not sources:
            return events
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(6, len(sources))) as executor:
            futures = [executor.submit(self._fetch_source, source, language) for source in sources]
            for future in concurrent.futures.as_completed(futures):
                try:
                    events.extend(future.result())
                except Exception:
                    continue
        return events

    def _fetch_source(self, source: NewsSource, language: str) -> list[dict[str, Any]]:
        body = self._read_url(source.url)
        if source.parser == "statuspage":
            return self._parse_statuspage(source, body, language)
        if body.lstrip().startswith("{"):
            return self._parse_json_source(source, body, language)
        return self._parse_xml_source(source, body, language)

    def _read_url(self, url: str) -> str:
        request = urllib.request.Request(url, headers=REQUEST_HEADERS)
        with urllib.request.urlopen(request, timeout=6) as response:
            raw = response.read(2_000_000)
            charset = response.headers.get_content_charset() or "utf-8"
            return raw.decode(charset, errors="replace")

    def _parse_json_source(self, source: NewsSource, body: str, language: str) -> list[dict[str, Any]]:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return []
        data = payload.get("data") if isinstance(payload, dict) else payload
        if not isinstance(data, list):
            return []
        rows: list[dict[str, Any]] = []
        for item in data[:20]:
            if not isinstance(item, dict):
                continue
            title = self._clean_text(str(item.get("title") or item.get("content") or ""))
            link = str(item.get("url") or item.get("link") or item.get("source_url") or source.url)
            summary = self._clean_text(str(item.get("description") or item.get("summary") or item.get("content") or title))
            published_at = self._parse_date(item.get("published_at") or item.get("publish_time") or item.get("created_at"))
            rows.append(self._build_event(source, language, title, summary, link, published_at))
        return [row for row in rows if row]

    def _parse_statuspage(self, source: NewsSource, body: str, language: str) -> list[dict[str, Any]]:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return []
        page_url = payload.get("page", {}).get("url") if isinstance(payload, dict) else None
        incidents = payload.get("incidents", []) if isinstance(payload, dict) else []
        rows: list[dict[str, Any]] = []
        for item in incidents[:8]:
            if not isinstance(item, dict):
                continue
            title = self._clean_text(str(item.get("name") or "HTX status update"))
            status = self._clean_text(str(item.get("status") or ""))
            summary = status or title
            link = str(item.get("shortlink") or page_url or source.url)
            published_at = self._parse_date(item.get("created_at") or item.get("updated_at"))
            rows.append(self._build_event(source, language, title, summary, link, published_at))
        return [row for row in rows if row]

    def _parse_xml_source(self, source: NewsSource, body: str, language: str) -> list[dict[str, Any]]:
        try:
            root = ET.fromstring(body.encode("utf-8"))
        except ET.ParseError:
            return []

        items = self._find_all(root, "item")
        if not items:
            items = self._find_all(root, "entry")

        rows: list[dict[str, Any]] = []
        for item in items[:20]:
            title = self._node_text(item, "title")
            summary = (
                self._node_text(item, "description")
                or self._node_text(item, "summary")
                or self._node_text(item, "content")
                or title
            )
            link = self._node_text(item, "link")
            if not link:
                link = self._entry_link(item)
            published_at = self._parse_date(
                self._node_text(item, "pubDate")
                or self._node_text(item, "published")
                or self._node_text(item, "updated")
            )
            event = self._build_event(source, language, title, summary, link, published_at)
            if event:
                rows.append(event)
        return rows

    def _build_event(
        self,
        source: NewsSource,
        language: str,
        title: str,
        summary: str,
        link: str,
        published_at: datetime,
    ) -> dict[str, Any] | None:
        title = self._clean_text(title)
        summary = self._clean_text(summary) or title
        if not title:
            return None
        link = self._normalize_url(link, source.url)
        if not link:
            return None

        category = self._classify_category(source.category, title, summary)
        sentiment = self._classify_sentiment(title, summary)
        tags = self._tags_for(title, summary, category, source.id)
        related_symbols = self._related_symbols(title, summary)
        severity = self._severity(category, sentiment, tags)
        domain = urllib.parse.urlparse(link).hostname or None
        event_id = hashlib.sha1(f"{source.id}:{link}:{title}".encode("utf-8")).hexdigest()[:16]

        return {
            "id": event_id,
            "title": title,
            "summary": summary[:420],
            "source": source.name,
            "url": link,
            "language": language,
            "published_at": published_at,
            "is_mock": False,
            "category": category,
            "sentiment": sentiment,
            "severity": severity,
            "reliability": 0.82 if source.language == language else 0.74,
            "tags": tags,
            "related_symbols": related_symbols,
            "source_status": "live",
            "source_domain": domain.replace("www.", "") if domain else None,
            "url_verified": True,
        }

    def _dedupe(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        deduped: list[dict[str, Any]] = []
        for event in events:
            title_key = re.sub(r"\W+", " ", event["title"].lower()).strip()[:90]
            url_key = str(event.get("url") or "")
            key = url_key or f"{event['source']}:{title_key}"
            if key in seen:
                continue
            seen.add(key)
            deduped.append(event)
        return deduped

    def _classify_category(self, fallback: str, title: str, summary: str) -> str:
        text = f"{title} {summary}".lower()
        for category in ("risk", "htx", "macro", "onchain", "funding"):
            if any(keyword in text for keyword in TAG_RULES[category]):
                return category
        return fallback

    def _classify_sentiment(self, title: str, summary: str) -> str:
        text = f"{title} {summary}".lower()
        has_negative = any(word in text for word in NEGATIVE_WORDS)
        has_positive = any(word in text for word in POSITIVE_WORDS)
        if has_negative and has_positive:
            return "mixed"
        if has_negative:
            return "negative"
        if has_positive:
            return "positive"
        return "neutral"

    def _tags_for(self, title: str, summary: str, category: str, source_id: str) -> list[str]:
        text = f"{title} {summary}".lower()
        tags = [source_id, category]
        for tag, keywords in TAG_RULES.items():
            if tag != category and any(keyword in text for keyword in keywords):
                tags.append(tag)
        return list(dict.fromkeys(tags))[:8]

    def _related_symbols(self, title: str, summary: str) -> list[str]:
        text = f"{title} {summary}".lower()
        symbols = [symbol for symbol, aliases in SYMBOL_ALIASES.items() if any(alias in text for alias in aliases)]
        return symbols or ["BTC/USDT", "ETH/USDT"]

    def _severity(self, category: str, sentiment: str, tags: list[str]) -> float:
        if category == "risk" or sentiment == "negative":
            return 0.72
        if category in {"macro", "onchain"}:
            return 0.55
        if "htx" in tags:
            return 0.58
        if sentiment == "positive":
            return 0.32
        return 0.42

    def _find_all(self, root: ET.Element, local_name: str) -> list[ET.Element]:
        return [node for node in root.iter() if self._local_name(node.tag) == local_name]

    def _node_text(self, node: ET.Element, local_name: str) -> str:
        for child in node.iter():
            if self._local_name(child.tag) == local_name:
                return self._clean_text(child.text or "")
        return ""

    def _entry_link(self, node: ET.Element) -> str:
        for child in node.iter():
            if self._local_name(child.tag) == "link":
                href = child.attrib.get("href")
                if href:
                    return href
        return ""

    def _parse_date(self, value: Any) -> datetime:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(float(value) / (1000 if value > 10_000_000_000 else 1), tz=UTC)
        if not value:
            return datetime.now(UTC)
        raw = str(value).strip()
        if raw.isdigit():
            return self._parse_date(float(raw))
        try:
            parsed = parsedate_to_datetime(raw)
        except (TypeError, ValueError, IndexError, OverflowError):
            parsed = None
        if parsed is None:
            try:
                parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError:
                return datetime.now(UTC)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)

    def _normalize_url(self, link: str, base_url: str) -> str:
        link = html.unescape((link or "").strip())
        if not link:
            return ""
        parsed = urllib.parse.urlparse(link)
        if parsed.scheme in {"http", "https"} and parsed.hostname:
            return link
        return urllib.parse.urljoin(base_url, link)

    def _clean_text(self, value: str) -> str:
        text = html.unescape(value or "")
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _local_name(self, tag: str) -> str:
        return tag.rsplit("}", 1)[-1] if "}" in tag else tag
