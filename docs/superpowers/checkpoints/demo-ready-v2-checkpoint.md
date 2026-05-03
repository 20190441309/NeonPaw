# NEON PAW — Demo-Ready V2 Checkpoint

**Date:** 2026-05-03
**Branch:** main
**Latest Commit:** 0f0b9e0
**Status:** Demo-ready (V2 — RootBrain-orchestrated multi-agent)

---

## Completed Features

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Retro terminal UI with scanline, glow, flicker effects | 1 | Done |
| 2 | ASCII pet with 10 scene frames (booting, sleeping, awake, listening, thinking, speaking, happy, comforting, glitch, error) | 1 | Done |
| 3 | Voice input via browser Web Speech API (STT) | 2 | Done |
| 4 | Voice output via browser SpeechSynthesis API (TTS) | 2 | Done |
| 5 | FastAPI backend with `/api/chat` endpoint | 3+4 | Done |
| 6 | DeepSeek real LLM integration with mock fallback | 5A | Done |
| 7 | Agent Trace panel (collapsible developer diagnostics) | 5C | Done |
| 8 | Pet state machine (energy, mood, affinity, hunger, stability) | 3+4 | Done |
| 9 | PetStatusPanel with bar visualization | 1 | Done |
| 10 | localStorage persistence (pet state, conversation history, memories) | 6 | Done |
| 11 | Lightweight memory system with dedup and save notification | 6 | Done |
| 12 | MemoryPanel (collapsible, clear-all with confirmation) | 6 | Done |
| 13 | StatusHint (backend status, LLM indicator, memory count) | 5B | Done |
| 14 | Dynamic footer hints per pet mode | Polish | Done |
| 15 | Cross-browser scrollbar theming (Firefox + WebKit) | Polish | Done |
| 16 | Responsive text sizing for mobile | 5B | Done |
| 17 | Memory privacy notice ("LOCAL ONLY" label, privacy footer) | 7B | Done |
| 18 | "How Memory Works" expandable section | 7B | Done |
| 19 | First-time memory save notification | 7B | Done |
| 20 | Clear-all confirmation with local browser context | 7B | Done |
| 21 | RootBrain-orchestrated multi-agent brain (7 modules) | 8A | Done |
| 22 | Agent Trace shows per-module decision flow | 8A | Done |

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
- **Without API key**: Mock mode returns modular rule-based responses

`.env` is git-ignored and will not be committed.

---

## Architecture Summary

```
User speaks → Browser STT → Text
  ↓
Frontend sends: message + pet_state + conversation_history + memories
  ↓
FastAPI /api/chat → RootBrain orchestrator
  ├─ [Mock path] intent → emotion → action → state_delta → memory → persona
  └─ [LLM path]  DeepSeek → JSON → validation → trace inference
  ↓
LLM returns: { reply, emotion, action, state_delta, memory, trace }
  ↓
Frontend: update pet state, switch ASCII frame, play TTS, save memory
```

---

## Backend Agent Module Structure

```
backend/app/
├── agents/
│   ├── __init__.py
│   ├── intent.py           # Classifies user message (greeting/sad/question/default)
│   ├── emotion.py          # Maps intent → allowed emotion
│   ├── action.py           # Maps intent → allowed action
│   ├── state_delta.py      # Computes per-action state changes
│   ├── memory_decision.py  # Decides whether to save memory (regex keywords)
│   ├── persona.py          # Generates mock-mode reply text
│   └── root_brain.py       # Orchestrator — mock pipeline + LLM call + validation
├── services/
│   ├── pet_brain.py        # Backward-compatible re-export wrapper
│   └── prompts.py          # System prompt for LLM
├── routers/
│   └── chat.py             # POST /api/chat endpoint
├── schemas.py              # Pydantic models (ChatRequest, ChatResponse, etc.)
├── config.py               # Environment variable loading
└── main.py                 # FastAPI app setup, CORS, router mount
```

### Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `intent.py` | Regex keyword matching → greeting, sad, question, default |
| `emotion.py` | Intent → emotion mapping (happy, comforting, curious, neutral) |
| `action.py` | Intent → action mapping (wake, comfort, think, speak) |
| `state_delta.py` | Action → state delta rules (energy, mood, affinity, hunger, stability) |
| `memory_decision.py` | Keyword detection for storable personal info |
| `persona.py` | Template replies for mock mode |
| `root_brain.py` | Orchestrates all modules, calls LLM, validates output, builds trace |

### Two Execution Paths

**Mock path** (no `LLM_API_KEY`):
```
message → intent → emotion → action → state_delta → memory → persona → ChatResponse
```

**LLM path** (with `LLM_API_KEY`):
```
message → DeepSeek LLM → JSON → validation → trace inference → ChatResponse
```

Both paths produce identical `ChatResponse` structure with 5-module trace entries.

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
6. Agent Trace panel shows: intent_agent → emotion_agent → action_agent → memory_agent → root_agent

### Demo 3: Emotional Response

1. Say: "我今天好累，压力很大"
2. Pet detects sadness, replies with comfort
3. Emotion changes to comforting, mood/affinity increase
4. Trace shows: "detected sadness/distress" → "selected comfort"

### Demo 4: Memory System (requires DeepSeek API key)

1. Say: "记住，我叫小野"
2. "MEMORY SAVED // ..." notification appears
3. First time only: "MEMORY SAVED LOCALLY // You can delete it in MEMORY BANK" also appears
4. MEMORY BANK panel shows the saved entry with "LOCAL ONLY" label
5. Expand "HOW MEMORY WORKS" to see explanation
6. Say: "我叫什么？"
7. Pet answers "小野" based on saved memory

