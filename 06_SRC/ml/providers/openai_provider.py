"""OpenAI-compatible API explanation provider.

Supports any OpenAI-compatible endpoint (OpenAI, Azure OpenAI, local vLLM, Ollama, etc.)
via configurable base URL, API key, and model name.

Environment variables:
    SANSEC_OPENAI_API_KEY   – Required. Bearer token for the API.
    SANSEC_OPENAI_BASE_URL  – Optional. Defaults to https://api.openai.com/v1
    SANSEC_OPENAI_MODEL     – Optional. Defaults to gpt-4o-mini
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

from ml.providers.base import ExplanationProvider

logger = logging.getLogger("sansec.ml.openai")


def _build_report_context(report: dict[str, Any]) -> str:
    """Serialize key report fields into a compact context block."""
    context_parts = [
        f"Filename: {report['filename']}",
        f"File type: {report['file_type']}",
        f"Size: {report['size']} bytes",
        f"SHA-256: {report['hashes']['sha256']}",
        f"Entropy: {report['entropy']}",
        f"Risk score: {report['risk_score']}/100",
        f"Threat level: {report['threat_level']}",
    ]

    sigs = report.get("signatures", [])
    if sigs:
        context_parts.append("Signatures: " + "; ".join(f"{s['severity']}: {s['name']}" for s in sigs[:8]))

    iocs = report.get("iocs", {})
    for ioc_type in ("ips", "urls", "domains", "emails"):
        vals = iocs.get(ioc_type, [])
        if vals:
            context_parts.append(f"IOC {ioc_type}: {', '.join(vals[:5])}")

    mitre = report.get("mitre_mappings", [])
    if mitre:
        context_parts.append("MITRE: " + "; ".join(f"{m['id']} {m['technique']}" for m in mitre))

    pe = report.get("pe_info", {})
    if pe.get("is_pe"):
        context_parts.append(f"PE machine: {pe.get('machine', 'unknown')}")
        context_parts.append(f"Entry point: {pe.get('entry_point', 'unknown')}")
        for api in pe.get("suspicious_apis", [])[:6]:
            context_parts.append(f"Suspicious API: {api['api']} ({api['category']})")

    return "\n".join(context_parts)


class OpenAIExplanationProvider(ExplanationProvider):
    """Provider adapter for OpenAI-compatible chat completion APIs."""

    def __init__(self) -> None:
        self._api_key = os.getenv("SANSEC_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
        self._base_url = (os.getenv("SANSEC_OPENAI_BASE_URL") or os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
        self._model = os.getenv("SANSEC_OPENAI_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        self._timeout = int(os.getenv("SANSEC_OPENAI_TIMEOUT", "30"))

    @property
    def provider_name(self) -> str:
        return f"openai:{self._model}"

    def _call_chat(self, messages: list[dict[str, str]]) -> str:
        if not self._api_key:
            raise RuntimeError("SANSEC_OPENAI_API_KEY is not configured.")

        payload = json.dumps({
            "model": self._model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 2048,
        }).encode("utf-8")

        request = urllib.request.Request(
            f"{self._base_url}/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
            return body["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as exc:
            logger.error("OpenAI API HTTP error %d", exc.code)
            raise RuntimeError(f"OpenAI API returned HTTP {exc.code}") from exc
        except Exception as exc:
            logger.error("OpenAI API call failed: %s", exc)
            raise RuntimeError(f"OpenAI API call failed: {exc}") from exc

    def explain(self, report: dict[str, Any], prompt_template: str) -> str:
        context = _build_report_context(report)
        messages = [
            {"role": "system", "content": prompt_template},
            {"role": "user", "content": f"Generate a comprehensive malware analysis explanation for the following sample.\n\n{context}"},
        ]
        return self._call_chat(messages)

    def chat(self, report: dict[str, Any], user_message: str, prompt_template: str) -> str:
        context = _build_report_context(report)
        messages = [
            {"role": "system", "content": prompt_template},
            {"role": "user", "content": f"Analysis context:\n{context}\n\nAnalyst question: {user_message}"},
        ]
        return self._call_chat(messages)
