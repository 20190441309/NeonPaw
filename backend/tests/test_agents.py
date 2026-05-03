"""Tests for individual agent modules: intent, emotion, action, state_delta, memory_decision, persona."""

from __future__ import annotations

import pytest

from app.schemas import PetState, StateDelta, Memory
from app.agents.intent import detect_intent
from app.agents.emotion import detect_emotion
from app.agents.action import select_action
from app.agents.state_delta import compute_state_delta
from app.agents.memory_decision import decide_memory
from app.agents.persona import generate_reply


# ── Fixtures ──────────────────────────────────────────────

@pytest.fixture
def pet_state() -> PetState:
    return PetState()


# ── Intent Agent ──────────────────────────────────────────

class TestIntentAgent:

    def test_greeting_chinese(self):
        assert detect_intent("你好") == "greeting"

    def test_greeting_english(self):
        assert detect_intent("hello") == "greeting"

    def test_greeting_variants(self):
        for msg in ["嗨", "醒醒", "在吗", "早上好", "晚上好", "hi", "喂"]:
            assert detect_intent(msg) == "greeting", f"Expected greeting for: {msg}"

    def test_sad_chinese(self):
        assert detect_intent("我今天好累") == "sad"

    def test_sad_english(self):
        assert detect_intent("I feel tired") == "sad"

    def test_sad_variants(self):
        for msg in ["难过", "伤心", "不开心", "压力大", "好烦", "焦虑", "upset", "stressed"]:
            assert detect_intent(msg) == "sad", f"Expected sad for: {msg}"

    def test_question_chinese(self):
        assert detect_intent("你在干什么？") == "question"

    def test_question_english(self):
        assert detect_intent("what is that?") == "question"

    def test_question_variants(self):
        for msg in ["为什么", "怎么了", "可以吗", "能不能", "how", "why"]:
            assert detect_intent(msg) == "question", f"Expected question for: {msg}"

    def test_default(self):
        assert detect_intent("随便聊聊") == "default"

    def test_sad_takes_priority_over_greeting(self):
        # "累" matches sad before greeting patterns
        assert detect_intent("你好累") == "sad"


# ── Emotion Agent ─────────────────────────────────────────

class TestEmotionAgent:

    def test_greeting_maps_to_happy(self, pet_state: PetState):
        assert detect_emotion("你好", "greeting", pet_state) == "happy"

    def test_sad_maps_to_comforting(self, pet_state: PetState):
        assert detect_emotion("好累", "sad", pet_state) == "comforting"

    def test_question_maps_to_curious(self, pet_state: PetState):
        assert detect_emotion("什么", "question", pet_state) == "curious"

    def test_default_maps_to_neutral(self, pet_state: PetState):
        assert detect_emotion("随便", "default", pet_state) == "neutral"

    def test_unknown_intent_maps_to_neutral(self, pet_state: PetState):
        assert detect_emotion("test", "unknown_intent", pet_state) == "neutral"


# ── Action Agent ──────────────────────────────────────────

class TestActionAgent:

    def test_greeting_maps_to_wake(self, pet_state: PetState):
        assert select_action("你好", "greeting", "happy", pet_state) == "wake"

    def test_sad_maps_to_comfort(self, pet_state: PetState):
        assert select_action("好累", "sad", "comforting", pet_state) == "comfort"

    def test_question_maps_to_think(self, pet_state: PetState):
        assert select_action("什么", "question", "curious", pet_state) == "think"

    def test_default_maps_to_speak(self, pet_state: PetState):
        assert select_action("随便", "default", "neutral", pet_state) == "speak"

    def test_unknown_intent_maps_to_speak(self, pet_state: PetState):
        assert select_action("test", "unknown", "neutral", pet_state) == "speak"


# ── State Delta Agent ─────────────────────────────────────

