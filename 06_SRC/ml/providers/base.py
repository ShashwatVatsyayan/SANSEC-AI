"""Base class and protocol for AI explanation providers."""

from __future__ import annotations

import abc
from typing import Any


class ExplanationProvider(abc.ABC):
    """Abstract base for all AI explanation backend adapters."""

    @abc.abstractmethod
    def explain(self, report: dict[str, Any], prompt_template: str) -> str:
        """Generate a natural-language explanation grounded in the analysis report.

        Args:
            report: Full analysis report dictionary.
            prompt_template: System prompt / instruction template.

        Returns:
            Markdown-formatted explanation string.
        """

    @abc.abstractmethod
    def chat(self, report: dict[str, Any], user_message: str, prompt_template: str) -> str:
        """Answer an analyst's free-form question about a specific analysis report.

        Args:
            report: Full analysis report dictionary.
            user_message: The analyst's question.
            prompt_template: System prompt / instruction template.

        Returns:
            Markdown-formatted response string.
        """

    @property
    @abc.abstractmethod
    def provider_name(self) -> str:
        """Human-readable name of the provider (e.g. 'openai', 'gemini', 'local')."""
