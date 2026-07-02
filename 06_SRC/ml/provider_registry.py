"""Provider registry — resolves the active AI explanation provider from configuration.

The active provider is selected by the SANSEC_ACTIVE_AI_MODEL environment variable
(or workspace setting). Supported values:

    sansec-local-explainer  →  LocalExplanationProvider  (default, no API key needed)
    openai:*                →  OpenAIExplanationProvider  (requires SANSEC_OPENAI_API_KEY)
    gemini:*                →  GeminiExplanationProvider  (requires SANSEC_GEMINI_API_KEY)

When no valid provider can be resolved, the local fallback is returned.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from ml.providers.base import ExplanationProvider
from ml.providers.local_provider import LocalExplanationProvider

logger = logging.getLogger("sansec.ml.registry")

_DEFAULT_PROMPT_PATH = Path(__file__).parent / "report_prompt.md"


def _load_prompt_template() -> str:
    """Load the system prompt from disk. Falls back to a minimal prompt."""
    try:
        return _DEFAULT_PROMPT_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.warning("report_prompt.md not found; using minimal fallback prompt.")
        return (
            "You are SANSEC AI, a malware analysis assistant. "
            "Use only evidence present in the report. Do not claim execution behavior."
        )


def resolve_provider(model_name: str | None = None) -> ExplanationProvider:
    """Resolve and instantiate the correct provider for the given model name."""
    name = (model_name or os.getenv("SANSEC_ACTIVE_AI_MODEL", "sansec-local-explainer")).lower()

    if name.startswith("openai") or name.startswith("gpt"):
        try:
            from ml.providers.openai_provider import OpenAIExplanationProvider
            provider = OpenAIExplanationProvider()
            logger.info("Resolved AI provider: %s", provider.provider_name)
            return provider
        except Exception as exc:
            logger.warning("Failed to initialize OpenAI provider; falling back to local: %s", exc)

    if name.startswith("gemini"):
        try:
            from ml.providers.gemini_provider import GeminiExplanationProvider
            provider = GeminiExplanationProvider()
            logger.info("Resolved AI provider: %s", provider.provider_name)
            return provider
        except Exception as exc:
            logger.warning("Failed to initialize Gemini provider; falling back to local: %s", exc)

    local = LocalExplanationProvider()
    logger.info("Resolved AI provider: %s", local.provider_name)
    return local


def explain_report(report: dict[str, Any], model_name: str | None = None) -> str:
    """High-level convenience: generate an AI explanation for a report."""
    provider = resolve_provider(model_name)
    prompt = _load_prompt_template()
    try:
        return provider.explain(report, prompt)
    except Exception as exc:
        logger.error("AI explanation failed (%s): %s — falling back to local", provider.provider_name, exc)
        return LocalExplanationProvider().explain(report, prompt)


def chat_with_report(report: dict[str, Any], user_message: str, model_name: str | None = None) -> str:
    """High-level convenience: answer an analyst question about a report."""
    provider = resolve_provider(model_name)
    prompt = _load_prompt_template()
    try:
        return provider.chat(report, user_message, prompt)
    except Exception as exc:
        logger.error("AI chat failed (%s): %s — falling back to local", provider.provider_name, exc)
        return LocalExplanationProvider().chat(report, user_message, prompt)
