# Phase 5A Checkpoint — Real LLM Provider Integration

**Date:** 2026-05-03
**Status:** Complete

---

## Completed Files

```
backend/app/config.py                  # Added LLM_BASE_URL, LLM_TIMEOUT
backend/.env.example                   # Updated for DeepSeek defaults
backend/requirements.txt               # Added openai>=1.30.0
backend/app/services/pet_brain.py      # Real LLM call + validation + fallback
```

## Key Architecture Decisions

- Uses OpenAI SDK with custom `base_url` for DeepSeek compatibility
- `SYSTEM_PROMPT` from `prompts.py` now wired into LLM messages
- Messages array includes: system prompt + pet state context + last 10 history messages + user input
- `response_format={"type": "json_object"}` requests structured JSON from LLM
- JSON response strips markdown code fences if LLM wraps them
- `_validate_response()` enforces action/emotion whitelists, clamps state_delta to -10..+10
- When `LLM_API_KEY` is empty → mock mode (pattern-based responses)
- When LLM call fails → `fallback_response()` (glitch/glitch)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `deepseek` | Provider label (informational) |
| `LLM_API_KEY` | `""` | API key; empty = mock mode |
| `LLM_MODEL` | `deepseek-chat` | Model name |
| `LLM_BASE_URL` | `https://api.deepseek.com` | OpenAI-compatible base URL |
| `LLM_TIMEOUT` | `30` | Request timeout in seconds |

## How to Run

```bash
cd /Users/hj/Desktop/hj/NeonPaw/backend
source venv/bin/activate
cp .env.example .env
# Edit .env and set LLM_API_KEY=your_deepseek_key
uvicorn app.main:app --reload --port 8000
```

## How to Verify

### Mock mode (no API key)
```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","pet_state":{"name":"NEON PAW","mode":"sleeping","emotion":"sleepy","energy":80,"mood":70,"affinity":20,"hunger":30,"stability":95,"lastInteractionAt":""},"conversation_history":[]}'
```

### DeepSeek mode (with API key)
Same curl command, but with `LLM_API_KEY` set in `.env`.

## What's Next

Phase 5A is clean. Ready for Phase 5B (UI polish) or additional features.
