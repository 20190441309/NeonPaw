# Phase 10C Checkpoint: Hands-free Conversation Session

**Date:** 2026-05-03
**Status:** Complete
**Branch:** main

---

## What Changed

Upgraded the wake word system to support continuous hands-free conversation sessions. After waking NEON PAW, follow-up speech is sent directly to `/api/chat` without requiring the wake phrase again. Sessions end on stop phrases or silence timeout.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/hooks/useWakeWord.ts` | Rewritten — added `session_listening` mode, stop phrase detection, session timeout, retry logic |
| `frontend/src/app/page.tsx` | Added `sessionActive` state, updated `enabled` constraint, session-aware UI hints, removed unused `sttStartRef` |

---

## How the Session State Machine Works

### Modes

```
wake_listening     → listening for wake phrases ("小爪醒醒", "NEON PAW")
command_listening  → one-shot command capture after wake phrase (10s timeout)
session_listening  → continuous conversation, any speech = command (25s silence timeout)
idle               → not listening (between states, processing, error)
```

### State Transitions

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
            wake_listening                                │
              │           │                               │
     wake phrase      wake phrase                         │
     + inline cmd     only                                │
         │               │                                │
         ▼               ▼                                │
       idle      command_listening                        │
         │           │         │                          │
    send to chat   command    timeout (10s)               │
    + activate     captured      │                        │
    session          │           ▼                        │
         │           ▼        onCommandTimeout            │
         │         idle        → wake_listening           │
         │           │                                    │
         │      send to chat                              │
         │      + activate session                        │
         │           │                                    │
         ▼           ▼                                    │
    ┌────────────────────┐                                │
    │  TTS playback      │                                │
    │  (paused, no mic)  │                                │
    └────────┬───────────┘                                │
             │                                            │
             ▼                                            │
      session_listening ◄───── TTS finishes + session     │
         │         │         active → resume to here      │
    any speech   stop phrase                              │
         │         │                                      │
         ▼         ▼                                      │
       idle    idle + end session                         │
         │         │                                      │
    send to chat   ▼                                      │
    (session     wake_listening ──────────────────────────┘
     stays active)
         │
    silence timeout (25s) or retries exhausted
         │
         ▼
    onCommandTimeout → wake_listening
```

### Stop Phrases

The following phrases end the hands-free session without being sent to `/api/chat`:

- "先这样"
- "不用了"
- "结束对话"
- "退出"
- "stop"
- "sleep"

Detection: exact match or substring match, case-insensitive.

### Session Lifecycle

```
1. User says "小爪醒醒" → wake detected → command_listening
2. User says "干嘛呢" → command captured → onCommand → sessionActive = true
3. Pet processes, replies via TTS
4. TTS finishes → resume() → session_listening (session is active)
5. User says "我今天好累啊" → sent to /api/chat directly
6. Pet replies via TTS
7. TTS finishes → resume() → session_listening (session still active)
8. User says "结束对话" → stop phrase detected → session ends → wake_listening
9. OR: 25s silence → session timeout → wake_listening
```

Inline commands also activate the session:
```
1. User says "小爪醒醒，干嘛呢" → wake detected, inline command extracted
2. Command "干嘛呢" sent to /api/chat → sessionActive = true
3. TTS finishes → resume() → session_listening (session is active)
4. Follow-up speech works without wake phrase
```

### Empty Result Handling

| Mode | Max Retries | Behavior on Exhaustion |
|---|---|---|
| wake_listening | unlimited | backoff restart (800ms → 5s) |
| command_listening | 3 | waits for command timeout (10s) |
| session_listening | 3 | ends session → wake_listening |

---

## UI Status Text

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
| Stop phrase | AWAKE | (returns to WAKE WORD ACTIVE) |
| Wake off + sleeping | SLEEPING | TAP SCREEN TO WAKE |
| Wake off + awake | AWAKE | TAP MICROPHONE TO TALK |

---

## Dev Console Logs

All logs prefixed with `[WAKE]` or `[PAGE]`:

```
[WAKE] mode: wake_listening
[WAKE] raw transcript: 小爪醒醒
[WAKE] wake detected, mode: followup
[WAKE] mode: command_listening
[WAKE] command capture started
[WAKE] command captured: 干嘛呢
[WAKE] session active: true
[WAKE] mode: idle
[PAGE] command captured: 干嘛呢
[PAGE] sending to chat: 干嘛呢

--- TTS finishes ---

[WAKE] resumed, resume target: session_listening
[WAKE] starting session listening, timeout: 25000 ms
[WAKE] session listening started
[WAKE] session transcript: 我今天好累啊
[WAKE] sending session command: 我今天好累啊

--- user says stop phrase ---

[WAKE] session transcript: 结束对话
[WAKE] session ended by stop phrase: 结束对话
[WAKE] session active: false
[WAKE] mode: wake_listening
```

---

## Key Design Decisions

1. **Single SpeechRecognition instance per mode.** The wake hook creates/destroys recognition instances as it switches between modes. No two instances run simultaneously.

2. **Session state tracked in both hook and page.** The hook's `sessionActiveRef` controls resume behavior. The page's `sessionActive` state controls the `enabled` constraint (so the hook stays active during thinking/speaking). Both must be set in sync — the inline path sets `setSessionState(true)` in the hook before calling `onWakeRef.current(result)`.

3. **Stop phrases checked before sending to chat.** The `isStopPhrase()` function runs on every final transcript in session_listening. Matches end the session silently.

4. **`continuous: false` for command/session capture.** Each utterance is captured as one-shot, then recognition restarts via the onend retry logic. This gives cleaner boundaries between commands.

5. **Session timeout is 25 seconds.** Long enough for natural pauses, short enough to not waste resources.

## Review Fix

The code review found that the inline command path did not set `sessionActiveRef` in the hook, causing `resume()` to return to `wake_listening` instead of `session_listening` after TTS. Fixed by adding `setSessionState(true)` in the inline branch of `startWakeListening` before invoking `onWakeRef.current(result)`.

---

## Verification

1. Enable Wake Mode (click `[WAKE]` in header)
2. Say "小爪醒醒" → pet wakes
3. Say "干嘛呢" → sent to `/api/chat` (command_listening → session activates)
4. Wait for pet TTS to finish
5. Say "我今天好累啊" without wake phrase → sent to `/api/chat` (session_listening)
6. Say "你能陪我写代码吗" without wake phrase → sent to `/api/chat`
7. Say "结束对话" → session ends, returns to wake_listening
8. Wait 25s without speaking → session timeout, returns to wake_listening
9. Disable Wake Mode → no continuous listening, click-to-talk still works
10. Page refresh → wake mode persists, session starts fresh

---

## Browser Limitations

1. Chrome/Edge only (SpeechRecognition API)
2. Page must be open — not a background listener
3. One SpeechRecognition instance at a time — created/destroyed per mode switch
4. Accuracy depends on mic quality and environment noise
5. Stop phrase detection uses substring match — "不用了谢谢" also triggers stop
6. Session timeout is based on silence, not user intent — a long pause may end the session unexpectedly
7. Chinese punctuation between wake phrase and command is stripped automatically
