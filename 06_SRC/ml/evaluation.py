"""Evaluation framework for SANSEC AI explanation quality.

Provides a corpus of test samples with expected findings and a scorer that
measures how well AI explanations cover ground-truth evidence.

Usage:
    python -m ml.evaluation
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

from ml.provider_registry import explain_report, resolve_provider

logger = logging.getLogger("sansec.ml.evaluation")


# Evaluation corpus — compact reference samples with expected ground-truth signals.
EVALUATION_CORPUS: list[dict[str, Any]] = [
    {
        "name": "benign_text_file",
        "report": {
            "id": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "filename": "readme.txt",
            "size": 42,
            "hashes": {
                "md5": "d41d8cd98f00b204e9800998ecf8427e",
                "sha1": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
                "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            },
            "file_type": "Text / Script File",
            "entropy": 3.21,
            "strings": ["Hello World"],
            "pe_info": {"is_pe": False},
            "iocs": {"ips": [], "urls": [], "emails": [], "domains": []},
            "signatures": [],
            "risk_score": 10,
            "threat_level": "Low",
            "mitre_mappings": [],
            "yara": {"enabled": False, "status": "not_configured", "matches": []},
            "capa": {"enabled": False, "status": "not_configured", "capabilities": []},
            "timestamp": "2026-07-02T00:00:00Z",
        },
        "expected_keywords": ["Low", "no critical", "readme.txt"],
        "expected_absent": ["Urgent action required", "**Critical**", "Process Injection"],
    },
    {
        "name": "suspicious_pe_with_injection",
        "report": {
            "id": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca545b",
            "filename": "payload.exe",
            "size": 3514022,
            "hashes": {
                "md5": "84c82835a5d21bb375c3c3372f7bc93a",
                "sha1": "4cc2835a5d21bb375c3c3372f7bc93a8d1a1bb1",
                "sha256": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca545b",
            },
            "file_type": "EXE (Windows Portable Executable)",
            "entropy": 7.42,
            "strings": ["VirtualAllocEx", "KERNEL32.dll", "http://malicious-c2.net/connect"],
            "pe_info": {
                "is_pe": True,
                "machine": "x64 (64-bit)",
                "entry_point": "0x140001020",
                "sections": [{"name": ".text", "virtual_size": 40960, "raw_size": 38912, "entropy": 6.25, "writable": False, "executable": True, "readable": True}],
                "imports": {"KERNEL32.dll": ["VirtualAllocEx", "WriteProcessMemory"]},
                "exports": [],
                "suspicious_sections": [],
                "high_entropy_sections": [],
                "suspicious_apis": [
                    {"api": "VirtualAllocEx", "category": "Process Injection", "dll": "KERNEL32.dll"},
                    {"api": "WriteProcessMemory", "category": "Process Injection", "dll": "KERNEL32.dll"},
                ],
            },
            "iocs": {"ips": ["185.220.101.4"], "urls": ["http://malicious-c2.net/connect"], "emails": [], "domains": ["malicious-c2.net"]},
            "signatures": [
                {"name": "Process Injection API Sequence", "severity": "High", "description": "File imports VirtualAllocEx and WriteProcessMemory."},
                {"name": "Embedded URL Indicators", "severity": "Medium", "description": "Found external endpoints."},
            ],
            "risk_score": 85,
            "threat_level": "Critical",
            "mitre_mappings": [{"id": "T1055", "technique": "Process Injection", "tactic": "Privilege Escalation / Defense Evasion"}],
            "yara": {"enabled": False, "status": "not_configured", "matches": []},
            "capa": {"enabled": False, "status": "not_configured", "capabilities": []},
            "timestamp": "2026-07-02T13:00:00Z",
        },
        "expected_keywords": ["Critical", "payload.exe", "VirtualAllocEx", "T1055", "Process Injection", "185.220.101.4", "Urgent"],
        "expected_absent": ["Low immediate concern"],
    },
]


def score_explanation(explanation: str, expected_keywords: list[str], expected_absent: list[str]) -> dict[str, Any]:
    """Score an explanation against ground-truth keywords.

    Returns:
        dict with hits, misses, false_positives, coverage (0.0-1.0), and passed (bool).
    """
    explanation_lower = explanation.lower()
    hits = [kw for kw in expected_keywords if kw.lower() in explanation_lower]
    misses = [kw for kw in expected_keywords if kw.lower() not in explanation_lower]
    false_positives = [kw for kw in expected_absent if kw.lower() in explanation_lower]
    coverage = len(hits) / len(expected_keywords) if expected_keywords else 1.0
    return {
        "hits": hits,
        "misses": misses,
        "false_positives": false_positives,
        "coverage": round(coverage, 3),
        "passed": coverage >= 0.8 and len(false_positives) == 0,
    }


def run_evaluation(model_name: str | None = None) -> dict[str, Any]:
    """Run the evaluation corpus against the specified provider."""
    provider = resolve_provider(model_name)
    results: list[dict[str, Any]] = []

    for case in EVALUATION_CORPUS:
        explanation = explain_report(case["report"], model_name)
        score = score_explanation(explanation, case["expected_keywords"], case["expected_absent"])
        results.append({
            "name": case["name"],
            "provider": provider.provider_name,
            "score": score,
        })
        status = "PASS" if score["passed"] else "FAIL"
        logger.info("[%s] %s — coverage=%.1f%% misses=%s fp=%s",
                     status, case["name"], score["coverage"] * 100, score["misses"], score["false_positives"])

    total = len(results)
    passed = sum(1 for r in results if r["score"]["passed"])
    return {
        "provider": provider.provider_name,
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / total, 3) if total else 0.0,
        "results": results,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    model = sys.argv[1] if len(sys.argv) > 1 else None
    summary = run_evaluation(model)
    print(json.dumps(summary, indent=2))
    sys.exit(0 if summary["pass_rate"] >= 0.8 else 1)
