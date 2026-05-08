# Phase 10D Design: Speech Recognition Accuracy & Correction UX

**Date:** 2026-05-08
**Status:** Approved
**Approach:** A — Extend useSpeechRecognition + new speechUtils + SpeechConfirmBar

---

## Goal

Improve voice input reliability by adding real-time STT feedback, low-confidence detection, an editable confirmation bar, wake-word/command separation, and noise filtering — without breaking existing wake, multi-turn, TTS, or pet state logic.

---

## Architecture

### New Files

| File | Purpose |
|---|---|
| `frontend/src/lib/speechUtils.ts` | Pure utility functions for text normalization, confidence checking, wake word splitting |
| `frontend/src/components/SpeechConfirmBar.tsx` | Editable confirmation UI shown when STT result needs user review |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/hooks/useSpeechRecognition.ts` | Read confidence field, add onLowConfidence callback, expose lastConfidence and lastRawTranscript |
| `frontend/src/components/VoiceButton.tsx` | Add isPendingConfirm and isLowConfidence props for visual feedback |
| `frontend/src/app/page.tsx` | Add pendingSpeech state, integrate SpeechConfirmBar, low-confidence branching logic |

### Unchanged Files

| File | Reason |
|---|---|
| `useWakeWord.ts` | State machine logic unchanged; page.tsx handles confirmation layer |
| `TerminalShell.tsx` | No structural changes needed |
| `ChatTranscript.tsx` | No changes needed |

---

## 1. Pure Utility Functions — `lib/speechUtils.ts`

### normalizeSpeechText(text: string): string
- Trim leading/trailing whitespace
- Remove redundant punctuation (keep meaningful ones)
- Collapse consecutive whitespace
- Normalize Chinese/English wake word matching variants

### splitWakeWordAndCommand(text: string): { hasWakeWord: boolean; command: string; raw: string }
- Reuse WAKE_PHRASES from useWakeWord
- If wake phrase found at start/middle of text, extract the portion after it
- Strip leading punctuation from command portion
- Return hasWakeWord=true even if command is empty (wake-only)

### isLowConfidenceSpeech(text: string, confidence?: number, lastUserMessage?: string, lastMessageTime?: number): boolean
Returns true if ANY of:
- `confidence` provided and < 0.6
- Text < 2 Chinese chars or < 3 English chars (after normalization)
- Text is only filler words: "啊", "嗯", "呃", "喂", "hello", "oh", etc.
- Text is empty or only punctuation
- Text matches a wake phrase but has no command content
- Text === lastUserMessage and time diff < 3000ms (duplicate)

### isMeaningfulSpeech(text: string): boolean
- Not empty after trim
- Not only punctuation
- Not only filler words
- Length >= 2 chars

---

## 2. useSpeechRecognition Hook Changes

### New return values
```ts
lastConfidence: number | null  // confidence from most recent final result
lastRawTranscript: string      // raw text before normalization
```

### Callback signature change
```ts
start(
  onResult: (text: string, confidence: number | null) => void,
  onLowConfidence?: (text: string, confidence: number | null) => void
)
```

### Internal logic
In `onresult` handler, when `isFinal`:
1. Read `event.results[i][0].confidence` (may be undefined)
2. Call `normalizeSpeechText(rawTranscript)`
3. Call `isLowConfidenceSpeech(normalized, confidence)`
4. If low confidence and onLowConfidence provided → call onLowConfidence
5. Else → call onResult (existing behavior)
6. Always set lastConfidence and lastRawTranscript

---

## 3. SpeechConfirmBar Component

### Visual Design
```
╭──────────────────────────────────────────────────────╮
│  HEARD: "鞋代码"                      confidence: low │
│  ┌────────────────────────────────────────────────┐  │
│  │ 鞋代码                                         │  │
│  └────────────────────────────────────────────────┘  │
│  我可能没有听清，你可以修改后发送，或者重新说一遍。      │
│                                                      │
│  [ > SEND ]    [ ↺ RETRY ]                           │
╰──────────────────────────────────────────────────────╯
```

### Props
```ts
interface SpeechConfirmBarProps {
  text: string;
  isLowConfidence: boolean;
  onConfirm: (editedText: string) => void;
  onRetry: () => void;
  onDismiss: () => void;
}
```

### Behavior
- Editable text input, pre-filled with recognized text
- SEND button calls onConfirm with current input value
- RETRY button calls onRetry (clears pending, restarts mic)
- Low confidence shows warning message
- High confidence (manual trigger via autoSend=false) shows without warning
- Terminal style: dark bg, cyan border, monospace font

---

## 4. page.tsx Integration

### New state
```ts
const [pendingSpeech, setPendingSpeech] = useState<{
  text: string;
  isLowConfidence: boolean;
} | null>(null);
```

### Flow — Click-to-Talk
1. User clicks mic → STT starts (existing)
2. Recognition ends → callback fires
3. If high confidence → auto-send via startVoiceInteraction (unchanged)
4. If low confidence → setPendingSpeech({ text, isLowConfidence: true })
5. SpeechConfirmBar appears
6. User edits + SEND → startVoiceInteraction(editedText), setPendingSpeech(null)
7. User clicks RETRY → setPendingSpeech(null), restart mic

### Flow — Wake Mode Inline
1. "小爪醒醒，今天陪我写代码" → splitWakeWordAndCommand
2. hasWakeWord + command present → low-confidence check on command
3. High confidence → auto-send
4. Low confidence → setPendingSpeech

### Flow — Wake Mode Session
1. session_listening captures text → low-confidence check
2. High confidence → auto-send via onCommand (existing path)
3. Low confidence → pause session (wakeWord.pause()), setPendingSpeech
4. After confirm/retry → resume session (wakeWord.resume())

### conversation_history
- Only record the final sent text (post-edit if user edited)
- Do not record raw incorrect text if user retried

### UI Status Hints
| State | Footer |
|---|---|
| pendingSpeech !== null + low conf | "LOW CONFIDENCE // 可能没听清" |
| pendingSpeech !== null + high conf | "HEARD: 等待确认" |
| Listening | "LISTENING..." |
| Normal | existing behavior |

### VoiceButton integration
- Pass isPendingConfirm={pendingSpeech !== null}
- Pass isLowConfidence={pendingSpeech?.isLowConfidence}

---

## 5. Noise Filtering Rules

Applied in normalizeSpeechText:
- Trim whitespace
- Remove leading/trailing punctuation that carries no meaning
- Collapse multiple spaces/tabs to single space
- Normalize full-width/half-width characters for comparison

Applied in isMeaningfulSpeech:
- Reject empty strings
- Reject strings that are only punctuation: "。。。", "???", "!!!"
- Reject strings that are only filler: "啊啊啊", "嗯嗯"

---

## 6. Acceptance Criteria

1. "小爪醒醒" → wake only, no empty message sent
2. "小爪醒醒，今天陪我写代码" → wake + auto-send "今天陪我写代码"
3. "嗯" / "啊" → not sent, show low confidence, allow retry
4. "鞋代码" (misrecognized) → show editable confirm bar
5. Multi-turn session → each turn handled correctly, no stuck states
6. Page refresh → localStorage state preserved
7. npm run build → no errors
