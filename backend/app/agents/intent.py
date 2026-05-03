"""Intent detection module — classifies user message into an intent category."""

from __future__ import annotations

import re

SAD_RE = re.compile(r"难过|伤心|不开心|累|烦|压力|焦虑|sad|tired|upset|stressed")
GREETING_RE = re.compile(r"你好|hi|hello|嗨|醒醒|在吗|喂|早|晚上好|早上好")
QUESTION_RE = re.compile(r"什么|为什么|怎么|吗|？|\?|how|what|why|能不能|可以")


def detect_intent(message: str) -> str:
    """Return intent category: 'greeting', 'sad', 'question', or 'default'."""
    msg = message.lower()
    if SAD_RE.search(msg):
        return "sad"
    if GREETING_RE.search(msg):
        return "greeting"
    if QUESTION_RE.search(msg):
        return "question"
    return "default"
