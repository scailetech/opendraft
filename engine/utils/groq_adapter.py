#!/usr/bin/env python3
"""
Groq API Adapter - Makes Groq models work with the Gemini-style interface.
Allows drop-in replacement of Gemini with Llama 4 Maverick or other Groq models.
"""

import os
import requests
import logging
from dataclasses import dataclass
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Default Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


@dataclass
class UsageMetadata:
    """Mimics Gemini's usage_metadata structure"""
    prompt_token_count: int
    candidates_token_count: int
    total_token_count: int


@dataclass
class Part:
    """Mimics Gemini's Part structure"""
    text: str
    function_call: Optional[object] = None


@dataclass
class Content:
    """Mimics Gemini's Content structure"""
    parts: list

    @classmethod
    def from_text(cls, text: str) -> 'Content':
        return cls(parts=[Part(text=text)])


@dataclass
class Candidate:
    """Mimics Gemini's Candidate structure"""
    content: Content
    finish_reason: str = "STOP"


@dataclass
class GroqResponse:
    """Mimics Gemini's response structure for full compatibility"""
    text: str
    usage_metadata: UsageMetadata
    candidates: list = None

    def __post_init__(self):
        # Create candidates list matching Gemini format if not provided
        if self.candidates is None:
            self.candidates = [
                Candidate(
                    content=Content.from_text(self.text),
                    finish_reason="STOP"
                )
            ]


