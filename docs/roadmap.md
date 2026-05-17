# NEON PAW Development Roadmap

> Updated: 2026-05-12  
> Scope: after the current voice conversation MVP, prioritize stability first, then richer voice/agent capability, then product packaging.

NEON PAW's core MVP loop is already in place:

```text
voice input -> browser STT -> /api/chat -> RootBrain -> pet state update -> ASCII frame -> browser TTS
```

The next work should keep that loop stable while gradually upgrading the pet from a polished demo into a more capable companion.

---

## P0: Stabilize The Project

These tasks should come first because they reduce future friction without changing product direction.

- [x] Fix frontend `npm run lint` errors.
  Current production build passes, but lint still reports React 19 / Next 16 rule violations around refs, effects, hook ordering, and `any` types.
- [x] Align README, checkpoint docs, and real commands.
  Keep setup instructions, feature status, and current architecture consistent.
- [x] Fix the Next.js workspace root warning.
  Configure `frontend/next.config.ts` so builds stop inferring the wrong workspace root.
- [x] Add stronger frontend speech types.
  Replace broad `any` usage around `SpeechRecognition`, recognition events, and browser-specific APIs.
- [x] Decide what to do with local untracked files.
  Current local files such as `.codex/` and root `AGENTS.md` should either be committed intentionally or ignored intentionally.

**Current status:** completed on 2026-05-12.

Notes:

- `.codex/` is local Codex app state and is ignored by git.
- Root `AGENTS.md` is treated as project documentation and should be tracked intentionally.
- Historical checkpoint files remain historical records; current setup and next steps are reflected in README and this roadmap.

**Definition of done**

```text
cd frontend && npm run build
cd frontend && npm run lint
cd backend && venv/bin/python -m pytest tests -q
```

All three commands pass cleanly.

---

## P1: Improve The Current Voice Experience

These tasks make the current browser-based experience feel smoother without requiring a backend speech stack yet.

- [x] Add fuzzy wake phrase matching.
  Handle near misses such as "小爪行行" or similar recognition errors around "小爪醒醒".
- [x] Add speech confidence visualization.
  Show a small signal meter, waveform, or confidence bar while listening.
- [x] Improve stop phrase handling.
  Replace broad substring matching with more intentional session-ending detection.
- [x] Add speech language controls.
  Support Chinese, English, and possibly an auto mode instead of hardcoding `zh-CN`.
- [x] Expand mock-mode replies.
  Make no-API-key demos feel less repetitive and more pet-like.
- [ ] Tune low-confidence heuristics with real usage.
  Expand filler words, duplicate detection, and short-utterance rules based on actual transcripts.

**Definition of done**

The app still works in click-to-talk and wake-mode sessions, and low-confidence corrections remain available in both flows.

**Progress:** fuzzy wake phrase matching completed on 2026-05-12. Exact wake phrase matching still takes priority, short wake phrases require a clean boundary before fuzzy matching runs, and near-misses such as "小爪行行" can now wake the pet.

Speech signal visualization completed on 2026-05-12. The UI now shows a terminal-style signal panel during click-to-talk, wake listening, session listening, and confirmation states.

Stop phrase handling improved on 2026-05-17. Multi-layer detection with exact match, suffix patterns, and negative boundary checking.

Speech language controls completed on 2026-05-17. LanguageSelector component + useSpeechLanguage hook integrated with useSpeechRecognition.

Mock-mode replies expanded on 2026-05-17. persona.py now provides 50+ varied replies across 11 intent categories, randomly selected and emotion-aware. Integrated into root_brain fallback path.

---

## P2: Add Backend Capabilities

These tasks move important runtime capabilities out of browser-only APIs.

- [ ] Decide and implement the state API direction.
  Either implement `GET /api/state` and `POST /api/state`, or formally keep state frontend-owned and remove stale state API references.
- [x] Add backend STT with `/api/stt`.
  Implemented using FunASR with GPU support.
- [x] Add backend TTS with `/api/tts`.
  Implemented using CosyVoice with GPU support.
- [x] Add backend health checks.
  Example: `/api/health` returns API status, LLM config state, STT/TTS availability, and memory backend status.
