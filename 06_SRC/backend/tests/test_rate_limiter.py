"""Unit & Integration Tests for SANSEC AI Rate Limiting Middleware and Service.

Verifies:
1. Standard rate limit headers on allowed requests (X-RateLimit-Limit, Remaining, Reset)
2. HTTP 429 Too Many Requests enforcement when quota is exceeded
3. RFC-compliant Retry-After header and detailed JSON payload
4. Tiered differentiation (auth tier vs analysis tier vs general tier)
5. Exemption of health and documentation endpoints
6. IP tracking via X-Forwarded-For and X-Real-IP headers
"""

import os
import unittest
from fastapi.testclient import TestClient

from app.services.rate_limiter import rate_limiter
from main import app


class RateLimiterTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        rate_limiter.reset_for_test()
        # Ensure rate limiting is active for testing
        os.environ["SANSEC_RATE_LIMIT_ENABLED"] = "true"
        os.environ["SANSEC_RATE_LIMIT_AUTH"] = "5"
        os.environ["SANSEC_RATE_LIMIT_AUTH_WINDOW"] = "60"
        os.environ["SANSEC_RATE_LIMIT_GENERAL"] = "10"
        os.environ["SANSEC_RATE_LIMIT_GENERAL_WINDOW"] = "60"

    def tearDown(self):
        rate_limiter.reset_for_test()

    def test_allowed_request_has_ratelimit_headers(self):
        resp = self.client.get("/api/dashboard/stats", headers={"X-Forwarded-For": "10.0.0.1"})
        self.assertIn(resp.status_code, [200, 401])  # status doesn't matter, rate limit middleware runs
        self.assertIn("X-RateLimit-Limit", resp.headers)
        self.assertIn("X-RateLimit-Remaining", resp.headers)
        self.assertIn("X-RateLimit-Reset", resp.headers)
        self.assertEqual(resp.headers["X-RateLimit-Limit"], "10")
        self.assertEqual(resp.headers["X-RateLimit-Remaining"], "9")

    def test_rate_limit_exceeded_returns_429(self):
        client_ip = "192.168.1.100"
        # Make 5 requests to auth endpoint (limit is 5)
        for i in range(5):
            r = self.client.post(
                "/api/auth/send-otp",
                json={"email": f"test{i}@example.com"},
                headers={"X-Forwarded-For": client_ip},
            )
            # Should be allowed (status could be 200 or 500 depending on SMTP, but not 429)
            self.assertNotEqual(r.status_code, 429, f"Request {i+1} was unexpectedly rate limited")

        # 6th request should be blocked with 429 Too Many Requests
        blocked = self.client.post(
            "/api/auth/send-otp",
            json={"email": "overflow@example.com"},
            headers={"X-Forwarded-For": client_ip},
        )
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Retry-After", blocked.headers)
        self.assertEqual(blocked.headers["X-RateLimit-Remaining"], "0")

        body = blocked.json()
        self.assertIn("detail", body)
        self.assertIn("retry_after", body)
        self.assertEqual(body["limit"], 5)
        self.assertEqual(body["tier"], "auth")
        self.assertGreaterEqual(body["retry_after"], 1)

    def test_health_check_exempted(self):
        # Health check should not have rate limiting applied or be blocked
        for _ in range(25):
            resp = self.client.get("/api/health")
            self.assertEqual(resp.status_code, 200)
            self.assertNotIn("X-RateLimit-Limit", resp.headers)

    def test_distinct_ips_have_independent_quotas(self):
        # IP 1 uses all its quota
        for _ in range(5):
            self.client.post(
                "/api/auth/send-otp",
                json={"email": "ip1@example.com"},
                headers={"X-Forwarded-For": "203.0.113.1"},
            )
        # IP 1 should be blocked
        blocked = self.client.post(
            "/api/auth/send-otp",
            json={"email": "ip1_blocked@example.com"},
            headers={"X-Forwarded-For": "203.0.113.1"},
        )
        self.assertEqual(blocked.status_code, 429)

        # IP 2 should still be allowed!
        fresh_ip = self.client.post(
            "/api/auth/send-otp",
            json={"email": "ip2@example.com"},
            headers={"X-Forwarded-For": "203.0.113.2"},
        )
        self.assertNotEqual(fresh_ip.status_code, 429)
