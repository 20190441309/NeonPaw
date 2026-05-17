"""Root Brain — CoT-powered orchestrator with sub-module validation.

Uses a single LLM call with chain-of-thought prompting, then validates
the output against lightweight sub-agent modules. When the LLM fails,
falls back to rule-based sub-modules for a basic response.
"""

from __future__ import annotations

import json
import logging
import re

from app.agents.intent import detect_intent
from app.agents.persona import generate_reply
from app.agents.state_delta import compute_state_delta
from app.agents.memory_decision import decide_memory
from app.schemas import (
    ChatResponse,
    ConversationMessage,
    Memory,
    MemoryEntry,
    PetState,
    StateDelta,
    TraceEntry,
)
from app.services.prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

VALID_ACTIONS = {"wake", "sleep", "listen", "think", "speak", "happy", "comfort", "idle", "glitch", "error"}
VALID_EMOTIONS = {"neutral", "happy", "sad", "sleepy", "curious", "comforting", "glitch"}


def _clamp_delta(value: int) -> int:
    """Clamp a state delta value to -5..+5 range."""
    return max(-5, min(5, value))


def _clamp_state(value: int) -> int:
    """Clamp a pet state value to 0..100 range."""
    return max(0, min(100, value))


def glitch_response(error_message: str = "Unknown error") -> ChatResponse:
    """Return a glitch response when LLM fails. Preserved for backward compatibility."""
    return ChatResponse(
        reply="核心信号有点不稳定……但我还在这里。",
        emotion="glitch",
        action="glitch",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-1, mood=-1, affinity=0, hunger=0, stability=-3),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message=error_message, level="error")],
    )


def _extract_reasoning_steps(content: str) -> list[TraceEntry]:
    """Extract CoT reasoning steps as trace entries from LLM response."""
    patterns = {
        "intent": r"\[INTENT:\s*\w+\]\s*([^\[]+?)(?=\[|$)",
        "emotion": r"\[EMOTION:\s*\w+(?:,\s*强度\d+)?\]\s*([^\[]+?)(?=\[|$)",
        "action": r"\[ACTION:\s*\w+\]\s*([^\[]+?)(?=\[|$)",
        "state_delta": r"\[STATE:\s*[^\]]+\]\s*([^\[]+?)(?=\[|$)",
        "persona": r"\[REPLY:\s*[^\]]*\]\s*([^\[]+?)(?=\[|$)",
        "memory": r"\[MEMORY:\s*\w+\]\s*([^\[]+?)(?=\[|$)",
    }

    trace = []
    for module, pattern in patterns.items():
        match = re.search(pattern, content, re.DOTALL)
        if match:
            reason = match.group(1).strip()
            first_line = reason.split("\n")[0].strip()
            if first_line:
                trace.append(TraceEntry(module=module, message=first_line, level="info"))

    if not trace:
        trace.append(TraceEntry(module="root_agent", message="LLM response parsed (no reasoning steps extracted)", level="info"))

    return trace


def _extract_json(content: str) -> dict | None:
    """Extract JSON from LLM response content."""
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, content, re.DOTALL)

    for match in reversed(matches):
        try:
            data = json.loads(match)
            if "reply" in data and "emotion" in data and "action" in data:
                return data
        except json.JSONDecodeError:
            continue

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


