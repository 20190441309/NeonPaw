# NEON PAW MVP — Design Spec

**Date:** 2026-05-02
**Status:** Approved
**Scope:** MVP — voice-interacting cyber terminal pet with single-agent brain

---

## 1. Overview

NEON PAW is a retro terminal-style AI electronic pet. It uses voice input to talk with the user, has basic pet states, ASCII/scene-frame animation, TTS voice replies, and a single-agent brain. The MVP prioritizes "voice interaction experience closure" — a working loop from voice input to pet response with visual feedback.

**Core loop:**
```
User voice → Browser STT → Frontend → POST /api/chat → Backend pet_brain
  → Structured JSON → Frontend: ASCII frame + state update + TTS
```

---

## 2. Architecture

**Stack:**
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- Communication: REST (POST /api/chat)
- Persistence: localStorage (MVP), SQLite-ready for later

**Key decisions:**
- Frontend owns pet state via localStorage
- Backend is stateless — receives pet_state in each request, returns state_delta
- No /api/state endpoint for MVP
- Mock LLM by default; LLM-ready with single function swap
- Desktop-first, CSS-only effects (scanline, glow)
- No Framer Motion, no canvas, no backend STT/TTS

**Project structure:**
```
neon-paw/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── TerminalShell.tsx
│   │   │   ├── ASCIIPet.tsx
│   │   │   ├── ChatTranscript.tsx
│   │   │   ├── PetStatusPanel.tsx
│   │   │   ├── VoiceButton.tsx
│   │   │   └── AgentTracePanel.tsx
│   │   ├── hooks/
│   │   │   ├── useSpeechRecognition.ts
│   │   │   ├── useSpeechSynthesis.ts
│   │   │   └── usePetState.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── petFrames.ts
│   │   │   └── types.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── tsconfig.json
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── schemas.py
    │   ├── routers/
    │   │   └── chat.py
    │   └── services/
    │       ├── pet_brain.py
    │       └── prompts.py
    ├── requirements.txt
    └── .env.example
```

---

## 3. ASCII Frame System

**Frame selection priority:** action > emotion > mode

All frames stored in `frontend/src/lib/petFrames.ts` as `String.raw` template literals, ~60 chars wide.

**Frame keys:**

| Key | Trigger |
|---|---|
| booting | App first load |
| sleeping | Default idle state |
| awake | Pet awake, no active action |
| listening | Voice input active |
| thinking | Waiting for backend |
| speaking | TTS playing |
| happy | action=happy |
| comforting | action=comfort |
| glitch | Error or action=glitch |
| error | Fatal error |

**Design principles:**
- Each frame is a complete terminal scene (borders, labels, status text), not just a pet face
- Pet face changes per state: `( o.o )` awake, `( -.- )` sleeping, `( ^.^ )` happy, `( x_x )` glitch
- Consistent width across all frames to avoid layout jumps
- Chat transcript appears below ASCII art, inside the same terminal border

---

## 4. Terminal Effects (CSS-only)

Applied via `globals.css` classes on `TerminalShell`.

**Scanline overlay:**
```css
.scanline::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(0, 0, 0, 0.15) 2px, rgba(0, 0, 0, 0.15) 4px
  );
  pointer-events: none;
  z-index: 10;
}
```

**Text glow:**
```css
.glow {
  text-shadow:
    0 0 5px rgba(0, 255, 204, 0.4),
    0 0 10px rgba(0, 255, 204, 0.2);
}
```

**Subtle flicker (optional, very light):**
```css
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.97; }
}
.terminal-flicker {
  animation: flicker 4s ease-in-out infinite;
}
```

No heavy CRT shader, no canvas, no Framer Motion.

---

## 5. State Management

**PetState type:**
```ts
type PetMode = "booting" | "sleeping" | "awake" | "listening"
             | "thinking" | "speaking" | "error";
type PetEmotion = "neutral" | "happy" | "sad" | "sleepy"
               | "curious" | "comforting" | "glitch";

interface PetState {
  name: string;
  mode: PetMode;
  emotion: PetEmotion;
  energy: number;    // 0-100
  mood: number;      // 0-100
  affinity: number;  // 0-100
  hunger: number;    // 0-100
  stability: number; // 0-100
  lastInteractionAt: string;
}
```

**Default state:**
```json
{
  "name": "NEON PAW", "mode": "sleeping", "emotion": "sleepy",
  "energy": 80, "mood": 70, "affinity": 20, "hunger": 30, "stability": 95,
  "lastInteractionAt": ""
}
```

**State transitions:**

| Trigger | Mode | Emotion |
|---|---|---|
| App load | booting → sleeping | sleepy |
| User taps screen (when sleeping/awake) | awake | curious |
| User starts voice | listening | — |
| Voice captured | thinking | — |
| Response received | speaking | from response |
| TTS ends | awake | from response |
| Long idle (60s+) | sleeping | sleepy |
| Voice/backend error | error | glitch |

**Persistence (localStorage):**
- Key: `neon_paw_state`
- Stores: petState + last 20 conversation messages
- Agent traces NOT persisted (ephemeral)
- On load: restore if saved < 24h ago; otherwise use defaults + booting animation

**Numeric state rules:**
- All values clamped to 0-100 after every delta application
- `value = max(0, min(100, value))`

---

## 6. Voice Integration

**STT — Web Speech API:**
- `webkitSpeechRecognition` / `SpeechRecognition`
- Language: `zh-CN` preferred, `en-US` fallback
- `continuous: false` (one utterance per click)
- `interimResults: true` (show partial text while speaking)
- Auto-stop after 10s silence

