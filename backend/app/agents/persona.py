"""Persona / reply module — generates the pet's reply text for mock mode."""

from __future__ import annotations

from app.schemas import PetState

# Template replies keyed by intent
_REPLIES: dict[str, str] = {
    "greeting": "信号接入成功，NEON PAW 已上线。",
    "sad":      "我在呢，有什么想说的都可以告诉我。",
    "question": "嗯……让我想想。",
    "default":  "收到你的信号了。",
}


def generate_reply(message: str, intent: str, emotion: str, pet_state: PetState) -> str:
    """Return a reply string based on intent and emotion (used in mock mode)."""
    return _REPLIES.get(intent, _REPLIES["default"])
