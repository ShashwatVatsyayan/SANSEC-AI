"""End-to-End Integration Tests for SANSEC Backend Auth and API Client.

Simulates a client interacting with all contract-defined endpoints including
user registration, authentication, JWT token refresh, file upload, analysis
polling, threat intel reporting, AI threat translation, settings, and PDF/CSV
exports.
"""

import unittest
from fastapi.testclient import TestClient

from main import app


class BackendIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_user = {
            "username": "integration_analyst",
            "email": "analyst.integ@sansec.ai",
            "password": "SecurePassword123!",
        }

    def test_complete_analyst_workflow(self):
        # 1. Register a new user
        reg_resp = self.client.post("/api/auth/register", json=self.test_user)
        self.assertEqual(reg_resp.status_code, 201)
        reg_json = reg_resp.json()
        self.assertEqual(reg_json["username"], self.test_user["username"])
        self.assertEqual(reg_json["email"], self.test_user["email"])
        self.assertEqual(reg_json["role"], "Analyst")

        # 2. Login to obtain JWT tokens
        login_payload = {
            "username": self.test_user["username"],
            "password": self.test_user["password"],
        }
        login_resp = self.client.post("/api/auth/login", json=login_payload)
        self.assertEqual(login_resp.status_code, 200)
        tokens = login_resp.json()
        self.assertIn("access_token", tokens)
        self.assertIn("refresh_token", tokens)
        self.assertEqual(tokens["token_type"], "bearer")

        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # 3. Get currently authenticated user details
        me_resp = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()["username"], self.test_user["username"])

        # 4. Perform JWT token refresh handshake
        refresh_resp = self.client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        self.assertEqual(refresh_resp.status_code, 200)
        new_tokens = refresh_resp.json()
        self.assertIn("access_token", new_tokens)
        headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}

        # 5. Upload a mock PE file for static analysis
        # Using a minimal simulated EXE starting with 'MZ'
        mock_exe = b"MZ\x90\x00\x03\x00\x00\x00http://host-ioc.com/exec 192.168.1.100 VirtualAllocEx"
        file_payload = {"file": ("malware_sample.exe", mock_exe, "application/octet-stream")}
        upload_resp = self.client.post("/api/files/upload", files=file_payload, headers=headers)
        self.assertEqual(upload_resp.status_code, 202)
        report = upload_resp.json()
        self.assertEqual(report["status"], "Completed")
        file_hash = report["task_id"]

        # 6. Retrieve file analysis status (polling simulation)
        status_resp = self.client.get(f"/api/analysis/{file_hash}/status", headers=headers)
        self.assertEqual(status_resp.status_code, 200)
        status_json = status_resp.json()
        self.assertEqual(status_json["status"], "Completed")
        self.assertEqual(status_json["progress"], 100)

        # 7. Get full analysis report details
        detail_resp = self.client.get(f"/api/analysis/{file_hash}", headers=headers)
        self.assertEqual(detail_resp.status_code, 200)
        report_details = detail_resp.json()
        self.assertEqual(report_details["id"], file_hash)
        self.assertGreater(report_details["entropy"], 0)
        self.assertIn("http://host-ioc.com/exec", report_details["iocs"]["urls"])

        # 8. Query AI Threat Explanation
        explain_resp = self.client.post(
            "/api/ai/explain",
            json={"file_hash": file_hash},
            headers=headers,
        )
        self.assertEqual(explain_resp.status_code, 200)
        explain_json = explain_resp.json()
        self.assertEqual(explain_json["file_hash"], file_hash)
        self.assertIn("explanation", explain_json)

        # 9. Perform interactive chat query
        chat_resp = self.client.post(
            "/api/ai/chat",
            json={"file_hash": file_hash, "message": "What techniques did this file execute?"},
            headers=headers,
        )
        self.assertEqual(chat_resp.status_code, 200)
        chat_json = chat_resp.json()
        self.assertIn("reply", chat_json)
        self.assertIn("timestamp", chat_json)

        # 10. List compiled reports archive
        reports_list_resp = self.client.get("/api/reports", headers=headers)
        self.assertEqual(reports_list_resp.status_code, 200)
        reports = reports_list_resp.json()
        self.assertTrue(len(reports) > 0)
        expected_report_id = f"rep_{file_hash[:12]}"
        report_meta = next((r for r in reports if r["id"] == expected_report_id), None)
        self.assertIsNotNone(report_meta, f"Could not find report {expected_report_id} in {reports}")
        report_id = report_meta["id"]

        # 11. Retrieve report document layout
        report_doc_resp = self.client.get(f"/api/reports/{report_id}", headers=headers)
        self.assertEqual(report_doc_resp.status_code, 200)
        self.assertEqual(report_doc_resp.json()["id"], report_id)

        # 12. Export report document as PDF
        pdf_resp = self.client.get(f"/api/reports/{report_id}/export?format=pdf", headers=headers)
        self.assertEqual(pdf_resp.status_code, 200)
        self.assertEqual(pdf_resp.headers["content-type"], "application/pdf")
        self.assertGreater(len(pdf_resp.content), 0)

        # 13. Export report document as JSON
        json_resp = self.client.get(f"/api/reports/{report_id}/export?format=json", headers=headers)
        self.assertEqual(json_resp.status_code, 200)
        self.assertEqual(json_resp.headers["content-type"], "application/json")
        self.assertEqual(json_resp.json()["id"], file_hash)

        # 14. Export report document as CSV
        csv_resp = self.client.get(f"/api/reports/{report_id}/export?format=csv", headers=headers)
        self.assertEqual(csv_resp.status_code, 200)
        self.assertEqual(csv_resp.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn("filename", csv_resp.text)

        # 15. Retrieve workspace system settings
        settings_resp = self.client.get("/api/settings", headers=headers)
        self.assertEqual(settings_resp.status_code, 200)
        settings = settings_resp.json()
        self.assertIn("active_ai_model", settings)

        # 16. Modify system settings
        update_payload = {
            "active_ai_model": "openai:gpt-4o-mini",
            "max_file_size_mb": 100,
            "automatic_virustotal_lookup": False,
        }
        update_resp = self.client.put("/api/settings", json=update_payload, headers=headers)
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["active_ai_model"], "openai:gpt-4o-mini")

        # 17. Perform logout session termination
        logout_resp = self.client.post("/api/auth/logout", headers=headers)
        self.assertEqual(logout_resp.status_code, 200)
        self.assertEqual(logout_resp.json()["message"], "Session terminated successfully.")
