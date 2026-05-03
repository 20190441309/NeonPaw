"""State delta module — computes pet state changes based on action and emotion."""

from __future__ import annotations

from app.schemas import StateDelta, PetState

# Per-action state delta rules
_ACTION_DELTAS: dict[str, dict[str, int]] = {
    "wake":      {"energy": -1, "mood": 5, "affinity": 3, "hunger": 1, "stability": 0},
    "comfort":   {"energy": -2, "mood": 5, "affinity": 3, "hunger": 0, "stability": 0},
    "think":     {"energy": -2, "mood": 2, "affinity": 2, "hunger": 1, "stability": 0},
    "speak":     {"energy": -2, "mood": 2, "affinity": 2, "hunger": 1, "stability": 0},
    "happy":     {"energy": -1, "mood": 5, "affinity": 3, "hunger": 0, "stability": 0},
    "listen":    {"energy": -1, "mood": 1, "affinity": 1, "hunger": 0, "stability": 0},
    "idle":      {"energy": 0,  "mood": 0, "affinity": 0, "hunger": 0, "stability": 0},
    "sleep":     {"energy": 5,  "mood": 0, "affinity": 0, "hunger": 0, "stability": 0},
    "glitch":    {"energy": -1, "mood": -1, "affinity": 0, "hunger": 0, "stability": -3},
    "error":     {"energy": -1, "mood": -1, "affinity": 0, "hunger": 0, "stability": -3},
}


def compute_state_delta(action: str, emotion: str, pet_state: PetState) -> StateDelta:
    """Return a StateDelta based on the selected action."""
    deltas = _ACTION_DELTAS.get(action, {"energy": -2, "mood": 2, "affinity": 2, "hunger": 1, "stability": 0})
    return StateDelta(**deltas)
