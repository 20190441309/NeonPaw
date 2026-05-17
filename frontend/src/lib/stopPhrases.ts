// Stop phrase detection for hands-free wake sessions
// More precise than substring matching — uses exact match + common variants + boundary detection

/**
 * Core stop phrases — exact match required
 */
const CORE_STOP_PHRASES = [
  // Chinese
  "先这样",
  "不用了",
  "结束对话",
  "退出",
  "挂了",
  "再见",
  "拜拜",
  "好了",
  "够了",
  "停",
  "停止",
  "结束",
  "关闭",
  "关掉",
  // English
  "stop",
  "sleep",
  "quit",
  "exit",
  "bye",
  "goodbye",
  "enough",
  "done",
  "close",
  "end",
];

/**
 * Stop phrase patterns with common suffixes
 * These allow natural extensions like "不用了谢谢" or "先这样吧"
 */
const STOP_PHRASE_PATTERNS: Array<{ phrase: string; suffixes: string[] }> = [
  {
    phrase: "不用了",
    suffixes: ["谢谢", "感谢", "没关系", "好的", "OK", "ok"],
  },
  {
    phrase: "先这样",
    suffixes: ["吧", "啦", "了", "了哈", "了哦"],
  },
  {
    phrase: "结束对话",
    suffixes: ["吧", "了"],
  },
  {
    phrase: "再见",
    suffixes: ["啦", "了", "哈", "哦", "拜拜"],
  },
  {
    phrase: "拜拜",
    suffixes: ["啦", "了", "哈", "哦"],
  },
  {
    phrase: "好了",
    suffixes: ["谢谢", "感谢", "了", "吧", "啦"],
  },
  {
    phrase: "够了",
    suffixes: ["谢谢", "感谢", "了", "吧"],
  },
];

/**
 * Boundary markers — words that should NOT precede a stop phrase
 * to avoid false positives like "退出登录" triggering stop
 */
const NEGATIVE_BOUNDARIES = new Set([
  "登录", "登陆", "注册", "账号", "系统", "应用", "程序", "页面",
  "login", "signin", "signup", "account", "system", "app", "page",
]);

/**
 * Normalize text for comparison
 */
function normalizeForStopCheck(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s　]+/g, "") // remove all whitespace
    .replace(/[,，。!！?？、；;：:""''…\-—_~～]+/g, ""); // remove punctuation
}

/**
 * Check if text matches a stop phrase pattern with suffixes
 */
function matchesStopPattern(
  normalized: string,
  phrase: string,
  suffixes: string[]
): boolean {
  // Exact match
  if (normalized === phrase) return true;

  // Match with common suffixes
  for (const suffix of suffixes) {
    if (normalized === phrase + suffix) return true;
  }

  return false;
}

/**
 * Check if the text before a potential stop phrase contains a negative boundary
 */
function hasNegativeBoundary(normalized: string, phrase: string): boolean {
  const idx = normalized.indexOf(phrase);
  if (idx <= 0) return false;

  // Check 2-4 characters before the phrase
  const prefix = normalized.slice(Math.max(0, idx - 4), idx);

  for (const boundary of NEGATIVE_BOUNDARIES) {
    if (prefix.includes(boundary)) return true;
  }

  return false;
}

/**
 * Check if text is a stop phrase.
 *
 * Uses a multi-layer detection approach:
 * 1. Exact match against core phrases
 * 2. Pattern match with common suffixes
 * 3. Boundary detection to avoid false positives
 *
 * @param text - The speech transcript to check
 * @returns true if the text is a stop phrase
 */
export function isStopPhrase(text: string): boolean {
  const normalized = normalizeForStopCheck(text);

  // Empty or too short
  if (normalized.length < 2) return false;

  // 1. Exact match
  if (CORE_STOP_PHRASES.includes(normalized)) return true;

  // 2. Pattern match with suffixes
  for (const { phrase, suffixes } of STOP_PHRASE_PATTERNS) {
    if (matchesStopPattern(normalized, phrase, suffixes)) {
      // Check for negative boundaries
      if (!hasNegativeBoundary(normalized, phrase)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all available stop phrases (for display in settings/help)
 */
export function getStopPhraseList(): string[] {
  return [...CORE_STOP_PHRASES];
}
