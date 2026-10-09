"""Shared-password staff login and per-IP rate limiting for public endpoints."""
import base64
import hashlib
import hmac
import logging
import secrets
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request

from .config import settings

logger = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 12 * 60 * 60
PUBLIC_RATE_LIMIT = 20          # requests per window, per client IP
PUBLIC_RATE_WINDOW_SECONDS = 60


def _sign(payload: str) -> str:
    return hmac.new(settings.session_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def check_staff_password(password: str) -> bool:
    return secrets.compare_digest(password.encode(), settings.staff_password.encode())


def issue_token() -> tuple[str, int]:
    """Return a signed token and its expiry (unix seconds)."""
    expires_at = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"staff:{expires_at}"
    raw = f"{payload}:{_sign(payload)}"
    return base64.urlsafe_b64encode(raw.encode()).decode(), expires_at


def _is_valid_token(token: str) -> bool:
    try:
        role, expires_at, signature = base64.urlsafe_b64decode(token.encode()).decode().split(":")
    except (ValueError, UnicodeDecodeError):
        return False
    payload = f"{role}:{expires_at}"
    if not hmac.compare_digest(signature, _sign(payload)):
        return False
    return role == "staff" and int(expires_at) > time.time()


async def require_staff(authorization: str = Header(default="")):
    """FastAPI dependency: reject requests without a valid staff token."""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not _is_valid_token(token):
        raise HTTPException(status_code=401, detail="Staff login required")


_recent_requests: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # App Runner appends the caller's address last; earlier entries are client-supplied
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


async def rate_limit_public(request: Request):
    """FastAPI dependency: cap how often one IP can hit the AI-backed public endpoints."""
    ip = _client_ip(request)
    now = time.time()
    window = _recent_requests[ip]
    while window and window[0] < now - PUBLIC_RATE_WINDOW_SECONDS:
        window.popleft()
    if len(window) >= PUBLIC_RATE_LIMIT:
        logger.warning("Rate limit hit on %s", request.url.path)
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute and try again.")
    window.append(now)
