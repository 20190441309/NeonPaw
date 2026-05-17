"""Tests for RootBrain CoT orchestration, glitch behavior, and response contract."""

from __future__ import annotations

import os
import pytest

from app.schemas import PetState, ChatResponse, StateDelta, Memory, TraceEntry
from app.agents.root_brain import (
    generate_response,
    glitch_response,
    _extract_reasoning_steps,
    _extract_json,
    _validate_and_build_response,
    _clamp_delta,
)


# -- Fixtures ----------------------------------------------------------------

@pytest.fixture
def pet_state() -> PetState:
    return PetState()


@pytest.fixture(autouse=True)
def _force_no_api_key(monkeypatch):
    """Ensure LLM_API_KEY is empty so tests hit the glitch path (no mock)."""
    monkeypatch.setenv("LLM_API_KEY", "")


# -- Glitch Response ---------------------------------------------------------

class TestGlitchResponse:

    def test_glitch_has_all_fields(self):
        resp = glitch_response("test error")
        assert isinstance(resp, ChatResponse)
        assert resp.reply
        assert resp.emotion == "glitch"
        assert resp.action == "glitch"
        assert resp.voice_style == "soft_robotic"
        assert isinstance(resp.state_delta, StateDelta)
        assert isinstance(resp.memory, Memory)
        assert isinstance(resp.trace, list)
        assert len(resp.trace) > 0

    def test_glitch_trace_module(self):
        resp = glitch_response("test error")
        assert resp.trace[0].module == "root_agent"

    def test_glitch_default_message(self):
        resp = glitch_response()
        assert "Unknown error" in resp.trace[0].message


# -- Response Contract Validation --------------------------------------------

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


# -- No API Key Returns Glitch -----------------------------------------------

class TestNoApiKey:

    @pytest.mark.asyncio
    async def test_no_key_returns_glitch(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        _assert_valid_response(resp)
        assert resp.emotion == "glitch"
        assert resp.action == "glitch"
        assert "LLM_API_KEY" in resp.trace[0].message


# -- Clamp Delta -------------------------------------------------------------

class TestClampDelta:

    def test_positive_clamped_to_5(self):
        assert _clamp_delta(10) == 5
        assert _clamp_delta(100) == 5

    def test_negative_clamped_to_neg5(self):
        assert _clamp_delta(-10) == -5
        assert _clamp_delta(-100) == -5

    def test_within_range_unchanged(self):
        assert _clamp_delta(0) == 0
        assert _clamp_delta(3) == 3
        assert _clamp_delta(-3) == -3
        assert _clamp_delta(5) == 5
        assert _clamp_delta(-5) == -5


# -- CoT Reasoning Extraction ------------------------------------------------

class TestExtractReasoningSteps:

    def test_extracts_intent(self):
        content = "[INTENT: greeting] 用户在打招呼\n[EMOTION: happy, 强度3] 用户心情不错"
        trace = _extract_reasoning_steps(content)
        modules = [t.module for t in trace]
        assert "intent" in modules
        assert "emotion" in modules

    def test_extracts_all_steps(self):
        content = (
            "[INTENT: greeting] 打招呼\n"
            "[EMOTION: happy, 强度3] 开心\n"
            "[ACTION: wake] 唤醒\n"
            "[STATE: energy=-1, mood=5, affinity=3, hunger=0, stability=0] 状态\n"
            "[REPLY: 你好呀~] 回复\n"
            "[MEMORY: no] 不保存"
        )
        trace = _extract_reasoning_steps(content)
        modules = [t.module for t in trace]
        assert "intent" in modules
        assert "emotion" in modules
        assert "action" in modules
        assert "state_delta" in modules
        assert "persona" in modules
        assert "memory" in modules

    def test_no_steps_returns_minimal_trace(self):
        content = '{"reply": "hi", "emotion": "happy", "action": "speak"}'
        trace = _extract_reasoning_steps(content)
        assert len(trace) == 1
        assert trace[0].module == "root_agent"


# -- JSON Extraction ---------------------------------------------------------

class TestExtractJson:

    def test_extracts_simple_json(self):
        content = '{"reply": "hi", "emotion": "happy", "action": "speak"}'
        data = _extract_json(content)
        assert data is not None
        assert data["reply"] == "hi"

    def test_extracts_json_after_reasoning(self):
        content = (
            "[INTENT: greeting] 打招呼\n"
            "[EMOTION: happy, 强度3] 开心\n"
            '\n{"reply": "你好~", "emotion": "happy", "action": "wake", '
            '"voice_style": "soft_robotic", '
            '"state_delta": {"energy": -1, "mood": 5, "affinity": 3, "hunger": 0, "stability": 0}, '
            '"memory": {"should_save": false, "content": ""}}'
        )
        data = _extract_json(content)
        assert data is not None
        assert data["reply"] == "你好~"
        assert data["action"] == "wake"

    def test_returns_none_for_no_json(self):
        data = _extract_json("this is not json at all")
        assert data is None


# -- Validate and Build Response ---------------------------------------------

class TestValidateAndBuildResponse:

    def test_valid_data_builds_response(self):
        data = {
            "reply": "hello",
            "emotion": "happy",
            "action": "speak",
            "voice_style": "soft_robotic",
            "state_delta": {"energy": -1, "mood": 2, "affinity": 1, "hunger": 0, "stability": 0},
            "memory": {"should_save": False, "content": ""},
        }
        trace = [TraceEntry(module="test", message="test")]
        resp = _validate_and_build_response(data, trace)
        _assert_valid_response(resp)
        assert resp.reply == "hello"

    def test_invalid_action_becomes_glitch(self):
        data = {
            "reply": "hi",
            "emotion": "happy",
            "action": "dance",
            "voice_style": "soft_robotic",
            "state_delta": {},
            "memory": {},
        }
        trace = []
        resp = _validate_and_build_response(data, trace)
        assert resp.action == "glitch"

    def test_invalid_emotion_becomes_glitch(self):
        data = {
            "reply": "hi",
            "emotion": "excited",
            "action": "speak",
            "voice_style": "soft_robotic",
            "state_delta": {},
            "memory": {},
        }
        trace = []
        resp = _validate_and_build_response(data, trace)
        assert resp.emotion == "glitch"


# -- LLM Integration (optional) ---------------------------------------------

class TestLLMIntegration:
    """These tests only run when LLM_API_KEY is set in the environment."""

    @pytest.fixture(autouse=True)
    def _require_api_key(self, monkeypatch):
        api_key = os.getenv("LLM_API_KEY", "")
        if not api_key:
            pytest.skip("LLM_API_KEY not set -- skipping LLM integration tests")
        # Remove the no-key override so real LLM path is used
        monkeypatch.delenv("LLM_API_KEY", raising=False)
        monkeypatch.setenv("LLM_API_KEY", api_key)

    @pytest.mark.asyncio
    async def test_llm_returns_valid_contract(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        _assert_valid_response(resp)

    @pytest.mark.asyncio
    async def test_llm_response_not_empty(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        assert len(resp.reply) > 0
        assert resp.reply != "..."

    @pytest.mark.asyncio
    async def test_llm_trace_has_reasoning(self, pet_state: PetState):
        resp = await generate_response("你好", pet_state, [], None)
        assert len(resp.trace) > 0
        assert all(isinstance(e, TraceEntry) for e in resp.trace)
