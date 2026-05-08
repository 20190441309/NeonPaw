# Phase 10D Checkpoint: Speech Recognition Accuracy & Correction UX

**Date:** 2026-05-08
**Status:** Complete
**Branch:** main

---

## What Changed

Added STT accuracy improvements: real-time transcript display, low-confidence detection with heuristic rules, an editable confirmation bar for correcting misrecognized speech, and noise filtering. All modes (click-to-talk, wake inline, wake session) auto-send on high confidence and show confirmation on low confidence.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/lib/speechUtils.ts` | **New** — Pure utility functions: normalizeSpeechText, splitWakeWordAndCommand, isLowConfidenceSpeech, isMeaningfulSpeech |
| `frontend/src/hooks/useSpeechRecognition.ts` | **Modified** — Reads confidence field, adds onLowConfidence callback, exposes lastConfidence and lastRawTranscript, calls markMessageSent |
| `frontend/src/components/SpeechConfirmBar.tsx` | **New** — Editable confirmation bar with SEND/RETRY buttons and low-confidence warning |
| `frontend/src/components/VoiceButton.tsx` | **Modified** — Added isPendingConfirm and isLowConfidence props for visual feedback |
| `frontend/src/app/page.tsx` | **Modified** — Added pendingSpeech state, low-confidence branching for all voice paths, SpeechConfirmBar integration, updated status hints |

---

## How the Confirmation Flow Works

### High Confidence (default path)
```
User speaks → STT final result → isLowConfidenceSpeech() = false
  → auto-send to /api/chat (unchanged behavior)
```

### Low Confidence (new path)
```
User speaks → STT final result → isLowConfidenceSpeech() = true
  → setPendingSpeech({ text, isLowConfidence: true, confidence })
  → SpeechConfirmBar appears
  → User edits text + clicks SEND → startVoiceInteraction(editedText)
  → OR User clicks RETRY → clear pending, resume listening
  → OR User presses Escape → dismiss, return to idle
```

### Low Confidence Triggers

| Trigger | Example |
|---|---|
| Browser confidence < 0.6 | (if available) |
| Text < 2 Chinese chars | "啊" |
| Text < 3 non-Chinese chars | "oh" |
| Only filler words | "嗯嗯" |
| Empty after normalization | "" |
| Only punctuation | "。。。" |
| Duplicate of last message (< 3s) | same text repeated |

---

## Wake Mode Integration

### Inline command ("小爪醒醒，今天陪我写代码")
- Wake hook extracts command → page.tsx runs `isLowConfidenceSpeech` on command
- High confidence → auto-send
- Low confidence → show confirm bar

### Session command (multi-turn)
- Session captures text → page.tsx runs `isLowConfidenceSpeech`
- High confidence → auto-send (keeps multi-turn flow smooth)
- Low confidence → pause wake listener, show confirm bar
- After confirm → send and resume wake listener

### Wake-only ("小爪醒醒")
- Wake hook detects followup mode → no command to validate
- No confirmation needed

---

## UI States

| Condition | Header | Footer |
|---|---|---|
| Pending + low confidence | (pet mode) | LOW CONFIDENCE // 可能没听清 |
| Pending + high confidence | (pet mode) | HEARD: 等待确认 |
| Listening | LISTENING | LISTENING... |
| Normal | (existing) | (existing) |

---

## VoiceButton Visual States

| State | Border | Icon |
|---|---|---|
| Pending + low conf | yellow-500/60 | ? (yellow) |
| Pending + high conf | yellow-400/60 | ? (yellow) |
| Listening | red-500 (pulse) | ● (red) |
| Normal | terminal-text/60 | 🎤 |

---

## Verification

1. Build passes: `npm run build` — no TypeScript errors
2. Backend tests: 44/44 agent tests pass
3. Multi-turn conversation preserved — no regression in wake/session logic
4. conversation_history records only confirmed/final text
5. localStorage state persists across refresh

---

## Known Limitations

1. Browser confidence field is not available in all browsers — falls back to heuristic-only detection
2. Filler word list is not exhaustive — may need expansion based on real usage
3. Duplicate detection window (3s) is a heuristic — may need tuning
4. SpeechConfirmBar replaces VoiceButton visually (not shown simultaneously) — intentional to reduce clutter

---

## Follow-up Optimizations

1. Expand filler word list with real-world data
2. Add confidence visualization (waveform or bar)
3. Add "always auto-send" toggle for power users
4. Backend STT integration (Whisper) for better accuracy
5. Fuzzy wake phrase matching for near-misses
