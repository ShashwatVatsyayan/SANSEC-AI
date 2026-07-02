import asyncio
import unittest
from io import BytesIO

from fastapi import HTTPException
from fastapi.routing import APIRoute
from starlette.datastructures import UploadFile

import main
from app.services.auth import create_access_token


CONTRACT_ROUTES = {
    ("POST", "/api/auth/register"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/logout"),
    ("POST", "/api/auth/refresh"),
    ("GET", "/api/auth/me"),
    ("POST", "/api/auth/google"),
    ("GET", "/api/auth/google/url"),
    ("POST", "/api/files/upload"),
    ("POST", "/api/upload"),
    ("GET", "/api/analysis/{id}/status"),
    ("GET", "/api/analysis/{id}"),
    ("GET", "/api/history"),
    ("POST", "/api/ai/explain"),
    ("POST", "/api/ai/chat"),
    ("GET", "/api/reports"),
    ("GET", "/api/reports/{id}"),
    ("GET", "/api/reports/{id}/export"),
    ("GET", "/api/dashboard/stats"),
    ("GET", "/api/analytics/trends"),
    ("GET", "/api/notifications"),
    ("GET", "/api/settings"),
    ("PUT", "/api/settings"),
    ("GET", "/api/admin/users"),
    ("GET", "/api/health"),
    ("GET", "/api/version"),
}


class ContractRouteTests(unittest.TestCase):
    def test_only_contract_routes_are_registered(self):
        actual = set()
        for route in main.app.routes:
            if isinstance(route, APIRoute):
                for method in route.methods:
                    if method in {"GET", "POST", "PUT"}:
                        actual.add((method, route.path))
        self.assertEqual(actual, CONTRACT_ROUTES)


class ContractBehaviorTests(unittest.TestCase):
    def setUp(self):
        self.user = {"sub": "admin", "role": "Admin"}

    def test_auth_contract_shapes(self):
        register = main.register_user(main.UserRegisterRequest(username="analyst_contract", email="a@sansec.ai", password="password123"))
        self.assertEqual(set(register), {"id", "username", "email", "role", "created_at"})

        login = main.login_user(main.UserLoginRequest(username="admin", password="sansec2026"))
        self.assertEqual(set(login), {"access_token", "refresh_token", "token_type"})
        refreshed = main.refresh_auth_token({"refresh_token": login["refresh_token"]})
        self.assertEqual(set(refreshed), {"access_token", "refresh_token", "token_type"})

    def test_upload_analysis_history_ai_and_reports(self):
        async def run():
            report = await main.upload_file_sync(
                UploadFile(file=BytesIO(b"sample http://example.com 8.8.8.8"), filename="../sample.txt"),
                self.user,
            )
            required_fields = {"id", "filename", "size", "hashes", "file_type", "entropy", "strings", "pe_info", "iocs", "signatures", "risk_score", "threat_level", "mitre_mappings", "timestamp"}
            self.assertTrue(required_fields.issubset(set(report)), f"Missing required fields: {required_fields - set(report)}")
            self.assertEqual(report["filename"], "sample.txt")

            status = main.get_analysis_status(report["id"], self.user)
            self.assertEqual(set(status), {"task_id", "status", "progress", "error_details"})

            history = main.get_history_logs(page=1, limit=20, _user=self.user)
            self.assertTrue(history)

            explanation = main.explain_report_with_ai(main.AIExplainRequest(file_hash=report["id"]), self.user)
            self.assertEqual(set(explanation), {"file_hash", "explanation"})

            chat = main.ask_ai_translator(main.AIChatRequest(file_hash=report["id"], message="Explain risk."), self.user)
            self.assertEqual(set(chat), {"reply", "timestamp"})

            reports = main.list_reports(self.user)
            self.assertTrue(reports)
            self.assertEqual(set(reports[0]), {"id", "filename", "created_at", "created_by"})

            report_doc = main.get_report_document(reports[0]["id"], self.user)
            self.assertEqual(set(report_doc), {"id", "filename", "created_at", "created_by"})

            export_res = main.export_report_document(reports[0]["id"], "pdf", self.user)
            self.assertEqual(export_res.media_type, "application/pdf")
            self.assertGreater(len(export_res.body), 0)

        asyncio.run(run())

    def test_protected_dependency_rejects_missing_token(self):
        with self.assertRaises(HTTPException) as ctx:
            main.current_user(None)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_bearer_dependency_accepts_token(self):
        token = create_access_token("admin", "Admin", "access")
        payload = main.current_user(f"Bearer {token}")
        self.assertEqual(payload["sub"], "admin")


if __name__ == "__main__":
    unittest.main()
