import unittest

from app.analysis.parser import calculate_entropy, calculate_hashes, extract_strings, find_iocs
from app.services.ai_engine import generate_explanation
from app.services.analyzer import analyze_content
from app.services.auth import create_access_token, verify_access_token, hash_password, verify_password
from app.services.reports import serialize_report
from app.services.storage import InMemoryAnalysisStore


class ParserTests(unittest.TestCase):
    def test_hashes_entropy_strings_and_iocs(self):
        data = b"hello http://evil.example.com/path 8.8.8.8 user@example.com"
        hashes = calculate_hashes(data)
        strings = extract_strings(data)
        iocs = find_iocs(strings)

        self.assertEqual(len(hashes["sha256"]), 64)
        self.assertGreater(calculate_entropy(data), 0)
        self.assertIn("http://evil.example.com/path", iocs["urls"])
        self.assertIn("8.8.8.8", iocs["ips"])
        self.assertIn("user@example.com", iocs["emails"])


class AnalyzerTests(unittest.TestCase):
    def test_analyze_content_report_shape(self):
        report = analyze_content(b"MZ suspicious http://c2.example.com", "sample.exe")

        self.assertEqual(report["filename"], "sample.exe")
        self.assertEqual(report["id"], report["hashes"]["sha256"])
        self.assertIn(report["threat_level"], {"Low", "Medium", "High", "Critical"})
        self.assertIn("iocs", report)
        self.assertIn("signatures", report)


class StorageTests(unittest.TestCase):
    def test_in_memory_store_deduplicates_history(self):
        store = InMemoryAnalysisStore()
        report = analyze_content(b"abc http://example.com", "one.txt")

        store.save_report(report)
        store.save_report(report)

        self.assertEqual(store.get_report(report["id"])["filename"], "one.txt")
        self.assertEqual(len(store.history()), 1)


class AuthTests(unittest.TestCase):
    def test_create_and_verify_token(self):
        token = create_access_token("analyst", "admin")
        payload = verify_access_token(token)

        self.assertEqual(payload["sub"], "analyst")
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["typ"], "access")

    def test_create_and_verify_refresh_token(self):
        token = create_access_token("analyst", "admin", "refresh")
        payload = verify_access_token(token)

        self.assertEqual(payload["sub"], "analyst")
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["typ"], "refresh")

    def test_password_hashing(self):
        pwd = "SecretPassword123!"
        hashed = hash_password(pwd)
        self.assertNotEqual(pwd, hashed)
        self.assertTrue(verify_password(pwd, hashed))
        self.assertFalse(verify_password("wrong_password", hashed))

    def test_plaintext_password_fallback(self):
        # Admin preconfigured fallback verification
        self.assertTrue(verify_password("sansec2026", "sansec2026"))
        self.assertFalse(verify_password("wrong", "sansec2026"))


class ReportTests(unittest.TestCase):
    def test_markdown_report_generation(self):
        report = analyze_content(b"abc http://example.com", "one.txt")
        explanation = generate_explanation(report)
        output = serialize_report(report, "markdown", explanation)

        self.assertEqual(output["format"], "markdown")
        self.assertIn("SANSEC AI Report", output["content"])
        self.assertIn("AI Explanation", output["content"])

    def test_pdf_report_generation(self):
        from app.services.pdf_generator import generate_pdf_report
        report = analyze_content(b"abc http://example.com", "one.txt")
        explanation = "Suspicious outbound connection detected."
        pdf_bytes = generate_pdf_report(report, explanation)
        self.assertGreater(len(pdf_bytes), 0)

    def test_explain_output_format(self):
        report = analyze_content(b"MZ http://evil.com VirtualAllocEx", "suspect.exe")
        explanation = generate_explanation(report)

        self.assertIn("### SANSEC AI Executive Assessment Summary", explanation)
        self.assertIn("### Key Technical Findings", explanation)
        self.assertIn("### Heuristic Signatures", explanation)
        self.assertIn("### MITRE ATT&CK Mapping", explanation)
        self.assertIn("### Recommended Response", explanation)


