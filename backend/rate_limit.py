"""Minimal in-memory rate limiting.

StockSense is meant to run as a single local process, so a dict of timestamps
is enough: no Redis, no extra dependency. Limits reset when the server
restarts and are not shared between workers. That is fine here, and is
documented in SECURITY.md for anyone who wants to host it.
"""
import time
import threading
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request

_hits: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def check(key: str, limit: int, window: float) -> None:
    """Record one hit for `key`; raise 429 if it exceeds `limit` per `window` seconds."""
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            retry = int(window - (now - q[0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": str(retry)},
            )
        q.append(now)


def by_ip(name: str, limit: int, window: float):
    """Dependency limiting an endpoint per client IP (for unauthenticated routes)."""
    def dep(request: Request):
        host = request.client.host if request.client else "unknown"
        check(f"{name}:ip:{host}", limit, window)
    return dep


def by_user(name: str, limit: int, window: float):
    """Dependency limiting an endpoint per authenticated user."""
    # Imported here, not at module level: routers.auth imports this module.
    from routers.auth import get_current_user

    def dep(current_user=Depends(get_current_user)):
        check(f"{name}:user:{current_user.id}", limit, window)
    return dep
