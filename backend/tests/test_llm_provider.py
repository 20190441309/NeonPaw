"""Tests for LLM provider adapter layer."""

from __future__ import annotations

import pytest

from app.services.llm_provider import (
    ProviderConfig,
    ProviderPreset,
    PROVIDER_PRESETS,
    create_llm_client,
    list_providers,
)


class TestProviderPresets:

    def test_all_presets_have_required_fields(self):
        for name, preset in PROVIDER_PRESETS.items():
            assert isinstance(preset, ProviderPreset)
            assert preset.name == name
            assert preset.base_url.startswith("http")
            assert preset.default_model
            assert preset.description

    def test_known_providers(self):
        expected = {"deepseek", "gemini", "kimi", "glm", "qwen", "openai"}
        assert set(PROVIDER_PRESETS.keys()) == expected


class TestProviderConfig:

    def test_config_defaults(self):
        config = ProviderConfig()
        assert config.provider == "deepseek"
        assert config.api_key == ""
        assert config.model == ""
        assert config.base_url == ""
        assert config.timeout == 30
        assert config.temperature == 0.7
        assert config.max_tokens == 1024

    def test_config_from_env_with_key(self, monkeypatch):
        monkeypatch.setenv("LLM_PROVIDER", "kimi")
        monkeypatch.setenv("LLM_API_KEY", "test-key-123")
        monkeypatch.setenv("LLM_MODEL", "")
        monkeypatch.setenv("LLM_BASE_URL", "")
        monkeypatch.setenv("LLM_TIMEOUT", "15")

        import importlib
        import app.config
        importlib.reload(app.config)

        config = ProviderConfig.from_env()
        assert config.provider == "kimi"
        assert config.api_key == "test-key-123"
        assert config.model == "moonshot-v1-8k"  # from preset
        assert "moonshot" in config.base_url  # from preset
        assert config.timeout == 15

    def test_config_override_model(self, monkeypatch):
        monkeypatch.setenv("LLM_PROVIDER", "deepseek")
        monkeypatch.setenv("LLM_API_KEY", "test-key")
        monkeypatch.setenv("LLM_MODEL", "deepseek-r1")
        monkeypatch.setenv("LLM_BASE_URL", "")
        monkeypatch.setenv("LLM_TIMEOUT", "30")

        import importlib
        import app.config
        importlib.reload(app.config)

        config = ProviderConfig.from_env()
        assert config.model == "deepseek-r1"  # explicit override

    def test_config_override_base_url(self, monkeypatch):
        monkeypatch.setenv("LLM_PROVIDER", "deepseek")
        monkeypatch.setenv("LLM_API_KEY", "test-key")
        monkeypatch.setenv("LLM_MODEL", "")
        monkeypatch.setenv("LLM_BASE_URL", "https://custom.api.com/v1")
        monkeypatch.setenv("LLM_TIMEOUT", "30")

        import importlib
        import app.config
        importlib.reload(app.config)

        config = ProviderConfig.from_env()
        assert config.base_url == "https://custom.api.com/v1"

    def test_describe(self):
        config = ProviderConfig(provider="deepseek", api_key="x", model="deepseek-chat")
        desc = config.describe()
        assert "DeepSeek" in desc
        assert "deepseek-chat" in desc

    def test_unknown_provider_uses_defaults(self, monkeypatch):
        monkeypatch.setenv("LLM_PROVIDER", "unknown_provider")
        monkeypatch.setenv("LLM_API_KEY", "test-key")
        monkeypatch.setenv("LLM_MODEL", "my-model")
        monkeypatch.setenv("LLM_BASE_URL", "https://my.api.com")
        monkeypatch.setenv("LLM_TIMEOUT", "30")

        import importlib
        import app.config
        importlib.reload(app.config)

        config = ProviderConfig.from_env()
        assert config.provider == "unknown_provider"
        assert config.model == "my-model"
        assert config.base_url == "https://my.api.com"


class TestCreateClient:

    def test_creates_async_client(self):
        config = ProviderConfig(provider="deepseek", api_key="test-key", model="test-model", base_url="https://api.test.com/v1")
        client = create_llm_client(config)
        assert client is not None
        assert "api.test.com" in str(client.base_url)


class TestListProviders:

    def test_returns_all_providers(self):
        providers = list_providers()
        assert len(providers) == len(PROVIDER_PRESETS)
        names = [p["name"] for p in providers]
        assert "deepseek" in names
        assert "gemini" in names
        assert "openai" in names
