from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.models.user_api_credential import UserApiCredential


class SettingsCredentialsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def test_credentials_are_masked_and_kept_out_of_settings_json(self) -> None:
        secret = "placeholder-credential-1234567890"
        response = self.client.put(
            "/api/settings/credentials/deepseek",
            json={"api_key": secret, "base_url": "https://api.deepseek.com", "model": "deepseek-v4-flash"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()["data"]
        self.assertTrue(payload["configured"])
        self.assertNotIn(secret, response.text)
        self.assertIn("****", payload["masked_key"])

        settings_response = self.client.get("/api/settings")
        self.assertEqual(settings_response.status_code, 200, settings_response.text)
        self.assertNotIn(secret, settings_response.text)
        self.assertNotIn("api_key", str(settings_response.json()["data"].get("settings_json", {})).lower())

        with SessionLocal() as db:
            row = db.query(UserApiCredential).filter(UserApiCredential.provider == "deepseek").first()
            self.assertIsNotNone(row)
            self.assertNotEqual(row.encrypted_api_key, secret)


if __name__ == "__main__":
    unittest.main()
