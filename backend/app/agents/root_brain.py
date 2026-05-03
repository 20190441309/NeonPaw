"""Root Brain — orchestrates all agent modules to produce a ChatResponse.

Two paths:
  - Mock path (no LLM_API_KEY): runs all modules with rule-based logic.
  - LLM path: calls DeepSeek, generates trace entries from the response.
"""

from __future__ import annotations

import json
import logging
import re

from openai import AsyncOpenAI

from app.schemas import (
    ChatResponse,
    ConversationMessage,
    Memory,
    MemoryEntry,
    PetState,
    StateDelta,
    TraceEntry,
)
from app.agents.intent import detect_intent
from app.agents.emotion import detect_emotion
from app.agents.action import select_action
from app.agents.state_delta import compute_state_delta
from app.agents.memory_decision import decide_memory
from app.agents.persona import generate_reply
from app.services.prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

VALID_ACTIONS = {"wake", "sleep", "listen", "think", "speak", "happy", "comfort", "idle", "glitch", "error"}
VALID_EMOTIONS = {"neutral", "happy", "sad", "sleepy", "curious", "comforting", "glitch"}


def _clamp(value: int, lo: int = -10, hi: int = 10) -> int:
    return max(lo, min(hi, value))


def fallback_response() -> ChatResponse:
    return ChatResponse(
        reply="核心信号有点不稳定……但我还在这里。",
        emotion="glitch",
        action="glitch",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-1, mood=-1, stability=-3),
        memory=Memory(),
        trace=[TraceEntry(module="fallback", message="LLM failed or returned invalid JSON.")],
    )


def _validate_llm_response(data: dict, trace: list[TraceEntry]) -> ChatResponse:
    """Parse and validate raw LLM JSON into a ChatResponse."""
    action = data.get("action", "speak")
    emotion = data.get("emotion", "neutral")
    if action not in VALID_ACTIONS:
        action = "speak"
    if emotion not in VALID_EMOTIONS:
        emotion = "neutral"

    raw_delta = data.get("state_delta", {})
    state_delta = StateDelta(
        energy=_clamp(int(raw_delta.get("energy", 0))),
        mood=_clamp(int(raw_delta.get("mood", 0))),
        affinity=_clamp(int(raw_delta.get("affinity", 0))),
        hunger=_clamp(int(raw_delta.get("hunger", 0))),
        stability=_clamp(int(raw_delta.get("stability", 0))),
    )

    raw_memory = data.get("memory", {})
    memory = Memory(
        should_save=bool(raw_memory.get("should_save", False)),
        content=str(raw_memory.get("content", "")),
    )

    return ChatResponse(
        reply=str(data.get("reply", "...")),
        emotion=emotion,
        action=action,
        voice_style=str(data.get("voice_style", "soft_robotic")),
        state_delta=state_delta,
        memory=memory,
        trace=trace,
    )


def _build_messages(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> list[dict[str, str]]:
    """Build the messages array for the LLM API call."""
    state_context = (
        f"[Pet State] mode={pet_state.mode}, emotion={pet_state.emotion}, "
        f"energy={pet_state.energy}, mood={pet_state.mood}, "
        f"affinity={pet_state.affinity}, hunger={pet_state.hunger}, "
        f"stability={pet_state.stability}"
    )

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": state_context},
    ]

    if memories:
        mem_lines = "\n".join(f"- {m.content}" for m in memories)
        messages.append({
            "role": "system",
            "content": f"[User Memories]\n你记得关于用户的以下信息，在回复中自然地引用：\n{mem_lines}",
        })

    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": message})
    return messages


def _infer_llm_trace(data: dict, message: str) -> list[TraceEntry]:
    """Generate module-style trace entries from an LLM response."""
    intent = detect_intent(message)
    emotion = data.get("emotion", "neutral")
    action = data.get("action", "speak")
    memory = data.get("memory", {})

    intent_labels = {
        "greeting": "detected greeting",
        "sad": "detected sadness/distress",
        "question": "detected question",
        "default": "general conversation",
    }
    emotion_labels = {
        "happy": "user mood positive",
        "sad": "user mood low",
        "comforting": "user needs comfort",
        "curious": "user is curious",
        "neutral": "user mood neutral",
        "sleepy": "pet sleepy",
        "glitch": "instability detected",
    }

    return [
        TraceEntry(module="intent_agent", message=f"{intent_labels.get(intent, intent)}"),
        TraceEntry(module="emotion_agent", message=f"{emotion_labels.get(emotion, emotion)}"),
        TraceEntry(module="action_agent", message=f"selected {action}"),
        TraceEntry(module="memory_agent", message="memory saved" if memory.get("should_save") else "no stable memory"),
        TraceEntry(module="root_agent", message="response assembled via LLM"),
    ]


async def _call_llm(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Call DeepSeek-compatible API and return validated ChatResponse."""
    from app import config

    client = AsyncOpenAI(
        api_key=config.LLM_API_KEY,
        base_url=config.LLM_BASE_URL,
        timeout=config.LLM_TIMEOUT,
    )

    messages = _build_messages(message, pet_state, history, memories)

    completion = await client.chat.completions.create(
        model=config.LLM_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=512,
        response_format={"type": "json_object"},
    )

    content = completion.choices[0].message.content
    if not content:
        raise ValueError("LLM returned empty content")

    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    data = json.loads(content)
    trace = _infer_llm_trace(data, message)
    return _validate_llm_response(data, trace)


def _mock_response(
    message: str,
    pet_state: PetState,
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Generate a response using the modular agent pipeline (no LLM)."""
    # Step 1: Intent
    intent = detect_intent(message)

    # Step 2: Emotion
    emotion = detect_emotion(message, intent, pet_state)

    # Step 3: Action
    action = select_action(message, intent, emotion, pet_state)

    # Step 4: State delta
    state_delta = compute_state_delta(action, emotion, pet_state)

    # Step 5: Memory decision
    memory = decide_memory(message, intent, pet_state)

    # Step 6: Reply
    reply = generate_reply(message, intent, emotion, pet_state)

    # Build trace
    intent_labels = {
        "greeting": "detected greeting",
        "sad": "detected sadness/distress",
        "question": "detected question",
        "default": "general conversation",
    }
    trace = [
        TraceEntry(module="intent_agent", message=f"{intent_labels.get(intent, intent)}"),
        TraceEntry(module="emotion_agent", message=f"user mood {emotion}"),
        TraceEntry(module="action_agent", message=f"selected {action}"),
        TraceEntry(module="memory_agent", message="memory saved" if memory.should_save else "no stable memory"),
        TraceEntry(module="root_agent", message="response assembled via mock pipeline"),
    ]

    return ChatResponse(
        reply=reply,
        emotion=emotion,
        action=action,
        voice_style="soft_robotic",
        state_delta=state_delta,
        memory=memory,
        trace=trace,
    )


async def generate_response(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Main entry point — returns a ChatResponse via mock or LLM path."""
    from app import config

    if not config.LLM_API_KEY:
        logger.info("No LLM_API_KEY set, using mock pipeline")
        return _mock_response(message, pet_state, memories)

    try:
        return await _call_llm(message, pet_state, history, memories)
    except Exception:
        logger.exception("LLM call failed, falling back to fallback response")
        return fallback_response()