- [ ] Improve backend fallback reporting.
  Return more specific trace entries when the LLM fails, JSON validation fails, or a provider is unavailable.

**Definition of done**

The app can run with either browser speech APIs or backend speech APIs, and the frontend can display backend capability status clearly.

---

## P3: Upgrade Memory

These tasks turn localStorage memory into a more durable and user-controllable memory system.

- [x] Add server-side memory APIs.
  Start with SQLite or another lightweight local store before adding cloud sync.
- [x] Add memory categories.
  Separate names, preferences, goals, habits, project context, and custom notes.
- [x] Add memory editing UI.
  Let the user edit, delete, pin, and inspect saved memories.
- [x] Add memory merge and dedupe.
  Avoid repeated memories such as multiple versions of "我叫小野".
- [x] Add memory export/import.
  Useful before introducing accounts or cloud sync.
- [ ] Optional: add vector memory retrieval.
  Use embeddings once conversation history and memories become too large for simple list injection.

**Definition of done**

The user can see and control what NEON PAW remembers, and memory survives beyond a single browser's localStorage when server memory is enabled.

**Progress:** Server-side SQLite memory completed on 2026-05-17. Backend provides CRUD API with categories (name/preference/goal/habit/project/custom), deduplication, and pinning. Frontend useMemory hook auto-detects backend availability and falls back to localStorage. MemoryPanel supports inline editing, category filtering, and server/local status display.

---

## P4: Grow The Agent Brain

These tasks make NEON PAW more capable while preserving the structured response contract.

- [x] LLM Provider adapter layer.
  Unified interface supporting DeepSeek, Gemini, Kimi, GLM, Qwen, OpenAI via config-only switching.
- [x] Strengthen module-level RootBrain outputs.
  Sub-module validation layer cross-checks LLM output against intent/action/state/memory modules.
- [ ] Add task-oriented companion modes.
  Examples: study buddy, coding buddy, daily check-in, reminder companion, reading assistant.
- [ ] Add a tool invocation layer.
  Prepare for calendar, files, search, MCP, and user-approved external actions.
- [x] Add richer Agent Trace modes.
  Provide a simple trace for normal users and a detailed trace for developer mode.
- [ ] Evaluate real Google ADK runtime integration.
  The current architecture is ADK-ready, but not using Google ADK runtime yet.
- [ ] Preserve the JSON response contract during any ADK migration.
  The frontend should still consume `reply`, `emotion`, `action`, `state_delta`, `memory`, and `trace`.

**Definition of done**

NEON PAW can handle small useful tasks without becoming a generic chatbot, and Agent Trace still explains what happened.

---

## P5: Package And Ship

These tasks turn the project from a local web demo into something easier to use regularly.

- [x] Add PWA support.
  Include manifest, icons, mobile polish, and an installable shell.
- [ ] Build an Electron desktop version.
  NEON PAW should be able to behave like a small desktop companion.
- [x] Add a settings screen.
  Configure API keys, model provider, voice mode, wake phrase, memory, privacy, and developer options.
- [ ] Deploy the backend.
  Start with a simple hosted FastAPI deployment or a local-first desktop backend.
- [ ] Add privacy and permissions documentation.
  Explain microphone usage, localStorage, backend memory, and any external provider calls.
- [ ] Add release checklist and demo script.
  Keep public demos repeatable and reduce last-minute setup risk.

**Definition of done**

A new user can install or open NEON PAW, configure it safely, and understand what data is local versus remote.

---

## Suggested Build Order

1. Finish **P0** so the codebase is clean and easier to change.
2. Pick two or three **P1** voice improvements for immediate user-facing polish.
3. Implement **P2 backend STT/TTS** if voice accuracy becomes the main bottleneck.
4. Upgrade **P3 memory** once conversations become meaningfully long-term.
5. Grow **P4 agent abilities** only after the interaction loop feels reliable.
6. Start **P5 packaging** when the app is useful enough to run every day.

Recommended next sprint:

```text
P2 backend STT/TTS
P1 expand mock-mode replies
P4 strengthen RootBrain outputs
```

详细的剩余功能 ROI 分析见 [Next Features Analysis](next-features-analysis.md)。
