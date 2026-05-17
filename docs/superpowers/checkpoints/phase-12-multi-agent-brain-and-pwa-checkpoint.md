# Phase 12 Checkpoint: Multi-Agent Brain, Health Check & PWA

**Date:** 2026-05-17
**Status:** Complete
**Branch:** main
**Commits:** `8b18a4a..e6546e5` (10 commits)

---

## Summary

This phase delivered three major capabilities: (1) replacing the rule-based mock pipeline with an LLM-powered multi-agent brain using Chain-of-Thought reasoning, (2) a backend health check endpoint with frontend integration, and (3) PWA support for home screen installation. Also includes fuzzy wake phrase matching and speech signal visualization improvements.

---

## What Changed

### 1. Multi-Agent Brain (CoT Reasoning)

**Problem:** The old `root_brain.py` had two paths — a mock pipeline with trivial lookup tables, and an LLM path that treated all decisions as a monolith. Neither produced truly intelligent per-agent decisions.

**Solution:** Single LLM call with a structured Chain-of-Thought system prompt requiring 6-step reasoning before JSON output. Each step corresponds to one agent module:

| Step | Module | Purpose |
|---|---|---|
| 1 | Intent | Classify user message (11 categories) |
| 2 | Emotion | Determine emotion + intensity (1-5) |
| 3 | Action | Select pet action from whitelist |
| 4 | State Delta | Calculate state changes (-5 to +5) |
| 5 | Reply | Generate personality-aware response |
| 6 | Memory | Decide whether to save to long-term memory |

**Key changes:**
- `backend/app/services/prompts.py` — Rewritten with full CoT prompt structure
- `backend/app/agents/root_brain.py` — Removed mock path entirely, added `_extract_reasoning_steps()`, `_extract_json()`, `_validate_and_build_response()`
- `backend/app/routers/chat.py` — Updated import from `fallback_response` to `glitch_response`
- No fallback to mock logic — any LLM failure returns a glitch response
- Intent taxonomy expanded from 4 to 11 categories
- State delta range changed from -10..+10 to -5..+5
- `max_tokens` increased from 512 to 1024 for CoT output
- Regex fix: changed `.+?` to `[^[]+?` to prevent greedy matching across step boundaries

**Test results:** 63 backend tests pass. Curl test with "你好呀" returned dynamic emotion (`happy`), action (`wake`), 6 trace entries with Chinese reasoning, and personality-aware reply.

### 2. Backend Health Check

**Files:**
- `backend/app/routers/health.py` — New `GET /api/health` endpoint
- `backend/app/main.py` — Registered health router
- `frontend/src/hooks/useHealthCheck.ts` — Polls `/api/health` every 60s
- `frontend/src/lib/api.ts` — Added `callHealthApi()` with 5s timeout
- `frontend/src/lib/types.ts` — Added `HealthStatus` interface
- `frontend/src/components/StatusHint.tsx` — Shows LLM provider name, uptime

**Response:**
```json
{
  "status": "ok",
  "uptime_seconds": 1234,
  "llm": { "mode": "llm", "provider": "deepseek", "model": "deepseek-chat" },
  "speech": { "mode": "browser" },
  "memory": { "backend": "sqlite", "count": 5 }
}
```

### 3. PWA Support

**Files:**
- `frontend/src/app/manifest.ts` — Web App Manifest (Next.js built-in)
- `frontend/public/sw.js` — Service worker (cache-first for static, network-first for API)
- `frontend/public/icon.svg` — SVG source icon (terminal-style green cat face)
- `frontend/public/icon-192.png` / `icon-512.png` — Generated PNG icons
- `frontend/src/app/layout.tsx` — Added `theme-color`, `appleWebApp` config
- `frontend/src/app/page.tsx` — Service worker registration
- `frontend/next.config.ts` — SW response headers (no-cache)

**Behavior:**
- Users can install via Chrome address bar or iOS Share menu
- Opens in standalone mode (no browser chrome)
- Offline: page shell loads from cache
- Icon: green cat face on black background with "NEON PAW" text

### 4. Fuzzy Wake Phrase Matching

- `frontend/src/lib/wakePhrases.ts` — Expanded wake phrase list with fuzzy matching
- Handles typos and partial matches for wake words like "小爪醒醒", "NEON PAW"

### 5. Speech Signal Visualization

- `frontend/src/components/SpeechSignalPanel.tsx` — New component showing mic signal level
- Visual feedback during listening, wake word detection, and confirmation states

---

## Files Changed

| Category | Files |
|---|---|
| Backend core | `agents/root_brain.py`, `services/prompts.py`, `routers/chat.py`, `main.py` |
| Backend new | `routers/health.py`, `run.bat`, `run.sh`, `pytest.ini` |
| Frontend new | `manifest.ts`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png` |
| Frontend new | `LanguageSelector.tsx`, `SpeechSignalPanel.tsx`, `useHealthCheck.ts`, `useSpeechLanguage.ts`, `speechLanguages.ts`, `stopPhrases.ts`, `wakePhrases.ts`, `speechRecognitionTypes.ts` |
| Frontend modified | `layout.tsx`, `page.tsx`, `next.config.ts`, `StatusHint.tsx`, `api.ts`, `types.ts`, `useSpeechRecognition.ts`, `useSpeechSynthesis.ts`, `useWakeWord.ts`, `useMemory.ts`, `usePetState.ts`, `speechUtils.ts` |
| Tests | `tests/test_root_brain.py` (16 tests rewritten for CoT) |
| Docs | `2026-05-17-multi-agent-brain-design.md`, `2026-05-17-multi-agent-brain-plan.md`, `roadmap.md` |

**Total:** 46 files changed, +4223 / -646 lines

---

## Verification

1. Backend: 63 tests pass (`pytest`)
2. Frontend: `npm run build` succeeds, zero TypeScript errors
3. Curl test: CoT reasoning returns 6 trace entries with Chinese messages
4. PWA: `manifest.webmanifest` generated, service worker registers in browser
5. Health: `/api/health` returns uptime and LLM config
6. All commits pushed to `origin/main`

---

## Current Project State

| Capability | Status |
|---|---|
| Terminal UI + ASCII Pet | Complete |
| Voice Input (browser STT) | Complete |
| Voice Output (browser TTS) | Complete |
| Pet State Machine | Complete |
| Conversation History | Complete |
| Long-term Memory | Complete |
| Agent Trace Panel | Complete |
| Wake Word Detection | Complete |
| Speech Language Control | Complete |
| STT Confidence & Correction | Complete |
| Multi-Agent Brain (CoT) | Complete |
| Backend Health Check | Complete |
| PWA Install | Complete |
| Backend STT/TTS | Not started |
| Server-side Memory | Not started |
| MCP Tool Calls | Not started |

---

## Known Issues

1. Auto language mode defaults to Chinese — no real-time language detection
2. Wake word phrases are Chinese + English but no other languages
3. Service worker does not cache Next.js `_next/` assets (only page shell)
4. No install prompt component — relies on browser's native install UI
