# Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-side drawer settings panel that lets users configure LLM, voice, memory, and developer options without editing config files.

**Architecture:** A `useSettings` hook centralizes all localStorage reads/writes with a single key prefix. `SettingsPanel` is a drawer component that slides in from the right. The gear button lives in `TerminalShell`'s header. Settings that affect other components (language, wake mode, trace mode) are read directly from localStorage by the consumers — no global state bus needed.

**Tech Stack:** React hooks, Tailwind CSS, localStorage, existing `callHealthApi` for backend status.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/lib/settings.ts` | Create | Settings types, defaults, localStorage helpers |
| `frontend/src/hooks/useSettings.ts` | Create | Hook for reading/writing all settings |
| `frontend/src/components/SettingsPanel.tsx` | Create | Drawer panel with all setting sections |
| `frontend/src/components/SettingsButton.tsx` | Create | Gear icon button that opens the drawer |
| `frontend/src/components/AgentTracePanel.tsx` | Modify | Accept `traceMode` prop from settings |
| `frontend/src/app/page.tsx` | Modify | Wire up SettingsButton + SettingsPanel |

---

### Task 1: Settings types and localStorage helpers

**Files:**
- Create: `frontend/src/lib/settings.ts`

- [ ] **Step 1: Create settings types and helpers**

```typescript
// frontend/src/lib/settings.ts

export type LLMProvider = "deepseek" | "gemini" | "kimi" | "glm" | "qwen" | "openai";
export type TraceMode = "simple" | "developer";
export type SpeechLanguageCode = "zh-CN" | "en-US" | "auto";

export interface LLMProviderPreset {
  name: LLMProvider;
  label: string;
  defaultModel: string;
}

export const LLM_PROVIDER_PRESETS: LLMProviderPreset[] = [
  { name: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat" },
  { name: "gemini", label: "Google Gemini", defaultModel: "gemini-2.0-flash" },
  { name: "kimi", label: "Moonshot Kimi", defaultModel: "moonshot-v1-8k" },
  { name: "glm", label: "Zhipu GLM", defaultModel: "glm-4-flash" },
  { name: "qwen", label: "Alibaba Qwen", defaultModel: "qwen-turbo" },
  { name: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
];

const PREFIX = "neon_paw_settings_";

function getSetting(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback;
  } catch {
    return fallback;
  }
}

function setSetting(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {}
}

// --- Individual settings ---

export function getLLMProvider(): LLMProvider {
  const val = getSetting("llm_provider", "deepseek");
  if (LLM_PROVIDER_PRESETS.some((p) => p.name === val)) return val as LLMProvider;
  return "deepseek";
}
export function setLLMProvider(v: LLMProvider) { setSetting("llm_provider", v); }

export function getLLMApiKey(): string { return getSetting("llm_api_key", ""); }
export function setLLMApiKey(v: string) { setSetting("llm_api_key", v); }

export function getLLMModel(): string { return getSetting("llm_model", ""); }
export function setLLMModel(v: string) { setSetting("llm_model", v); }

export function getSpeechLanguage(): SpeechLanguageCode {
  const val = getSetting("language", "zh-CN");
  if (["zh-CN", "en-US", "auto"].includes(val)) return val as SpeechLanguageCode;
  return "zh-CN";
}
export function setSpeechLanguage(v: SpeechLanguageCode) { setSetting("language", v); }

export function getWakeMode(): boolean { return getSetting("wake_mode", "false") === "true"; }
export function setWakeMode(v: boolean) { setSetting("wake_mode", String(v)); }

export function getTraceMode(): TraceMode {
  const val = getSetting("trace_mode", "simple");
  if (val === "developer") return "developer";
  return "simple";
}
export function setTraceMode(v: TraceMode) { setSetting("trace_mode", v); }

export function getDevMode(): boolean { return getSetting("dev_mode", "false") === "true"; }
export function setDevMode(v: boolean) { setSetting("dev_mode", String(v)); }

export function getDefaultModelForProvider(provider: LLMProvider): string {
  return LLM_PROVIDER_PRESETS.find((p) => p.name === provider)?.defaultModel ?? "";
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit src/lib/settings.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/settings.ts
git commit -m "feat: add settings types and localStorage helpers"
```

---

### Task 2: useSettings hook

**Files:**
- Create: `frontend/src/hooks/useSettings.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/hooks/useSettings.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  type LLMProvider,
  type TraceMode,
  type SpeechLanguageCode,
  getLLMProvider, setLLMProvider,
  getLLMApiKey, setLLMApiKey,
  getLLMModel, setLLMModel,
  getSpeechLanguage, setSpeechLanguage,
  getWakeMode, setWakeMode,
  getTraceMode, setTraceMode,
  getDevMode, setDevMode,
} from "@/lib/settings";

export interface SettingsState {
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  language: SpeechLanguageCode;
  wakeMode: boolean;
  traceMode: TraceMode;
  devMode: boolean;
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>({
    llmProvider: "deepseek",
    llmApiKey: "",
    llmModel: "",
    language: "zh-CN",
    wakeMode: false,
    traceMode: "simple",
    devMode: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings({
      llmProvider: getLLMProvider(),
      llmApiKey: getLLMApiKey(),
      llmModel: getLLMModel(),
      language: getSpeechLanguage(),
      wakeMode: getWakeMode(),
      traceMode: getTraceMode(),
      devMode: getDevMode(),
    });
    setLoaded(true);
  }, []);

  const update = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Persist to localStorage
    switch (key) {
      case "llmProvider": setLLMProvider(value as LLMProvider); break;
      case "llmApiKey": setLLMApiKey(value as string); break;
      case "llmModel": setLLMModel(value as string); break;
      case "language": setSpeechLanguage(value as SpeechLanguageCode); break;
      case "wakeMode": setWakeMode(value as boolean); break;
      case "traceMode": setTraceMode(value as TraceMode); break;
      case "devMode": setDevMode(value as boolean); break;
    }
  }, []);

  return { settings, update, loaded };
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit src/hooks/useSettings.ts`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSettings.ts
git commit -m "feat: add useSettings hook for centralized settings management"
```