class UserStoreAndAuthTests(unittest.TestCase):
    def test_in_memory_user_store(self):
        from app.services.storage import InMemoryUserStore
        store = InMemoryUserStore()
        
        # Test admin prepopulation
        admin = store.get_user_by_username("admin")
        self.assertIsNotNone(admin)
        self.assertEqual(admin["role"], "Admin")
        
        # Test save and load
        user = {
            "id": "usr_test",
            "username": "tester",
            "email": "tester@sansec.ai",
            "role": "Analyst",
            "created_at": "2026-07-02T12:00:00Z",
            "password": "hashed_pw",
        }
        store.save_user(user)
        
        loaded = store.get_user_by_id("usr_test")
        self.assertEqual(loaded["username"], "tester")
        self.assertEqual(loaded["email"], "tester@sansec.ai")
        
        # Test lookup methods
        by_name = store.get_user_by_username("tester")
        self.assertEqual(by_name["id"], "usr_test")
        
        by_email = store.get_user_by_email("tester@sansec.ai")
        self.assertEqual(by_email["id"], "usr_test")

        # Test listing users
        all_users = store.list_users()
        self.assertEqual(len(all_users), 2)  # admin + tester

    def test_verify_google_token_or_code_mock(self):
        from app.services.auth import verify_google_token_or_code
        
        # Test code verification
        res = verify_google_token_or_code(code="mock_jason", credential=None)
        self.assertEqual(res["email"], "jason@gmail.com")
        self.assertEqual(res["name"], "jason")
        self.assertEqual(res["sub"], "google_jason")
        
        # Test fallback JWT parsing
        # Header: {"alg":"RS256","typ":"JWT"}
        # Payload: {"email":"jason@gmail.com","name":"jason","sub":"google_jason"}
        # Base64 encoded payload: eyJlbWFpbCI6Imphc29uQGdtYWlsLmNvbSIsIm5hbWUiOiJqYXNvbiIsInN1YiI6Imdvb2dsZV9qYXNvbiJ9
        import base64
        payload_b64 = base64.urlsafe_b64encode(b'{"email":"jason@gmail.com","name":"jason","sub":"google_jason"}').decode("utf-8").replace("=", "")
        jwt_token = f"header.{payload_b64}.signature"
        
        res = verify_google_token_or_code(code=None, credential=jwt_token)
        self.assertEqual(res["email"], "jason@gmail.com")
        self.assertEqual(res["name"], "jason")
        self.assertEqual(res["sub"], "google_jason")

    def test_role_based_authorization(self):
        import main
        from fastapi import HTTPException
        
        # User is Analyst
        analyst_user = {"username": "analyst", "role": "Analyst"}
        with self.assertRaises(HTTPException) as ctx:
            main.require_admin(analyst_user)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "Administrative permissions required.")
        
        # User is Admin
        admin_user = {"username": "admin", "role": "Admin"}
        res = main.require_admin(admin_user)
        self.assertEqual(res, admin_user)


class SecureUploadTests(unittest.TestCase):
    def test_valid_uploads(self):
        import main
        
        # MZ header (PE executable)
        main.validate_upload(b"MZ\x90\x00\x03\x00\x00\x00", "test.exe", "application/x-msdownload")
        
        # PDF header
        main.validate_upload(b"%PDF-1.4\n%...", "test.pdf", "application/pdf")
        
        # Script (UTF-8 plain text)
        main.validate_upload(b"import os\nprint('hello')", "script.py", "text/plain")

    def test_invalid_uploads(self):
        import main
        from fastapi import HTTPException
        
        # Invalid binary magic for extension
        with self.assertRaises(HTTPException) as ctx:
            main.validate_upload(b"UNKNOWN_BINARY\x00\x11", "malicious.exe", "application/octet-stream")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("MIME type or magic number validation failed", ctx.exception.detail)
        
        # Empty file
        with self.assertRaises(HTTPException) as ctx:
            main.validate_upload(b"", "empty.exe")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Uploaded file is empty", ctx.exception.detail)

    def test_duplicate_detection(self):
        import main
        
        content = b"MZ\x90\x00\x03\x00\x00\x00 dummy payload"
        filename = "dup_test.exe"
        
        # Clear/initialize storage settings just in case
        main.workspace_settings["automatic_virustotal_lookup"] = False
        
        # First save
        report1 = main.save_report_for_content(content, filename)
        self.assertIsNotNone(report1)
        
        # Second save (should hit duplicate check early)
        report2 = main.save_report_for_content(content, filename)
        self.assertEqual(report1["id"], report2["id"])
        self.assertEqual(report1["timestamp"], report2["timestamp"])


if __name__ == "__main__":
    unittest.main()

