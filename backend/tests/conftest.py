"""Test setup: an isolated SQLite database and no external services.

Environment variables are set before anything from the app is imported,
because config.py and database.py read them at import time. Values set here
take precedence over any developer .env file, so tests never touch a real
database, Anthropic, Groq or an Angel One account.
"""
import os
import sys
import tempfile
import uuid

_tmp = tempfile.mkdtemp(prefix="stocksense-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(_tmp, "test.db").replace("\\", "/")
os.environ["SECRET_KEY"] = "test-only-" + uuid.uuid4().hex + uuid.uuid4().hex
for key in ("ANTHROPIC_API_KEY", "GROQ_API_KEY", "ANGEL_ONE_API_KEY",
            "ANGEL_ONE_CLIENT_ID", "ANGEL_ONE_PASSWORD", "ANGEL_ONE_TOTP_SECRET"):
    os.environ[key] = ""

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

import rate_limit
from main import app  # TestClient without `with` skips lifespan: no broker login


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    rate_limit._hits.clear()
    yield
    rate_limit._hits.clear()


@pytest.fixture
def client():
    return TestClient(app)


PASSWORD = "test-" + uuid.uuid4().hex[:12]


@pytest.fixture
def make_user(client):
    """Register and log in a fresh user; returns (email, auth headers)."""
    def _make():
        email = f"user-{uuid.uuid4().hex[:10]}@example.com"
        r = client.post("/api/auth/register", json={"email": email, "password": PASSWORD, "name": "Test"})
        assert r.status_code == 200, r.text
        r = client.post("/api/auth/login", data={"username": email, "password": PASSWORD})
        assert r.status_code == 200, r.text
        rate_limit._hits.clear()  # account setup should not eat into the limits under test
        return email, {"Authorization": "Bearer " + r.json()["access_token"]}
    return _make
