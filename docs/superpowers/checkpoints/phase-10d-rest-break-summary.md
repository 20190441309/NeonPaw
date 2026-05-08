# Rest Break Summary — After Phase 10D

**Date:** 2026-05-08
**Branch:** main
**Latest Commit:** 4c258a5
**Frontend Build:** Pass (Next.js 16.2.4, Turbopack)
**Backend Tests:** 44/44 pass

---

## Completed Phases

| Phase | Description | Commit |
|---|---|---|
| 1–7B | Core MVP: terminal UI, pet brain, voice, TTS, memory, persistence | various |
| 8A | Decompose backend brain into ADK-ready agent modules | 0f0b9e0 |
| 8B-alt | RootBrain multi-agent stabilization (no real ADK runtime) | 78f3899 |
| 9A | RootBrain multi-agent pytest tests (44 tests) | c5c109e |
| 10A | Browser wake word prototype | d994c9d |
| 10B | Hands-free wake conversation (inline + follow-up) | cff58a0 |
| 10C | Hands-free conversation session (multi-turn, stop phrases, timeout) | 155d7e1 |
| **10D** | **STT accuracy & correction UX** | **4c258a5** |

---

## Phase 10D Summary

Added speech recognition accuracy improvements:

- **speechUtils.ts** — Pure utility functions for text normalization, wake word splitting, low-confidence detection, and meaningful speech filtering
- **SpeechConfirmBar** — Editable confirmation bar shown when STT result is low confidence; user can edit text and SEND or click RETRY to re-record
- **useSpeechRecognition** — Now reads browser `confidence` field, splits callbacks into `onResult` (high confidence, auto-send) and `onLowConfidence` (shows confirm bar)
- **VoiceButton** — New visual states for pending confirmation and low confidence (yellow border, `?` icon)
- **All voice paths unified** — click-to-talk, wake inline command, and session listening all use the same low-confidence detection → confirmation flow
- **Noise filtering** — normalizeSpeechText strips redundant punctuation, collapses whitespace; isMeaningfulSpeech rejects empty/filler-only/punctuation-only text

---

## Current Working Features

### Core (Phase 1–7B)
- Retro terminal UI with ASCII pet frames (10 scene frames)
- Browser STT (Web Speech API) for Chinese voice input
- Single-agent RootBrain with mock and DeepSeek LLM paths
- Pet state machine (booting, sleeping, awake, listening, thinking, speaking, error)
- Browser TTS (SpeechSynthesis API) for pet replies
- Agent trace panel showing decision pipeline
- Simple long-term memory with localStorage persistence
- Pet state persistence across page refresh

### Voice Interaction (Phase 10A–10D)
- **Wake Mode (OFF by default):** browser mic listens for wake phrases ("小爪醒醒", "NEON PAW")
- **Hands-free session:** after wake, continuous conversation without re-saying wake phrase
- **Stop phrases:** "先这样", "不用了", "结束对话", "退出", "stop", "sleep"
- **Session timeout:** 25s silence returns to wake listening
- **Click-to-talk** always works regardless of Wake Mode state
- **Low-confidence detection:** short text, filler words, low browser confidence → show confirmation bar
- **Speech correction:** editable text input, SEND/RETRY buttons, low-confidence warning
- **Noise normalization:** trim, strip punctuation, collapse whitespace

### Backend (Phase 8A–9A)
- ADK-ready agent module decomposition (intent, emotion, action, state_delta, memory_decision, persona)
- RootBrain orchestrator (mock + LLM paths)
- 44 pytest tests covering all agent modules

---

## Current Architecture

