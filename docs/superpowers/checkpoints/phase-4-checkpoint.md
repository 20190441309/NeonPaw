# Phase 4 Checkpoint — Frontend-Backend Wiring

**Date:** 2026-05-03
**Status:** Complete

---

## Completed Files

```
frontend/src/lib/api.ts              # callChatApi() — POST to backend, fallback on error
frontend/src/app/page.tsx            # Wired voice flow to backend /api/chat
```

## Key Architecture Decisions

- `callChatApi` sends `{message, pet_state, conversation_history}` to backend
- Returns structured `ChatResponse` matching Agent Response Contract
- On HTTP error: returns inline fallback with glitch emotion/action
- On network failure (catch): `pet.setError()` + fallback message in transcript
- `petState` and `history` accessed via refs in `handleVoiceClick` to avoid `useCallback` churn from object deps

## Full Loop

```
Click mic → STT → callChatApi({message, pet_state, history})
  → backend mock brain → ChatResponse
  → addMessage → applyResponse → setSpeaking
  → TTS speak → setIdle
```

## How to Run

```bash
# Terminal 1: Backend
cd /Users/hj/Desktop/hj/NeonPaw/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd /Users/hj/Desktop/hj/NeonPaw/frontend
npm run dev
```

## How to Verify

1. Open http://localhost:3000 in Chrome
2. Click screen → awake
3. Click mic → say "你好" → pet replies "信号接入成功" with TTS
4. Say "好累" → comfort response
5. Stop backend → say something → glitch/error state with fallback message
6. Status bars update, chat transcript shows in terminal
