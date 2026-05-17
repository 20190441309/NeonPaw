# Phase 11B Checkpoint: Speech Language Control

**Date:** 2026-05-13
**Status:** Complete
**Branch:** main

---

## What Changed

Added speech language control feature. Users can now switch between Chinese (zh-CN), English (en-US), and Auto mode for both speech recognition (STT) and text-to-speech (TTS). Language preference is persisted in localStorage.

---

## Problem

Previously, the speech language was hardcoded to `zh-CN` in all speech-related hooks:
- `useSpeechRecognition.ts` — STT always used Chinese
- `useSpeechSynthesis.ts` — TTS always used Chinese
- `useWakeWord.ts` — Wake word detection always used Chinese

This prevented users from:
- Using English speech input
- Getting English TTS responses
- Switching languages without code changes

---

## Solution

Created a language control system with:

### 1. Language Configuration Module (`speechLanguages.ts`)
- Defines supported languages: Chinese, English, Auto
- Provides language codes for STT and TTS
- Handles localStorage persistence
- Auto-detection based on text content

### 2. Language Hook (`useSpeechLanguage.ts`)
- Manages language state
- Loads/saves preference from localStorage
- Provides language cycling functionality

### 3. Language Selector UI (`LanguageSelector.tsx`)
- Compact mode: single button that cycles through languages
- Full mode: radio-style selector with flags
- Terminal-themed styling

### 4. Updated Speech Hooks
- `useSpeechRecognition` — accepts language parameter
- `useSpeechSynthesis` — accepts language parameter
- `useWakeWord` — accepts language parameter

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/lib/speechLanguages.ts` | **New** — Language configuration and utilities |
| `frontend/src/hooks/useSpeechLanguage.ts` | **New** — Language state management hook |
| `frontend/src/components/LanguageSelector.tsx` | **New** — Language selection UI component |
| `frontend/src/hooks/useSpeechRecognition.ts` | **Modified** — Accept language parameter |
| `frontend/src/hooks/useSpeechSynthesis.ts` | **Modified** — Accept language parameter |
| `frontend/src/hooks/useWakeWord.ts` | **Modified** — Accept language parameter |
| `frontend/src/app/page.tsx` | **Modified** — Integrate language control |

---

## Supported Languages

| Language | Code | STT Code | TTS Code | Flag |
|---|---|---|---|---|
| Chinese | `zh-CN` | `zh-CN` | `zh-CN` | 🇨🇳 |
| English | `en-US` | `en-US` | `en-US` | 🇺🇸 |
| Auto | `auto` | `zh-CN` (default) | `zh-CN` (default) | 🌐 |

---

## Auto Mode Behavior

When "Auto" mode is selected:
- STT defaults to Chinese (`zh-CN`)
- TTS defaults to Chinese (`zh-CN`)
- Language detection runs on recognized text
- Future: could dynamically switch based on detected language

---

## UI Integration

### Header Bar
A language selector button appears in the terminal header, left of the Wake Mode toggle:

```
[🇨🇳 中文] [WAKE]  ← Compact mode (cycles on click)
```

### Language Cycling
Clicking the button cycles through: Chinese → English → Auto → Chinese

### Persistence
Language preference is saved to `localStorage` under key `neon_paw_speech_language`. On page refresh, the selected language persists.

---

## Verification

1. Build passes: `npm run build` — no TypeScript errors
2. Language selector appears in header
3. Clicking selector cycles through languages
4. STT uses selected language (Chinese vs English recognition)
5. TTS uses selected language (Chinese vs English voice)
6. Wake word detection uses selected language
7. Language preference persists across page refresh
8. Auto mode defaults to Chinese

---

## Usage Scenarios

### Chinese User (Default)
1. Open page → Language shows "🇨🇳 中文"
2. Speak Chinese → STT recognizes Chinese
3. Pet responds → TTS speaks Chinese

### English User
1. Click language selector → Changes to "🇺🇸 English"
2. Speak English → STT recognizes English
3. Pet responds → TTS speaks English

### Bilingual User
1. Click language selector → Changes to "🌐 Auto"
2. Speak any language → STT defaults to Chinese
3. Future: auto-detect and switch

---

## Technical Details

### Language Code Mapping
```typescript
{
  "zh-CN": { sttCode: "zh-CN", ttsCode: "zh-CN" },
  "en-US": { sttCode: "en-US", ttsCode: "en-US" },
  "auto":  { sttCode: "zh-CN", ttsCode: "zh-CN" },  // defaults to Chinese
}
```

### Voice Selection
TTS automatically selects a voice matching the language prefix:
- Chinese: finds voice with `lang.startsWith("zh")`
- English: finds voice with `lang.startsWith("en")`

### Wake Word Phrases
Wake word detection currently only supports Chinese phrases:
- "小爪醒醒"
- "NEON PAW"
- "醒醒"

English wake phrases could be added in future updates.

---

## Known Limitations

1. Auto mode defaults to Chinese — no real-time language detection yet
2. Wake word phrases are Chinese-only
3. No language-specific wake phrases for English
4. TTS voice quality depends on browser's available voices
5. Some browsers may not have English voices installed

---

## Follow-up Improvements

1. Add real-time language detection in Auto mode
2. Add English wake phrases ("Hey NEON PAW", "wake up")
3. Add language-specific UI text (labels, hints)
4. Add more languages (Japanese, Korean, etc.)
5. Add language-specific TTS voice selection
