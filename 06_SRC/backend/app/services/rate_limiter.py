"""SANSEC AI Rate Limiting Service.

Production-grade in-memory sliding-window rate limiter with RFC-compliant headers:
- Tiered rate limits for sensitive auth, heavy analysis, and general API endpoints
- Tracks request timestamps per client IP / key with automatic expired entry pruning
- Returns HTTP 429 Too Many Requests with Retry-After and X-RateLimit-* headers
- Thread-safe and async-safe for FastAPI / Starlette
"""

import asyncio
import os
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


@dataclass
class RateLimitConfig:
    limit: int
    window_seconds: int
    tier_name: str


class SlidingWindowRateLimiter:
    """Sliding-window in-memory rate limiter with periodic cleanup."""

    def __init__(self):
        # Maps (key, tier) -> list of timestamp floats
        self._history: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()
        self._cleanup_interval = 300.0  # clean memory every 5 minutes

    def get_tier_config(self, path: str) -> Optional[RateLimitConfig]:
        """Determine rate limit tier for a given path."""
        # Exempt health and docs endpoints
        if path in ("/api/health", "/api/version", "/docs", "/openapi.json", "/redoc", "/favicon.ico"):
            return None

        # Sensitive Auth endpoints (login, register, OTP, google)
        if path.startswith("/api/auth/") and not path.endswith("/url"):
            limit = int(os.getenv("SANSEC_RATE_LIMIT_AUTH", "10"))
            window = int(os.getenv("SANSEC_RATE_LIMIT_AUTH_WINDOW", "60"))
            return RateLimitConfig(limit=limit, window_seconds=window, tier_name="auth")

        # Resource-intensive Analysis and Upload endpoints
        if path.startswith("/api/files/upload") or path.startswith("/api/upload") or path.startswith("/api/ai/"):
            limit = int(os.getenv("SANSEC_RATE_LIMIT_ANALYSIS", "20"))
            window = int(os.getenv("SANSEC_RATE_LIMIT_ANALYSIS_WINDOW", "60"))
            return RateLimitConfig(limit=limit, window_seconds=window, tier_name="analysis")

        # General API endpoints
        if path.startswith("/api/"):
            limit = int(os.getenv("SANSEC_RATE_LIMIT_GENERAL", "120"))
            window = int(os.getenv("SANSEC_RATE_LIMIT_GENERAL_WINDOW", "60"))
            return RateLimitConfig(limit=limit, window_seconds=window, tier_name="general")

        return None

    def _extract_client_key(self, request: Request) -> str:
        """Extract client identifier from proxy headers or socket address."""
        # 1. Forwarded header (e.g. from reverse proxies, Vercel, Cloudflare)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
            if client_ip:
                return client_ip

        # 2. X-Real-IP
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()

        # 3. Direct client host
        if request.client and request.client.host:
            return request.client.host

        return "anonymous"

    async def check_rate_limit(
        self, request: Request
    ) -> Tuple[bool, Optional[RateLimitConfig], int, int]:
        """Check if request is within limits.
        
        Returns:
            (is_allowed, config, remaining, retry_after)
        """
        # Global kill-switch check
        enabled = os.getenv("SANSEC_RATE_LIMIT_ENABLED", "true").lower() == "true"
        if not enabled:
            return True, None, 9999, 0

        config = self.get_tier_config(request.url.path)
        if config is None:
            return True, None, 9999, 0

        client_key = self._extract_client_key(request)
        now = time.time()
        window_start = now - config.window_seconds
        storage_key = (client_key, config.tier_name)

        async with self._lock:
            # Periodic cleanup of stale entries across all keys
            if now - self._last_cleanup > self._cleanup_interval:
                self._cleanup_stale_entries(now)
                self._last_cleanup = now

            # Filter out timestamps outside current sliding window
            timestamps = [ts for ts in self._history[storage_key] if ts > window_start]
            count = len(timestamps)

            if count >= config.limit:
                # Rate limit exceeded
                oldest_in_window = timestamps[0]
                retry_after = max(1, int(oldest_in_window + config.window_seconds - now + 0.99))
                self._history[storage_key] = timestamps
                return False, config, 0, retry_after

            # Request allowed: record this timestamp
            timestamps.append(now)
            self._history[storage_key] = timestamps
            remaining = max(0, config.limit - len(timestamps))
            return True, config, remaining, 0

    def _cleanup_stale_entries(self, now: float) -> None:
        """Remove keys with no activity in the past hour."""
        cutoff = now - 3600.0
        keys_to_remove = []
        for key, timestamps in self._history.items():
            self._history[key] = [t for t in timestamps if t > cutoff]
            if not self._history[key]:
                keys_to_remove.append(key)
        for key in keys_to_remove:
            del self._history[key]

    def reset_for_test(self) -> None:
        """Clear all rate limit history (for testing)."""
        self._history.clear()


# Global singleton instance
rate_limiter = SlidingWindowRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI / Starlette middleware enforcing tiered rate limits."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Check rate limit
        allowed, config, remaining, retry_after = await rate_limiter.check_rate_limit(request)

        if not allowed and config is not None:
            # Build 429 response with RFC headers
            content = {
                "detail": f"Rate limit exceeded on '{config.tier_name}' tier ({config.limit} requests per {config.window_seconds}s). Please wait {retry_after}s before retrying.",
                "retry_after": retry_after,
                "limit": config.limit,
                "window_seconds": config.window_seconds,
                "tier": config.tier_name,
            }
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(config.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time() + retry_after)),
            }
            return JSONResponse(status_code=429, content=content, headers=headers)

        # Process request
        response = await call_next(request)

        # Attach rate limit headers if applicable
        if config is not None:
            response.headers["X-RateLimit-Limit"] = str(config.limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(int(time.time() + config.window_seconds))

        return response