class TestStateDeltaAgent:

    def test_wake_delta(self, pet_state: PetState):
        delta = compute_state_delta("wake", "happy", pet_state)
        assert isinstance(delta, StateDelta)
        assert delta.energy == -1
        assert delta.mood == 5
        assert delta.affinity == 3

    def test_comfort_delta(self, pet_state: PetState):
        delta = compute_state_delta("comfort", "comforting", pet_state)
        assert delta.energy == -2
        assert delta.mood == 5
        assert delta.affinity == 3

    def test_think_delta(self, pet_state: PetState):
        delta = compute_state_delta("think", "curious", pet_state)
        assert delta.energy == -2
        assert delta.mood == 2

    def test_glitch_delta(self, pet_state: PetState):
        delta = compute_state_delta("glitch", "glitch", pet_state)
        assert delta.stability == -3

    def test_sleep_restores_energy(self, pet_state: PetState):
        delta = compute_state_delta("sleep", "sleepy", pet_state)
        assert delta.energy == 5

    def test_idle_no_change(self, pet_state: PetState):
        delta = compute_state_delta("idle", "neutral", pet_state)
        assert delta.energy == 0
        assert delta.mood == 0
        assert delta.affinity == 0

    def test_unknown_action_gets_default(self, pet_state: PetState):
        delta = compute_state_delta("nonexistent", "neutral", pet_state)
        assert isinstance(delta, StateDelta)

    def test_all_actions_covered(self, pet_state: PetState):
        actions = ["wake", "comfort", "think", "speak", "happy", "listen", "idle", "sleep", "glitch", "error"]
        for action in actions:
            delta = compute_state_delta(action, "neutral", pet_state)
            assert isinstance(delta, StateDelta), f"Failed for action: {action}"


# ── Memory Decision Agent ─────────────────────────────────

class TestMemoryDecisionAgent:

    def test_name_triggers_save(self, pet_state: PetState):
        memory = decide_memory("我叫小野", "default", pet_state)
        assert memory.should_save is True
        assert "小野" in memory.content

    def test_preference_triggers_save(self, pet_state: PetState):
        memory = decide_memory("我喜欢猫", "default", pet_state)
        assert memory.should_save is True

    def test_goal_triggers_save(self, pet_state: PetState):
        memory = decide_memory("我的目标是成为程序员", "default", pet_state)
        assert memory.should_save is True

    def test_habit_triggers_save(self, pet_state: PetState):
        memory = decide_memory("我每天跑步", "default", pet_state)
        assert memory.should_save is True

    def test_english_name_triggers_save(self, pet_state: PetState):
        memory = decide_memory("my name is Alex", "default", pet_state)
        assert memory.should_save is True

    def test_english_preference_triggers_save(self, pet_state: PetState):
        memory = decide_memory("I like pizza", "default", pet_state)
        assert memory.should_save is True

    def test_temporary_emotion_no_save(self, pet_state: PetState):
        memory = decide_memory("我今天好累", "sad", pet_state)
        assert memory.should_save is False

    def test_greeting_no_save(self, pet_state: PetState):
        memory = decide_memory("你好", "greeting", pet_state)
        assert memory.should_save is False

    def test_random_chat_no_save(self, pet_state: PetState):
        memory = decide_memory("今天天气不错", "default", pet_state)
        assert memory.should_save is False

    def test_memory_content_truncated(self, pet_state: PetState):
        long_msg = "我叫" + "x" * 300
        memory = decide_memory(long_msg, "default", pet_state)
        assert memory.should_save is True
        assert len(memory.content) <= 200


# ── Persona Agent ─────────────────────────────────────────

class TestPersonaAgent:

    def test_greeting_reply(self, pet_state: PetState):
        reply = generate_reply("你好", "greeting", "happy", pet_state)
        assert "NEON PAW" in reply

    def test_sad_reply(self, pet_state: PetState):
        reply = generate_reply("好累", "sad", "comforting", pet_state)
        assert "在呢" in reply

    def test_question_reply(self, pet_state: PetState):
        reply = generate_reply("什么", "question", "curious", pet_state)
        assert "想" in reply

    def test_default_reply(self, pet_state: PetState):
        reply = generate_reply("随便", "default", "neutral", pet_state)
        assert "信号" in reply

    def test_unknown_intent_returns_default(self, pet_state: PetState):
        reply = generate_reply("test", "unknown", "neutral", pet_state)
        assert reply == "收到你的信号了。"
