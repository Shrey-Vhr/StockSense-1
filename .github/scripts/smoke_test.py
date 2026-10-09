"""Smoke test for the README quick start, run by .github/workflows/quickstart.yml.

Expects the backend on :8000 and the Vite dev server on :5173, started exactly
as the README describes. Uses only the standard library so it runs before
anything else is installed.
"""
import json
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "http://localhost:8000"
WEB = "http://localhost:5173"


def request(method, url, body=None, headers=None, form=False):
    data = None
    headers = dict(headers or {})
    if body is not None:
        if form:
            data = urllib.parse.urlencode(body).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def wait_for(url, seconds=240):
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as r:
                if r.status == 200:
                    return
        except Exception:
            pass
        time.sleep(3)
    sys.exit(f"FAIL: {url} did not come up within {seconds}s")


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail[:200]}]" if detail and not ok else ""))
    if not ok:
        sys.exit(1)


wait_for(API + "/")
wait_for(WEB + "/")

status, body = request("GET", WEB + "/")
check("frontend dev server serves the app", status == 200 and 'id="root"' in body, body)

email = f"quickstart-{secrets.token_hex(4)}@example.com"
pw = secrets.token_urlsafe(16)
status, body = request("POST", API + "/api/auth/register", {"email": email, "password": pw, "name": "Quickstart"})
check("sign up works", status == 200, body)

status, body = request("POST", API + "/api/auth/login", {"username": email, "password": pw}, form=True)
check("log in works", status == 200, body)
auth = {"Authorization": "Bearer " + json.loads(body)["access_token"]}

status, body = request("GET", API + "/api/screener/indicators", headers=auth)
check("authenticated API call works", status == 200, body)

status, body = request("GET", API + "/api/stocks/search?q=RELI", headers=auth)
check("stock search works (bundled stock list)", status == 200 and "RELIANCE" in body, body)

status, body = request("GET", API + "/api/screener/indicators")
check("API rejects calls without a token", status == 401, body)

print("Quick start verified.")
