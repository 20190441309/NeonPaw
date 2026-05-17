"""Root Brain — CoT-powered multi-agent orchestrator.

Uses a single LLM call with chain-of-thought prompting to produce
intelligent per-agent decisions. Each reasoning step becomes a trace entry.

No mock fallback — LLM failure returns a glitch response.
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
    """Return a glitch response when LLM fails."""
    return ChatResponse(
        reply="核心信号有点不稳定……但我还在这里。",
        emotion="glitch",
        action="glitch",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-1, mood=-1, affinity=0, hunger=0, stability=-3),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message=error_message)],
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
            # Take first line only for trace conciseness
            first_line = reason.split("\n")[0].strip()
            if first_line:
                trace.append(TraceEntry(module=module, message=first_line))

    # If no reasoning steps found, return a minimal trace
    if not trace:
        trace.append(TraceEntry(module="root_agent", message="LLM response parsed (no reasoning steps extracted)"))

    return trace


def _extract_json(content: str) -> dict | None:
    """Extract JSON from LLM response content."""
    # Try to find JSON after all reasoning steps
    # Look for the last JSON object in the content
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, content, re.DOTALL)

    for match in reversed(matches):
        try:
            data = json.loads(match)
            # Verify it has the required fields
            if "reply" in data and "emotion" in data and "action" in data:
                return data
        except json.JSONDecodeError:
            continue

    # If no nested JSON found, try the entire content as JSON
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


def _validate_and_build_response(data: dict, trace: list[TraceEntry]) -> ChatResponse:
    """Validate LLM JSON output and build ChatResponse."""
    action = data.get("action", "speak")
    emotion = data.get("emotion", "neutral")

    # Validate action and emotion against whitelists
    if action not in VALID_ACTIONS:
        trace.append(TraceEntry(module="validation", message=f"action '{action}' not in whitelist, using 'glitch'"))
        action = "glitch"
    if emotion not in VALID_EMOTIONS:
        trace.append(TraceEntry(module="validation", message=f"emotion '{emotion}' not in whitelist, using 'glitch'"))
        emotion = "glitch"

    # Parse and clamp state delta
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
        trace.append(TraceEntry(module="validation", message="state_delta parse error, using zeros"))
        state_delta = StateDelta()

    # Parse memory
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


async def generate_response(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Main entry point — single LLM call with CoT reasoning."""
    from app import config

    if not config.LLM_API_KEY:
        logger.warning("No LLM_API_KEY set, returning glitch response")
        return glitch_response("LLM_API_KEY not configured")

    client = AsyncOpenAI(
        api_key=config.LLM_API_KEY,
        base_url=config.LLM_BASE_URL,
        timeout=config.LLM_TIMEOUT,
    )

    messages = _build_messages(message, pet_state, history, memories)

    try:
        completion = await client.chat.completions.create(
            model=config.LLM_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
    except Exception as e:
        logger.exception("LLM call failed")
        return glitch_response(f"LLM 调用失败: {type(e).__name__}")

    content = completion.choices[0].message.content
    if not content or not content.strip():
        logger.warning("LLM returned empty content")
        return glitch_response("LLM 返回空内容")

    content = content.strip()
    logger.debug("LLM raw output:\n%s", content)

    # Extract reasoning steps as trace
    trace = _extract_reasoning_steps(content)

    # Extract JSON from response
    data = _extract_json(content)
    if data is None:
        logger.warning("Failed to extract JSON from LLM response: %s", content[:200])
        return glitch_response("LLM 返回无效 JSON")

    return _validate_and_build_response(data, trace)
