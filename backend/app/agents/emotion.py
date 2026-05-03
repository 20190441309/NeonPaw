"""Emotion analysis module — determines pet emotion from user input and pet state."""

from __future__ import annotations

from app.schemas import PetState

# Map intent to emotion
_INTENT_EMOTION: dict[str, str] = {
    "greeting": "happy",
    "sad": "comforting",
    "question": "curious",
    "default": "neutral",
}


def detect_emotion(message: str, intent: str, pet_state: PetState) -> str:
    """Return one of the allowed emotions based on intent and context."""
    return _INTENT_EMOTION.get(intent, "neutral")
