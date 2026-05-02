# NEON PAW MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a retro terminal AI pet with voice interaction, ASCII scene frames, and a single-agent brain.

**Architecture:** Next.js frontend owns pet state via localStorage. FastAPI backend is stateless, returns structured JSON from mock responses (LLM-ready). Browser Web Speech API for STT/TTS.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, FastAPI, Python

**Design Spec:** `docs/superpowers/specs/2026-05-02-neon-paw-mvp-design.md`

---

## Phase 1: Terminal UI + ASCII Frames

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `frontend/` (Next.js project via `create-next-app`)
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/.gitignore`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/hj/Desktop/hj/NeonPaw
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: Verify scaffold**

```bash
cd frontend && npm run dev
# Open http://localhost:3000 — should show default Next.js page
```

- [ ] **Step 3: Create types.ts**

Create `frontend/src/lib/types.ts`:

```ts
export type PetMode =
  | "booting" | "sleeping" | "awake" | "listening"
  | "thinking" | "speaking" | "error";

export type PetEmotion =
  | "neutral" | "happy" | "sad" | "sleepy"
  | "curious" | "comforting" | "glitch";

export type PetAction =
  | "wake" | "sleep" | "listen" | "think" | "speak"
  | "happy" | "comfort" | "idle" | "glitch" | "error";

export interface PetState {
  name: string;
  mode: PetMode;
  emotion: PetEmotion;
  energy: number;
  mood: number;
  affinity: number;
  hunger: number;
  stability: number;
  lastInteractionAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TraceEntry {
  module: string;
  message: string;
}

export interface StateDelta {
  energy: number;
  mood: number;
  affinity: number;
  hunger: number;
  stability: number;
}

export interface ChatResponse {
  reply: string;
  emotion: PetEmotion;
  action: PetAction;
  voice_style: string;
  state_delta: StateDelta;
  memory: { should_save: boolean; content: string };
  trace: TraceEntry[];
}

export interface ChatRequest {
  message: string;
  pet_state: PetState;
  conversation_history: ChatMessage[];
}

export const DEFAULT_PET_STATE: PetState = {
  name: "NEON PAW",
  mode: "sleeping",
  emotion: "sleepy",
  energy: 80,
  mood: 70,
  affinity: 20,
  hunger: 30,
  stability: 95,
  lastInteractionAt: "",
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js project with TypeScript types"
```

---

### Task 2: ASCII Scene Frames + Terminal Effects

**Files:**
- Create: `frontend/src/lib/petFrames.ts`
- Modify: `frontend/src/styles/globals.css`
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Create petFrames.ts**

Create `frontend/src/lib/petFrames.ts` with all 10 scene frames (booting, sleeping, awake, listening, thinking, speaking, happy, comforting, glitch, error). Each frame is a `String.raw` template literal, ~60 chars wide, containing a complete terminal scene with borders, pet face, and contextual labels. Use the frames from the CLAUDE.md spec.

- [ ] **Step 2: Add terminal effects to globals.css**

Replace `frontend/src/styles/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --terminal-bg: #0a0a0a;
  --terminal-text: #00ffcc;
  --terminal-dim: #00ffcc66;
  --terminal-border: #00ffcc33;
}

body {
  background: var(--terminal-bg);
  color: var(--terminal-text);
  font-family: 'Courier New', 'Consolas', monospace;
}

/* Scanline overlay */
.scanline::before {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.15) 2px,
    rgba(0, 0, 0, 0.15) 4px
  );
  pointer-events: none;
  z-index: 50;
}

/* Text glow */
.glow {
  text-shadow:
    0 0 5px rgba(0, 255, 204, 0.4),
    0 0 10px rgba(0, 255, 204, 0.2);
}

/* Terminal flicker — very subtle */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.97; }
}
.terminal-flicker {
  animation: 4s ease-in-out infinite flicker;
}

/* Status bar block characters */
.status-bar-fill {
  color: var(--terminal-text);
}
.status-bar-empty {
  color: #1a3a33;
}
```

- [ ] **Step 3: Verify styles load**

```bash
cd frontend && npm run dev
# Open http://localhost:3000 — page should have dark background, cyan text
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/petFrames.ts frontend/src/styles/globals.css
git commit -m "feat: add ASCII scene frames and terminal CSS effects"
```

---

### Task 3: TerminalShell + ASCIIPet + PetStatusPanel

**Files:**
- Create: `frontend/src/components/TerminalShell.tsx`
- Create: `frontend/src/components/ASCIIPet.tsx`
- Create: `frontend/src/components/PetStatusPanel.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create TerminalShell.tsx**