---

### Task 3: SettingsButton component

**Files:**
- Create: `frontend/src/components/SettingsButton.tsx`

- [ ] **Step 1: Create the gear button**

```tsx
// frontend/src/components/SettingsButton.tsx
"use client";

interface Props {
  onClick: () => void;
}

export default function SettingsButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="opacity-40 hover:opacity-80 transition-opacity text-sm leading-none"
      title="Settings"
    >
      ⚙
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SettingsButton.tsx
git commit -m "feat: add SettingsButton gear icon component"
```

---

### Task 4: SettingsPanel component

**Files:**
- Create: `frontend/src/components/SettingsPanel.tsx`

- [ ] **Step 1: Create the drawer panel**

```tsx
// frontend/src/components/SettingsPanel.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { type SettingsState } from "@/hooks/useSettings";
import { LLM_PROVIDER_PRESETS, type LLMProvider } from "@/lib/settings";
import { callHealthApi, callMemoryExportApi, callMemoryImportApi } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";

interface Props {

interface Props {
  open: boolean;
  settings: SettingsState;
  onUpdate: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onClose: () => void;
}

export default function SettingsPanel({ open, settings, onUpdate, onClose }: Props) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load health on open
  useEffect(() => {
    if (!open) return;
    callHealthApi().then(setHealth);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleExport = async () => {
    const data = await callMemoryExportApi();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neon-paw-memories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.memories)) return;
      const items = data.memories
        .filter((m: Record<string, unknown>) => typeof m === "object" && typeof m.content === "string")
        .map((m: Record<string, unknown>) => ({
          content: String(m.content),
          category: typeof m.category === "string" ? m.category : "custom",
          pinned: Boolean(m.pinned),
        }));
      if (items.length === 0) return;
      const result = await callMemoryImportApi(items);
      if (result) {
        setImportResult(result);
        setTimeout(() => setImportResult(null), 4000);
      }
    } catch {}
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-[320px] max-w-[90vw] z-50 border-l border-[var(--terminal-border)] bg-[var(--terminal-bg)] overflow-y-auto terminal-scroll"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--terminal-border)]">
          <span className="text-xs tracking-wider opacity-70">SETTINGS</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs opacity-40 hover:opacity-80 transition-opacity"
          >
            [X]
          </button>
        </div>

        <div className="p-4 space-y-5 text-[10px]">
          {/* LLM Config */}
          <section>
            <h3 className="text-[9px] tracking-widest opacity-40 mb-2">LLM CONFIG</h3>
            <div className="space-y-2">
              <label className="block">
                <span className="opacity-40 block mb-0.5">Provider</span>
                <select
                  value={settings.llmProvider}
                  onChange={(e) => {
                    const provider = e.target.value as LLMProvider;
                    onUpdate("llmProvider", provider);
                    if (!settings.llmModel) {
                      const preset = LLM_PROVIDER_PRESETS.find((p) => p.name === provider);
                      if (preset) onUpdate("llmModel", preset.defaultModel);
                    }
                  }}
                  className="w-full bg-transparent border border-[var(--terminal-border)] px-2 py-1 text-[var(--terminal-text)] outline-none focus:border-[var(--terminal-text)]/50"
                >
                  {LLM_PROVIDER_PRESETS.map((p) => (
                    <option key={p.name} value={p.name} className="bg-black">
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="opacity-40 block mb-0.5">API Key</span>
                <div className="flex items-center gap-1">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.llmApiKey}
                    onChange={(e) => onUpdate("llmApiKey", e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 bg-transparent border border-[var(--terminal-border)] px-2 py-1 text-[var(--terminal-text)] outline-none focus:border-[var(--terminal-text)]/50 placeholder:opacity-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="opacity-30 hover:opacity-60 transition-opacity text-[8px] px-1"
                  >
                    {showApiKey ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {!settings.llmApiKey && (
                  <span className="text-yellow-400/50 text-[8px] block mt-0.5">
                    No API key — using mock mode
                  </span>
                )}
              </label>

              <label className="block">
                <span className="opacity-40 block mb-0.5">Model</span>
                <input
                  type="text"
                  value={settings.llmModel}
                  onChange={(e) => onUpdate("llmModel", e.target.value)}
                  placeholder={LLM_PROVIDER_PRESETS.find((p) => p.name === settings.llmProvider)?.defaultModel}
                  className="w-full bg-transparent border border-[var(--terminal-border)] px-2 py-1 text-[var(--terminal-text)] outline-none focus:border-[var(--terminal-text)]/50 placeholder:opacity-20"
                />
              </label>
            </div>
            <p className="opacity-20 text-[8px] mt-1.5">
              LLM settings are stored locally. Restart backend to apply env-based config.
            </p>
          </section>

          {/* Voice */}
          <section>
            <h3 className="text-[9px] tracking-widest opacity-40 mb-2">VOICE</h3>
            <div className="space-y-2">
              <div>
                <span className="opacity-40 block mb-1">Language</span>
                <div className="flex gap-1">
                  {(["zh-CN", "en-US", "auto"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onUpdate("language", code)}
                      className={`px-2 py-0.5 border text-[9px] transition-colors ${
                        settings.language === code
                          ? "border-[var(--terminal-text)]/50 text-[var(--terminal-text)]"
                          : "border-[var(--terminal-border)] text-[var(--terminal-text)]/30 hover:text-[var(--terminal-text)]/50"
                      }`}
                    >
                      {code === "zh-CN" ? "中文" : code === "en-US" ? "English" : "Auto"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="opacity-40">Wake Mode</span>
                <button
                  type="button"
                  onClick={() => onUpdate("wakeMode", !settings.wakeMode)}
                  className={`px-2 py-0.5 border text-[9px] transition-colors ${
                    settings.wakeMode
                      ? "border-[var(--terminal-text)]/50 text-[var(--terminal-text)]"
                      : "border-[var(--terminal-border)] text-[var(--terminal-text)]/30"
                  }`}
                >
                  {settings.wakeMode ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </section>

          {/* Memory */}
          <section>
            <h3 className="text-[9px] tracking-widest opacity-40 mb-2">MEMORY</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="px-2 py-0.5 border border-[var(--terminal-border)] text-[9px] opacity-40 hover:opacity-70 transition-opacity"
              >
                EXPORT
              </button>
              <label className="px-2 py-0.5 border border-[var(--terminal-border)] text-[9px] opacity-40 hover:opacity-70 transition-opacity cursor-pointer">
                IMPORT
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {importResult && (
                <span className="opacity-40 text-[8px]">
                  +{importResult.imported} OK {importResult.skipped > 0 && `· ${importResult.skipped} SKIP`}
                </span>
              )}
            </div>
          </section>

          {/* Backend Status */}
          <section>
            <h3 className="text-[9px] tracking-widest opacity-40 mb-2">BACKEND STATUS</h3>
            <div className="space-y-0.5 opacity-40 text-[9px]">
              <div>API: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}</div>
              <div>
                Status:{" "}
                <span className={health ? "text-emerald-400/60" : "text-red-400/60"}>
                  {health ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              {health && (
                <>
                  <div>LLM: {health.llm.provider} / {health.llm.mode}</div>
                  <div>Memory: {health.memory.backend} ({health.memory.server_storage ? "server" : "local"})</div>
                </>
              )}
            </div>
          </section>

          {/* Developer */}
          <section>
            <h3 className="text-[9px] tracking-widest opacity-40 mb-2">DEVELOPER</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="opacity-40">Agent Trace</span>
                <button
                  type="button"
                  onClick={() => onUpdate("traceMode", settings.traceMode === "simple" ? "developer" : "simple")}
                  className={`px-2 py-0.5 border text-[9px] transition-colors ${
                    settings.traceMode === "developer"
                      ? "border-[var(--terminal-text)]/50 text-[var(--terminal-text)]"
                      : "border-[var(--terminal-border)] text-[var(--terminal-text)]/30"
                  }`}
                >
                  {settings.traceMode === "simple" ? "SIMPLE" : "DEVELOPER"}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-40">Dev Mode</span>
                <button
                  type="button"
                  onClick={() => onUpdate("devMode", !settings.devMode)}
                  className={`px-2 py-0.5 border text-[9px] transition-colors ${
                    settings.devMode
                      ? "border-[var(--terminal-text)]/50 text-[var(--terminal-text)]"
                      : "border-[var(--terminal-border)] text-[var(--terminal-text)]/30"
                  }`}
                >
                  {settings.devMode ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit src/components/SettingsPanel.tsx`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel drawer component with all config sections"
