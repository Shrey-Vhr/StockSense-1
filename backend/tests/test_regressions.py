"""Regression tests for bugs found in the pre-publication review."""
import asyncio

from database import SessionLocal
from models.portfolio import Holding
from services import market_data
from tests.conftest import PASSWORD


def test_email_is_case_insensitive(client):
    body = {"email": "Mixed.Case@Example.com", "password": PASSWORD, "name": "Case"}
    assert client.post("/api/auth/register", json=body).status_code == 200
    # Same address, different case: not a second account.
    dup = client.post("/api/auth/register", json={**body, "email": "mixed.case@example.com"})
    assert dup.status_code == 400
    for username in ("mixed.case@example.com", "MIXED.CASE@EXAMPLE.COM"):
        r = client.post("/api/auth/login", data={"username": username, "password": PASSWORD})
        assert r.status_code == 200, username


def test_portfolio_rejects_nonsense_numbers(client, make_user):
    _, a = make_user()
    for bad in ({"quantity": 0, "avg_buy_price": 100},
                {"quantity": -5, "avg_buy_price": 100},
                {"quantity": 5, "avg_buy_price": 0},
                {"quantity": 5, "avg_buy_price": -1}):
        r = client.post("/api/portfolio/add", headers=a, json={"symbol": "TCS", **bad})
        assert r.status_code == 422, bad


def test_portfolio_symbols_are_normalised(client, make_user):
    _, a = make_user()
    for symbol in ("tcs", "TCS.NS", " Tcs "):
        r = client.post("/api/portfolio/add", headers=a,
                        json={"symbol": symbol, "quantity": 10, "avg_buy_price": 100})
        assert r.status_code == 200, r.text
    with SessionLocal() as db:
        rows = db.query(Holding).filter(Holding.symbol.like("%TCS%")).all()
    assert [(h.symbol, h.quantity) for h in rows][-1] == ("TCS.NS", 30)
    assert len({h.symbol for h in rows}) == len(rows)


def test_alert_types_are_limited_to_ones_that_fire(client, make_user):
    _, a = make_user()
    for kind in ("rsi_above", "volume_spike", "breakout"):
        r = client.post("/api/alerts", headers=a, json={"symbol": "TCS", "alert_type": kind, "value": 70})
        assert r.status_code == 422, kind
    r = client.post("/api/alerts", headers=a, json={"symbol": "TCS", "alert_type": "price_above", "value": 4000})
    assert r.status_code == 200 and r.json()["symbol"] == "TCS.NS"
    assert client.post("/api/alerts", headers=a,
                       json={"symbol": "TCS", "alert_type": "price_below", "value": -1}).status_code == 422


def test_watchlist_duplicate_check_uses_the_cleaned_symbol(client, make_user):
    _, a = make_user()
    wid = client.post("/api/watchlists/", headers=a, json={"name": "L"}).json()["id"]
    assert client.post(f"/api/watchlists/{wid}/stocks", headers=a, json={"symbol": "TCS.NS"}).status_code == 200
    assert client.post(f"/api/watchlists/{wid}/stocks", headers=a, json={"symbol": "tcs"}).status_code == 400
    assert client.post("/api/watchlists/", headers=a, json={"name": ""}).status_code == 422


def test_history_rejects_malformed_period(client, make_user):
    _, a = make_user()
    r = client.get("/api/stocks/history/TCS", headers=a, params={"period": "x" * 8, "interval": "1d"})
    assert r.status_code == 404  # never reaches yfinance


def test_failed_lookups_are_not_cached():
    calls = []

    @market_data.ttl_cache(ttl_seconds=60)
    async def flaky(key):
        calls.append(key)
        return {} if len(calls) == 1 else {"ok": True}

    assert asyncio.run(flaky("x")) == {}
    assert asyncio.run(flaky("x")) == {"ok": True}  # the empty first result was not pinned
    assert asyncio.run(flaky("x")) == {"ok": True}
    assert len(calls) == 2


def test_angel_one_quote_parses_a_real_ltp_payload(monkeypatch):
    import services.angel_one_service as svc
    broker = svc.AngelOneService()
    broker.is_connected = True
    broker.last_login = 10**12  # far future: skips the session check
    monkeypatch.setattr(broker, "ensure_logged_in", lambda: True)
    monkeypatch.setattr(broker, "get_token_info", lambda s: ("SBIN-EQ", "3045"))

    class Api:
        def ltpData(self, *args):
            return {"status": True, "data": {"ltp": 110.0, "open": 100.0, "high": 111.0,
                                             "low": 99.0, "close": 100.0, "tradingSymbol": "SBIN-EQ"}}
    broker.api = Api()
    quote = broker.get_quote("SBIN.NS")
    assert quote is not None and quote["current_price"] == 110.0
    assert round(quote["change_percent"], 2) == 10.0


def test_angel_one_status_requires_a_token(client):
    assert client.get("/api/angel-one/status").status_code == 401