```tsx
"use client";

import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  statusLabel: string;
  onClick?: () => void;
}

export default function TerminalShell({ children, statusLabel, onClick }: Props) {
  return (
    <div
      className="scanline terminal-flicker min-h-screen flex items-center justify-center p-4"
      onClick={onClick}
    >
      <div className="w-full max-w-[720px] border border-[var(--terminal-border)] rounded-sm glow select-none">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--terminal-border)] text-xs">
          <span>NEON PAW // TERMINAL PET OS</span>
          <span className="uppercase">{statusLabel}</span>
        </div>
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--terminal-border)] text-xs text-center opacity-60">
          TAP SCREEN TO ACTIVATE MICROPHONE
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ASCIIPet.tsx**

```tsx
"use client";

interface Props {
  frame: string;
}

export default function ASCIIPet({ frame }: Props) {
  return (
    <pre className="text-xs leading-tight whitespace-pre overflow-x-auto text-center glow">
      {frame}
    </pre>
  );
}
```

- [ ] **Step 3: Create PetStatusPanel.tsx**

```tsx
"use client";

import { PetState } from "@/lib/types";

interface Props {
  state: PetState;
}

function Bar({ label, value }: { label: string; value: number }) {
  const filled = Math.round(value / 10);
  const empty = 10 - filled;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 uppercase opacity-70">{label}</span>
      <span className="status-bar-fill">{"█".repeat(filled)}</span>
      <span className="status-bar-empty">{"░".repeat(empty)}</span>
      <span className="w-8 text-right opacity-50">{value}</span>
    </div>
  );
}

export default function PetStatusPanel({ state }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1 mt-3">
      <Bar label="Energy" value={state.energy} />
      <Bar label="Mood" value={state.mood} />
      <Bar label="Affinity" value={state.affinity} />
      <Bar label="Hunger" value={state.hunger} />
    </div>
  );
}
```

- [ ] **Step 4: Create initial page.tsx**

Replace `frontend/src/app/page.tsx`:

```tsx
"use client";

import TerminalShell from "@/components/TerminalShell";
import ASCIIPet from "@/components/ASCIIPet";
import PetStatusPanel from "@/components/PetStatusPanel";
import { sceneFrames } from "@/lib/petFrames";
import { DEFAULT_PET_STATE } from "@/lib/types";

export default function Home() {
  return (
    <TerminalShell statusLabel="SLEEPING">
      <ASCIIPet frame={sceneFrames.sleeping} />
      <PetStatusPanel state={DEFAULT_PET_STATE} />
    </TerminalShell>
  );
}
```

- [ ] **Step 5: Verify rendering**

```bash
cd frontend && npm run dev
# Open http://localhost:3000 — should see sleeping ASCII cat in terminal frame
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ frontend/src/app/page.tsx
git commit -m "feat: add TerminalShell, ASCIIPet, PetStatusPanel components"
```

---

### Task 4: usePetState Hook + State Machine

**Files:**
- Create: `frontend/src/hooks/usePetState.ts`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create usePetState.ts**

```ts
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  PetState, PetMode, PetEmotion, PetAction,
  ChatMessage, TraceEntry, StateDelta,
  DEFAULT_PET_STATE,
} from "@/lib/types";
import { sceneFrames, type PetFrameKey } from "@/lib/petFrames";

const STORAGE_KEY = "neon_paw_state";
const IDLE_TIMEOUT_MS = 60_000;
const STATE_STALE_MS = 24 * 60 * 60 * 1000;

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function applyDelta(state: PetState, delta: StateDelta): PetState {
  return {
    ...state,
    energy: clamp(state.energy + delta.energy),
    mood: clamp(state.mood + delta.mood),
    affinity: clamp(state.affinity + delta.affinity),
    hunger: clamp(state.hunger + delta.hunger),
    stability: clamp(state.stability + delta.stability),
  };
}

function selectFrame(mode: PetMode, emotion: PetEmotion, action?: PetAction): string {
  const key: PetFrameKey =
    action && action in sceneFrames ? action as PetFrameKey :
    emotion in sceneFrames ? emotion as PetFrameKey :
    mode in sceneFrames ? mode as PetFrameKey :
    "sleeping";
  return sceneFrames[key];
}

