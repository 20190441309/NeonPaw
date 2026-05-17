"""LLM Provider adapter layer.

Provides a unified interface for calling different LLM providers
(DeepSeek, Gemini, Kimi, GLM, Qwen, OpenAI, etc.) through a single
factory function. Most providers use OpenAI-compatible APIs, so the
adapter mainly handles provider-specific configuration.

Usage:
    from app.services.llm_provider import create_llm_client, ProviderConfig

    config = ProviderConfig.from_env()
    client = create_llm_client(config)
    completion = await client.chat.completions.create(...)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Provider presets
# ---------------------------------------------------------------------------

@dataclass
class ProviderPreset:
    name: str
    base_url: str
    default_model: str
    description: str = ""


PROVIDER_PRESETS: dict[str, ProviderPreset] = {
    "deepseek": ProviderPreset(
        name="deepseek",
        base_url="https://api.deepseek.com",
        default_model="deepseek-chat",
        description="DeepSeek V3 / R1",
    ),
    "gemini": ProviderPreset(
        name="gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        default_model="gemini-2.0-flash",
        description="Google Gemini (OpenAI-compatible endpoint)",
    ),
    "kimi": ProviderPreset(
        name="kimi",
        base_url="https://api.moonshot.cn/v1",
        default_model="moonshot-v1-8k",
        description="Moonshot Kimi",
    ),
    "glm": ProviderPreset(
        name="glm",
        base_url="https://open.bigmodel.cn/api/paas/v4",
        default_model="glm-4-flash",
        description="Zhipu GLM-4",
    ),
    "qwen": ProviderPreset(
        name="qwen",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        default_model="qwen-turbo",
        description="Alibaba Qwen",
    ),
    "openai": ProviderPreset(
        name="openai",
        base_url="https://api.openai.com/v1",
        default_model="gpt-4o-mini",
        description="OpenAI GPT",
    ),
}


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass
class ProviderConfig:
    provider: str = "deepseek"
    api_key: str = ""
    model: str = ""
    base_url: str = ""
    timeout: int = 30
    temperature: float = 0.7
    max_tokens: int = 1024

    @classmethod
    def from_env(cls) -> ProviderConfig:
        """Build config from environment variables (via app.config)."""
        from app import config

        provider = config.LLM_PROVIDER.lower().strip()
        preset = PROVIDER_PRESETS.get(provider)

        return cls(
            provider=provider,
            api_key=config.LLM_API_KEY,
            model=config.LLM_MODEL or (preset.default_model if preset else ""),
            base_url=config.LLM_BASE_URL or (preset.base_url if preset else ""),
            timeout=config.LLM_TIMEOUT,
        )

    def describe(self) -> str:
        preset = PROVIDER_PRESETS.get(self.provider)
        label = preset.description if preset else self.provider
        model = self.model or "(not set)"
        return f"{label} / {model}"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def create_llm_client(config: ProviderConfig | None = None) -> AsyncOpenAI:
    """Create an AsyncOpenAI client configured for the target provider.

    All supported providers expose an OpenAI-compatible chat completions API,
    so a single AsyncOpenAI client works for all of them. The only differences
    are base_url, model name, and API key format.
    """
    if config is None:
        config = ProviderConfig.from_env()

    logger.info(
        "Creating LLM client: provider=%s, model=%s, base_url=%s",
        config.provider,
        config.model,
        config.base_url,
    )

    return AsyncOpenAI(
        api_key=config.api_key,
        base_url=config.base_url,
        timeout=config.timeout,
    )


def list_providers() -> list[dict]:
    """Return available provider presets (for settings UI / health check)."""
    return [
        {
            "name": p.name,
            "base_url": p.base_url,
            "default_model": p.default_model,
            "description": p.description,
        }
        for p in PROVIDER_PRESETS.values()
    ]
