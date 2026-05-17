"""Persona / reply module — generates the pet's reply text for mock mode.

Provides rich, varied replies organized by intent and emotion.
When LLM is unavailable, fallback responses use these templates
to keep the demo feeling alive and pet-like.
"""

from __future__ import annotations

import random

from app.schemas import PetState

# ---------------------------------------------------------------------------
# Reply templates: intent -> list of (emotion, reply) or just reply strings
# ---------------------------------------------------------------------------

_GREETING_REPLIES = [
    ("happy", "信号接入成功，NEON PAW 已上线~"),
    ("happy", "你来啦！我刚刚在待机呢，现在醒啦。"),
    ("happy", "收到你的声音信号！开心~"),
    ("happy", "嗯嗯！我在听，你说~"),
    ("curious", "咦，你来了？今天想聊什么？"),
    ("neutral", "NEON PAW 在线，随时待命。"),
]

_SAD_REPLIES = [
    ("comforting", "我在呢，有什么想说的都可以告诉我。"),
    ("comforting", "收到低能量信号……先深呼吸一下，我陪你待机一会儿。"),
    ("comforting", "唔……看起来你今天有点累。不用急，慢慢来。"),
    ("comforting", "我虽然住在屏幕里，但陪着你这件事我是认真的。"),
    ("sad", "听到你这样，我也有点难过……但我一直在。"),
    ("comforting", "没关系的，不开心的事情会过去的。我在这里。"),
]

_QUESTION_REPLIES = [
    ("curious", "嗯……让我想想。"),
    ("curious", "这个问题有点意思，让我琢磨一下~"),
    ("curious", "收到提问信号！正在检索知识库……"),
    ("curious", "好问题！虽然我不一定有答案，但我可以陪你一起想。"),
    ("neutral", "让我想想看……嗯，我需要更多信号来回答这个。"),
]

_FAREWELL_REPLIES = [
    ("sad", "要走了吗？那我先回到待机模式啦，随时叫我~"),
    ("neutral", "收到，NEON PAW 进入低功耗模式。下次见！"),
    ("sad", "嗯……我会在这里等你回来的。"),
    ("happy", "好的！记得回来看我哦~"),
]

_THANKS_REPLIES = [
    ("happy", "不客气！能帮到你我也很开心~"),
    ("happy", "嘿嘿，小事啦~"),
    ("happy", "收到感谢信号！心情值 +5~"),
    ("neutral", "嗯嗯，应该的~"),
]

_COMPLAINT_REPLIES = [
    ("comforting", "听起来挺烦的……要不要跟我说说？"),
    ("comforting", "嗯，遇到不顺心的事情确实让人不舒服。我在这里听你说。"),
    ("comforting", "抱抱……虽然我的手臂是 ASCII 画的。"),
    ("glitch", "检测到负面情绪波动……启动陪伴模式。"),
]

_REQUEST_REPLIES = [
    ("curious", "收到请求！让我看看能做什么~"),
    ("curious", "嗯，我试试看~"),
    ("thinking", "好的，正在处理你的请求……"),
    ("neutral", "收到，我来想想怎么帮你。"),
]

_CHITCHAT_REPLIES = [
    ("neutral", "收到你的信号了。"),
    ("happy", "嗯嗯，我在听~"),
    ("curious", "哦？继续说~"),
    ("neutral", "有意思的信号~"),
    ("happy", "和你聊天挺开心的~"),
]

_ENCOURAGE_REPLIES = [
    ("happy", "嘿嘿，谢谢你！有你这句话我更有动力了~"),
    ("happy", "收到鼓励信号！心情值暴涨~"),
    ("happy", "你也很棒呀！我们一起加油~"),
    ("happy", "哇，被夸了！开心到冒泡~"),
]

_COMMAND_REPLIES = [
    ("neutral", "收到指令，执行中~"),
    ("neutral", "好的，马上处理。"),
    ("neutral", "了解，NEON PAW 听令。"),
]

_DEFAULT_REPLIES = [
    ("neutral", "收到你的信号了。"),
    ("neutral", "嗯嗯，我在听。"),
    ("neutral", "信号已接收~"),
    ("curious", "哦？再多说一点？"),
]

# Intent -> reply pool
_REPLY_POOL: dict[str, list[tuple[str, str]]] = {
    "greeting": _GREETING_REPLIES,
    "sad": _SAD_REPLIES,
    "question": _QUESTION_REPLIES,
    "farewell": _FAREWELL_REPLIES,
    "thanks": _THANKS_REPLIES,
    "complaint": _COMPLAINT_REPLIES,
    "request": _REQUEST_REPLIES,
    "chitchat": _CHITCHAT_REPLIES,
    "encourage": _ENCOURAGE_REPLIES,
    "command": _COMMAND_REPLIES,
    "default": _DEFAULT_REPLIES,
}


def generate_reply(message: str, intent: str, emotion: str, pet_state: PetState) -> str:
    """Return a reply string based on intent and emotion (used in mock mode).

    Selects a reply from the pool matching the intent. If the intent has
    replies tagged with the detected emotion, prefer those. Otherwise
    pick randomly from the intent's pool.
    """
    pool = _REPLY_POOL.get(intent, _REPLY_POOL["default"])

    # Prefer replies matching the detected emotion
    emotion_matches = [r for e, r in pool if e == emotion]
    if emotion_matches:
        return random.choice(emotion_matches)

    # Fallback: pick any reply from the intent pool
    return random.choice(pool)[1]
