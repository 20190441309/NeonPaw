// frontend/src/components/SettingsPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { type SettingsState } from "@/hooks/useSettings";
import { LLM_PROVIDER_PRESETS, type LLMProvider } from "@/lib/settings";
import { callHealthApi, callMemoryExportApi, callMemoryImportApi } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";

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

  useEffect(() => {
    if (!open) return;
    callHealthApi().then(setHealth);
  }, [open]);

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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[320px] max-w-[90vw] z-50 border-l border-[var(--terminal-border)] bg-[var(--terminal-bg)] overflow-y-auto terminal-scroll">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--terminal-border)]">
          <span className="text-xs tracking-wider opacity-70">SETTINGS</span>
          <button type="button" onClick={onClose} className="text-xs opacity-40 hover:opacity-80 transition-opacity">[X]</button>
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
                    <option key={p.name} value={p.name} className="bg-black">{p.label}</option>
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
                  <button type="button" onClick={() => setShowApiKey((v) => !v)} className="opacity-30 hover:opacity-60 transition-opacity text-[8px] px-1">
                    {showApiKey ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {!settings.llmApiKey && (
                  <span className="text-yellow-400/50 text-[8px] block mt-0.5">No API key — using mock mode</span>
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
            <p className="opacity-20 text-[8px] mt-1.5">LLM settings are stored locally. Restart backend to apply env-based config.</p>
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
              <button type="button" onClick={handleExport} className="px-2 py-0.5 border border-[var(--terminal-border)] text-[9px] opacity-40 hover:opacity-70 transition-opacity">EXPORT</button>
              <label className="px-2 py-0.5 border border-[var(--terminal-border)] text-[9px] opacity-40 hover:opacity-70 transition-opacity cursor-pointer">
                IMPORT
                <input type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImport(file); e.target.value = ""; }} />
              </label>
              {importResult && (
                <span className="opacity-40 text-[8px]">+{importResult.imported} OK {importResult.skipped > 0 && `· ${importResult.skipped} SKIP`}</span>
              )}
            </div>
          </section>

          {/* Backend Status */}
          <section>
            <h3 className="text-[9px] tracking-widest opacity-40 mb-2">BACKEND STATUS</h3>
            <div className="space-y-0.5 opacity-40 text-[9px]">
              <div>API: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}</div>
              <div>Status: <span className={health ? "text-emerald-400/60" : "text-red-400/60"}>{health ? "ONLINE" : "OFFLINE"}</span></div>
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
