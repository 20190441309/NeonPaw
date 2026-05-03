# NEON PAW — Demo-Ready MVP Checkpoint

**Date:** 2026-05-03
**Branch:** main
**Latest Commit:** 669ba6b
**Status:** Demo-ready

---

## Completed Features

| # | Feature | Status |
|---|---------|--------|
| 1 | Retro terminal UI with scanline, glow, flicker effects | Done |
| 2 | ASCII pet with 10 scene frames (booting, sleeping, awake, listening, thinking, speaking, happy, comforting, glitch, error) | Done |
| 3 | Voice input via browser Web Speech API (STT) | Done |
| 4 | Voice output via browser SpeechSynthesis API (TTS) | Done |
| 5 | FastAPI backend with `/api/chat` endpoint | Done |
| 6 | DeepSeek real LLM integration with mock fallback | Done |
| 7 | Agent Trace panel (collapsible developer diagnostics) | Done |
| 8 | Pet state machine (energy, mood, affinity, hunger, stability) | Done |
| 9 | PetStatusPanel with bar visualization | Done |
| 10 | localStorage persistence (pet state, conversation history, memories) | Done |
| 11 | Lightweight memory system with dedup and save notification | Done |
| 12 | MemoryPanel (collapsible, clear-all with confirmation) | Done |
| 13 | StatusHint (backend status, LLM indicator, memory count) | Done |
| 14 | Dynamic footer hints per pet mode | Done |
| 15 | Cross-browser scrollbar theming (Firefox + WebKit) | Done |
| 16 | Responsive text sizing for mobile | Done |

---

## Run Commands

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set LLM_API_KEY (optional — mock mode works without it)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Quick Start (both)

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=your_deepseek_api_key_here
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com
LLM_TIMEOUT=30
```

- **With API key**: DeepSeek LLM generates contextual pet replies
- **Without API key**: Mock mode returns pattern-matched responses (greeting, sad, question, default)

`.env` is git-ignored and will not be committed.

---

## Demo Script

### Demo 1: Wake and Greet

1. Open http://localhost:3000
2. Pet is sleeping — ASCII frame shows z z z
3. Click the screen — pet wakes up, frame changes to awake
4. Footer changes from "TAP SCREEN TO WAKE" to "TAP MICROPHONE TO TALK"

### Demo 2: Voice Conversation

1. Click the microphone button
2. Say: "你好，NEON PAW"
3. Pet enters thinking mode — ASCII frame shows brain processing
4. Pet replies with voice — frame changes to speaking
5. Reply text appears in chat transcript

### Demo 3: Emotional Response

1. Say: "我今天好累，压力很大"
2. Pet detects sadness, replies with comfort
3. Emotion changes to comforting, mood/affinity increase

### Demo 4: Memory System (requires DeepSeek API key)

1. Say: "记住，我叫小野"
2. "MEMORY SAVED // ..." notification appears
3. MEMORY BANK panel shows the saved entry
4. Say: "我叫什么？"
5. Pet answers "小野" based on saved memory

### Demo 5: Agent Trace

1. After any conversation, click "AGENT TRACE" to expand
2. Shows module and decision summary from the LLM
3. Indicates whether LLM or mock mode was used

### Demo 6: Status Indicators

- Footer left: ONLINE/OFFLINE/FALLBACK + LLM indicator + MEM:N
- Footer right: dynamic hint per pet mode
- Pet status panel: energy, mood, bond, hunger, stability bars

---

## Architecture

```
User speaks → Browser STT → Text
  ↓
Frontend sends: message + pet_state + conversation_history + memories
  ↓
FastAPI /api/chat → pet_brain.py → DeepSeek LLM (or mock)
  ↓
LLM returns: { reply, emotion, action, state_delta, memory, trace }
  ↓
Frontend: update pet state, switch ASCII frame, play TTS, save memory
```

---

## Project Structure

```
neon-paw/
├── frontend/          Next.js 16 + React + TypeScript + Tailwind
│   ├── src/app/       page.tsx, globals.css
│   ├── src/components/  TerminalShell, ASCIIPet, VoiceButton, ChatTranscript,
│   │                    PetStatusPanel, AgentTracePanel, StatusHint,
│   │                    MemoryPanel, MemoryNotification
│   ├── src/hooks/     usePetState, useMemory, useSpeechRecognition, useSpeechSynthesis
│   └── src/lib/       api.ts, types.ts, petFrames.ts
│
└── backend/           FastAPI + Python
    ├── app/main.py        CORS, router mount
    ├── app/schemas.py     Pydantic models
    ├── app/routers/chat.py  POST /api/chat
    └── app/services/
        ├── pet_brain.py   LLM call, mock, validation, memory injection
        └── prompts.py     System prompt with memory rules
```

---

## Known Limitations

| Limitation | Impact | Planned |
|---|---|---|
| No ADK multi-agent | Single root agent only | Phase 8+ |
| No backend STT/TTS | Uses browser APIs only | Phase 8+ |
| No wake word detection | Must click to interact | V2 |
| No database | All state in localStorage | Phase 8+ |
| Memory is localStorage only | Lost if browser data cleared | Phase 8+ |
| No Electron/PWA | Web only | V2 |
| No MCP tool calling | Pet can't use external tools | Phase 8+ |
| Mock mode limited | Pattern-matched replies without API key | — |
| Chinese-only STT | Browser STT set to zh-CN | Could add lang switch |

---

## Commit History

```
669ba6b docs: add Phase 7A memory UX refinement checkpoint
372c5e9 feat: Phase 7A — memory UX refinement
8ca26a8 docs: add Phase 6 memory system checkpoint
844a134 feat: Phase 6 — lightweight localStorage memory system
7bac994 docs: add demo polish checkpoint
a4e8416 fix: demo polish — scrollbar, footer hints, chat readability, prompt tuning
77ecf8c docs: add Phase 5B checkpoint
62bbd5c feat: Phase 5B — UI/UX polish and voice experience improvements
f42c7d4 docs: add Phase 5A checkpoint
96d5e6a feat: Phase 5A — real LLM provider integration with DeepSeek
bf95017 docs: add Phase 5C checkpoint
764a672 feat: Phase 5C — Agent Trace Panel
a27470e docs: add Phase 4 checkpoint
78b8506 chore: add venv and __pycache__ to .gitignore
a876f33 feat: Phase 3+4 — FastAPI backend and frontend-backend wiring
b6d15e8 feat: Phase 2 — voice integration with STT, TTS, and mock responses
99d1dcb Initial commit: NEON PAW terminal pet UI
```

---

## Security Checklist

- [x] `.env` is git-ignored (root `.gitignore` covers `backend/.env`)
- [x] `.env` is not tracked in git
- [x] No API keys in source code
- [x] LLM API key read from environment variable only
- [x] CORS restricted to `localhost:3000`
