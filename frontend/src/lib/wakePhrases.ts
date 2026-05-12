export const WAKE_PHRASES = [
  "小爪醒醒",
  "小抓醒醒",
  "小早醒醒",
  "小爪",
  "小抓",
  "小早",
  "醒醒",
  "neon paw",
];

interface WakePhraseCandidate {
  phrase: string;
  normalized: string;
  maxDistance: number;
}

export interface WakePhraseMatch {
  hasWakeWord: boolean;
  command: string;
  raw: string;
  phrase?: string;
  isFuzzy: boolean;
  distance: number;
}

const FUZZY_CANDIDATES: WakePhraseCandidate[] = WAKE_PHRASES
  .map((phrase) => ({ phrase, normalized: normalizeWakeText(phrase) }))
  .filter(({ normalized }) => normalized.length >= 4)
  .map(({ phrase, normalized }) => ({
    phrase,
    normalized,
    maxDistance: normalized.length <= 4 ? 2 : 2,
  }));

const LONG_WAKE_PHRASES = WAKE_PHRASES.filter((phrase) => normalizeWakeText(phrase).length >= 4);
const SHORT_WAKE_PHRASES = WAKE_PHRASES.filter((phrase) => normalizeWakeText(phrase).length < 4);

function stripCommandPrefix(text: string): string {
  return text.replace(/^[,，。!！?？、；;：:\s]+/, "").trim();
}

export function normalizeWakeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\.,!?;:'"，。！？；：""''、·\-_~`@#\$%\^&\*\(\)\[\]\{\}\/\\|<>=+]/g, "")
    .trim();
}

function isCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function boundedLevenshtein(a: string, b: string, maxDistance: number): number {
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
      current[j] = next;
      rowMin = Math.min(rowMin, next);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[b.length];
}

function fuzzyCommandFromTranscript(transcript: string, phraseLength: number): string {
  const trimmed = transcript.trimStart();
  return stripCommandPrefix(trimmed.slice(Math.min(trimmed.length, phraseLength)));
}

function findFuzzyWakePhrase(transcript: string): WakePhraseMatch | null {
  const normalizedTranscript = normalizeWakeText(transcript);
  if (normalizedTranscript.length < 4) return null;

  let best: WakePhraseMatch | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of FUZZY_CANDIDATES) {
    const phraseLength = candidate.normalized.length;
    const maxStart = candidate.normalized === "neonpaw" ? 5 : 2;
    const scanLimit = Math.min(maxStart, normalizedTranscript.length - phraseLength);

    for (let start = 0; start <= scanLimit; start++) {
      const windowText = normalizedTranscript.slice(start, start + phraseLength);
      if (windowText.length !== phraseLength) continue;
      if (isCjk(candidate.normalized) && windowText[0] !== candidate.normalized[0]) continue;

      const distance = boundedLevenshtein(windowText, candidate.normalized, candidate.maxDistance);
      if (distance === 0 || distance > candidate.maxDistance) continue;

      const score = distance + start * 0.25;
      if (score < bestScore) {
        bestScore = score;
        best = {
          hasWakeWord: true,
          command: fuzzyCommandFromTranscript(transcript, phraseLength),
          raw: transcript,
          phrase: candidate.phrase,
          isFuzzy: true,
          distance,
        };
      }
    }
  }

  return best;
}

function findExactWakePhrase(text: string, phrases: string[]): WakePhraseMatch | null {
  const lower = text.toLowerCase();

  for (const phrase of phrases) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const after = text.slice(idx + phrase.length);
      return {
        hasWakeWord: true,
        command: stripCommandPrefix(after),
        raw: text,
        phrase,
        isFuzzy: false,
        distance: 0,
      };
    }
  }

  return null;
}

function findNormalizedWakePhrase(text: string, phrases: string[]): WakePhraseMatch | null {
  const normalized = normalizeWakeText(text);
  for (const phrase of phrases) {
    const normalizedPhrase = normalizeWakeText(phrase);
    if (normalizedPhrase.length > 0 && normalized.includes(normalizedPhrase)) {
      return {
        hasWakeWord: true,
        command: "",
        raw: text,
        phrase,
        isFuzzy: false,
        distance: 0,
      };
    }
  }

  return null;
}

function findShortBoundaryWakePhrase(text: string): WakePhraseMatch | null {
  const lower = text.toLowerCase();

  for (const phrase of SHORT_WAKE_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx === -1) continue;

    const after = text.slice(idx + phrase.length);
    if (after.length > 0 && !/^[,，。!！?？、；;：:\s]/.test(after)) continue;

    return {
      hasWakeWord: true,
      command: stripCommandPrefix(after),
      raw: text,
      phrase,
      isFuzzy: false,
      distance: 0,
    };
  }

  return null;
}

export function splitWakePhraseAndCommand(text: string): WakePhraseMatch {
  return (
    findExactWakePhrase(text, LONG_WAKE_PHRASES) ??
    findNormalizedWakePhrase(text, LONG_WAKE_PHRASES) ??
    findShortBoundaryWakePhrase(text) ??
    findFuzzyWakePhrase(text) ??
    findExactWakePhrase(text, SHORT_WAKE_PHRASES) ??
    findNormalizedWakePhrase(text, SHORT_WAKE_PHRASES) ?? {
    hasWakeWord: false,
    command: "",
    raw: text,
    isFuzzy: false,
    distance: 0,
    }
  );
}
