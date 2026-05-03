# Phase 10A Checkpoint: Browser Wake Word Prototype

**Date:** 2026-05-03
**Status:** Complete
**Branch:** main
**Latest Commit:** d994c9d

---

## What Changed

Added an optional browser-based wake word detection system. When enabled, the browser listens for wake phrases ("NEON PAW", "小爪", "醒醒") and automatically triggers the voice interaction flow. OFF by default. Click-to-talk remains fully functional.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/hooks/useWakeWord.ts` | **New** — continuous SpeechRecognition hook for wake phrases |
| `frontend/src/components/WakeModeToggle.tsx` | **New** — terminal-style toggle button |
| `frontend/src/components/TerminalShell.tsx` | Added `headerAction` prop for toggle placement |
| `frontend/src/components/VoiceButton.tsx` | Added `isWakeWordActive` prop, green indicator |
| `frontend/src/app/page.tsx` | Wired wake word hook, toggle, shared voice flow |

---

## How Wake Mode Works

### Architecture

```
useWakeWord hook (separate SpeechRecognition instance)
  │
  ├─ enabled=false → inactive (default)
  │
  └─ enabled=true → continuous listening
      │
      ├─ hears "NEON PAW" / "小爪" / "醒醒"
      │   └─ calls onWakePhrase callback
      │       ├─ pet.wake() (if sleeping)
      │       └─ stt.start(callback) → normal voice flow
      │
      ├─ no-speech → auto-restart after 500ms
      │
      └─ not-allowed → error state, no restart
```

### State Flow

```
Wake Mode OFF (default):
  click mic → handleVoiceClick → existing flow (unchanged)

Wake Mode ON:
  wake word hook listening → detects "NEON PAW"
    → onWakePhrase callback
      → if sleeping: pet.wake()
      → pet.setListening()
      → stt.start(callback)
      → normal voice flow continues
    → wake hook stops (hands off to main STT)
    → after main STT finishes, wake hook restarts
```

### Supported Wake Phrases

- `"neon paw"` (case-insensitive)
- `"小爪"`
- `"小爪醒醒"`
- `"醒醒"`

Match logic: lowercase transcript, check if any phrase is a substring.

---

## UI Changes

### Header Toggle

A `[WAKE]` / `[WAKE:ON]` button appears in the terminal header bar, left of the status label:
- **OFF (default):** dim `WAKE` label
- **ON:** green `WAKE:ON` label
- **Error:** red `ERR` label
- **Unsupported:** grayed out (no SpeechRecognition in browser)

### VoiceButton

When wake mode is active and listening:
- Green dot indicator (instead of mic emoji)
- Label changes to "唤醒监听中..."

### Footer Hints

- Sleeping + wake ON: `SAY "NEON PAW" TO WAKE`
- Awake + wake ON: `WAKE WORD ACTIVE`
- All other modes: unchanged

### Privacy Notice

When wake mode is enabled, a small notice appears below the voice button:
```
WAKE MODE: BROWSER MIC ONLY · ACTIVE WHILE PAGE IS OPEN
```

---

## Persistence

Wake mode preference is saved to `localStorage` under key `neon_paw_wake_mode`. On page refresh, if it was ON, it stays ON and the listener restarts automatically.

---

## Error Handling

| Error | Behavior |
|---|---|
| SpeechRecognition not available | Toggle disabled, tooltip explains |
| Microphone permission denied | Error state, no auto-restart, toggle shows ERR |
| No-speech during wake listening | Auto-restart after 500ms |
| Wake phrase not detected | Keeps listening silently |
| Active voice interaction | Wake hook pauses (enabled but not listening) |

---

## Browser Limitations

1. **Chrome/Edge only.** SpeechRecognition API is not supported in Firefox or Safari. Toggle is disabled in unsupported browsers.
2. **Page must be open.** Wake listening stops when the tab is closed or navigated away. Not a background system listener.
3. **Microphone permission required.** Browser will prompt on first enable. If denied, shows error.
4. **One SpeechRecognition at a time.** Wake hook stops when main STT starts. After voice interaction completes, wake hook restarts.
5. **Accuracy depends on mic quality.** Wake phrases may not be detected in noisy environments.

---

## Verification

1. `npm run build` passes
2. Toggle appears in header, OFF by default
3. Toggle ON → mic permission prompt → starts listening
4. Say "NEON PAW" → pet wakes, starts listening for your voice
5. Say "醒醒" → same effect
6. Complete voice interaction → wake listener restarts
7. Toggle OFF → stops listening, click-to-talk still works
8. Page refresh → wake mode state persisted
9. Mic permission denied → graceful error, toggle shows ERR
10. SpeechRecognition not supported → toggle disabled

---

## Privacy

- Wake Mode uses browser microphone permission
- Only active while the page is open
- Not a background system listener
- Audio is processed locally by the browser's SpeechRecognition API
- No audio is sent to any server for wake word detection

---

## Commit

```
d994c9d feat: Phase 10A — browser wake word prototype
```
