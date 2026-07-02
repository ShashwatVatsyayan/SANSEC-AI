import json
from typing import Any


def build_json_report(report: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "sansec.report.v1",
        "analysis": report,
    }


def build_markdown_report(report: dict[str, Any], explanation: str | None = None) -> str:
    lines = [
        f"# SANSEC AI Report - {report['filename']}",
        "",
        f"- SHA-256: `{report['hashes']['sha256']}`",
        f"- MD5: `{report['hashes']['md5']}`",
        f"- SHA-1: `{report['hashes']['sha1']}`",
        f"- File type: {report['file_type']}",
        f"- Size: {report['size']} bytes",
        f"- Entropy: {report['entropy']}",
        f"- Threat level: {report['threat_level']}",
        f"- Risk score: {report['risk_score']}/100",
        "",
        "## Signatures",
    ]
    signatures = report.get("signatures", [])
    if signatures:
        for signature in signatures:
            lines.append(f"- **{signature['severity']}** {signature['name']}: {signature['description']}")
    else:
        lines.append("- No heuristic signatures triggered.")

    lines.extend(["", "## IOCs"])
    iocs = report.get("iocs", {})
    for key in ("ips", "urls", "domains", "emails"):
        values = iocs.get(key, [])
        lines.append(f"### {key.upper()}")
        lines.extend([f"- `{value}`" for value in values] or ["- None"])

    lines.extend(["", "## MITRE ATT&CK"])
    mappings = report.get("mitre_mappings", [])
    if mappings:
        for mapping in mappings:
            lines.append(f"- {mapping['id']} - {mapping['technique']} ({mapping['tactic']})")
    else:
        lines.append("- No mappings identified.")

    if explanation:
        lines.extend(["", "## AI Explanation", explanation])

    return "\n".join(lines)


def serialize_report(report: dict[str, Any], output_format: str, explanation: str | None = None) -> Any:
    normalized = output_format.lower()
    if normalized == "json":
        return build_json_report(report)
    if normalized in {"md", "markdown"}:
        return {"format": "markdown", "content": build_markdown_report(report, explanation)}
    if normalized == "raw-json":
        return json.dumps(build_json_report(report), indent=2, sort_keys=True)
    raise ValueError("Unsupported report format.")

