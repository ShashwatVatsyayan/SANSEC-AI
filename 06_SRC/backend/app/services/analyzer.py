import datetime
import logging
from typing import Any

from app.analysis.parser import (
    analyze_pe,
    calculate_entropy,
    calculate_hashes,
    calculate_risk_score,
    detect_file_type,
    extract_strings,
    find_iocs,
    match_signatures,
)
from app.services.yara_capa import run_capa, scan_yara

logger = logging.getLogger("sansec.analyzer")


MITRE_BY_CATEGORY = {
    "Process Injection": {"id": "T1055", "technique": "Process Injection", "tactic": "Privilege Escalation / Defense Evasion"},
    "Evasion/Anti-Debug": {"id": "T1497", "technique": "Virtualization/Sandbox Evasion", "tactic": "Defense Evasion"},
    "Network / C2": {"id": "T1071", "technique": "Application Layer Protocol", "tactic": "Command and Control"},
    "Execution": {"id": "T1204", "technique": "User Execution", "tactic": "Execution"},
    "Persistence/Registry": {"id": "T1547", "technique": "Boot or Logon Autostart Execution", "tactic": "Persistence"},
    "Keylogging": {"id": "T1056", "technique": "Input Capture", "tactic": "Credential Access"},
}


def classify_threat_level(risk_score: int) -> str:
    if risk_score >= 75:
        return "Critical"
    if risk_score >= 50:
        return "High"
    if risk_score >= 25:
        return "Medium"
    return "Low"


# Extended MITRE mappings derived from IOC, signature, and file-type evidence.
MITRE_IOC_NETWORK = {"id": "T1041", "technique": "Exfiltration Over C2 Channel", "tactic": "Exfiltration"}
MITRE_PACKED = {"id": "T1027", "technique": "Obfuscated Files or Information", "tactic": "Defense Evasion"}
MITRE_ENCRYPTED_CHANNEL = {"id": "T1573", "technique": "Encrypted Channel", "tactic": "Command and Control"}
MITRE_MASQUERADING = {"id": "T1036", "technique": "Masquerading", "tactic": "Defense Evasion"}
MITRE_MACRO_EXEC = {"id": "T1059.005", "technique": "Command and Scripting Interpreter: Visual Basic", "tactic": "Execution"}
MITRE_SCRIPTING = {"id": "T1059", "technique": "Command and Scripting Interpreter", "tactic": "Execution"}
MITRE_DLL_SIDELOAD = {"id": "T1574.002", "technique": "DLL Side-Loading", "tactic": "Persistence / Privilege Escalation"}


def map_mitre(
    pe_info: dict[str, Any],
    iocs: dict[str, Any] | None = None,
    signatures: list[dict[str, str]] | None = None,
    file_type: str = "",
    entropy: float = 0.0,
) -> list[dict[str, str]]:
    """Build comprehensive MITRE ATT&CK mappings from multiple evidence sources.

    Sources:
        1. Suspicious API imports (PE metadata)
        2. IOC network indicators (IPs, URLs, domains)
        3. Heuristic signature names (packing, injection, etc.)
        4. File type heuristics (DLL, Office, Script)
        5. High entropy (obfuscation/packing)
    """
    mappings: list[dict[str, str]] = []
    seen: set[str] = set()
    iocs = iocs or {}
    signatures = signatures or []

    def _add(mapping: dict[str, str]) -> None:
        if mapping["id"] not in seen:
            mappings.append(mapping)
            seen.add(mapping["id"])

    # 1. API-based mappings
    for api in pe_info.get("suspicious_apis", []):
        mapping = MITRE_BY_CATEGORY.get(api.get("category"))
        if mapping:
            _add(mapping)

    # 2. IOC-based mappings — network indicators imply C2 / exfiltration
    has_network = bool(iocs.get("ips") or iocs.get("urls") or iocs.get("domains"))
    if has_network:
        _add(MITRE_BY_CATEGORY["Network / C2"])
        _add(MITRE_IOC_NETWORK)

    # 3. Signature-based mappings
    for sig in signatures:
        sig_name_lower = sig.get("name", "").lower()
        if "pack" in sig_name_lower or "compress" in sig_name_lower or "encrypt" in sig_name_lower:
            _add(MITRE_PACKED)
        if "injection" in sig_name_lower:
            _add(MITRE_BY_CATEGORY["Process Injection"])
        if "url" in sig_name_lower or "c2" in sig_name_lower:
            _add(MITRE_BY_CATEGORY["Network / C2"])
        if "debug" in sig_name_lower or "evasion" in sig_name_lower:
            _add(MITRE_BY_CATEGORY["Evasion/Anti-Debug"])

    # 4. File-type heuristics
    file_type_upper = file_type.upper()
    if "DLL" in file_type_upper:
        _add(MITRE_DLL_SIDELOAD)
    if "OFFICE" in file_type_upper or "DOCX" in file_type_upper:
        _add(MITRE_MACRO_EXEC)
    if "SCRIPT" in file_type_upper:
        _add(MITRE_SCRIPTING)

    # 5. High entropy → obfuscation/packing
    if entropy > 7.0:
        _add(MITRE_PACKED)
    if entropy > 7.5:
        _add(MITRE_ENCRYPTED_CHANNEL)

    return mappings