**TTS — SpeechSynthesis:**
- Prefer Chinese voice if available
- Rate: 1.0, Pitch: 1.1
- `voice_style` field logged but not acted on in MVP

**Voice flow:**
```
1. Click mic → mode: listening, show waveform
2. Interim results update display
3. Silence detected → mode: thinking
4. POST /api/chat with recognized text
5. Response → mode: speaking, start TTS
6. TTS ends → mode: awake
```

**Browser not supported → show Chrome/Edge suggestion.**

---

## 7. Backend API

**POST /api/chat**

Request:
```json
{
  "message": "你好",
  "pet_state": { "name": "NEON PAW", "mode": "awake", ... },
  "conversation_history": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "信号接入成功。" }
  ]
}
```

Response:
```json
{
  "reply": "我醒啦，正在接收你的声音信号。",
  "emotion": "happy",
  "action": "wake",
  "voice_style": "soft_robotic",
  "state_delta": { "energy": -2, "mood": 5, "affinity": 3, "hunger": 1, "stability": 0 },
  "memory": { "should_save": false, "content": "" },
  "trace": [{ "module": "root_agent", "message": "Greeting detected. Wake action selected." }]
}
```

**Mock mode:**
- Default when `LLM_API_KEY` is not set
- Keyword matching on user message → canned responses
- Patterns: greeting → wake, sad → comfort, question → think, default → idle

**LLM-ready:**
```python
async def generate_response(message, pet_state, history, memories):
    if config.LLM_API_KEY:
        return await call_llm(message, pet_state, history, memories)
    return mock_response(message, pet_state)
```

**Allowed actions:** wake, sleep, listen, think, speak, happy, comfort, idle, glitch, error

**Allowed emotions:** neutral, happy, sad, sleepy, curious, comforting, glitch

**CORS:** Allow `http://localhost:3000` only.

---

## 8. Frontend Components

**Component tree:**
```
TerminalShell (scanline overlay, glow, border, click-to-wake)
├── Header ("NEON PAW // status", mode label)
├── ASCIIPet (renders selected scene frame in <pre>)
├── ChatTranscript (inline user/pet messages, auto-scroll)
├── PetStatusPanel (energy/mood/affinity/hunger bars)
├── VoiceButton (mic icon, state-dependent styling)
├── AgentTracePanel (collapsible, dev-only)
└── Footer ("TAP SCREEN TO ACTIVATE MICROPHONE")
```

**TerminalShell:** Full-screen dark container, monospace font, scanline `::before`, max-width ~720px centered.

**ASCIIPet:** Receives `currentFrame` string, renders in `<pre>`. Frame selection lives in `usePetState`.

**ChatTranscript:** Last N messages, `USER:` / `PAW:` prefixes, auto-scroll, hidden during boot/sleep.

**PetStatusPanel:** Four bars with block characters (`████████░░`), reactive to state changes.

**VoiceButton:** Circular mic icon, states: idle / listening (pulsing red) / thinking (spinner) / disabled (gray).

**AgentTracePanel:** Collapsed by default, shows `[module] message` entries from last response.

---

## 9. Error Handling

Every failure shows a visible pet response — never silent failure.

| Failure | Behavior |
|---|---|
| Browser no STT support | Message: "语音识别需要 Chrome 或 Edge" |
| No mic permission | Error/glitch frame, prompt to allow mic |
| Recognition timeout | Idle, "我没有听清，再说一次？" |
| Backend unreachable | Frontend fallback response |
| HTTP 500 | Backend fallback response |
| Invalid LLM JSON | Backend catches → fallback |
| TTS unavailable | Skip voice, show text only |

**Fallback response:**
```json
{
  "reply": "核心信号有点不稳定……但我还在这里。",
  "emotion": "glitch", "action": "glitch",
  "state_delta": { "energy": -1, "mood": -1, "affinity": 0, "hunger": 0, "stability": -3 },
  "memory": { "should_save": false, "content": "" },
  "trace": [{ "module": "fallback", "message": "LLM failed or returned invalid JSON." }]
}
```

Invalid emotion/action from backend → fall back to `neutral`/`idle`.
Corrupted localStorage → ignore, use default state.

---

## 10. Development Approach

**Visual-First Layered — 4 phases:**

**Phase 1: Terminal UI + ASCII Frames**
- Next.js project scaffold
- TerminalShell with scanline/glow effects
- All 10 ASCII scene frames in petFrames.ts
- ASCIIPet rendering with frame selection
- PetStatusPanel with status bars
- usePetState hook with state transitions
- Booting → sleeping → awake animation
- Click-to-wake

**Phase 2: Voice Integration**
- useSpeechRecognition hook
- VoiceButton component with all states
- useSpeechSynthesis hook
- Listening → thinking → speaking flow
- Error handling for unsupported browsers

**Phase 3: Backend**
- FastAPI scaffold
- POST /api/chat endpoint
- Pydantic schemas
- Mock response system
- LLM-ready architecture
- CORS configuration

**Phase 4: Integration & Polish**
- Wire frontend to backend
- ChatTranscript component
- AgentTracePanel (collapsible)
- localStorage persistence
- Full error handling
- End-to-end testing

---

## 11. What MVP Does NOT Include

- Real Google ADK multi-agent
- Backend STT / TTS
- SQLite or any database
- User login / auth
- Framer Motion or canvas effects
- Wake word detection
- Always-on voice listening
- Electron / PWA
- MCP tool calling
