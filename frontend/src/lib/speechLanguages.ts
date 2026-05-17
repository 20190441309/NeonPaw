// Speech language configuration for STT and TTS

export type SpeechLanguageCode = "zh-CN" | "en-US" | "auto";

export interface SpeechLanguage {
  code: SpeechLanguageCode;
  name: string;
  sttCode: string;  // SpeechRecognition lang code
  ttsCode: string;  // SpeechSynthesis lang code
  flag: string;
}

export const SPEECH_LANGUAGES: SpeechLanguage[] = [
  {
    code: "zh-CN",
    name: "中文",
    sttCode: "zh-CN",
    ttsCode: "zh-CN",
    flag: "🇨🇳",
  },
  {
    code: "en-US",
    name: "English",
    sttCode: "en-US",
    ttsCode: "en-US",
    flag: "🇺🇸",
  },
  {
    code: "auto",
    name: "Auto",
    sttCode: "zh-CN",  // Default to Chinese, detect from input
    ttsCode: "zh-CN",  // Default to Chinese
    flag: "🌐",
  },
];

export const DEFAULT_LANGUAGE: SpeechLanguageCode = "zh-CN";

const STORAGE_KEY = "neon_paw_settings_language";

/**
 * Get saved language preference from localStorage
 */
export function getSavedLanguage(): SpeechLanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isValidLanguageCode(saved)) {
      return saved;
    }
  } catch {}
  return DEFAULT_LANGUAGE;
}

/**
 * Save language preference to localStorage
 */
export function saveLanguage(code: SpeechLanguageCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

/**
 * Check if a string is a valid language code
 */
function isValidLanguageCode(code: string): code is SpeechLanguageCode {
  return SPEECH_LANGUAGES.some((l) => l.code === code);
}

/**
 * Get language config by code
 */
export function getLanguageConfig(code: SpeechLanguageCode): SpeechLanguage {
  return SPEECH_LANGUAGES.find((l) => l.code === code) || SPEECH_LANGUAGES[0];
}

/**
 * Detect language from text content (for "auto" mode)
 * Returns the detected language code
 */
export function detectLanguageFromText(text: string): "zh-CN" | "en-US" {
  // Check for Chinese characters
  const chineseChars = text.match(/[一-鿿㐀-䶿]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;

  // Check for Latin characters
  const latinChars = text.match(/[a-zA-Z]/g);
  const latinCount = latinChars ? latinChars.length : 0;

  // If more Chinese characters, use Chinese
  if (chineseCount > latinCount) {
    return "zh-CN";
  }

  // Default to English
  return "en-US";
}