def _yara_signatures(yara_result: dict[str, Any]) -> list[dict[str, str]]:
    """Convert YARA matches into heuristic signatures for unified scoring."""
    sigs: list[dict[str, str]] = []
    for match in yara_result.get("matches", []):
        severity = "High" if "malware" in match.get("rule", "").lower() else "Medium"
        sigs.append({
            "name": f"YARA: {match['rule']}",
            "severity": severity,
            "description": f"YARA rule '{match['rule']}' matched (namespace: {match.get('namespace', 'default')}, tags: {', '.join(match.get('tags', []) or ['none'])}).",
        })
    return sigs


def analyze_content(content: bytes, filename: str, string_limit: int = 50) -> dict[str, Any]:
    file_size = len(content)
    hashes = calculate_hashes(content)
    file_type = detect_file_type(content, filename)
    entropy = calculate_entropy(content)
    strings = extract_strings(content)
    pe_info = analyze_pe(content) if "EXE" in file_type or "DLL" in file_type else {"is_pe": False}
    iocs = find_iocs(strings)
    signatures = match_signatures(file_type, pe_info, iocs, entropy)

    # YARA enrichment
    yara_result = scan_yara(content)
    if yara_result.get("enabled") and yara_result.get("status") == "ok":
        signatures.extend(_yara_signatures(yara_result))
        logger.info("YARA scan completed: %d matches", len(yara_result.get("matches", [])))

    # CAPA enrichment
    capa_result = run_capa(content)
    if capa_result.get("enabled") and capa_result.get("status") == "ok":
        logger.info("CAPA scan completed: %d capabilities", len(capa_result.get("capabilities", [])))

    risk_score = calculate_risk_score(file_type, pe_info, signatures, entropy)

    return {
        "id": hashes["sha256"],
        "filename": filename,
        "size": file_size,
        "hashes": hashes,
        "file_type": file_type,
        "entropy": entropy,
        "strings": strings[:string_limit],
        "pe_info": pe_info,
        "iocs": iocs,
        "signatures": signatures,
        "risk_score": risk_score,
        "threat_level": classify_threat_level(risk_score),
        "mitre_mappings": map_mitre(pe_info, iocs=iocs, signatures=signatures, file_type=file_type, entropy=entropy),
        "yara": yara_result,
        "capa": capa_result,
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
    }


def to_history_item(report: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": report["id"],
        "filename": report["filename"],
        "size": report["size"],
        "risk_score": report["risk_score"],
        "threat_level": report["threat_level"],
        "file_type": report["file_type"],
        "timestamp": report["timestamp"],
    }
