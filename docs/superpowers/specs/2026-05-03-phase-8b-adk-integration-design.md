# Phase 8B Design: Google ADK Runtime Integration

**Date:** 2026-05-03
**Status:** Approved
**Branch:** main
**Depends on:** Phase 8A (modular agent brain)

---

## Goal

Add Google ADK as an optional runtime path for the pet brain, alongside the existing DeepSeek and mock pipelines. ADK runs when `USE_ADK=true` and a `GOOGLE_API_KEY` is set. If ADK fails, the system falls back to DeepSeek, then mock.

**Non-goals:** No frontend changes. No schema changes. No sub-agents. No function tools. No database. No cloud deployment.

---

## Dispatch Architecture

```
generate_response(message, pet_state, history, memories)
  │
  ├─ Tier 1: USE_ADK=true AND GOOGLE_API_KEY set?
  │   └─ _call_adk() → ADK Runner → LlmAgent(Gemini) → ChatResponse
  │       └─ on failure → try Tier 2
  │
  ├─ Tier 2: LLM_API_KEY set? (existing DeepSeek path, unchanged)
  │   └─ _call_llm() → AsyncOpenAI → DeepSeek → ChatResponse
  │       └─ on failure → fallback_response()
  │
  └─ Tier 3: No keys set (existing mock path, unchanged)
      └─ _mock_response() → rule-based pipeline → ChatResponse
```

Priority: ADK > DeepSeek > Mock. Each tier falls through to the next on failure.

---

## New Environment Variables

Added to `config.py` and `.env.example`:

| Variable | Default | Purpose |
|---|---|---|
| `USE_ADK` | `"false"` | Enable ADK runtime path |
| `GOOGLE_API_KEY` | `""` | Google AI Studio API key for Gemini |
| `ADK_MODEL` | `"gemini-2.0-flash"` | Gemini model ID for ADK agent |

Existing vars (`LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_PROVIDER`, `LLM_TIMEOUT`) remain unchanged.

---

## New File: `backend/app/agents/adk_agent.py`

Single new module encapsulating all ADK logic.

### Public API

```python
def is_adk_available() -> bool:
    """Check if ADK is configured (USE_ADK=true and GOOGLE_API_KEY set)."""

async def call_adk_agent(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Run the ADK agent and return a ChatResponse. Raises on failure."""
```

### Internal Structure

1. **Agent definition** — `LlmAgent` created with:
   - `model="gemini-2.0-flash"` (from `config.ADK_MODEL`)
   - `instruction=SYSTEM_PROMPT` (from `services/prompts.py`)
   - `name="neon_paw_brain"`
   - `description="NEON PAW pet brain agent"`
   - `output_schema` — a Pydantic model matching ChatResponse fields

2. **Runner + session service** — module-level, initialized lazily on first call:
   - `InMemorySessionService()` — no persistent state
   - `Runner(agent=agent, app_name="neon_paw", session_service=session_service)`

3. **`call_adk_agent()` flow:**
   - Build context string (pet state, memories, recent history) — same format as `_build_messages()`
   - Create session via `session_service.create_session()`
   - Build `types.Content(role="user", parts=[types.Part(text=context + message)])`
   - Run `runner.run_async()` and collect final text response
   - Parse JSON response
   - Validate and build trace via `_infer_llm_trace()` (imported from `root_brain`)
   - Return `ChatResponse`

4. **Error handling:**
   - Any exception propagates to caller (`generate_response()`)
   - Caller catches and falls through to DeepSeek tier

### Dependencies

- `google-adk` package (new)
- `google.genai.types` (comes with google-adk)
- `app.schemas` (existing)
- `app.services.prompts` (existing)
- `app.agents.root_brain._infer_llm_trace` (existing, for trace generation)
- `app.config` (existing)

---

## Modified File: `backend/app/agents/root_brain.py`

Only `generate_response()` changes. Add ADK tier before DeepSeek tier:

```python
async def generate_response(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    from app import config

    # Tier 1: ADK
    if config.USE_ADK and config.GOOGLE_API_KEY:
        try:
            from app.agents.adk_agent import call_adk_agent
            return await call_adk_agent(message, pet_state, history, memories)
        except Exception:
            logger.exception("ADK call failed, trying next tier")

    # Tier 2: DeepSeek (existing, unchanged)
    if config.LLM_API_KEY:
        try:
            return await _call_llm(message, pet_state, history, memories)
        except Exception:
            logger.exception("LLM call failed, falling back to fallback response")
            return fallback_response()

    # Tier 3: Mock (existing, unchanged)
    logger.info("No LLM_API_KEY set, using mock pipeline")
    return _mock_response(message, pet_state, memories)
```