### Demo 5: Memory Privacy

1. Open MEMORY BANK panel
2. "LOCAL ONLY" label visible next to header
3. Privacy notice at bottom: "LOCAL BROWSER STORAGE ONLY. NOT STORED ON ANY SERVER."
4. Click CLEAR ALL — confirmation reads "This clears local memories from this browser only. Continue?"
5. Click YES, CLEAR — all memories removed

### Demo 6: Agent Trace (new in V2)

1. After any conversation, click "AGENT TRACE" to expand
2. Shows 5-module decision flow:
   - `intent_agent`: detected greeting / sadness / question
   - `emotion_agent`: user mood positive / neutral / needs comfort
   - `action_agent`: selected wake / comfort / speak / think
   - `memory_agent`: memory saved / no stable memory
   - `root_agent`: response assembled via LLM / mock pipeline
3. Trace clearly indicates whether LLM or mock mode was used

### Demo 7: Status Indicators

- Footer left: ONLINE/OFFLINE/FALLBACK + LLM indicator + MEM:N
- Footer right: dynamic hint per pet mode
- Pet status panel: energy, mood, bond, hunger, stability bars

### Demo 8: Mock Mode (no API key)

1. Start backend without LLM_API_KEY: `LLM_API_KEY="" uvicorn app.main:app --port 8000`
2. All demos above still work with pattern-matched responses
3. Trace shows "response assembled via mock pipeline"

---

## Project Structure

```
neon-paw/
├── frontend/          Next.js 16 + React + TypeScript + Tailwind
│   ├── src/app/       page.tsx, globals.css
│   ├── src/components/  TerminalShell, ASCIIPet, VoiceButton, ChatTranscript,
│   │                    PetStatusPanel, AgentTracePanel, StatusHint,
│   │                    MemoryPanel, MemoryNotification, FirstTimeMemoryNotice
│   ├── src/hooks/     usePetState, useMemory, useSpeechRecognition, useSpeechSynthesis
│   └── src/lib/       api.ts, types.ts, petFrames.ts
│
└── backend/           FastAPI + Python
    ├── app/
    │   ├── agents/          RootBrain-orchestrated multi-agent brain (Phase 8A)
    │   │   ├── intent.py
    │   │   ├── emotion.py
    │   │   ├── action.py
    │   │   ├── state_delta.py
    │   │   ├── memory_decision.py
    │   │   ├── persona.py
    │   │   └── root_brain.py
    │   ├── services/
    │   │   ├── pet_brain.py    backward-compat wrapper
    │   │   └── prompts.py      LLM system prompt
    │   ├── routers/chat.py     POST /api/chat
    │   ├── schemas.py          Pydantic models
    │   ├── config.py           env vars
    │   └── main.py             FastAPI app
    └── .env.example
```

---

## Commit History

```
0f0b9e0 Phase 8A: decompose backend brain into ADK-ready agent modules
2ee44a5 docs: add demo-ready MVP v1 checkpoint
2d82c97 docs: add Phase 7B memory privacy checkpoint
6ad931f feat: Phase 7B — memory privacy and local storage notice
d72824d docs: add demo-ready MVP checkpoint
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

## Known Limitations

| Limitation | Impact | Planned |
|---|---|---|
| No real Google ADK runtime | Modules are Python functions, not ADK agents | Optional future (Phase 8B spec cancelled) |
| No backend STT/TTS | Uses browser APIs only | Phase 9+ |
| No wake word detection | Must click to interact | Phase 9 |
| No database/cloud sync | All state in localStorage | Phase 10+ |
| Memories are localStorage only | Lost if browser data cleared | Phase 10+ |
| No Electron/PWA | Web only | Phase 10 |
| No MCP tool calling | Pet can't use external tools | Phase 10+ |
| Mock mode limited | Pattern-matched replies without API key | — |
| Chinese-only STT | Browser STT set to zh-CN | Could add lang switch |
| Agent brain is rule-based in mock mode | No LLM reasoning without API key | By design |

---

## Recommended Next Phases

### Phase 8B-alt: RootBrain Multi-Agent Stabilization (Current)

- Self-developed RootBrain orchestrator coordinates all agent modules
- DeepSeek is the LLM provider; no Google ADK dependency required
- Architecture is ADK-ready — modules can migrate to ADK sub-agents later if needed
- Google ADK integration spec exists as a cancelled reference (`phase-8b-adk-integration-design.md`)

### Phase 9: Wake Word Prototype

- Implement "Hey NEON PAW" / "NEON PAW，醒醒" wake word detection
- Browser-side keyword spotting or lightweight model
- Always-listening mode with visual indicator
- Transition from click-to-talk to voice-activated interaction

### Phase 10: Packaging & Deployment

- Electron desktop app wrapper
- PWA support for mobile
- Backend deployment (cloud or local)
- Optional: cloud sync for memories and pet state
- Optional: MCP tool calling for external integrations

---

## Security Checklist

- [x] `.env` is git-ignored (root `.gitignore` covers `backend/.env`)
- [x] `.env` is not tracked in git
- [x] No API keys in source code
- [x] LLM API key read from environment variable only
- [x] CORS restricted to `localhost:3000`
- [x] Memories stored in browser localStorage only
- [x] No server-side user data persistence
