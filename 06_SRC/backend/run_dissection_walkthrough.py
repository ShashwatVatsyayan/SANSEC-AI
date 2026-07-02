"""Malware Dissection End-to-End Walkthrough for SANSEC AI Platform.

Simulates a full security analyst malware dissection workflow by uploading a mock
malware sample, tracking parsing, running threat intelligence searches, checking
YARA and CAPA results, querying AI explanations, and generating a PDF report.
"""

from __future__ import annotations

import json
import os
import sys
import time
from unittest.mock import patch

from fastapi.testclient import TestClient

# Adjust import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app


def run_walkthrough():
    client = TestClient(app)
    print("=" * 80)
    print("   🛡️  SANSEC AI MALWARE DISSECTION END-TO-END SYSTEM WALKTHROUGH 🛡️   ")
    print("=" * 80)

    # 1. Register security analyst account
    print("\n[STEP 1] Registering New Security Analyst Account...")
    register_payload = {
        "username": "threat_hunter_walkthrough",
        "email": "hunter@sansec.ai",
        "password": "hunterPassword2026!",
    }
    reg_resp = client.post("/api/auth/register", json=register_payload)
    if reg_resp.status_code == 201:
        print(f"  ✅ Account created successfully: {reg_resp.json()['username']} ({reg_resp.json()['role']})")
    else:
        print(f"  ❌ Registration failed: {reg_resp.text}")
        return

    # 2. Login to obtain access tokens
    print("\n[STEP 2] Authenticating Analyst & Generating Session Keys...")
    login_payload = {
        "username": "threat_hunter_walkthrough",
        "password": "hunterPassword2026!",
    }
    login_resp = client.post("/api/auth/login", json=login_payload)
    if login_resp.status_code == 200:
        tokens = login_resp.json()
        access_token = tokens["access_token"]
        print("  ✅ Session established. JWT Auth Bearer token received.")
    else:
        print(f"  ❌ Login failed: {login_resp.text}")
        return

    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Simulate uploading a suspicious payload
    print("\n[STEP 3] Uploading Suspected Malware Payload (.EXE) for Deep Dissection...")
    # Creating simulated PE structure with network indicators and injection API patterns
    mock_pe_payload = (
        b"MZ\x90\x00\x03\x00\x00\x00"
        b"PE\x00\x00\x4c\x01\x01\x00"  # PE signature, machine type (x86)
        b"VirtualAllocEx WriteProcessMemory CreateRemoteThread "  # suspicious API patterns
        b"http://c2-controlled.botnet.net/beacon "  # C2 IOC
        b"192.168.22.40"  # Network IP IOC
    )
    
    files = {"file": ("wannacry_variant_sim.exe", mock_pe_payload, "application/octet-stream")}
    upload_resp = client.post("/api/files/upload", files=files, headers=headers)
    if upload_resp.status_code == 202:
        upload_data = upload_resp.json()
        task_id = upload_data["task_id"]
        print(f"  ✅ Upload accepted. Dissection job created. Job ID: {task_id}")
    else:
        print(f"  ❌ Upload failed: {upload_resp.text}")
        return

    # 4. Check analysis status
    print("\n[STEP 4] Polling Static Heuristics Engine Analysis Job...")
    status_resp = client.get(f"/api/analysis/{task_id}/status", headers=headers)
    if status_resp.status_code == 200:
        status_data = status_resp.json()
        print(f"  ✅ Dissection status: {status_data['status']} ({status_data['progress']}% complete)")
    else:
        print(f"  ❌ Status check failed: {status_resp.text}")
        return

    # 5. Retrieve full analysis report telemetry
    print("\n[STEP 5] Extracting Parsed Telemetry, Hashes, and Signatures...")
    report_resp = client.get(f"/api/analysis/{task_id}", headers=headers)
    if report_resp.status_code == 200:
        report = report_resp.json()
        print(f"  ✅ Telemetry successfully extracted.")
        print(f"     * Shannon Entropy: {report['entropy']:.4f}")
        print(f"     * Risk Score: {report['risk_score']}/100")
        print(f"     * Threat Level: {report['threat_level']}")
        print(f"     * SHA-256: {report['hashes']['sha256']}")
        print(f"     * Network IOCs Detected: URLs={report['iocs']['urls']}, IPs={report['iocs']['ips']}")
        print(f"     * Active Signatures: {[sig['name'] for sig in report['signatures']]}")
        print(f"     * MITRE Mappings:")
        for mitre in report["mitre_mappings"]:
            print(f"       - [{mitre['id']}] {mitre['technique']} ({mitre['tactic']})")
    else:
        print(f"  ❌ Telemetry extraction failed: {report_resp.text}")
        return

    # 6. Request AI Reasoning Explanation
    print("\n[STEP 6] Triggering AI Reasoning Explainer Engine...")
    explain_resp = client.post("/api/ai/explain", json={"file_hash": task_id}, headers=headers)
    if explain_resp.status_code == 200:
        explanation = explain_resp.json()["explanation"]
        print("  ✅ AI explanation received:")
        # Print first few lines of the explanation
        lines = explanation.strip().split("\n")
        for line in lines[:8]:
            print(f"     {line}")
        if len(lines) > 8:
            print("     [... truncated for brief display ...]")
    else:
        print(f"  ❌ AI explanation generation failed: {explain_resp.text}")
        return

    # 7. Ask a follow up question via AI Chat
    print("\n[STEP 7] Initiating Interactive AI Threat Chat Query...")
    chat_payload = {
        "file_hash": task_id,
        "message": "Explain what risk level this file poses and how we can mitigate the C2 network indicators.",
    }
    chat_resp = client.post("/api/ai/chat", json=chat_payload, headers=headers)
    if chat_resp.status_code == 200:
        chat_data = chat_resp.json()
        print("  ✅ AI reply received:")
        chat_lines = chat_data["reply"].strip().split("\n")
        for line in chat_lines[:8]:
            print(f"     {line}")
        if len(chat_lines) > 8:
            print("     [... truncated for brief display ...]")
    else:
        print(f"  ❌ AI chat interaction failed: {chat_resp.text}")
        return

    # 8. Export finalized PDF Report document
    print("\n[STEP 8] Rending and Exporting Fully Compiled PDF Report Document...")
    pdf_resp = client.get(f"/api/reports/{f'rep_{task_id[:12]}'}/export?format=pdf", headers=headers)
    if pdf_resp.status_code == 200:
        pdf_bytes = pdf_resp.content
        print(f"  ✅ PDF generated successfully ({len(pdf_bytes)} bytes).")
        # Save a copy in local directory
        # Save using StorageManager
        from app.services.storage_manager import StorageManager
        storage_manager = StorageManager()
        pdf_filename = "dissection_walkthrough_report.pdf"
        saved_pdf_path = storage_manager.save_export(pdf_bytes, pdf_filename)
        print(f"  💾 Handover artifact exported to: {saved_pdf_path}")
    else:
        print(f"  ❌ PDF export failed: {pdf_resp.text}")
        return

    print("\n" + "=" * 80)
    print("      🎉 WALKTHROUGH COMPLETED: ALL E2E CONTRACT PATHWAYS FULLY VERIFIED 🎉      ")
    print("=" * 80)


if __name__ == "__main__":
    run_walkthrough()
