from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.core.security import assert_real_trading_disabled
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.schemas.settings import SettingsUpdate
from app.services.settings_service import SettingsService


class LiveTradingDisabledContractTest(unittest.TestCase):
    def test_runtime_config_keeps_real_trading_disabled(self) -> None:
        self.assertFalse(settings.real_trading_enabled)
        assert_real_trading_disabled()

    def test_settings_update_forces_live_flags_false(self) -> None:
        init_db()
        service = SettingsService()
        payload = service.default_settings().model_copy(update={"live_trading_enabled": True, "real_trading_enabled": True})
        with SessionLocal() as db:
            saved = service.update_settings(db, SettingsUpdate.model_validate(payload.model_dump()))
            self.assertFalse(saved.live_trading_enabled)
            self.assertFalse(saved.real_trading_enabled)


if __name__ == "__main__":
    unittest.main()
