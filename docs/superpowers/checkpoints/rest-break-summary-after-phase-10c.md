# Rest Break Summary — After Phase 10C

**Date:** 2026-05-03
**Branch:** main
**Latest Commit:** 155d7e1

---

## Completed Phases

| Phase | Description | Commit |
|---|---|---|
| 1–7B | Core MVP: terminal UI, pet brain, voice, TTS, memory, persistence | various |
| 8A | Decompose backend brain into ADK-ready agent modules | 0f0b9e0 |
| 8B-alt | RootBrain multi-agent stabilization (no real ADK runtime) | 78f3899 |
| 9A | RootBrain multi-agent pytest tests (59 tests) | c5c109e |
| 10A | Browser wake word prototype | d994c9d |
| 10B | Hands-free wake conversation (inline + follow-up) | cff58a0 |
| 10C | Hands-free conversation session (multi-turn, stop phrases, timeout) | 155d7e1 |

---

## Current Working Features

- Retro terminal UI with ASCII pet frames
- Browser STT (Web Speech API) for Chinese voice input
- Single-agent RootBrain with mock and DeepSeek LLM paths
- Pet state machine (booting, sleeping, awake, listening, thinking, speaking, error)
- Browser TTS for pet replies
- Agent trace panel showing decision pipeline
- Simple long-term memory with localStorage persistence
- **Wake Mode (OFF by default):** browser mic listens for wake phrases ("小爪醒醒", "NEON PAW")
- **Hands-free session:** after wake, continuous conversation without re-saying wake phrase
- **Stop phrases:** "先这样", "不用了", "结束对话", "退出", "stop", "sleep"
- **Session timeout:** 25s silence returns to wake listening
- Click-to-talk always works regardless of Wake Mode state

---

## Current Architecture

```
Frontend (Next.js 16 + React + TypeScript + Tailwind)
  ├── page.tsx — main page, wires all hooks and components
  ├── hooks/
  │   ├── usePetState.ts — pet state machine + localStorage persistence
  │   ├── useSpeechRecognition.ts — browser STT (Web Speech API)
  │   ├── useSpeechSynthesis.ts — browser TTS (SpeechSynthesis API)
  │   ├── useWakeWord.ts — wake word + session state machine
  │   └── useMemory.ts — simple memory with localStorage
  ├── components/
  │   ├── TerminalShell.tsx — terminal frame, scanlines, header/footer
  │   ├── ASCIIPet.tsx — ASCII pet rendering
  │   ├── VoiceButton.tsx — mic button with wake indicator
  │   ├── WakeModeToggle.tsx — [WAKE] / [WAKE:ON] toggle
  │   ├── ChatTranscript.tsx — conversation display
  │   ├── PetStatusPanel.tsx — state bars
  │   ├── AgentTracePanel.tsx — agent decision trace
  │   └── MemoryPanel.tsx — memory display
  └── lib/
      ├── api.ts — callChatApi() → POST /api/chat
      ├── petFrames.ts — ASCII scene frames
      └── types.ts — shared TypeScript types

Backend (FastAPI + Python)
  ├── app/
  │   ├── main.py — FastAPI app, CORS
  │   ├── schemas.py — Pydantic models (PetState, ChatResponse, etc.)
  │   ├── config.py — env vars (LLM_API_KEY, LLM_BASE_URL, etc.)
  │   ├── routers/chat.py — POST /api/chat
  │   ├── agents/
  │   │   ├── root_brain.py — orchestrator (mock + LLM paths)
  │   │   ├── intent.py — regex intent detection
  │   │   ├── emotion.py — emotion detection
  │   │   ├── action.py — action selection
  │   │   ├── state_delta.py — state change computation
  │   │   ├── memory_decision.py — memory save decision
  │   │   └── persona.py — reply generation (mock path)
  │   └── services/prompts.py — system prompt
  └── tests/
      ├── test_agents.py — 44 tests for agent modules
      └── test_root_brain.py — 18 tests for root brain
```

---

## How to Run

### Backend

```bash
cd backend
pip install -r requirements.txt
# Optional: set LLM_API_KEY in .env for DeepSeek
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Tests

```bash
cd backend && pytest -v  # 59 tests
cd frontend && npm run build  # TypeScript check
```

---

## Current Known Limitations

1. **SpeechRecognition accuracy** — Browser STT can be inaccurate for short Chinese wake phrases or noisy environments. Tracked as future Phase 10D.
2. **Chrome/Edge only** — Web Speech API not available in Firefox/Safari.
3. **Page must be open** — Wake listening stops when tab is closed. Not a background listener.
4. **One SpeechRecognition instance at a time** — Wake hook creates/destroys instances per mode switch.
5. **Stop phrase substring matching** — "不用了谢谢" also triggers stop. Acceptable for MVP.
6. **No backend STT/TTS** — Uses browser-native APIs only.
7. **No real ADK runtime** — RootBrain is self-developed orchestrator, not Google ADK.

---

## Recommended Next Phase

### Phase 10D: Speech Recognition Accuracy & Correction UX

When the user is ready to address STT accuracy issues, Phase 10D should cover:

1. Visual feedback showing what the browser heard (interim + final transcripts)
2. Quick-correction UI: "I said X, not Y" tap-to-fix
3. Confidence threshold: if STT confidence is low, ask user to repeat
4. Wake phrase fuzzy matching (handle near-misses like "小爪行行")
5. Noise filtering heuristics (ignore very short transcripts during wake listening)
6. Optional: backend STT integration (Whisper / Gemini) for better accuracy

---

## Important Files

| File | Purpose |
|---|---|
| `frontend/src/hooks/useWakeWord.ts` | Wake word + session state machine (core of Phase 10A–10C) |
| `frontend/src/app/page.tsx` | Main page wiring all hooks |
| `backend/app/agents/root_brain.py` | Agent orchestrator (mock + LLM paths) |
| `backend/app/schemas.py` | API contract types |
| `CLAUDE.md` | Project instructions, architecture, design decisions |

## Key Checkpoints

| Checkpoint | File |
|---|---|
| Phase 10A | `docs/superpowers/checkpoints/phase-10a-wake-word-checkpoint.md` |
| Phase 10B | `docs/superpowers/checkpoints/phase-10b-hands-free-wake-checkpoint.md` |
| Phase 10C | `docs/superpowers/checkpoints/phase-10c-hands-free-session-checkpoint.md` |
| Phase 9A | `docs/superpowers/checkpoints/phase-9a-rootbrain-testing-checkpoint.md` |
| Phase 8B-alt | `docs/superpowers/checkpoints/phase-8b-alt-rootbrain-checkpoint.md` |

---

**Project is clean. No uncommitted changes. Safe to exit.**
