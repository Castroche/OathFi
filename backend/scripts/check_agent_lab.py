from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "http://127.0.0.1:8001"


def request_json(method: str, path: str, body: dict | None = None) -> tuple[bool, dict]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    try:
        with urlopen(request, timeout=60) as response:
            return True, json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        try:
            return False, json.loads(exc.read().decode("utf-8", errors="replace"))
        except json.JSONDecodeError:
            return False, {"ok": False, "error": {"message": f"HTTP {exc.code}"}}
    except (URLError, TimeoutError) as exc:
        return False, {"ok": False, "error": {"message": str(exc)}}


def data(payload: dict) -> dict:
    value = payload.get("data")
    return value if isinstance(value, dict) else {}


def line(name: str, ok: bool, detail: str = "") -> None:
    status = "PASS" if ok else "FAIL"
    print(f"{name}: {status}{(' - ' + detail) if detail else ''}")


def main() -> int:
    failures = 0

    ok, health = request_json("GET", "/api/health")
    health_ok = ok and health.get("ok") is True
    line("health status", health_ok, str(health.get("data") or health.get("error") or ""))
    failures += 0 if health_ok else 1

    ok, context = request_json("GET", "/api/agent/context?symbol=ETH%2FUSDT")
    context_data = data(context)
    context_ok = ok and context.get("ok") is True and context_data.get("is_mock") is False and bool(context_data.get("price") or context_data.get("current_price"))
    line(
        "context status",
        context_ok,
        f"source={context_data.get('source')} is_mock={context_data.get('is_mock')} price={context_data.get('price') or context_data.get('current_price')}",
    )
    failures += 0 if context_ok else 1

    ok, providers = request_json("GET", "/api/ai/providers")
    providers_list = providers.get("data") if isinstance(providers.get("data"), list) else []
    deepseek = next((item for item in providers_list if item.get("name") == "deepseek"), {})
    providers_ok = ok and len(providers_list) >= 10
    line("providers status", providers_ok, f"count={len(providers_list)} deepseek_configured={deepseek.get('configured')}")
    failures += 0 if providers_ok else 1

    if deepseek.get("configured"):
        ok, test = request_json("POST", "/api/ai/providers/test", {"provider": "deepseek", "model": deepseek.get("default_model")})
        test_data = data(test)
        line(
            "deepseek test",
            ok and test.get("ok") is True and test_data.get("ok") is True,
            f"healthy={test_data.get('ok')} error_type={test_data.get('error_type')} error={test_data.get('error_message')}",
        )
    else:
        line("deepseek test", True, "SKIP - provider not configured")

    ok, generated = request_json(
        "POST",
        "/api/agent/hypotheses/generate",
        {"symbol": "ETH/USDT", "provider": "deepseek", "model": deepseek.get("default_model") or "", "mode": "ai"},
    )
    generated_data = data(generated)
    generate_ok = ok and generated.get("ok") is True and generated_data.get("run_created") is True and generated_data.get("hypotheses_count", 0) >= 1
    line(
        "agent generate",
        generate_ok,
        (
            f"run_id={generated_data.get('run_id')} count={generated_data.get('hypotheses_count')} "
            f"mode={generated_data.get('analysis_mode')} ai={generated_data.get('is_ai_generated')} "
            f"error_type={generated_data.get('error_type')}"
        ),
    )
    failures += 0 if generate_ok else 1

    db_path = Path(__file__).resolve().parents[1] / "oathfi_demo.db"
    line("database visible", db_path.exists(), str(db_path))
    failures += 0 if db_path.exists() else 1

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
