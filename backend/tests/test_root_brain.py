"""Tests for RootBrain orchestration, fallback behavior, and response contract."""

from __future__ import annotations

import os
import pytest

from app.schemas import PetState, ChatResponse, StateDelta, Memory, TraceEntry
from app.agents.root_brain import generate_response, fallback_response


# ── Fixtures ──────────────────────────────────────────────

@pytest.fixture
def pet_state() -> PetState:
    return PetState()


@pytest.fixture(autouse=True)
def _force_mock_mode(monkeypatch):
    """Ensure LLM_API_KEY is empty so all tests use the mock pipeline."""
    monkeypatch.setenv("LLM_API_KEY", "")


# ── Fallback Response ─────────────────────────────────────

class TestFallbackResponse:

    def test_fallback_has_all_fields(self):
        resp = fallback_response()
        assert isinstance(resp, ChatResponse)
        assert resp.reply
        assert resp.emotion == "glitch"
        assert resp.action == "glitch"
        assert resp.voice_style == "soft_robotic"
        assert isinstance(resp.state_delta, StateDelta)
        assert isinstance(resp.memory, Memory)
        assert isinstance(resp.trace, list)
        assert len(resp.trace) > 0

    def test_fallback_trace_module(self):
        resp = fallback_response()
        assert resp.trace[0].module == "fallback"


# ── Response Contract Validation ──────────────────────────

def _assert_valid_response(resp: ChatResponse):
    """Validate that a ChatResponse matches the expected contract."""
    assert isinstance(resp, ChatResponse)
    assert isinstance(resp.reply, str) and len(resp.reply) > 0
    assert resp.emotion in {"neutral", "happy", "sad", "sleepy", "curious", "comforting", "glitch"}
    assert resp.action in {"wake", "sleep", "listen", "think", "speak", "happy", "comfort", "idle", "glitch", "error"}
    assert resp.voice_style == "soft_robotic"
    assert isinstance(resp.state_delta, StateDelta)
    assert isinstance(resp.memory, Memory)
    assert isinstance(resp.trace, list)
    assert len(resp.trace) > 0
    for entry in resp.trace:
        assert isinstance(entry, TraceEntry)
        assert isinstance(entry.module, str)
        assert isinstance(entry.message, str)


# ── Mock Pipeline Orchestration ───────────────────────────

class TestMockOrchestration:

    @pytest.mark.asyncio
    async def test_greeting_response(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        _assert_valid_response(resp)
        assert resp.action == "wake"
        assert resp.emotion == "happy"

    @pytest.mark.asyncio
    async def test_sad_response(self, pet_state: PetState):
        resp = await generate_response("我今天好累", pet_state, [], None)
        _assert_valid_response(resp)
        assert resp.action == "comfort"
        assert resp.emotion == "comforting"

    @pytest.mark.asyncio
    async def test_question_response(self, pet_state: PetState):
        resp = await generate_response("你在干什么？", pet_state, [], None)
        _assert_valid_response(resp)
        assert resp.action == "think"
        assert resp.emotion == "curious"

    @pytest.mark.asyncio
    async def test_default_response(self, pet_state: PetState):
        resp = await generate_response("随便聊聊", pet_state, [], None)
        _assert_valid_response(resp)
        assert resp.action == "speak"
        assert resp.emotion == "neutral"


# ── Agent Trace ───────────────────────────────────────────

class TestAgentTrace:

    @pytest.mark.asyncio
    async def test_trace_has_five_modules(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        modules = [t.module for t in resp.trace]
        assert modules == ["intent_agent", "emotion_agent", "action_agent", "memory_agent", "root_agent"]

    @pytest.mark.asyncio
    async def test_trace_indicates_mock_pipeline(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        assert resp.trace[-1].message == "response assembled via mock pipeline"

    @pytest.mark.asyncio
    async def test_trace_greeting_intent(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        assert "greeting" in resp.trace[0].message

    @pytest.mark.asyncio
    async def test_trace_sad_intent(self, pet_state: PetState):
        resp = await generate_response("好累", pet_state, [], None)
        assert "sadness" in resp.trace[0].message or "sad" in resp.trace[0].message.lower()


# ── Memory Integration ────────────────────────────────────

class TestMemoryIntegration:

    @pytest.mark.asyncio
    async def test_name_saved_as_memory(self, pet_state: PetState):
        resp = await generate_response("我叫小野", pet_state, [], None)
        assert resp.memory.should_save is True
        assert "小野" in resp.memory.content

    @pytest.mark.asyncio
    async def test_temporary_emotion_not_saved(self, pet_state: PetState):
        resp = await generate_response("我今天好累", pet_state, [], None)
        assert resp.memory.should_save is False

    @pytest.mark.asyncio
    async def test_greeting_not_saved(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        assert resp.memory.should_save is False


# ── State Delta Integration ───────────────────────────────

class TestStateDeltaIntegration:

    @pytest.mark.asyncio
    async def test_greeting_state_delta(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        # wake action: energy -1, mood 5, affinity 3
        assert resp.state_delta.energy == -1
        assert resp.state_delta.mood == 5
        assert resp.state_delta.affinity == 3

    @pytest.mark.asyncio
    async def test_comfort_state_delta(self, pet_state: PetState):
        resp = await generate_response("好累", pet_state, [], None)
        # comfort action: energy -2, mood 5, affinity 3
        assert resp.state_delta.energy == -2
        assert resp.state_delta.mood == 5


# ── DeepSeek Integration (optional) ──────────────────────

class TestDeepSeekIntegration:
    """These tests only run when LLM_API_KEY is set in the environment."""

    @pytest.fixture(autouse=True)
    def _require_api_key(self, monkeypatch):
        api_key = os.getenv("LLM_API_KEY", "")
        if not api_key:
            pytest.skip("LLM_API_KEY not set — skipping DeepSeek integration tests")
        # Remove the mock-mode override so real LLM path is used
        monkeypatch.delenv("LLM_API_KEY", raising=False)
        monkeypatch.setenv("LLM_API_KEY", api_key)

    @pytest.mark.asyncio
    async def test_deepseek_returns_valid_contract(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        _assert_valid_response(resp)

    @pytest.mark.asyncio
    async def test_deepseek_trace_shows_llm(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        assert resp.trace[-1].message == "response assembled via LLM"

    @pytest.mark.asyncio
    async def test_deepseek_response_not_empty(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        assert len(resp.reply) > 0
        assert resp.reply != "..."
