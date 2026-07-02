"""AI explanation engine service — bridges the backend to the ML provider registry.

This module is the backend-facing API for AI explanations. It delegates to the
ml.provider_registry module which resolves the active provider (local, OpenAI,
Gemini, etc.) based on configuration.

When the ML module is not importable (e.g. running backend in isolation), it
falls back to self-contained heuristic logic identical to the local provider.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("sansec.ai_engine")


def _fallback_explanation(report: dict[str, Any]) -> str:
    """Self-contained local explanation when ml module is unavailable."""
    risk = report["risk_score"]
    level = report["threat_level"]
    pe = report.get("pe_info", {})
    iocs = report.get("iocs", {})
    mitre = report.get("mitre_mappings", [])
    signatures = report.get("signatures", [])

    sections: list[str] = [
        "### SANSEC AI Executive Assessment Summary",
        f"The sample **{report['filename']}** has a **{level}** threat profile with a calculated risk score of **{risk}/100**.",
    ]

    if risk >= 75:
        sections.append("Urgent action required: the file contains multiple static indicators commonly associated with malicious tooling.")
    elif risk >= 50:
        sections.append("Attention advised: suspicious static indicators were observed and should be reviewed before allowing execution.")
    else:
        sections.append("Low immediate concern: no critical static heuristics were triggered, but this is not a clean verdict.")

    sections.append("\n### Key Technical Findings")
    sections.append(f"- File type: {report['file_type']}")
    sections.append(f"- Entropy: {report['entropy']}")
    sections.append(f"- SHA-256: {report['hashes']['sha256']}")

    if pe.get("is_pe"):
        sections.append(f"- PE architecture: {pe.get('machine', 'unknown')}")
        sections.append(f"- Entry point: {pe.get('entry_point', 'unknown')}")
        for api in pe.get("suspicious_apis", [])[:6]:
            sections.append(f"- Suspicious API: `{api['api']}` ({api['category']} in `{api['dll']}`)")
    else:
        sections.append("- No valid PE import/section table was parsed.")

    if signatures:
        sections.append("\n### Heuristic Signatures")
        for signature in signatures[:8]:
            sections.append(f"- {signature['severity']}: {signature['name']} - {signature['description']}")

    network_iocs = iocs.get("ips", []) + iocs.get("urls", []) + iocs.get("domains", [])
    if network_iocs:
        sections.append("\n### Indicators of Compromise")
        for ip in iocs.get("ips", [])[:5]:
            sections.append(f"- IP Address: `{ip}`")
        for url in iocs.get("urls", [])[:5]:
            sections.append(f"- URL: `{url}`")
        for domain in iocs.get("domains", [])[:5]:
            sections.append(f"- Domain: `{domain}`")

    if mitre:
        sections.append("\n### MITRE ATT&CK Mapping")
        for mapping in mitre:
            sections.append(f"- {mapping['id']}: {mapping['technique']} ({mapping['tactic']})")

    sections.append("\n### Recommended Response")
    if risk >= 50:
        sections.append("1. Keep the sample isolated and do not execute it on analyst workstations.")
        sections.append("2. Block or monitor extracted IOCs in DNS, proxy, EDR, and SIEM tooling.")
        sections.append("3. Submit the hash to approved threat-intelligence providers if policy allows.")
    else:
        sections.append("1. Preserve the report for audit/history.")
        sections.append("2. Escalate to deeper analysis only if the source, user report, or telemetry is suspicious.")

    return "\n".join(sections)


def generate_explanation(report: dict[str, Any], model_name: str | None = None) -> str:
    """Generate an AI explanation for an analysis report.

    Attempts to use the ML provider registry. Falls back to self-contained
    heuristic logic if the ML module is unavailable.
    """
    try:
        import sys
        import os
        # Ensure ml module root is importable
        ml_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))
        if ml_root not in sys.path:
            sys.path.insert(0, os.path.dirname(ml_root))
        from ml.provider_registry import explain_report
        return explain_report(report, model_name)
    except Exception as exc:
        logger.debug("ML provider registry unavailable, using fallback: %s", exc)
        return _fallback_explanation(report)