def _validate_and_build_response(data: dict, trace: list[TraceEntry]) -> ChatResponse:
    """Validate LLM JSON output and build ChatResponse."""
    action = data.get("action", "speak")
    emotion = data.get("emotion", "neutral")

    if action not in VALID_ACTIONS:
        trace.append(TraceEntry(module="validation", message=f"action '{action}' not in whitelist, using 'glitch'", level="warning"))
        action = "glitch"
    if emotion not in VALID_EMOTIONS:
        trace.append(TraceEntry(module="validation", message=f"emotion '{emotion}' not in whitelist, using 'glitch'", level="warning"))
        emotion = "glitch"

    raw_delta = data.get("state_delta", {})
    try:
        state_delta = StateDelta(
            energy=_clamp_delta(int(raw_delta.get("energy", 0))),
            mood=_clamp_delta(int(raw_delta.get("mood", 0))),
            affinity=_clamp_delta(int(raw_delta.get("affinity", 0))),
            hunger=_clamp_delta(int(raw_delta.get("hunger", 0))),
            stability=_clamp_delta(int(raw_delta.get("stability", 0))),
        )
    except (ValueError, TypeError):
        trace.append(TraceEntry(module="validation", message="state_delta parse error, using zeros", level="warning"))
        state_delta = StateDelta()

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
            "content": f"[User Memories]\n{mem_lines}",
        })

    for msg in history[-5:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": message})
    return messages


# ---------------------------------------------------------------------------
# Sub-module validation layer
# ---------------------------------------------------------------------------

# Intent categories used by both LLM prompt and intent.py regex
_INTENT_TO_EMOTION: dict[str, str] = {
    "greeting": "happy",
    "sad": "comforting",
    "question": "curious",
    "farewell": "sad",
    "thanks": "happy",
    "complaint": "comforting",
    "request": "curious",
    "chitchat": "neutral",
    "encourage": "happy",
    "command": "neutral",
    "default": "neutral",
}

_INTENT_TO_ACTION: dict[str, str] = {
    "greeting": "wake",
    "sad": "comfort",
    "question": "think",
    "farewell": "sleep",
    "thanks": "happy",
    "complaint": "comfort",
    "request": "think",
    "chitchat": "speak",
    "encourage": "happy",
    "command": "idle",
    "default": "speak",
}


def _validate_response(
    response: ChatResponse,
    message: str,
    pet_state: PetState,
) -> ChatResponse:
    """Cross-check LLM output against sub-module analysis.

    Compares LLM's intent (from trace) with regex-based intent detection,
    validates state delta against rule-based computation, and checks
    memory decision against pattern matching.
    """
    # 1. Re-detect intent via regex
    detected_intent = detect_intent(message)

    # Find LLM's intent from trace
    llm_intent = None
    for entry in response.trace:
        if entry.module == "intent":
            for category in _INTENT_TO_EMOTION:
                if category in entry.message.lower():
                    llm_intent = category
                    break
            break

    if llm_intent and llm_intent != detected_intent:
        response.trace.append(TraceEntry(
            module="validation",
            message=f"intent mismatch: LLM={llm_intent}, regex={detected_intent}",
            level="warning",
        ))
    else:
        response.trace.append(TraceEntry(
            module="validation",
            message=f"intent verified: {detected_intent}",
            level="info",
        ))

    # 2. Validate state delta against rule-based computation
    expected_delta = compute_state_delta(response.action, response.emotion, pet_state)
    max_diff = max(
        abs(response.state_delta.energy - expected_delta.energy),
        abs(response.state_delta.mood - expected_delta.mood),
        abs(response.state_delta.affinity - expected_delta.affinity),
        abs(response.state_delta.hunger - expected_delta.hunger),
        abs(response.state_delta.stability - expected_delta.stability),
    )
    if max_diff > 3:
        response.trace.append(TraceEntry(
            module="validation",
            message=f"state_delta corrected (max_diff={max_diff})",
            level="warning",
        ))
        response.state_delta = StateDelta(
            energy=_clamp_delta(expected_delta.energy),
            mood=_clamp_delta(expected_delta.mood),
            affinity=_clamp_delta(expected_delta.affinity),
            hunger=_clamp_delta(expected_delta.hunger),
            stability=_clamp_delta(expected_delta.stability),
        )
    else:
        response.trace.append(TraceEntry(
            module="validation",
            message=f"state_delta within range (max_diff={max_diff})",
            level="info",
        ))

    # 3. Cross-check memory decision
    rule_memory = decide_memory(message, detected_intent, pet_state)
    if response.memory.should_save and not rule_memory.should_save:
        response.trace.append(TraceEntry(
            module="validation",
            message="LLM wants to save memory, but regex says no — keeping LLM decision",
            level="info",
        ))
    elif not response.memory.should_save and rule_memory.should_save:
        response.trace.append(TraceEntry(
            module="validation",
            message="regex detects storable info, but LLM says no — keeping LLM decision",
            level="info",
        ))

    return response


# ---------------------------------------------------------------------------
# Fallback response (rule-based, no LLM)
# ---------------------------------------------------------------------------

def _fallback_response(message: str, pet_state: PetState, error: str) -> ChatResponse:
    """Generate a basic response using sub-modules when LLM is unavailable."""
    intent = detect_intent(message)
    emotion = _INTENT_TO_EMOTION.get(intent, "neutral")
    action = _INTENT_TO_ACTION.get(intent, "speak")
    delta = compute_state_delta(action, emotion, pet_state)
    mem = decide_memory(message, intent, pet_state)
    reply = generate_reply(message, intent, emotion, pet_state)

    trace = [
        TraceEntry(module="fallback", message=error, level="warning"),
        TraceEntry(module="intent", message=f"regex detected: {intent}", level="info"),
        TraceEntry(module="emotion", message=f"mapped to: {emotion}", level="info"),
        TraceEntry(module="action", message=f"selected: {action}", level="info"),
    ]

    return ChatResponse(
        reply=reply,
        emotion=emotion,
        action=action,
        voice_style="soft_robotic",
        state_delta=delta,
        memory=mem,
        trace=trace,
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def generate_response(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Main entry point — single LLM call with CoT reasoning + sub-module validation."""
    from app.services.llm_provider import ProviderConfig, create_llm_client

    llm_config = ProviderConfig.from_env()

    if not llm_config.api_key:
        logger.warning("No LLM_API_KEY set, falling back to rule-based response")
        return _fallback_response(message, pet_state, "LLM_API_KEY not configured")

    client = create_llm_client(llm_config)

    messages = _build_messages(message, pet_state, history, memories)

    try:
        completion = await client.chat.completions.create(
            model=llm_config.model,
            messages=messages,
            temperature=llm_config.temperature,
            max_tokens=llm_config.max_tokens,
        )
    except Exception as e:
        logger.exception("LLM call failed")
        return _fallback_response(message, pet_state, f"LLM 调用失败: {type(e).__name__}")

    content = completion.choices[0].message.content
    if not content or not content.strip():
        logger.warning("LLM returned empty content")
        return _fallback_response(message, pet_state, "LLM 返回空内容")

    content = content.strip()
    logger.debug("LLM raw output:\n%s", content)

    # Extract reasoning steps as trace
    trace = _extract_reasoning_steps(content)

    # Extract JSON from response
    data = _extract_json(content)
    if data is None:
        logger.warning("Failed to extract JSON from LLM response: %s", content[:200])
        return _fallback_response(message, pet_state, "LLM 返回无效 JSON")

    response = _validate_and_build_response(data, trace)

    # Sub-module validation layer
    response = _validate_response(response, message, pet_state)

    return response