```
Frontend (Next.js 16 + React + TypeScript + Tailwind)
  ├── page.tsx — main page, wires all hooks and components
  ├── hooks/
  │   ├── usePetState.ts — pet state machine + localStorage persistence
  │   ├── useSpeechRecognition.ts — browser STT + confidence + low-conf callbacks
  │   ├── useSpeechSynthesis.ts — browser TTS (SpeechSynthesis API)
  │   ├── useWakeWord.ts — wake word + session state machine
  │   └── useMemory.ts — simple memory with localStorage
  ├── components/
  │   ├── TerminalShell.tsx — terminal frame, scanlines, header/footer
  │   ├── ASCIIPet.tsx — ASCII pet rendering
  │   ├── VoiceButton.tsx — mic button with wake/confirm/low-conf indicators
  │   ├── SpeechConfirmBar.tsx — editable confirmation bar (Phase 10D)
  │   ├── WakeModeToggle.tsx — [WAKE] / [WAKE:ON] toggle
  │   ├── ChatTranscript.tsx — conversation display
  │   ├── PetStatusPanel.tsx — state bars
  │   ├── AgentTracePanel.tsx — agent decision trace
  │   └── MemoryPanel.tsx — memory display
  └── lib/
      ├── api.ts — callChatApi() → POST /api/chat
      ├── petFrames.ts — ASCII scene frames (10 frames)
      ├── speechUtils.ts — text normalization, confidence check, wake word split (Phase 10D)
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
      └── test_root_brain.py — root brain tests (requires openai package)
```

---

## Voice Interaction State Machine

### Wake Word System (useWakeWord.ts)

```
                ┌─────────────────────────────────────┐
                │                                     │
                ▼                                     │
        wake_listening                                │
          │           │                               │
   wake phrase      wake phrase                       │
   + inline cmd     only                               │
       │               │                               │
       ▼               ▼                               │
     idle      command_listening                       │
       │           │         │                         │
  low-conf?    command    timeout (10s)                │
  → confirm    captured      │                         │
  → send         │           ▼                         │
       │         ▼     onCommandTimeout                │
       │       idle     → wake_listening               │
       │         │                                     │
       │    low-conf?                                  │
       │    → confirm                                  │
       │    → send                                     │
       │         │                                     │
       ▼         ▼                                     │
  ┌────────────────────┐                               │
  │  TTS playback      │                               │
  │  (paused, no mic)  │                               │
  └────────┬───────────┘                               │
           │                                           │
           ▼                                           │
    session_listening ◄── TTS finishes + session       │
       │         │         active → resume             │
  any speech   stop phrase                             │
       │         │                                     │
  low-conf?    ▼                                       │
  → confirm  idle + end session                        │
  → send        │                                      │
       │        ▼                                      │
       │   wake_listening ─────────────────────────────┘
       │
  silence timeout (25s) or retries exhausted
       │
       ▼
  onCommandTimeout → wake_listening
```

### Speech Confirmation Flow (Phase 10D)

```
STT final result
       │
       ▼
isLowConfidenceSpeech()?
       │
   ┌───┴───┐
   │       │
  NO      YES
   │       │
   ▼       ▼
 auto    setPendingSpeech()
 send    SpeechConfirmBar appears
   │       │
   │   ┌───┴───┐
   │   │       │
   │  SEND   RETRY
   │   │       │
   │   ▼       ▼
   │ startVoice  clear pending
   │ Interaction  resume listening
   │   │
   ▼   ▼
 /api/chat
```

---

## Low Confidence Triggers

| Trigger | Example | Rule |
|---|---|---|
| Browser confidence < 0.6 | (browser-provided) | Numeric threshold |
| Text < 2 Chinese chars | "啊" | Length check |
| Text < 3 non-Chinese chars | "oh" | Length check |
| Only filler words | "嗯嗯" | Filler word set |
| Empty after normalization | "" | Empty check |
| Only punctuation | "。。。" | Regex check |
| Duplicate of last message (< 3s) | same text again | Time + content check |

---

## UI Status Text Reference

