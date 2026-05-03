import re
from app.schemas import ChatResponse, StateDelta, Memory, TraceEntry

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


async def generate_response(
    message: str, pet_state, history
) -> ChatResponse:
    from app import config

    if config.LLM_API_KEY:
        # Future: call real LLM here
        return mock_response(message)
    return mock_response(message)
