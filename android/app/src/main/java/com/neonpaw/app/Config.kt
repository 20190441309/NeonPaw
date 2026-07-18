package com.neonpaw.app

/**
 * App-wide configuration.
 * Change [apiBaseURL] for device / production backends.
 *
 * Defaults:
 * - Emulator → host machine via 10.0.2.2
 * - Physical device → set LAN IP, e.g. "http://192.168.1.100:8000"
 * - Production → HTTPS domain
 *
 * You can also pass Gradle property:
 *   ./gradlew :app:assembleDebug -PAPI_BASE_URL=http://192.168.1.100:8000
 */
object AppConfig {
    val apiBaseURL: String = BuildConfig.API_BASE_URL

    const val speechRecognitionLanguage = "zh-CN"
    const val speechSynthesisLanguage = "zh-CN"

    /** Idle timeout before pet goes to sleep (ms) */
    const val idleTimeoutMs = 60_000L

    /** Discard saved state older than this (ms) */
    const val stateStaleMs = 24 * 60 * 60 * 1000L

    const val maxHistoryCount = 20

    const val stateStorageKey = "neon_paw_state"
    const val memoryStorageKey = "neon_paw_memories"
}
