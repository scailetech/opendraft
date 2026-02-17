"""
ABOUTME: Shared Gemini client wrapper for new google.genai API.
ABOUTME: Provides backward-compatible interface matching legacy GenerativeModel-style usage.
"""

import logging
import os
from typing import Any, Optional, Protocol, runtime_checkable

try:
    from google import genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)


@runtime_checkable
class GenerativeModel(Protocol):
    """Protocol for objects that can generate content (duck typing)."""

    def generate_content(
        self, prompt: Any, generation_config: Any = None, safety_settings: Any = None
    ) -> Any:
        """Generate content from a prompt."""
        ...


class GenerationConfig:
    """
    Configuration for content generation.

    Replaces genai.GenerationConfig from old API.
    """

    def __init__(
        self,
        temperature: float = 0.7,
        max_output_tokens: int = 8192,
        response_mime_type: Optional[str] = None,
    ):
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        self.response_mime_type = response_mime_type


class GeminiModelWrapper:
    """
    Compatibility wrapper for the new google.genai API.

    Mimics legacy GenerativeModel interface
    so existing code continues to work unchanged.

    Usage:
        client = genai.Client(api_key=api_key)
        model = GeminiModelWrapper(client, "gemini-2.0-flash")
        response = model.generate_content("Hello")
        print(response.text)
    """

    def __init__(
        self,
        client: "genai.Client",
        model_name: str,
        temperature: float = 0.7,
    ):
        """
        Initialize wrapper.

        Args:
            client: google.genai.Client instance
            model_name: Model name (e.g., "gemini-2.0-flash")
            temperature: Default temperature for generation
        """
        self.client = client
        self.model_name = model_name
        self.default_temperature = temperature

    def generate_content(
        self,
        prompt: Any,
        generation_config: Any = None,
        safety_settings: Any = None,
    ) -> Any:
        """
        Generate content using the new API.

        Compatible with old GenerativeModel.generate_content() signature.

        Args:
            prompt: Text prompt or list of prompts
            generation_config: GenerationConfig or dict with settings
            safety_settings: Ignored (new API handles safety differently)

        Returns:
            Response object with .text attribute
        """
        _ = safety_settings
        config = {"temperature": self.default_temperature}

        if generation_config:
            # Handle GenerationConfig object
            if hasattr(generation_config, "temperature"):
                config["temperature"] = generation_config.temperature
            if hasattr(generation_config, "max_output_tokens"):
                config["max_output_tokens"] = generation_config.max_output_tokens
            if hasattr(generation_config, "response_mime_type") and generation_config.response_mime_type:
                config["response_mime_type"] = generation_config.response_mime_type

            # Handle dict
            if isinstance(generation_config, dict):
                config.update(generation_config)

        # Handle different prompt types
        if isinstance(prompt, str):
            contents = prompt
        elif isinstance(prompt, list):
            contents = "\n".join(str(p) for p in prompt)
        else:
            contents = str(prompt)

        return self.client.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=config if config else None,
        )

    def count_tokens(self, text: str) -> Any:
        """Count tokens in text."""
        return self.client.models.count_tokens(
            model=self.model_name,
            contents=text,
        )


def create_gemini_client(
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.0-flash",
    temperature: float = 0.7,
) -> GeminiModelWrapper:
    """
    Create a Gemini client wrapper.

    Convenience function that handles API key from environment.

    Args:
        api_key: API key (defaults to GEMINI_API_KEY or GOOGLE_API_KEY env var)
        model_name: Model name
        temperature: Default temperature

    Returns:
        GeminiModelWrapper instance

    Raises:
        ImportError: If google-genai not installed
        ValueError: If no API key found
    """
    if not genai:
        raise ImportError(
            "google-genai not installed. Run: pip install google-genai>=1.0.0"
        )

    api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "API key required. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
        )

    client = genai.Client(api_key=api_key)
    return GeminiModelWrapper(client, model_name, temperature)
