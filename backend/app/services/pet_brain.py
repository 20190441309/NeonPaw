from __future__ import annotations

import json
import re
import logging
from openai import AsyncOpenAI
from app.schemas import ChatResponse, StateDelta, Memory, TraceEntry, PetState, ConversationMessage, MemoryEntry
from app.services.prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

VALID_ACTIONS = {"wake", "sleep", "listen", "think", "speak", "happy", "comfort", "idle", "glitch", "error"}
VALID_EMOTIONS = {"neutral", "happy", "sad", "sleepy", "curious", "comforting", "glitch"}

MOCK_RESPONSES: dict[str, ChatResponse] = {
    "greeting": ChatResponse(
        reply="信号接入成功，NEON PAW 已上线。",
        emotion="happy",
        action="wake",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-1, mood=5, affinity=3, hunger=1),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Greeting detected. Wake action.")],
    ),
    "sad": ChatResponse(
        reply="我在呢，有什么想说的都可以告诉我。",
        emotion="comforting",
        action="comfort",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-2, mood=5, affinity=3),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Sadness detected. Comfort action.")],
    ),
    "question": ChatResponse(
        reply="嗯……让我想想。",
        emotion="curious",
        action="think",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-2, mood=2, affinity=2, hunger=1),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Question detected. Think action.")],
    ),
    "default": ChatResponse(
        reply="收到你的信号了。",
        emotion="neutral",
        action="speak",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-2, mood=2, affinity=2, hunger=1),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Default response. Speak action.")],
    ),
}

SAD_RE = re.compile(r"难过|伤心|不开心|累|烦|压力|焦虑|sad|tired|upset|stressed")
GREETING_RE = re.compile(r"你好|hi|hello|嗨|醒醒|在吗|喂|早|晚上好|早上好")
QUESTION_RE = re.compile(r"什么|为什么|怎么|吗|？|\?|how|what|why|能不能|可以")


def mock_response(message: str) -> ChatResponse:
    msg = message.lower()
    if SAD_RE.search(msg):
        return MOCK_RESPONSES["sad"]
    if GREETING_RE.search(msg):
        return MOCK_RESPONSES["greeting"]
    if QUESTION_RE.search(msg):
        return MOCK_RESPONSES["question"]
    return MOCK_RESPONSES["default"]


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


def _validate_response(data: dict) -> ChatResponse:
    """Parse and validate LLM JSON output into ChatResponse."""
    action = data.get("action", "speak")
    emotion = data.get("emotion", "neutral")

    if action not in VALID_ACTIONS:
        action = "speak"
    if emotion not in VALID_EMOTIONS:
        emotion = "neutral"

    raw_delta = data.get("state_delta", {})
    state_delta = StateDelta(
        energy=max(-10, min(10, int(raw_delta.get("energy", 0)))),
        mood=max(-10, min(10, int(raw_delta.get("mood", 0)))),
        affinity=max(-10, min(10, int(raw_delta.get("affinity", 0)))),
        hunger=max(-10, min(10, int(raw_delta.get("hunger", 0)))),
        stability=max(-10, min(10, int(raw_delta.get("stability", 0)))),
    )

    raw_memory = data.get("memory", {})
    memory = Memory(
        should_save=bool(raw_memory.get("should_save", False)),
        content=str(raw_memory.get("content", "")),
    )

    raw_trace = data.get("trace", [])
    trace = [
        TraceEntry(module=str(t.get("module", "root_agent")), message=str(t.get("message", "")))
        for t in raw_trace
        if isinstance(t, dict)
    ]
    if not trace:
        trace = [TraceEntry(module="root_agent", message="LLM response parsed.")]

    return ChatResponse(
        reply=str(data.get("reply", "...")),
        emotion=emotion,
        action=action,
        voice_style=str(data.get("voice_style", "soft_robotic")),
        state_delta=state_delta,
        memory=memory,
        trace=trace,
    )


async def _call_llm(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Call DeepSeek-compatible OpenAI-style API and return validated ChatResponse."""
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

    # Strip markdown code fences if present
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    data = json.loads(content)
    return _validate_response(data)


async def generate_response(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    from app import config

    if not config.LLM_API_KEY:
        logger.info("No LLM_API_KEY set, using mock response")
        return mock_response(message)

    try:
        return await _call_llm(message, pet_state, history, memories)
    except Exception:
        logger.exception("LLM call failed, falling back to fallback response")
        return fallback_response()
