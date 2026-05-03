# Phase 8B-alt: DeepSeek-Powered RootBrain Multi-Agent Stabilization

**Date:** 2026-05-03
**Status:** Draft
**Branch:** main
**Depends on:** Phase 8A (modular agent brain)

---

## Why This Phase Replaces Phase 8B

The original Phase 8B planned to integrate Google ADK as a runtime. That direction is cancelled. Instead, we stabilize and document the existing RootBrain-orchestrated multi-agent architecture, which already works with DeepSeek and requires no external agent framework.

---

## Goals

1. Keep DeepSeek as the real LLM provider.
2. Keep RootBrain as the single orchestrator.
3. Keep the existing 7-module agent structure unchanged.
4. Do NOT add `google-adk`, `litellm`, or any new dependencies.
5. Do NOT add `USE_ADK`, `GOOGLE_API_KEY`, `ADK_MODEL` env vars.
6. Do NOT change `/api/chat` request or response schema.
7. Do NOT change frontend files (except minor doc/label wording if needed).
8. Preserve mock fallback when `LLM_API_KEY` is missing.
9. Keep Agent Trace showing the 5-module decision flow.

---

## What Changes

### 1. Update Phase 8B spec status

Mark `docs/superpowers/specs/2026-05-03-phase-8b-adk-integration-design.md` as **Cancelled** — add a header note explaining the pivot to Phase 8B-alt.

### 2. Update V2 checkpoint architecture description

In `docs/superpowers/checkpoints/demo-ready-v2-checkpoint.md`:
- Rename references from "ADK-ready agent modules" to "RootBrain-orchestrated multi-agent architecture"
- Clarify that multi-agent is implemented by Python module orchestration, not by Google ADK
- Add note: "Google ADK integration is a future option, not a current dependency"

### 3. Update backend docstrings

In `backend/app/agents/root_brain.py`:
- Update module docstring to describe RootBrain as the orchestrator
- Clarify the two execution paths (mock pipeline vs DeepSeek LLM)
- No logic changes

### 4. Write Phase 8B-alt checkpoint

Create `docs/superpowers/checkpoints/phase-8b-alt-checkpoint.md` documenting:
- Architecture: RootBrain-orchestrated, ADK-ready but ADK-not-required
- 7 agent modules and their roles
- Two execution paths (mock + DeepSeek)
- Agent Trace format
- How to run and verify
- Future ADK migration path (optional, not required)

### 5. Verify nothing is broken

- Mock mode works (`LLM_API_KEY=""`)
- DeepSeek mode works (`LLM_API_KEY=set`)
- Frontend builds (`npm run build`)
- Agent Trace shows module flow
- All demo scripts from V2 checkpoint still pass

---

## What Does NOT Change

| Component | Change? |
|---|---|
| Frontend source files | No |
| `/api/chat` schema | No |
| `schemas.py` | No |
| `routers/chat.py` | No |
| `config.py` | No |
| `requirements.txt` | No |
| `.env.example` | No |
| `agents/*.py` (all modules) | No logic changes |
| `services/prompts.py` | No |
| DeepSeek pipeline | No |
| Mock pipeline | No |
| Agent Trace format | No |

---

## Files Modified

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-05-03-phase-8b-adk-integration-design.md` | Add cancelled header |
| `docs/superpowers/checkpoints/demo-ready-v2-checkpoint.md` | Update architecture wording |
| `backend/app/agents/root_brain.py` | Update docstring only |
| `docs/superpowers/checkpoints/phase-8b-alt-checkpoint.md` | New checkpoint |

---

## Verification

1. `cd backend && source venv/bin/activate && LLM_API_KEY="" python -c "..."` — mock mode returns valid ChatResponse
2. `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000` — DeepSeek mode works
3. `cd frontend && npm run build` — frontend builds
4. Agent Trace shows 5-module flow in both mock and DeepSeek modes
5. All V2 demo scripts still work

---

## Success Criteria

- Architecture is documented as "RootBrain-orchestrated multi-agent"
- No ADK dependency or env vars added
- Existing pipelines work unchanged
- Checkpoint captures current state accurately