```

---

### Task 5: Update AgentTracePanel to accept external traceMode

**Files:**
- Modify: `frontend/src/components/AgentTracePanel.tsx:32-41`

- [ ] **Step 1: Add `traceMode` prop and remove internal mode state**

Replace the component's Props interface and state. Change:

```tsx
interface Props {
  trace: TraceEntry[];
}
```

To:

```tsx
interface Props {
  trace: TraceEntry[];
  traceMode?: "simple" | "developer";
}
```

Change the component function signature and remove internal `mode` state:

```tsx
export default function AgentTracePanel({ trace, traceMode = "simple" }: Props) {
  const [open, setOpen] = useState(false);
  // Remove: const [mode, setMode] = useState<"simple" | "developer">("simple");
```

Replace all references to internal `mode` with `traceMode`. Remove the mode toggle buttons (SIMPLE/DEVELOPER) from the UI since mode is now controlled by settings.

The full change in the JSX: remove the mode toggle `<div>` (lines 64-89), and replace `mode` with `traceMode` in the remaining logic:

```tsx
  const simpleTrace = useMemo(
    () => trace.filter((t) => SIMPLE_MODULES.has(t.module)),
    [trace],
  );

  const displayTrace = traceMode === "simple" ? simpleTrace : trace;
```

And in the hidden count display, replace `mode === "simple"` with `traceMode === "simple"`:

```tsx
{traceMode === "simple" && simpleTrace.length < trace.length && (
  <span className="opacity-20 text-[8px]">
    ({trace.length - simpleTrace.length} hidden)
  </span>
)}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit src/components/AgentTracePanel.tsx`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AgentTracePanel.tsx
git commit -m "feat: AgentTracePanel accepts external traceMode prop"
```

---

### Task 6: Wire settings into page.tsx

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Add imports**

Add to the imports at the top:

```tsx
import SettingsButton from "@/components/SettingsButton";
import SettingsPanel from "@/components/SettingsPanel";
import { useSettings } from "@/hooks/useSettings";
```

- [ ] **Step 2: Add settings hook and drawer state**

After the `importResult` state declaration (around line 87), add:

```tsx
  // Settings
  const { settings, update: updateSettings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
```

- [ ] **Step 3: Pass traceMode to AgentTracePanel**

Change the AgentTracePanel usage from:

```tsx
<AgentTracePanel trace={pet.trace} />
```

To:

```tsx
<AgentTracePanel trace={pet.trace} traceMode={settings.traceMode} />
```

- [ ] **Step 4: Add SettingsButton to headerAction**

In the `headerAction` prop of `TerminalShell`, add the settings button:

```tsx
      headerAction={
        <div className="flex items-center gap-2">
          <SettingsButton onClick={() => setSettingsOpen(true)} />
          <LanguageSelector
            currentLanguage={speechLanguage.languageCode}
            onLanguageChange={speechLanguage.setLanguage}
            compact
          />
          <WakeModeToggle
            enabled={wakeWordEnabled}
            onToggle={() => persistWakeMode(!wakeWordEnabled)}
            isSupported={stt.isSupported}
            error={wakeWord.error}
          />
        </div>
      }
```

- [ ] **Step 5: Add SettingsPanel before closing tag**

Before the closing `</TerminalShell>` tag, add:

```tsx
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
```

- [ ] **Step 6: Verify full page compiles**

Run: `cd frontend && npx tsc --noEmit src/app/page.tsx`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: wire SettingsPanel and SettingsButton into main page"
```

---

### Task 7: Sync settings with existing hooks

**Files:**
- Modify: `frontend/src/hooks/useSpeechLanguage.ts`
- Modify: `frontend/src/app/page.tsx`

The `useSpeechLanguage` hook uses its own localStorage key `neon_paw_speech_language`. Settings panel uses `neon_paw_settings_language`. We need to sync them.

- [ ] **Step 1: Update useSpeechLanguage to use the settings key**

In `frontend/src/lib/speechLanguages.ts`, change the `STORAGE_KEY` constant:

```typescript
const STORAGE_KEY = "neon_paw_settings_language";
```

This way both the hook and the settings panel read/write the same key.

- [ ] **Step 2: Sync wake mode key in page.tsx**

In `frontend/src/app/page.tsx`, change the `WAKE_MODE_STORAGE_KEY` constant:

```tsx
const WAKE_MODE_STORAGE_KEY = "neon_paw_settings_wake_mode";
```

This ensures the settings panel's wake mode toggle and the existing wake mode hook use the same key.

- [ ] **Step 3: Verify page compiles**

Run: `cd frontend && npx tsc --noEmit src/app/page.tsx`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/speechLanguages.ts frontend/src/app/page.tsx
git commit -m "feat: sync settings localStorage keys between panel and hooks"
```

---

### Task 8: Full build and lint verification

- [ ] **Step 1: Run TypeScript build**

Run: `cd frontend && npm run build`
Expected: build succeeds with no errors

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: no new errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build/lint issues from settings screen"
```

---

### Task 9: Update roadmap

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Mark settings screen as complete**

In the P5 section, add a completed item or update existing text to reflect the settings screen is done.

- [ ] **Step 2: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: mark P5 settings screen as implemented"
```
