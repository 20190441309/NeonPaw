"""Action selection module — picks the pet action based on intent and emotion."""

from __future__ import annotations

from app.schemas import PetState

# Map intent to action
_INTENT_ACTION: dict[str, str] = {
    "greeting": "wake",
    "sad": "comfort",
    "question": "think",
    "default": "speak",
}


def select_action(message: str, intent: str, emotion: str, pet_state: PetState) -> str:
    """Return one of the allowed actions."""
    return _INTENT_ACTION.get(intent, "speak")