class GroqModel:
    """
    Groq API wrapper that mimics the Gemini GenerativeModel interface.

    Usage:
        model = GroqModel("meta-llama/llama-4-maverick-17b-128e-instruct")
        response = model.generate_content("Write an introduction...")
        print(response.text)
    """

    # Available models on Groq
    MODELS = {
        "llama-4-maverick": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "llama-4-scout": "meta-llama/llama-4-scout-17b-16e-instruct",
        "kimi-k2": "moonshotai/kimi-k2-instruct",
        "llama-3.3-70b": "llama-3.3-70b-versatile",
        "gpt-oss-120b": "openai/gpt-oss-120b",
        "gpt-oss-20b": "openai/gpt-oss-20b",
    }

    # Context window limits (in tokens) for each model
    CONTEXT_LIMITS = {
        "meta-llama/llama-4-maverick-17b-128e-instruct": 128000,
        "meta-llama/llama-4-scout-17b-16e-instruct": 131072,
        "moonshotai/kimi-k2-instruct": 131072,
        "llama-3.3-70b-versatile": 128000,
        "openai/gpt-oss-120b": 32768,
        "openai/gpt-oss-20b": 32768,
    }

    def __init__(
        self,
        model_name: str = "meta-llama/llama-4-maverick-17b-128e-instruct",
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
    ):
        """
        Initialize Groq model.

        Args:
            model_name: Full model name or shorthand (e.g., "llama-4-maverick")
            api_key: Groq API key (defaults to env var or hardcoded key)
            temperature: Generation temperature (0-1)
            max_tokens: Maximum output tokens
        """
        # Resolve shorthand model names
        self.model_name = self.MODELS.get(model_name, model_name)
        self.api_key = api_key or GROQ_API_KEY
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

        # Set context limit for this model
        self.context_limit = self.CONTEXT_LIMITS.get(self.model_name, 32768)
        logger.info(f"GroqModel initialized: {self.model_name}")

    def _truncate_prompt(self, prompt: str) -> str:
        """Truncate prompt to fit within context window, leaving room for output."""
        # Groq API has stricter request size limits than model context
        # Use conservative limit: 32K tokens max for API, regardless of model context
        api_limit = min(self.context_limit, 32000)

        # Reserve space for output tokens (max_tokens) + buffer
        max_input_tokens = api_limit - self.max_tokens - 500

        # Rough estimate: 4 chars per token
        max_chars = max_input_tokens * 4

        if len(prompt) <= max_chars:
            return prompt

        # Truncate and add notice
        truncated = prompt[:max_chars]
        # Find last complete sentence or paragraph
        last_period = truncated.rfind('.')
        last_newline = truncated.rfind('\n')
        cut_point = max(last_period, last_newline)
        if cut_point > max_chars * 0.8:  # Only use if we keep most of the content
            truncated = truncated[:cut_point + 1]

        logger.warning(f"Prompt truncated from {len(prompt):,} to {len(truncated):,} chars (context limit: {self.context_limit:,} tokens)")

        return truncated + "\n\n[Note: Input was truncated to fit context window]"

    def generate_content(self, prompt: str, generation_config: dict = None) -> GroqResponse:
        """
        Generate content using Groq API.
        Mimics Gemini's generate_content interface.

        Args:
            prompt: The prompt to send to the model
            generation_config: Optional config (ignored, for Gemini compatibility)

        Returns:
            GroqResponse with .text and .usage_metadata attributes
        """
        import time

        # Truncate prompt if too large for context window
        prompt = self._truncate_prompt(prompt)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        max_retries = 8  # Increased for Groq free tier rate limits
        last_error = None

        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=data,
                    timeout=300  # 5 min timeout for long generations
                )
                response.raise_for_status()
                result = response.json()

                # Extract text and usage
                text = result["choices"][0]["message"]["content"]
                usage = result.get("usage", {})

                usage_metadata = UsageMetadata(
                    prompt_token_count=usage.get("prompt_tokens", 0),
                    candidates_token_count=usage.get("completion_tokens", 0),
                    total_token_count=usage.get("total_tokens", 0),
                )

                logger.debug(f"Groq response: {usage_metadata.total_token_count} tokens")

                # Add small delay to avoid rate limits (2 req/min is safe for free tier)
                time.sleep(2)

                return GroqResponse(text=text, usage_metadata=usage_metadata)

            except requests.exceptions.Timeout:
                raise Exception(f"Groq API timeout after 300s for model {self.model_name}")
            except requests.exceptions.HTTPError as e:
                # Handle rate limiting (429)
                if e.response is not None and e.response.status_code == 429:
                    last_error = e
                    if attempt < max_retries - 1:
                        # Longer exponential backoff for Groq free tier limits
                        # 10s, 20s, 40s, 60s, 60s, 60s, 60s = up to 5 min total
                        wait_time = min(60, (2 ** attempt) * 10)
                        logger.warning(f"Rate limited (429) (attempt {attempt + 1}/{max_retries}), waiting {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    raise Exception(f"Groq API rate limited after {max_retries} retries: {e}")
                # Handle payload too large (413) - retry with smaller prompt
                if e.response is not None and e.response.status_code == 413:
                    last_error = e
                    if attempt < max_retries - 1:
                        # Reduce prompt size by 30% each retry
                        current_len = len(data["messages"][0]["content"])
                        new_len = int(current_len * 0.7)
                        truncated = data["messages"][0]["content"][:new_len]
                        # Find clean break point
                        last_break = max(truncated.rfind('\n\n'), truncated.rfind('. '))
                        if last_break > new_len * 0.7:
                            truncated = truncated[:last_break + 1]
                        data["messages"][0]["content"] = truncated + "\n\n[Content truncated to fit API limits. Focus on the key points provided.]"
                        logger.warning(f"Payload too large (413), truncating from {current_len:,} to {len(data['messages'][0]['content']):,} chars (attempt {attempt + 1})")
                        continue
                    raise Exception(f"Groq API payload too large after {max_retries} truncation attempts: {e}")
                raise Exception(f"Groq API error: {e}")
            except (requests.exceptions.ConnectionError, ConnectionResetError) as e:
                # Retry on connection errors with longer backoff
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 2  # Exponential backoff: 2s, 4s, 8s, 16s
                    logger.warning(f"Connection error (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
                    continue
                raise Exception(f"Groq API connection error after {max_retries} retries: {e}")
            except requests.exceptions.RequestException as e:
                raise Exception(f"Groq API error: {e}")
            except KeyError as e:
                raise Exception(f"Unexpected Groq response format: {e}")

        raise Exception(f"Groq API error after {max_retries} retries: {last_error}")


def setup_groq_model(
    model_name: str = "llama-4-maverick",
    temperature: float = 0.7,
) -> GroqModel:
    """
    Factory function matching setup_model() signature from agent_runner.

    Args:
        model_name: Model shorthand or full name
        temperature: Generation temperature

    Returns:
        Configured GroqModel instance
    """
    return GroqModel(
        model_name=model_name,
        temperature=temperature,
    )


# Quick test
if __name__ == "__main__":
    print("Testing Groq adapter...")
    model = GroqModel("llama-4-maverick")
    response = model.generate_content("Say 'Hello, I am Llama 4 Maverick!' in one sentence.")
    print(f"Response: {response.text}")
    print(f"Tokens: {response.usage_metadata.total_token_count}")
