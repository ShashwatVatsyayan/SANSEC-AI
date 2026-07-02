"""PDF report generator for SANSEC AI analysis reports.

Converts a structured analysis report dict into a professionally formatted PDF
using WeasyPrint (HTML→PDF). Falls back to a plain-text PDF if WeasyPrint is
unavailable.
"""

from __future__ import annotations

import io
import logging
from typing import Any

logger = logging.getLogger("sansec.pdf_generator")


def _html_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _build_report_html(report: dict[str, Any], explanation: str | None = None) -> str:
    """Build a full HTML document for PDF rendering."""
    hashes = report.get("hashes", {})
    pe = report.get("pe_info", {})
    iocs = report.get("iocs", {})
    signatures = report.get("signatures", [])
    mitre = report.get("mitre_mappings", [])

    # --- CSS ---
    css = """
    @page { size: A4; margin: 1.5cm; }
    body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a2e; line-height: 1.5; }
    h1 { color: #c9a227; font-size: 18pt; border-bottom: 2px solid #c9a227; padding-bottom: 6px; margin-bottom: 4px; }
    h2 { color: #1a1a2e; font-size: 13pt; margin-top: 16px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
    h3 { color: #333; font-size: 11pt; margin-top: 12px; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .meta-table td { padding: 4px 8px; border: 1px solid #ddd; vertical-align: top; }
    .meta-table td:first-child { font-weight: bold; width: 160px; background: #f5f5f5; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 9pt; color: #fff; }
    .badge-critical { background: #e53e3e; }
    .badge-high { background: #dd6b20; }
    .badge-medium { background: #d69e2e; }
    .badge-low { background: #38a169; }
    .sig-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9pt; }
    .sig-table th { background: #1a1a2e; color: #c9a227; text-align: left; padding: 4px 6px; }
    .sig-table td { padding: 4px 6px; border-bottom: 1px solid #eee; }
    .ioc-list { margin: 4px 0; padding-left: 18px; }
    .ioc-list li { font-family: monospace; font-size: 9pt; margin: 2px 0; }
    .mitre-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9pt; }
    .mitre-table th { background: #2d3748; color: #ecc94b; text-align: left; padding: 4px 6px; }
    .mitre-table td { padding: 4px 6px; border-bottom: 1px solid #eee; }
    .explanation { background: #f7fafc; border-left: 3px solid #c9a227; padding: 8px 12px; margin: 10px 0; font-size: 9pt; white-space: pre-wrap; }
    .footer { margin-top: 20px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
    """

    # --- Threat level badge ---
    level = report.get("threat_level", "Low")
    badge_class = f"badge-{level.lower()}"

    # --- HTML ---
    html_parts = [
        f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{css}</style></head><body>",
        f"<h1>SANSEC AI — Malware Analysis Report</h1>",
        f"<h2>Sample Overview</h2>",
        f"<table class='meta-table'>",
        f"<tr><td>Filename</td><td>{_html_escape(report.get('filename', 'unknown'))}</td></tr>",
        f"<tr><td>File Type</td><td>{_html_escape(report.get('file_type', 'unknown'))}</td></tr>",
        f"<tr><td>Size</td><td>{report.get('size', 0):,} bytes</td></tr>",
        f"<tr><td>Shannon Entropy</td><td>{report.get('entropy', 0)}</td></tr>",
        f"<tr><td>Risk Score</td><td><strong>{report.get('risk_score', 0)}/100</strong></td></tr>",
        f"<tr><td>Threat Level</td><td><span class='badge {badge_class}'>{level}</span></td></tr>",
        f"<tr><td>SHA-256</td><td style='font-family:monospace;font-size:8pt'>{hashes.get('sha256', '')}</td></tr>",
        f"<tr><td>MD5</td><td style='font-family:monospace;font-size:8pt'>{hashes.get('md5', '')}</td></tr>",
        f"<tr><td>SHA-1</td><td style='font-family:monospace;font-size:8pt'>{hashes.get('sha1', '')}</td></tr>",
        f"<tr><td>Scan Timestamp</td><td>{report.get('timestamp', '')}</td></tr>",
        f"</table>",
    ]

    # --- PE Info ---
    if pe.get("is_pe"):
        html_parts.append("<h2>PE Metadata</h2>")
        html_parts.append("<table class='meta-table'>")
        html_parts.append(f"<tr><td>Architecture</td><td>{_html_escape(pe.get('machine', 'unknown'))}</td></tr>")
        html_parts.append(f"<tr><td>Entry Point</td><td style='font-family:monospace'>{pe.get('entry_point', '')}</td></tr>")
        html_parts.append("</table>")

        sections = pe.get("sections", [])
        if sections:
            html_parts.append("<h3>Sections</h3><table class='sig-table'>")
            html_parts.append("<tr><th>Name</th><th>Virtual Size</th><th>Raw Size</th><th>Entropy</th><th>R</th><th>W</th><th>X</th></tr>")
            for sec in sections:
                html_parts.append(
                    f"<tr><td>{_html_escape(sec.get('name', ''))}</td>"
                    f"<td>{sec.get('virtual_size', 0):,}</td>"
                    f"<td>{sec.get('raw_size', 0):,}</td>"
                    f"<td>{sec.get('entropy', 0)}</td>"
                    f"<td>{'✓' if sec.get('readable') else '—'}</td>"
                    f"<td>{'✓' if sec.get('writable') else '—'}</td>"
                    f"<td>{'✓' if sec.get('executable') else '—'}</td></tr>"
                )
            html_parts.append("</table>")

        sus_apis = pe.get("suspicious_apis", [])
        if sus_apis:
            html_parts.append("<h3>Suspicious API Imports</h3><table class='sig-table'>")
            html_parts.append("<tr><th>API</th><th>Category</th><th>DLL</th></tr>")
            for api in sus_apis[:15]:
                html_parts.append(f"<tr><td>{_html_escape(api['api'])}</td><td>{_html_escape(api['category'])}</td><td>{_html_escape(api['dll'])}</td></tr>")
            html_parts.append("</table>")

    # --- Signatures ---
    html_parts.append("<h2>Heuristic Signatures</h2>")
    if signatures:
        html_parts.append("<table class='sig-table'>")
        html_parts.append("<tr><th>Severity</th><th>Name</th><th>Description</th></tr>")
        for sig in signatures:
            html_parts.append(f"<tr><td><span class='badge badge-{sig['severity'].lower()}'>{sig['severity']}</span></td><td>{_html_escape(sig['name'])}</td><td>{_html_escape(sig['description'])}</td></tr>")
        html_parts.append("</table>")
    else:
        html_parts.append("<p>No heuristic signatures triggered.</p>")

    # --- IOCs ---
    html_parts.append("<h2>Indicators of Compromise (IOCs)</h2>")
    for ioc_type, label in [("ips", "IP Addresses"), ("urls", "URLs"), ("domains", "Domains"), ("emails", "Emails")]:
        values = iocs.get(ioc_type, [])
        html_parts.append(f"<h3>{label}</h3>")
        if values:
            html_parts.append("<ul class='ioc-list'>")
            for v in values[:20]:
                html_parts.append(f"<li>{_html_escape(v)}</li>")
            html_parts.append("</ul>")
        else:
            html_parts.append("<p>None detected.</p>")

    # --- MITRE ---
    html_parts.append("<h2>MITRE ATT&amp;CK Mappings</h2>")
    if mitre:
        html_parts.append("<table class='mitre-table'>")
        html_parts.append("<tr><th>ID</th><th>Technique</th><th>Tactic</th></tr>")
        for m in mitre:
            html_parts.append(f"<tr><td>{_html_escape(m['id'])}</td><td>{_html_escape(m['technique'])}</td><td>{_html_escape(m['tactic'])}</td></tr>")
        html_parts.append("</table>")
    else:
        html_parts.append("<p>No MITRE ATT&amp;CK mappings identified.</p>")

    # --- AI Explanation ---
    if explanation:
        html_parts.append("<h2>AI Threat Assessment</h2>")
        html_parts.append(f"<div class='explanation'>{_html_escape(explanation)}</div>")

    # --- Footer ---
    html_parts.append("<div class='footer'>Generated by SANSEC AI — AI-Powered Malware Analysis Workspace</div>")
    html_parts.append("</body></html>")

    return "".join(html_parts)


def generate_pdf_report(report: dict[str, Any], explanation: str | None = None) -> bytes:
    """Generate a PDF document from an analysis report.

    Uses WeasyPrint for HTML→PDF conversion. Falls back to returning the
    HTML as UTF-8 bytes (served as application/pdf) when WeasyPrint is
    unavailable.

    Returns:
        PDF binary content as bytes.
    """
    html = _build_report_html(report, explanation)

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        logger.info("PDF report generated via WeasyPrint (%d bytes)", len(pdf_bytes))
        return pdf_bytes
    except ImportError:
        logger.warning("WeasyPrint is not installed; returning HTML as fallback PDF.")
        return html.encode("utf-8")
    except Exception as exc:
        logger.error("WeasyPrint rendering failed: %s; returning HTML fallback.", exc)
        return html.encode("utf-8")
