# Phase 10B Checkpoint: Hands-free Wake Conversation

**Date:** 2026-05-03
**Status:** Complete
**Branch:** main
**Latest Commit:** cff58a0

---

## What Changed

Upgraded wake word detection to support hands-free conversation. Two interaction modes: inline command (wake phrase + command in one utterance) and follow-up listening (wake phrase alone, then auto-start main STT). No backend changes.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/hooks/useWakeWord.ts` | Rewritten — extractCommand, inline/followup modes, pause/resume |
| `frontend/src/app/page.tsx` | Handle both modes, wake status UI, pause/resume lifecycle |

---

## How Hands-free Wake Conversation Works

### Two Interaction Modes

**A. Inline Command Mode**
User says wake phrase + command in one utterance. The wake phrase is stripped and the remaining text is sent directly to the chat API.

```
User: "小爪醒醒，今天陪我写代码"
  → wake phrase "小爪醒醒" detected
  → command extracted: "今天陪我写代码"
  → pet wakes → sends "今天陪我写代码" to chat API → pet responds
  → no click required
```

**B. Follow-up Listening Mode**
User says only the wake phrase. Pet wakes and automatically starts main STT for the next sentence.

```
User: "小爪醒醒"
  → wake phrase detected, no command after it
  → pet wakes → enters "LISTENING FOR COMMAND"
  → main SpeechRecognition starts automatically
User: "今天陪我写代码"
  → main STT captures text
  → sends to chat API → pet responds
  → no click required
```

### Wake Listener Lifecycle

```
Wake Mode ON + pet idle
  → wake listener active (WAKE LISTENING)
  → detects wake phrase
  → wake listener stops (hands off)
  → inline: send command directly
  → followup: start main STT
  → main interaction (thinking → speaking → TTS)
  → TTS ends → wake listener resumes
```

### Pause/Resume Control

- Wake listener pauses when: main STT starts (click or follow-up), pet enters thinking/speaking
- Wake listener resumes when: TTS finishes, interaction ends, error recovery
- Prevents two SpeechRecognition instances running simultaneously

---

## UI Status Text

| State | Header | Footer |
|---|---|---|
| Wake listening | AWAKE | WAKE WORD ACTIVE |
| Wake phrase detected | WAKE DETECTED | — |
| Follow-up mode | LISTENING FOR COMMAND | LISTENING FOR COMMAND |
| Processing inline command | PROCESSING COMMAND | PROCESSING COMMAND |
| Wake off + sleeping | SLEEPING | TAP SCREEN TO WAKE |
| Wake off + awake | AWAKE | TAP MICROPHONE TO TALK |

---

## Command Extraction

Wake phrases are matched longest-first ("小爪醒醒" before "醒醒"). Text after the wake phrase is extracted as the command:

```
"小爪醒醒，今天陪我写代码" → command: "今天陪我写代码"
"NEON PAW help me plan"     → command: "help me plan"
"小爪醒醒"                   → no command → follow-up mode
"醒醒"                       → no command → follow-up mode
```

Leading punctuation (commas, periods, spaces) between wake phrase and command is stripped.

---

## Dev Console Logs

Open browser DevTools → Console. All logs prefixed with `[WAKE]`:

```
[WAKE] enabled changed: true isSupported: true
[WAKE] recognition started
[WAKE] raw transcript: 小爪醒醒，今天陪我写代码
[WAKE] normalized: 小爪醒醒今天陪我写代码
[WAKE] wake detected, mode: inline command: 今天陪我写代码
[WAKE] recognition ended, wakeMatched: true enabled: true paused: false
[WAKE] not restarting — wake matched, handing off
```

Or for follow-up mode:
```
[WAKE] raw transcript: 小爪醒醒
[WAKE] follow-up listening mode (wake phrase only)
[WAKE] paused
[WAKE] resumed
[WAKE] restarting recognition
```

---

## Verification

1. Enable Wake Mode (click `[WAKE]` in header)
2. Say "小爪醒醒，今天陪我写代码" → pet responds to "今天陪我写代码" without clicking
3. Say only "小爪醒醒" → pet enters LISTENING FOR COMMAND
4. Say "今天陪我写代码" → pet responds without clicking
5. After response, wake listener resumes automatically
6. Disable Wake Mode → click-to-talk still works
7. Page refresh → wake mode persists

---

## Browser Limitations

1. Chrome/Edge only (SpeechRecognition API)
2. Page must be open — not a background listener
3. One SpeechRecognition instance at a time — wake pauses during main STT
4. Accuracy depends on mic quality and environment noise
5. Inline command extraction depends on browser's transcript quality — if the browser doesn't properly segment the wake phrase from the command, it may fall back to follow-up mode
6. Chinese punctuation (，！？) between wake phrase and command is stripped automatically

---

## Commit

```
cff58a0 feat: Phase 10B — hands-free wake conversation
```
