"""Local heuristic explanation provider — no external API calls.

This is the default provider used when no external AI service is configured.
It generates structured, evidence-grounded explanations using deterministic
template logic based on static analysis report fields.
"""

from __future__ import annotations

from typing import Any

from ml.providers.base import ExplanationProvider


class LocalExplanationProvider(ExplanationProvider):
    """Generates explanations using template-based heuristic logic."""

    @property
    def provider_name(self) -> str:
        return "sansec-local-explainer"

    def explain(self, report: dict[str, Any], prompt_template: str) -> str:
        risk = report["risk_score"]
        level = report["threat_level"]
        pe = report.get("pe_info", {})
        iocs = report.get("iocs", {})
        mitre = report.get("mitre_mappings", [])
        signatures = report.get("signatures", [])

        sections: list[str] = [
            "### SANSEC AI Executive Assessment Summary",
            f"The sample **{report['filename']}** has a **{level}** threat profile "
            f"with a calculated risk score of **{risk}/100**.",
        ]

        if risk >= 75:
            sections.append(
                "Urgent action required: the file contains multiple static indicators "
                "commonly associated with malicious tooling."
            )
        elif risk >= 50:
            sections.append(
                "Attention advised: suspicious static indicators were observed "
                "and should be reviewed before allowing execution."
            )
        else:
            sections.append(
                "Low immediate concern: no critical static heuristics were triggered, "
                "but this is not a clean verdict."
            )

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
            for sig in signatures[:8]:
                sections.append(f"- {sig['severity']}: {sig['name']} - {sig['description']}")

        # YARA results
        yara = report.get("yara", {})
        if yara.get("enabled") and yara.get("matches"):
            sections.append("\n### YARA Rule Matches")
            for match in yara["matches"][:5]:
                sections.append(f"- Rule: `{match['rule']}` (tags: {', '.join(match.get('tags', []) or ['none'])})")

        # CAPA results
        capa = report.get("capa", {})
        if capa.get("enabled") and capa.get("capabilities"):
            sections.append("\n### CAPA Capabilities")
            for cap in capa["capabilities"][:10]:
                sections.append(f"- `{cap}`")

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

    def chat(self, report: dict[str, Any], user_message: str, prompt_template: str) -> str:
        context = self.explain(report, prompt_template)
        return (
            f"Based on the stored telemetry for {report['filename']}, "
            f"risk is {report['risk_score']}/100 with threat level "
            f"{report['threat_level']}. Analyst question: {user_message}\n\n{context}"
        )
