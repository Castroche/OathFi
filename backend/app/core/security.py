from app.core.config import settings


def assert_real_trading_disabled() -> None:
    if settings.real_trading_enabled:
        raise RuntimeError("REAL_TRADING_ENABLED must remain false during the OathFi demo phase.")
