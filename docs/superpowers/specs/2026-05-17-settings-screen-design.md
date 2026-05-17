# Settings Screen Design

> Date: 2026-05-17
> Status: Approved

## Overview

Add a settings panel to NEON PAW that lets users configure LLM provider, voice, memory, and developer options without editing config files. First version uses a right-side drawer panel with localStorage persistence.

## Decisions

- **Layout**: Right-side drawer panel (320px), closes on ESC or outside click
- **Persistence**: localStorage with `neon_paw_settings_` prefix
- **Scope**: All config categories (LLM, voice, memory, backend info, developer)

## UI Structure

```
┌─────────────────────────────────┐
│ SETTINGS                    [X] │
├─────────────────────────────────┤
│ > LLM CONFIG                    │
│   Provider  [DeepSeek ▾]        │
│   API Key   [••••••••••]        │
│   Model     [deepseek-chat  ]   │
│                                 │
│ > VOICE                         │
│   Language  [中文] [English]    │
│   Wake Mode [ON/OFF]            │
│                                 │
│ > MEMORY                        │
│   [EXPORT] [IMPORT] [CLEAR]     │
│                                 │
│ > BACKEND STATUS                │
│   API: http://localhost:8000    │
│   Status: ONLINE                │
│   LLM: DeepSeek / live          │
│   Memory: 12 entries            │
│                                 │
│ > DEVELOPER                     │
│   Agent Trace  [ON/OFF]         │
│   Dev Mode     [ON/OFF]         │
└─────────────────────────────────┘
```

Trigger: gear icon button in the top-right of the status bar.

## Data Flow

### localStorage Keys

| Key | Values | Default |
|-----|--------|---------|
| `neon_paw_settings_llm_provider` | `deepseek` \| `gemini` \| `kimi` \| `glm` \| `qwen` \| `openai` | `deepseek` |
| `neon_paw_settings_llm_api_key` | string | `""` |
| `neon_paw_settings_llm_model` | string | provider-dependent |
| `neon_paw_settings_language` | `zh-CN` \| `en-US` \| `auto` | `zh-CN` |
| `neon_paw_settings_wake_mode` | `true` \| `false` | `false` |
| `neon_paw_settings_trace_mode` | `simple` \| `developer` | `simple` |
| `neon_paw_settings_dev_mode` | `true` \| `false` | `false` |

### Integration with Existing Code

- **Language**: `useSpeechLanguage` already reads `neon_paw_speech_language`. Settings panel reuses this key (rename to `neon_paw_settings_language` for consistency, or keep both and sync).
- **Wake mode**: `useWakeMode` already reads `neon_paw_wake_mode`. Settings panel reuses this key.
- **Agent Trace**: `AgentTracePanel` has internal mode state. Lift to `useSettings` hook for global control.
- **LLM config**: First version displays and edits in frontend only. Actual生效 requires backend restart (`.env`). Panel shows hint text.
- **Developer mode**: Controls visibility of extra debug info (raw JSON, network logs).

## Interaction Details

- API Key field: masked by default (`••••••••`), toggle to show/hide
- Provider switch: auto-fills default model name for that provider
- Memory buttons (export/import/clear): reuse existing API functions
- Backend section: read-only, polls `/api/health` on open

## Error Handling

- Empty API key: yellow hint "No API key — using mock mode"
- localStorage write failure: silent fallback (settings don't persist)

## Files to Create/Modify

### New Files

- `frontend/src/hooks/useSettings.ts` — unified settings read/write hook
- `frontend/src/components/SettingsPanel.tsx` — drawer panel component

### Modified Files

- `frontend/src/app/page.tsx` — add SettingsButton + SettingsPanel
- `frontend/src/components/AgentTracePanel.tsx` — accept external mode prop
- `frontend/src/components/MemoryPanel.tsx` — no changes needed (memory buttons in settings are separate entry points calling same API)

## Component Tree

```
page.tsx
├── SettingsPanel (drawer)
│   ├── LLMSection
│   ├── VoiceSection
│   ├── MemorySection
│   ├── BackendSection (read-only, calls /api/health)
│   └── DeveloperSection
└── SettingsButton (gear icon, fixed top-right)
```
