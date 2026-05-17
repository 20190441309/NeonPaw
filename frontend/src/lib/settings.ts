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
  { name: "gemini", label: "Google Gemini", defaultModel: "gem-2.0-flash" },
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
