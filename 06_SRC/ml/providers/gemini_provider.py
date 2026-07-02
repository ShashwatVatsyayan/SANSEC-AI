"""Google Gemini explanation provider.

Uses the Gemini REST API (generativelanguage.googleapis.com) for
AI-powered malware analysis explanations.

Environment variables:
    SANSEC_GEMINI_API_KEY  – Required. API key for Gemini.
    SANSEC_GEMINI_MODEL    – Optional. Defaults to gemini-1.5-pro.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

from ml.providers.base import ExplanationProvider
from ml.providers.openai_provider import _build_report_context

logger = logging.getLogger("sansec.ml.gemini")


class GeminiExplanationProvider(ExplanationProvider):
    """Provider adapter for Google Gemini generative AI API."""

    def __init__(self) -> None:
        self._api_key = os.getenv("SANSEC_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
        self._model = os.getenv("SANSEC_GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-1.5-pro"
        self._timeout = int(os.getenv("SANSEC_GEMINI_TIMEOUT", "30"))

    @property
    def provider_name(self) -> str:
        return f"gemini:{self._model}"

    def _call_generate(self, system_instruction: str, user_text: str) -> str:
        if not self._api_key:
            raise RuntimeError("SANSEC_GEMINI_API_KEY is not configured.")

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self._model}:generateContent?key={self._api_key}"
        )

        payload = json.dumps({
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"parts": [{"text": user_text}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048},
        }).encode("utf-8")

        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
            return body["candidates"][0]["content"]["parts"][0]["text"]
        except urllib.error.HTTPError as exc:
            logger.error("Gemini API HTTP error %d", exc.code)
            raise RuntimeError(f"Gemini API returned HTTP {exc.code}") from exc
        except Exception as exc:
            logger.error("Gemini API call failed: %s", exc)
            raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    def explain(self, report: dict[str, Any], prompt_template: str) -> str:
        context = _build_report_context(report)
        return self._call_generate(
            prompt_template,
            f"Generate a comprehensive malware analysis explanation for the following sample.\n\n{context}",
        )

    def chat(self, report: dict[str, Any], user_message: str, prompt_template: str) -> str:
        context = _build_report_context(report)
        return self._call_generate(
            prompt_template,
            f"Analysis context:\n{context}\n\nAnalyst question: {user_message}",
        )
