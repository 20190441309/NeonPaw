# Demo Polish Checkpoint

**Date:** 2026-05-03
**Status:** Complete

---

## Completed Files

```
frontend/src/app/globals.css               # color-scheme: dark, Firefox scrollbar, hover state
frontend/src/components/TerminalShell.tsx   # footerHint prop replaces hardcoded text
frontend/src/app/page.tsx                  # Dynamic footerHint by pet mode
frontend/src/components/ChatTranscript.tsx  # Flex layout, line-clamp-3, increased spacing
backend/app/services/prompts.py            # Tuned for shorter cyber-pet replies
```

## What Changed

### Scrollbar
- `color-scheme: dark` on body prevents white scrollbar
- Firefox: `scrollbar-width: thin; scrollbar-color: #00ffcc33 transparent`
- WebKit: 4px width, cyan thumb, hover brightens

### Footer Hint
| Mode | Hint |
|---|---|
| sleeping | TAP SCREEN TO WAKE |
| awake | TAP MICROPHONE TO TALK |
| listening | LISTENING... |
| thinking | PET BRAIN PROCESSING... |
| speaking | NEON PAW IS TALKING... |
| error | SIGNAL ERROR // RETRY |

### Chat Transcript
- Flex layout with `gap-2` for aligned USR/PAW labels
- Labels right-aligned (`text-right`) with fixed width (`w-8`)
- PAW replies clamped to 3 lines (`line-clamp-3`)
- Increased spacing: `mt-4 pt-4 space-y-2.5`

### System Prompt
- "reply 必须是 1–2 句简短的话"
- "赛博朋克、简洁、轻微电子感、陪伴感。不要过度卖萌或油腻"

## How to Verify

1. Start backend + frontend
2. Scroll chat — thin cyan scrollbar, not white
3. Check footer changes per pet mode
4. Long PAW replies clamp at 3 lines
5. USR/PAW labels aligned
6. With DeepSeek key: shorter, cyber-toned replies
