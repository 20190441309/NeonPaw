# Phase 5B Checkpoint — UI/UX Polish

**Date:** 2026-05-03
**Status:** Complete

---

## Completed Files

```
frontend/src/app/globals.css                 # Animations, scrollbar, glow-subtle
frontend/src/app/page.tsx                    # StatusHint wiring, isError prop
frontend/src/components/TerminalShell.tsx    # Split footer, statusHint slot, responsive
frontend/src/components/VoiceButton.tsx      # 5-state visuals with labels
frontend/src/components/ChatTranscript.tsx   # Border separator, fade-in, scrollbar
frontend/src/components/PetStatusPanel.tsx   # Border separator, responsive text
frontend/src/components/AgentTracePanel.tsx  # Subtle background, reduced opacity
frontend/src/components/ASCIIPet.tsx         # Responsive text, scrollbar
frontend/src/components/StatusHint.tsx       # NEW — backend status indicator
```

## What Changed

### VoiceButton States
| State | Visual | Label |
|---|---|---|
| idle | Muted mic icon | "点击说话" |
| listening | Red pulse ring + dot | "正在听..." |
| thinking | Spinning ◎ | "思考中..." |
| speaking | Wave bars | "回复中..." |
| error | Red ! mark | "信号异常" |

### StatusHint (footer left)
- Green dot + "ONLINE" when backend responds
- Red dot + "OFFLINE" on network failure
- Yellow + "FALLBACK" when backend returns fallback response
- "LLM" tag when real LLM was used

### Layout
- TerminalShell footer split: status hint (left), tap hint (right)
- Responsive padding and text sizing for mobile
- ChatTranscript has border separator and fade-in animation
- PetStatusPanel has border separator
- AgentTracePanel uses subtle background tint

## How to Verify

1. Start backend + frontend
2. Open http://localhost:3000
3. Click screen → wake → status shows "ONLINE" in footer
4. Click mic → button shows pulse ring + "正在听..."
5. After speech → spinner + "思考中..."
6. During TTS → wave bars + "回复中..."
7. Stop backend → speak → error state + "OFFLINE" in footer
8. Resize browser → layout adapts to smaller screens
