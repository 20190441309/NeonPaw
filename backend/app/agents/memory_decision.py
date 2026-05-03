"""Memory decision module — determines whether to save user input as a long-term memory."""

from __future__ import annotations

import re

from app.schemas import Memory, PetState

# Patterns that indicate storable personal information
_MEMORY_PATTERNS = [
    re.compile(r"我叫|我的名字|叫我|记住我|记住，"),
    re.compile(r"我喜欢|我不喜欢|我最爱|我讨厌|我偏好"),
    re.compile(r"我的目标|我计划|我想成为|我打算|我的梦想"),
    re.compile(r"我每天|我经常|我习惯|我总是"),
    re.compile(r"my name is|call me|remember.*name", re.IGNORECASE),
    re.compile(r"i like|i love|i hate|i prefer", re.IGNORECASE),
    re.compile(r"my goal|my plan|i want to be|i plan to", re.IGNORECASE),
]


def decide_memory(message: str, intent: str, pet_state: PetState) -> Memory:
    """Return a Memory decision based on message content."""
    for pattern in _MEMORY_PATTERNS:
        if pattern.search(message):
            return Memory(should_save=True, content=message.strip()[:200])
    return Memory(should_save=False, content="")