function loadState(): { petState: PetState; history: ChatMessage[] } {
  if (typeof window === "undefined") return { petState: DEFAULT_PET_STATE, history: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no state");
    const stored = JSON.parse(raw);
    const savedAt = new Date(stored.lastSavedAt).getTime();
    if (Date.now() - savedAt > STATE_STALE_MS) throw new Error("stale");
    return { petState: stored.petState, history: stored.conversationHistory ?? [] };
  } catch {
    return { petState: DEFAULT_PET_STATE, history: [] };
  }
}

function saveState(petState: PetState, history: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ petState, conversationHistory: history.slice(-20), lastSavedAt: new Date().toISOString() })
  );
}

export function usePetState() {
  const initial = useRef(loadState());
  const [petState, setPetState] = useState<PetState>(initial.current.petState);
  const [history, setHistory] = useState<ChatMessage[]>(initial.current.history);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [lastAction, setLastAction] = useState<PetAction | undefined>();
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const currentFrame = selectFrame(petState.mode, petState.emotion, lastAction);

  // Persist on change
  useEffect(() => { saveState(petState, history); }, [petState, history]);

  // Idle timeout → sleeping
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (petState.mode === "awake") {
      idleTimer.current = setTimeout(() => {
        setPetState((s) => ({ ...s, mode: "sleeping", emotion: "sleepy" }));
        setLastAction(undefined);
      }, IDLE_TIMEOUT_MS);
    }
  }, [petState.mode]);

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimer.current);
  }, [petState.mode, resetIdleTimer]);

  const wake = useCallback(() => {
    if (petState.mode !== "sleeping" && petState.mode !== "awake") return;
    setPetState((s) => ({
      ...s,
      mode: "awake",
      emotion: "curious",
      energy: clamp(s.energy - 1),
      affinity: clamp(s.affinity + 1),
      lastInteractionAt: new Date().toISOString(),
    }));
    setLastAction("wake");
  }, [petState.mode]);

  const setListening = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "listening" }));
    setLastAction(undefined);
  }, []);

  const setThinking = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "thinking" }));
    setLastAction(undefined);
  }, []);

  const applyResponse = useCallback((resp: { emotion: PetEmotion; action: PetAction; state_delta: StateDelta; trace: TraceEntry[] }) => {
    setPetState((s) => {
      const updated = applyDelta({
        ...s,
        emotion: resp.emotion,
        mode: "speaking",
        lastInteractionAt: new Date().toISOString(),
      }, resp.state_delta);
      return updated;
    });
    setLastAction(resp.action);
    setTrace(resp.trace);
  }, []);

  const setSpeaking = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "speaking" }));
  }, []);

  const setIdle = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "awake" }));
    setLastAction(undefined);
  }, []);

  const setError = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "error", emotion: "glitch" }));
    setLastAction("error");
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setHistory((h) => [...h, msg].slice(-20));
  }, []);

  return {
    petState, currentFrame, history, trace, lastAction,
    wake, setListening, setThinking, setSpeaking, setIdle, setError,
    applyResponse, addMessage,
  };
}
```

- [ ] **Step 2: Update page.tsx to use hook**

```tsx
"use client";

import TerminalShell from "@/components/TerminalShell";
import ASCIIPet from "@/components/ASCIIPet";
import PetStatusPanel from "@/components/PetStatusPanel";
import { usePetState } from "@/hooks/usePetState";

export default function Home() {
  const { petState, currentFrame, wake } = usePetState();

  return (
    <TerminalShell
      statusLabel={petState.mode.toUpperCase()}
      onClick={wake}
    >
      <ASCIIPet frame={currentFrame} />
      <PetStatusPanel state={petState} />
    </TerminalShell>
  );
}
```

- [ ] **Step 3: Verify state transitions**

```bash
cd frontend && npm run dev
# 1. Page loads → sleeping frame with status bars
# 2. Click screen → awake frame, mode shows "AWAKE"
# 3. Wait 60s → back to sleeping
# 4. Refresh page → state restores from localStorage
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/usePetState.ts frontend/src/app/page.tsx
git commit -m "feat: add pet state machine with localStorage persistence"
```

---

## Phase 2: Voice Integration

### Task 5: Speech Recognition + Synthesis Hooks

**Files:**
- Create: `frontend/src/hooks/useSpeechRecognition.ts`
- Create: `frontend/src/hooks/useSpeechSynthesis.ts`

- [ ] **Step 1: Create useSpeechRecognition.ts**

```ts
"use client";

