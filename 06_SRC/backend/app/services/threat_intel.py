import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger("sansec.threat_intel")


def virustotal_hash_lookup(file_hash: str) -> dict[str, Any]:
    """Look up a file hash on VirusTotal v3 API."""
    api_key = os.getenv("VIRUSTOTAL_API_KEY")
    if not api_key:
        return {
            "provider": "virustotal",
            "enabled": False,
            "status": "not_configured",
            "summary": "VIRUSTOTAL_API_KEY is not configured.",
        }

    request = urllib.request.Request(
        f"https://www.virustotal.com/api/v3/files/{file_hash}",
        headers={"x-apikey": api_key},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return {"provider": "virustotal", "enabled": True, "status": "http_error", "code": exc.code}
    except Exception as exc:
        return {"provider": "virustotal", "enabled": True, "status": "error", "detail": str(exc)}

    stats = body.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
    return {
        "provider": "virustotal",
        "enabled": True,
        "status": "ok",
        "last_analysis_stats": stats,
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
    }


def vt_to_signatures(vt_result: dict[str, Any]) -> list[dict[str, str]]:
    """Convert VirusTotal detection stats into heuristic signatures for risk scoring."""
    if not vt_result.get("enabled") or vt_result.get("status") != "ok":
        return []

    malicious = vt_result.get("malicious", 0)
    suspicious = vt_result.get("suspicious", 0)
    sigs: list[dict[str, str]] = []

    if malicious > 0:
        severity = "High" if malicious >= 5 else "Medium"
        sigs.append({
            "name": "VirusTotal Malicious Detections",
            "severity": severity,
            "description": f"VirusTotal reports {malicious} engine(s) flagged this hash as malicious.",
        })
    if suspicious > 0:
        sigs.append({
            "name": "VirusTotal Suspicious Detections",
            "severity": "Medium",
            "description": f"VirusTotal reports {suspicious} engine(s) flagged this hash as suspicious.",
        })

    return sigs


def enrich_report_with_virustotal(report: dict[str, Any]) -> dict[str, Any]:
    """Enrich an existing analysis report with VirusTotal data.

    Performs a VT lookup, attaches the result, and appends VT-derived
    signatures to the report's signature list. Returns the mutated report.
    """
    file_hash = report.get("id", report.get("hashes", {}).get("sha256", ""))
    if not file_hash:
        return report

    vt_result = virustotal_hash_lookup(file_hash)
    report["virustotal"] = vt_result

    if vt_result.get("enabled") and vt_result.get("status") == "ok":
        vt_sigs = vt_to_signatures(vt_result)
        if vt_sigs:
            report.setdefault("signatures", []).extend(vt_sigs)
            logger.info("VirusTotal enrichment: %d detections added as signatures", len(vt_sigs))

    return report

