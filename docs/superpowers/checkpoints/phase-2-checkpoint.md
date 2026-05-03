# Phase 2 Checkpoint — Voice Integration

**Date:** 2026-05-03
**Status:** Complete

---

## Completed Files

```
frontend/src/
├── components/
│   ├── ChatTranscript.tsx     # Displays conversation history in terminal
│   └── VoiceButton.tsx        # Mic button with idle/listening/thinking/speaking states
├── hooks/
│   ├── useSpeechRecognition.ts # Web Speech API, zh-CN, interim results
│   └── useSpeechSynthesis.ts   # SpeechSynthesis with Chinese voice preference
└── app/
    └── page.tsx               # Wires voice flow + temporary mock responses
```

## Key Architecture Decisions

- `isSupported` defaults to `true` via `useState`, updated to real value in `useEffect` — prevents SSR hydration mismatch where server renders "unsupported" message
- Transient modes (`listening`, `thinking`, `speaking`) are normalized to `awake` on localStorage restore — prevents pet from being stuck in a transient state after refresh
- STT debug logs guarded behind `process.env.NODE_ENV === "development"`
- Temporary mock responses in `page.tsx` simulate backend for end-to-end testing until Phase 3
- `VoiceButton` always renders the same DOM structure (button + message div) — `isSupported` controls styling, not conditional rendering

## Voice Flow

```
Click mic → setListening → STT start
  → onresult → setThinking → addMessage(user)
  → 800ms mock delay → mockReply()
  → addMessage(assistant) → applyResponse → setSpeaking
  → TTS speak → onEnd → setIdle
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Unsupported browser | Button disabled, message shown |
| Mic permission denied | Error: "请允许麦克风访问权限" |
| No speech detected | Error: "我没有听清，再说一次？" |
| Other STT error | Error: "语音识别出错: {error}" |

## Run Command

```bash
cd /Users/hj/Desktop/hj/NeonPaw/frontend
npm run dev
# http://localhost:3000
```

## Phase 3 Should Implement

1. FastAPI backend with `POST /api/chat`
2. Mock pet brain with keyword-based responses
3. Wire `sendChat()` API call to replace temporary mock in `page.tsx`
4. Remove temporary `mockReply` function from `page.tsx`