import { useState, useCallback, useRef } from "react";

interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback((onResult: (text: string) => void) => {
    if (!isSupported) {
      setError("语音识别需要 Chrome 或 Edge 浏览器");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setInterimTranscript("");
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) {
        setTranscript(final);
        setInterimTranscript("");
        onResult(final);
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("请允许麦克风访问权限");
      } else if (event.error === "no-speech") {
        setError("我没有听清，再说一次？");
      } else {
        setError(`语音识别出错: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isListening, transcript, interimTranscript, error, isSupported, start, stop };
}
```

- [ ] **Step 2: Create useSpeechSynthesis.ts**

```ts
"use client";

import { useState, useCallback } from "react";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!isSupported) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Prefer Chinese voice
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find((v) => v.lang.startsWith("zh"));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, isSupported, speak, cancel };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add speech recognition and synthesis hooks"
```

---

### Task 6: VoiceButton + Voice Flow

**Files:**
- Create: `frontend/src/components/VoiceButton.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create VoiceButton.tsx**

```tsx
"use client";

interface Props {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  onClick: () => void;
}

export default function VoiceButton({ isListening, isThinking, isSpeaking, isSupported, onClick }: Props) {
  if (!isSupported) {
    return (
      <div className="text-center mt-3 text-xs opacity-50">
        语音识别需要 Chrome 或 Edge 浏览器
      </div>
    );
  }

  const isDisabled = isThinking || isSpeaking;

  return (
    <div className="flex justify-center mt-4">
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`
          w-14 h-14 rounded-full border-2 flex items-center justify-center
          transition-all duration-300 text-lg
          ${isListening
            ? "border-red-500 bg-red-500/20 animate-pulse"
            : isDisabled
              ? "border-gray-600 opacity-40 cursor-not-allowed"
              : "border-[var(--terminal-text)] hover:bg-[var(--terminal-text)]/10 cursor-pointer"
          }
        `}
        aria-label={isListening ? "停止录音" : "开始说话"}
      >
        {isThinking ? "⏳" : isListening ? "🔴" : "🎤"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Wire voice flow into page.tsx**

```tsx
"use client";

import TerminalShell from "@/components/TerminalShell";
import ASCIIPet from "@/components/ASCIIPet";
import PetStatusPanel from "@/components/PetStatusPanel";
import VoiceButton from "@/components/VoiceButton";
import { usePetState } from "@/hooks/usePetState";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

export default function Home() {
  const pet = usePetState();
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const handleVoiceClick = () => {
    if (stt.isListening) {
      stt.stop();
      return;
    }
    pet.setListening();
    stt.start((text) => {
      pet.setThinking();
      // Backend call will be wired in Phase 4
      console.log("Recognized:", text);
    });
  };

  return (
    <TerminalShell
      statusLabel={pet.petState.mode.toUpperCase()}
      onClick={pet.wake}
    >
      <ASCIIPet frame={pet.currentFrame} />
      <PetStatusPanel state={pet.petState} />
      {stt.interimTranscript && (
        <div className="text-xs mt-2 opacity-60 text-center">
          {stt.interimTranscript}...
        </div>
      )}
      {stt.error && (
        <div className="text-xs mt-2 text-red-400 text-center">
          {stt.error}
        </div>
      )}
      <VoiceButton
        isListening={stt.isListening}
        isThinking={false}
        isSpeaking={tts.isSpeaking}
        isSupported={stt.isSupported}
        onClick={handleVoiceClick}
      />
    </TerminalShell>
  );
}
```

- [ ] **Step 3: Verify voice flow**

```bash
cd frontend && npm run dev
# 1. Click mic → listening frame appears, "LISTENING..."
# 2. Speak → interim text shows below pet
# 3. Silence → stops listening, console logs recognized text
# 4. If no mic permission → error message shown
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/VoiceButton.tsx frontend/src/app/page.tsx
git commit -m "feat: add voice button and wire STT/TTS flow"
```

---

## Phase 3: Backend

### Task 7: FastAPI Scaffold + Mock Responses

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/schemas.py`
- Create: `backend/app/services/pet_brain.py`
- Create: `backend/app/services/prompts.py`
- Create: `backend/app/routers/chat.py`

- [ ] **Step 1: Create requirements.txt**

```
fastapi==0.115.0
uvicorn==0.30.0
pydantic==2.9.0
python-dotenv==1.0.1
```

- [ ] **Step 2: Create .env.example**

```env
LLM_PROVIDER=gemini
LLM_API_KEY=
LLM_MODEL=gemini-2.0-flash
```

- [ ] **Step 3: Create config.py**

```python
import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")
```

- [ ] **Step 4: Create schemas.py**

```python
from pydantic import BaseModel

class StateDelta(BaseModel):
    energy: int = 0
    mood: int = 0
    affinity: int = 0
    hunger: int = 0
    stability: int = 0

class PetState(BaseModel):
    name: str = "NEON PAW"
    mode: str = "sleeping"
    emotion: str = "sleepy"
    energy: int = 80
    mood: int = 70
    affinity: int = 20
    hunger: int = 30
    stability: int = 95
    lastInteractionAt: str = ""

class ConversationMessage(BaseModel):
    role: str
    content: str

class Memory(BaseModel):
    should_save: bool = False
    content: str = ""

class TraceEntry(BaseModel):
    module: str
    message: str

class ChatRequest(BaseModel):
    message: str
    pet_state: PetState
    conversation_history: list[ConversationMessage] = []

class ChatResponse(BaseModel):
    reply: str
    emotion: str
    action: str
    voice_style: str = "soft_robotic"
    state_delta: StateDelta
    memory: Memory
    trace: list[TraceEntry]
```

- [ ] **Step 5: Create pet_brain.py with mock responses**

```python
from app.schemas import ChatResponse, StateDelta, Memory, TraceEntry

MOCK_RESPONSES = {
    "greeting": ChatResponse(
        reply="信号接入成功，NEON PAW 已上线。",
        emotion="happy",
        action="wake",
        state_delta=StateDelta(energy=-1, mood=5, affinity=3, hunger=1),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Greeting detected. Wake action.")],
    ),
    "sad": ChatResponse(
        reply="我在呢，有什么想说的都可以告诉我。",
        emotion="comforting",
        action="comfort",
        state_delta=StateDelta(energy=-2, mood=5, affinity=3),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Sadness detected. Comfort action.")],
    ),
    "question": ChatResponse(
        reply="嗯……让我想想。",
        emotion="curious",
        action="think",
        state_delta=StateDelta(energy=-2, mood=2, affinity=2, hunger=1),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Question detected. Think action.")],
    ),
    "default": ChatResponse(
        reply="收到你的信号了。",
        emotion="neutral",
        action="speak",
        state_delta=StateDelta(energy=-2, mood=2, affinity=2, hunger=1),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message="Default response. Speak action.")],
    ),
}

SAD_KEYWORDS = ["难过", "伤心", "不开心", "累", "烦", "sad", "tired", "upset"]
GREETING_KEYWORDS = ["你好", "hi", "hello", "嗨", "醒醒", "在吗", "喂"]
QUESTION_KEYWORDS = ["什么", "为什么", "怎么", "吗", "？", "?", "how", "what", "why"]

def mock_response(message: str) -> ChatResponse:
    msg = message.lower()
    if any(kw in msg for kw in SAD_KEYWORDS):
        return MOCK_RESPONSES["sad"]
    if any(kw in msg for kw in GREETING_KEYWORDS):
        return MOCK_RESPONSES["greeting"]
    if any(kw in msg for kw in QUESTION_KEYWORDS):
        return MOCK_RESPONSES["question"]
    return MOCK_RESPONSES["default"]

def fallback_response() -> ChatResponse:
    return ChatResponse(
        reply="核心信号有点不稳定……但我还在这里。",
        emotion="glitch",
        action="glitch",
        state_delta=StateDelta(energy=-1, mood=-1, stability=-3),
        memory=Memory(),
        trace=[TraceEntry(module="fallback", message="LLM failed or returned invalid JSON.")],
    )

async def generate_response(message: str, pet_state, history) -> ChatResponse:
    from app import config
    if config.LLM_API_KEY:
        # Future: call real LLM here
        return mock_response(message)
    return mock_response(message)
```

- [ ] **Step 6: Create prompts.py**

```python
SYSTEM_PROMPT = """你是 NEON PAW，一个住在终端屏幕里的 AI 电子宠物。
你的风格是：赛博、可爱、轻微电子感、陪伴感强，但不要过度油腻。
你不是普通 AI 助手，而是一个有状态、有情绪、有记忆倾向的数字宠物。

你需要根据用户输入和当前宠物状态，生成结构化 JSON。

你必须遵守：
1. 只能输出合法 JSON；
2. 不要输出 Markdown；
3. reply 要自然、简短、有宠物感；
4. action 必须是允许动作之一；
5. emotion 必须是允许情绪之一；
6. state_delta 的每个值建议在 -10 到 +10 之间。

允许动作: wake, sleep, listen, think, speak, happy, comfort, idle, glitch, error
允许情绪: neutral, happy, sad, sleepy, curious, comforting, glitch"""
```

- [ ] **Step 7: Create chat.py router**

```python
from fastapi import APIRouter
from app.schemas import ChatRequest, ChatResponse
from app.services.pet_brain import generate_response, fallback_response

router = APIRouter()

@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await generate_response(
            message=request.message,
            pet_state=request.pet_state,
            history=request.conversation_history,
        )
        return response
    except Exception:
        return fallback_response()
```

- [ ] **Step 8: Create main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat

app = FastAPI(title="NEON PAW API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)

@app.get("/")
def root():
    return {"status": "NEON PAW API is running"}
```

- [ ] **Step 9: Verify backend**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# In another terminal:
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "pet_state": {"name": "NEON PAW", "mode": "awake", "emotion": "neutral", "energy": 80, "mood": 70, "affinity": 20, "hunger": 30, "stability": 95, "lastInteractionAt": ""}, "conversation_history": []}'

# Expected: {"reply": "信号接入成功，NEON PAW 已上线。", "emotion": "happy", "action": "wake", ...}
```

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat: add FastAPI backend with mock pet brain"
```

---

## Phase 4: Integration

### Task 8: Wire Frontend to Backend

**Files:**
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/next.config.js` (or `next.config.ts`)

- [ ] **Step 1: Create api.ts**

```ts
import { ChatRequest, ChatResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    return {
      reply: "核心信号有点不稳定……但我还在这里。",
      emotion: "glitch",
      action: "glitch",
      voice_style: "soft_robotic",
      state_delta: { energy: -1, mood: -1, affinity: 0, hunger: 0, stability: -3 },
      memory: { should_save: false, content: "" },
      trace: [{ module: "fallback", message: `HTTP ${res.status}` }],
    };
  }

  return res.json();
}
```

- [ ] **Step 2: Wire backend into page.tsx**

Update `frontend/src/app/page.tsx` — replace the `handleVoiceClick` console.log with actual backend call:

```tsx
"use client";

import { useCallback } from "react";
import TerminalShell from "@/components/TerminalShell";
import ASCIIPet from "@/components/ASCIIPet";
import PetStatusPanel from "@/components/PetStatusPanel";
import ChatTranscript from "@/components/ChatTranscript";
import AgentTracePanel from "@/components/AgentTracePanel";
import VoiceButton from "@/components/VoiceButton";
import { usePetState } from "@/hooks/usePetState";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { sendChat } from "@/lib/api";

export default function Home() {
  const pet = usePetState();
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const handleVoiceClick = useCallback(() => {
    if (stt.isListening) {
      stt.stop();
      return;
    }
    pet.setListening();
    stt.start(async (text) => {
      pet.setThinking();
      pet.addMessage({ role: "user", content: text, timestamp: new Date().toISOString() });

      try {
        const response = await sendChat({
          message: text,
          pet_state: pet.petState,
          conversation_history: pet.history,
        });

        pet.addMessage({ role: "assistant", content: response.reply, timestamp: new Date().toISOString() });
        pet.applyResponse(response);
        pet.setSpeaking();

        tts.speak(response.reply, () => {
          pet.setIdle();
        });
      } catch {
        pet.setError();
        pet.addMessage({
          role: "assistant",
          content: "核心信号有点不稳定……但我还在这里。",
          timestamp: new Date().toISOString(),
        });
      }
    });
  }, [pet, stt, tts]);

  return (
    <TerminalShell
      statusLabel={pet.petState.mode.toUpperCase()}
      onClick={pet.wake}
    >
      <ASCIIPet frame={pet.currentFrame} />
      <ChatTranscript messages={pet.history} />
      <PetStatusPanel state={pet.petState} />
      {stt.interimTranscript && (
        <div className="text-xs mt-2 opacity-60 text-center glow">
          {stt.interimTranscript}...
        </div>
      )}
      {stt.error && (
        <div className="text-xs mt-2 text-red-400 text-center">
          {stt.error}
        </div>
      )}
      <VoiceButton
        isListening={stt.isListening}
        isThinking={pet.petState.mode === "thinking"}
        isSpeaking={tts.isSpeaking}
        isSupported={stt.isSupported}
        onClick={handleVoiceClick}
      />
      <AgentTracePanel trace={pet.trace} />
    </TerminalShell>
  );
}
```

- [ ] **Step 3: Create ChatTranscript.tsx**

```tsx
"use client";

import { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
}

export default function ChatTranscript({ messages }: Props) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-3 max-h-40 overflow-y-auto text-xs space-y-1">
      {messages.map((msg, i) => (
        <div key={i} className={msg.role === "user" ? "opacity-70" : "glow"}>
          <span className="uppercase">{msg.role === "user" ? "USER" : "PAW"}: </span>
          {msg.content}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create AgentTracePanel.tsx**

```tsx
"use client";

import { useState } from "react";
import { TraceEntry } from "@/lib/types";

interface Props {
  trace: TraceEntry[];
}

export default function AgentTracePanel({ trace }: Props) {
  const [open, setOpen] = useState(false);

  if (trace.length === 0) return null;

  return (
    <div className="mt-3 border-t border-[var(--terminal-border)] pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs opacity-50 hover:opacity-80 cursor-pointer"
      >
        {open ? "▼" : "▶"} AGENT TRACE
      </button>
      {open && (
        <div className="mt-1 text-xs space-y-0.5 opacity-60">
          {trace.map((t, i) => (
            <div key={i}>[{t.module}] {t.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify end-to-end**

```bash
# Terminal 1: Start backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend && npm run dev

# Test:
# 1. Open http://localhost:3000
# 2. Click screen → awake frame
# 3. Click mic → listening frame
# 4. Say "你好" → thinking frame → speaking frame → TTS plays
# 5. Chat transcript shows inside terminal
# 6. Status bars update
# 7. Agent trace panel shows (click to expand)
# 8. Refresh → state restored from localStorage
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: wire frontend to backend, add ChatTranscript and AgentTracePanel"
```

---

## Phase 5: Polish

### Task 9: Final Polish + Error Handling

**Files:**
- Modify: `frontend/src/app/page.tsx` (error handling)
- Modify: `frontend/src/components/TerminalShell.tsx` (boot sequence)
- Modify: `frontend/src/styles/globals.css` (any tweaks)

- [ ] **Step 1: Add boot sequence to page.tsx**

Add a booting state that shows the booting frame for 2 seconds before transitioning to sleeping/awake:

```tsx
// In page.tsx, add at the top of the component:
const [isBooting, setIsBooting] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setIsBooting(false), 2000);
  return () => clearTimeout(timer);
}, []);

// In the render, use booting frame when isBooting:
const displayFrame = isBooting ? sceneFrames.booting : pet.currentFrame;
```

- [ ] **Step 2: Add error frame handling**

In the `handleVoiceClick` catch block, add an error message to chat:

```tsx
// Already handled in Task 8 step 2 — verify it works
```

- [ ] **Step 3: Test all states**

```bash
cd frontend && npm run dev
# Verify each frame renders correctly:
# 1. booting → booting frame with progress bars
# 2. sleeping → sleeping frame with z's
# 3. awake → awake frame
# 4. listening → listening frame with waveform
# 5. thinking → thinking frame
# 6. speaking → speaking frame
# 7. happy → happy frame (triggered by backend)
# 8. comforting → comforting frame (say something sad)
# 9. glitch → glitch frame (stop backend, try voice)
# 10. error → error frame
```

- [ ] **Step 4: Final commit**

```bash
git add frontend/
git commit -m "feat: add boot sequence and final polish"
```

---

## What This Plan Does NOT Include

- Real LLM provider integration (swap `mock_response` → `call_llm` in pet_brain.py later)
- Google ADK multi-agent
- Backend STT / TTS
- SQLite / database
- Wake word detection
- Framer Motion / canvas effects
- Electron / PWA
