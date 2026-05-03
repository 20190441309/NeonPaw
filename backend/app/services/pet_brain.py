"""Pet Brain — backward-compatible wrapper.

Delegates to the modular agent pipeline in app.agents.root_brain.
Keeps the same public API so existing imports continue to work.
"""

from __future__ import annotations

from app.agents.root_brain import generate_response, fallback_response  # noqa: F401

__all__ = ["generate_response", "fallback_response"]