| State | Header | Footer |
|---|---|---|
| Wake listening | AWAKE | WAKE WORD ACTIVE |
| Wake phrase detected | AWAKE | — |
| Follow-up mode | LISTENING FOR COMMAND | LISTENING FOR COMMAND |
| Processing inline | PROCESSING COMMAND | PROCESSING COMMAND |
| Session listening | AWAKE | SESSION LISTENING |
| Session + thinking | THINKING | SESSION // THINKING... |
| Session + speaking | SPEAKING | SESSION // SPEAKING... |
| Session timeout | SESSION TIMEOUT | SESSION TIMEOUT // WAKE WORD ACTIVE |
| Pending + low confidence | (pet mode) | LOW CONFIDENCE // 可能没听清 |
| Pending + high confidence | (pet mode) | HEARD: 等待确认 |
| Listening | LISTENING | LISTENING... |
| Wake off + sleeping | SLEEPING | TAP SCREEN TO WAKE |
| Wake off + awake | AWAKE | TAP MICROPHONE TO TALK |

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
cd backend && pytest tests/test_agents.py -v  # 44 tests
cd frontend && npm run build  # TypeScript check
```

---

## Current Known Limitations

1. **SpeechRecognition accuracy** — Browser STT can be inaccurate for short Chinese wake phrases or noisy environments.
2. **Chrome/Edge only** — Web Speech API not available in Firefox/Safari.
3. **Page must be open** — Wake listening stops when tab is closed.
4. **One SpeechRecognition instance at a time** — Wake hook creates/destroys instances per mode switch.
5. **Browser confidence field** — Not available in all browsers; falls back to heuristic-only detection.
6. **Filler word list** — Not exhaustive; may need expansion based on real usage.
7. **No backend STT/TTS** — Uses browser-native APIs only.
8. **No real ADK runtime** — RootBrain is self-developed orchestrator, not Google ADK.
9. **Stop phrase substring matching** — "不用了谢谢" also triggers stop.
10. **Duplicate detection window (3s)** — Heuristic; may need tuning.

---

## Important Files

| File | Purpose |
|---|---|
| `frontend/src/hooks/useWakeWord.ts` | Wake word + session state machine |
| `frontend/src/hooks/useSpeechRecognition.ts` | Browser STT + confidence + low-conf callbacks |
| `frontend/src/lib/speechUtils.ts` | Text normalization, confidence check, wake word split |
| `frontend/src/components/SpeechConfirmBar.tsx` | Editable confirmation bar |
| `frontend/src/app/page.tsx` | Main page wiring all hooks |
| `backend/app/agents/root_brain.py` | Agent orchestrator (mock + LLM paths) |
| `backend/app/schemas.py` | API contract types |
| `CLAUDE.md` | Project instructions, architecture, design decisions |

## Key Checkpoints

| Checkpoint | File |
|---|---|
| Phase 10D | `docs/superpowers/checkpoints/phase-10d-stt-correction-checkpoint.md` |
| Phase 10C | `docs/superpowers/checkpoints/phase-10c-hands-free-session-checkpoint.md` |
| Phase 10B | `docs/superpowers/checkpoints/phase-10b-hands-free-wake-checkpoint.md` |
| Phase 10A | `docs/superpowers/checkpoints/phase-10a-wake-word-checkpoint.md` |
| Phase 9A | `docs/superpowers/checkpoints/phase-9a-rootbrain-testing-checkpoint.md` |
| Phase 8B-alt | `docs/superpowers/checkpoints/phase-8b-alt-rootbrain-checkpoint.md` |

---

## Recommended Next Phases

### Phase 11A: Backend STT Integration
Replace browser STT with server-side Whisper or Gemini STT for better accuracy, especially for Chinese. Add `/api/stt` endpoint.

### Phase 11B: Wake Phrase Fuzzy Matching
Handle near-misses like "小爪行行" → "小爪醒醒" using edit distance or phonetic similarity.

### Phase 11C: Confidence Visualization
Add waveform or confidence bar to the listening UI so users can see real-time recognition quality.

### Phase 12: Real ADK Multi-Agent
Replace RootBrain orchestrator with Google ADK runtime. Decompose into Intent, Emotion, Persona, State, Action, Memory agents.

---

**Project is clean. No uncommitted changes. Safe to exit.**
