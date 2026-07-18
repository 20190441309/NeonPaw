package com.neonpaw.app.speech

/**
 * Wake phrase matching — ported from frontend wakePhrases.ts.
 */
object WakePhrases {

    val WAKE_PHRASES = listOf(
        "小爪醒醒",
        "小抓醒醒",
        "小早醒醒",
        "小爪",
        "小抓",
        "小早",
        "醒醒",
        "neon paw",
        "hey neon paw",
        "neonpaw",
    )

    data class Match(
        val hasWakeWord: Boolean,
        val command: String,
        val raw: String,
        val phrase: String? = null,
        val isFuzzy: Boolean = false,
        val distance: Int = 0,
    )

    fun normalize(text: String): String {
        return text.lowercase()
            .replace(Regex("""[\s\.,!?;:'"，。！？；：""''、·\-_~`@#$%^&*()\[\]{}/\\|<>+=+]"""), "")
            .trim()
    }

    fun splitWakePhraseAndCommand(transcript: String): Match {
        val raw = transcript.trim()
        if (raw.isEmpty()) {
            return Match(hasWakeWord = false, command = "", raw = raw)
        }

        val normalized = normalize(raw)
        if (normalized.isEmpty()) {
            return Match(hasWakeWord = false, command = "", raw = raw)
        }

        // Exact prefix / contains match, longest phrase first
        val sorted = WAKE_PHRASES.sortedByDescending { normalize(it).length }
        for (phrase in sorted) {
            val nPhrase = normalize(phrase)
            if (nPhrase.isEmpty()) continue

            val idx = normalized.indexOf(nPhrase)
            if (idx >= 0) {
                val after = normalized.substring(idx + nPhrase.length)
                val command = stripCommandPrefix(after.ifEmpty {
                    // recover original-ish remaining text after phrase in raw
                    ""
                })
                // Prefer residual from original text when possible
                val commandFromRaw = extractCommandFromRaw(raw, phrase)
                return Match(
                    hasWakeWord = true,
                    command = commandFromRaw.ifEmpty { command },
                    raw = raw,
                    phrase = phrase,
                    isFuzzy = false,
                    distance = 0,
                )
            }
        }

        // Fuzzy for longer phrases only (len >= 4)
        val fuzzy = fuzzyMatch(normalized)
        if (fuzzy != null) {
            val command = extractCommandAfterFuzzy(normalized, fuzzy.normalizedPhrase)
            return Match(
                hasWakeWord = true,
                command = command,
                raw = raw,
                phrase = fuzzy.phrase,
                isFuzzy = true,
                distance = fuzzy.distance,
            )
        }

        return Match(hasWakeWord = false, command = "", raw = raw)
    }

    private data class FuzzyHit(
        val phrase: String,
        val normalizedPhrase: String,
        val distance: Int,
    )

    private fun fuzzyMatch(normalized: String): FuzzyHit? {
        var best: FuzzyHit? = null
        for (phrase in WAKE_PHRASES) {
            val nPhrase = normalize(phrase)
            if (nPhrase.length < 4) continue
            val maxDist = 2
            // sliding window over transcript
            if (normalized.length < nPhrase.length - maxDist) continue
            val windowStart = 0
            val windowEnd = (normalized.length - nPhrase.length + maxDist).coerceAtLeast(0)
            for (i in windowStart..windowEnd) {
                val end = (i + nPhrase.length + maxDist).coerceAtMost(normalized.length)
                if (end <= i) continue
                val slice = normalized.substring(i, end)
                // also try exact length window
                val candidates = buildList {
                    add(slice)
                    if (i + nPhrase.length <= normalized.length) {
                        add(normalized.substring(i, i + nPhrase.length))
                    }
                }
                for (cand in candidates) {
                    val dist = boundedLevenshtein(cand, nPhrase, maxDist)
                    if (dist <= maxDist) {
                        if (best == null || dist < best.distance) {
                            best = FuzzyHit(phrase, nPhrase, dist)
                        }
                    }
                }
            }
        }
        return best
    }

    private fun extractCommandAfterFuzzy(normalized: String, nPhrase: String): String {
        // Best-effort: strip closest occurrence approximation
        val idx = normalized.indexOf(nPhrase.take(2))
        if (idx < 0) return ""
        val afterStart = (idx + nPhrase.length - 1).coerceAtMost(normalized.length)
        return stripCommandPrefix(normalized.substring(afterStart))
    }

    private fun extractCommandFromRaw(raw: String, phrase: String): String {
        val lower = raw.lowercase()
        val p = phrase.lowercase()
        val idx = lower.indexOf(p)
        if (idx < 0) {
            // try normalized positions roughly
            return ""
        }
        return stripCommandPrefix(raw.substring(idx + phrase.length))
    }

    private fun stripCommandPrefix(text: String): String {
        return text.replace(Regex("""^[,，。!！?？、；;：:\s]+"""), "").trim()
    }

    private fun boundedLevenshtein(a: String, b: String, maxDistance: Int): Int {
        if (kotlin.math.abs(a.length - b.length) > maxDistance) return maxDistance + 1
        var previous = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            val current = IntArray(b.length + 1)
            current[0] = i
            var rowMin = current[0]
            for (j in 1..b.length) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                current[j] = minOf(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + cost,
                )
                rowMin = minOf(rowMin, current[j])
            }
            if (rowMin > maxDistance) return maxDistance + 1
            previous = current
        }
        return previous[b.length]
    }
}

object StopPhrases {
    private val phrases = listOf(
        "再见", "拜拜", "结束", "停止", "闭嘴", "休息", "睡觉",
        "没事了", "就这样", "好了", "stop", "bye", "goodbye", "sleep",
    )

    fun isStopPhrase(text: String): Boolean {
        val n = WakePhrases.normalize(text)
        if (n.isEmpty()) return false
        return phrases.any { n.contains(WakePhrases.normalize(it)) }
    }
}
