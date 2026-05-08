// Speech utility functions for Phase 10D — STT accuracy & correction UX

const WAKE_PHRASES = [
  "小爪醒醒",
  "小抓醒醒",
  "小早醒醒",
  "小爪",
  "小抓",
  "小早",
  "醒醒",
  "neon paw",
];

const FILLER_WORDS = new Set([
  "啊", "嗯", "呃", "喂", "哦", "呀", "吧", "呢", "嘛", "哈",
  "额", "诶", "噢", "呵", "哼",
  "hello", "hi", "hey", "oh", "um", "uh", "er", "ah", "hmm",
  "yo", "ok", "okay",
]);

/**
 * Normalize speech text: trim, collapse whitespace, strip redundant punctuation.
 */
export function normalizeSpeechText(text: string): string {
  return text
    .trim()
    .replace(/[\s　]+/g, " ") // collapse whitespace (including full-width space)
    .replace(/^[,，。!！?？、；;：:""''…\-—_\s]+/, "") // strip leading punctuation
    .replace(/[,，。!！?？、；;：:""''…\-—_\s]+$/, "") // strip trailing punctuation
    .trim();
}

/**
 * Split a transcript into wake word + command portions.
 * If wake phrase found, returns the text after it as the command.
 */
export function splitWakeWordAndCommand(text: string): {
  hasWakeWord: boolean;
  command: string;
  raw: string;
} {
  const lower = text.toLowerCase();

  for (const phrase of WAKE_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const after = text.slice(idx + phrase.length);
      const command = after.replace(/^[,，。!！?？、；;：:\s]+/, "").trim();
      return { hasWakeWord: true, command, raw: text };
    }
  }

  return { hasWakeWord: false, command: "", raw: text };
}

/**
 * Check if a speech result has low confidence.
 * Uses both numeric confidence (if available) and heuristic rules.
 */
export function isLowConfidenceSpeech(
  text: string,
  confidence?: number | null,
  lastUserMessage?: string,
  lastMessageTime?: number
): boolean {
  const normalized = normalizeSpeechText(text);

  // Empty after normalization
  if (normalized.length === 0) return true;

  // Numeric confidence from browser
  if (confidence != null && confidence < 0.6) return true;

  // Too short: < 2 Chinese chars or < 3 non-Chinese chars
  const chineseChars = (normalized.match(/[一-鿿]/g) || []).length;
  const nonChinese = normalized.replace(/[一-鿿]/g, "").replace(/\s/g, "").length;
  if (chineseChars > 0 && chineseChars < 2 && nonChinese === 0) return true;
  if (chineseChars === 0 && nonChinese < 3) return true;

  // Only filler words
  const words = normalized.toLowerCase().split(/\s+/);
  const allFiller = words.every((w) => FILLER_WORDS.has(w));
  if (allFiller) return true;

  // Only punctuation (should be caught by normalize, but double-check)
  if (/^[\p{P}\p{S}\s]+$/u.test(normalized)) return true;

  // Duplicate of last message within 3 seconds
  if (
    lastUserMessage != null &&
    lastMessageTime != null &&
    normalized === normalizeSpeechText(lastUserMessage) &&
    Date.now() - lastMessageTime < 3000
  ) {
    return true;
  }

  return false;
}

/**
 * Check if speech text is meaningful enough to send.
 * Stricter than "not low confidence" — used for noise filtering.
 */
export function isMeaningfulSpeech(text: string): boolean {
  const normalized = normalizeSpeechText(text);
  if (normalized.length === 0) return false;

  // Only punctuation
  if (/^[\p{P}\p{S}\s]+$/u.test(normalized)) return false;

  // Only filler words
  const words = normalized.toLowerCase().split(/\s+/);
  const allFiller = words.every((w) => FILLER_WORDS.has(w));
  if (allFiller) return false;

  return true;
}
