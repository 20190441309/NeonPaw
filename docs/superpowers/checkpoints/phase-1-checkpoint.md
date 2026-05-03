# Phase 1 Checkpoint — Terminal UI + ASCII Frames

**Date:** 2026-05-02
**Status:** Complete, reviewed, approved

---

## Completed Files

```
frontend/src/
├── app/
│   ├── globals.css          # Scanline, glow, flicker (CSS-only)
│   ├── layout.tsx           # Root layout, NEON PAW metadata
│   └── page.tsx             # Main page, assembles components
├── components/
│   ├── ASCIIPet.tsx         # Renders frame string in <pre>
│   ├── PetStatusPanel.tsx   # Energy/Mood/Affinity/Hunger/Stability bars
│   └── TerminalShell.tsx    # Terminal frame, header, footer, click handler
├── hooks/
│   └── usePetState.ts       # State machine, localStorage, frame selection
└── lib/
    ├── petFrames.ts         # 10 ASCII scene frames (String.raw)
    └── types.ts             # All TypeScript types + DEFAULT_PET_STATE
```

## Key Architecture Decisions

- Frontend owns pet state via `usePetState` hook + localStorage
- Frame selection: `action > emotion > mode` using `ACTION_TO_FRAME` mapping
- SSR-safe: defaults on first render, localStorage loaded in `useEffect`
- Operational modes (listening/thinking) reset emotion to "neutral"
- All numeric state clamped 0-100
- Idle timeout: 60s → sleeping
- localStorage staleness: 24h

## Run Command

```bash
cd /Users/hj/Desktop/hj/NeonPaw/frontend
npm run dev
# http://localhost:3000
```

## Phase 2 Constraints

- No backend wired yet — voice input has nowhere to send text
- No TTS playback yet — pet can't speak replies
- No ChatTranscript or VoiceButton components yet
- Mic button and voice hooks (useSpeechRecognition, useSpeechSynthesis) not implemented
- Browser STT requires Chrome/Edge; must show fallback message for unsupported browsers

## Phase 2 Should Implement

1. `useSpeechRecognition` hook — Web Speech API, zh-CN, interim results
2. `useSpeechSynthesis` hook — SpeechSynthesis, Chinese voice preference
3. `VoiceButton` component — idle/listening/thinking/speaking states
4. Wire voice flow: click mic → STT → thinking → (backend placeholder) → TTS → idle
5. Error handling for unsupported browsers and mic permission failures