All other functions unchanged: `_mock_response()`, `_call_llm()`, `_validate_llm_response()`, `_infer_llm_trace()`, `_build_messages()`, `fallback_response()`.

---

## Modified File: `backend/app/config.py`

Add three lines:

```python
USE_ADK = os.getenv("USE_ADK", "false").lower() == "true"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
ADK_MODEL = os.getenv("ADK_MODEL", "gemini-2.0-flash")
```

---

## Modified File: `backend/requirements.txt`

Add:
```
google-adk>=1.0.0
```

---

## Modified File: `backend/.env.example`

Add:
```env
# Google ADK (optional — enables ADK runtime path)
USE_ADK=false
GOOGLE_API_KEY=
ADK_MODEL=gemini-2.0-flash
```

---

## What Does NOT Change

| Component | Change? |
|---|---|
| Frontend (all files) | No |
| `schemas.py` | No |
| `routers/chat.py` | No |
| `services/prompts.py` | No |
| `services/pet_brain.py` | No |
| `agents/intent.py` | No |
| `agents/emotion.py` | No |
| `agents/action.py` | No |
| `agents/state_delta.py` | No |
| `agents/memory_decision.py` | No |
| `agents/persona.py` | No |
| `main.py` | No |
| `/api/chat` request format | No |
| `/api/chat` response format | No |

---

## Trace Handling

ADK path reuses `_infer_llm_trace()` from `root_brain.py`. The trace output format is identical to the current LLM path — same 5-module entries:

```json
"trace": [
  {"module": "intent_agent", "message": "detected greeting"},
  {"module": "emotion_agent", "message": "user mood positive"},
  {"module": "action_agent", "message": "selected wake"},
  {"module": "memory_agent", "message": "no stable memory"},
  {"module": "root_agent", "message": "response assembled via ADK"}
]
```

The `root_agent` trace message changes from "response assembled via LLM" to "response assembled via ADK" to distinguish the runtime.

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| ADK `output_schema` doesn't parse cleanly | Low | `output_schema` is native Gemini support. Fallback: remove `output_schema`, parse JSON from text manually |
| ADK Runner adds latency | Medium | Runner is thin overhead. If too slow, use `google.genai` SDK directly |
| `google-adk` breaking changes | Low | Pin version `>=1.0.0,<2.0.0` in requirements.txt |
| ADK import fails if package missing | Low | Conditional import in `generate_response()`. `is_adk_available()` checks config first |
| Gemini response quality differs from DeepSeek | Medium | Expected. May need Gemini-specific prompt tuning. Not a blocker |

---

## Verification Steps

| # | Test | Expected |
|---|---|---|
| 1 | `USE_ADK=false`, `LLM_API_KEY=""` | Mock pipeline works (unchanged) |
| 2 | `USE_ADK=false`, `LLM_API_KEY=set` | DeepSeek pipeline works (unchanged) |
| 3 | `USE_ADK=true`, `GOOGLE_API_KEY=set` | ADK returns valid ChatResponse |
| 4 | `USE_ADK=true`, `GOOGLE_API_KEY=invalid`, `LLM_API_KEY=set` | Falls back to DeepSeek |
| 5 | `USE_ADK=true`, `GOOGLE_API_KEY=invalid`, `LLM_API_KEY=""` | Falls back to mock |
| 6 | ADK response has all 7 ChatResponse fields | Valid Pydantic model |
| 7 | ADK trace shows 5 module entries | Same format as LLM path |
| 8 | `npm run build` in frontend/ | Build passes |
| 9 | All 8 demo scripts from V2 checkpoint | Still work |

---

## Rollback Strategy

1. **Instant rollback:** Set `USE_ADK=false` in `.env` → system reverts to existing DeepSeek/mock pipeline with zero code changes
2. **Code rollback:** Delete `agents/adk_agent.py`, revert `root_brain.py` and `config.py` → clean Phase 8A state
3. **No data migration** — ADK path uses `InMemorySessionService`, no persistent state

---

## Implementation Order

1. Add `google-adk` to `requirements.txt`
2. Add 3 env vars to `config.py` and `.env.example`
3. Create `agents/adk_agent.py`
4. Modify `generate_response()` in `root_brain.py`
5. Run all verification steps
6. Write Phase 8B checkpoint

---

## Success Criteria

- ADK mode produces valid `ChatResponse` with correct trace
- All existing modes (mock, DeepSeek) work unchanged
- Frontend builds and runs without changes
- Fallback chain works: ADK fails → DeepSeek → mock → fallback_response()
- `USE_ADK=false` completely disables ADK code path (no import errors)
