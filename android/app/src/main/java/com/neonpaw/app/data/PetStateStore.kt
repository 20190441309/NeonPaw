package com.neonpaw.app.data

import android.content.Context
import com.neonpaw.app.AppConfig
import com.neonpaw.app.model.ChatMessage
import com.neonpaw.app.model.MemoryExportData
import com.neonpaw.app.model.MemoryItem
import com.neonpaw.app.model.PetEmotion
import com.neonpaw.app.model.PetMode
import com.neonpaw.app.model.PetState
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant

/**
 * Persists pet state, conversation history, and memories via SharedPreferences.
 * Ported from iOS PetStateStore / frontend localStorage.
 */
class PetStateStore(context: Context) {

    private val prefs = context.getSharedPreferences("neon_paw", Context.MODE_PRIVATE)
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    @Serializable
    private data class StoredState(
        val petState: PetState,
        val conversationHistory: List<StoredChatMessage>,
        val lastSavedAt: String,
    )

    @Serializable
    private data class StoredChatMessage(
        val role: String,
        val content: String,
        val timestamp: String,
    )

    fun load(): Pair<PetState, List<ChatMessage>> {
        val raw = prefs.getString(AppConfig.stateStorageKey, null) ?: return PetState.DEFAULT to emptyList()
        return try {
            val stored = json.decodeFromString<StoredState>(raw)

            // Staleness check
            val savedAt = runCatching { Instant.parse(stored.lastSavedAt) }.getOrNull()
            if (savedAt != null) {
                val age = Instant.now().toEpochMilli() - savedAt.toEpochMilli()
                if (age > AppConfig.stateStaleMs) {
                    return PetState.DEFAULT to emptyList()
                }
            }

            // Transient modes can't survive process death
            var petState = stored.petState
            if (petState.mode in listOf(PetMode.LISTENING, PetMode.THINKING, PetMode.SPEAKING)) {
                petState = petState.copy(mode = PetMode.AWAKE, emotion = PetEmotion.NEUTRAL)
            }

            val history = stored.conversationHistory.map {
                ChatMessage(role = it.role, content = it.content, timestamp = it.timestamp)
            }
            petState to history
        } catch (_: Exception) {
            PetState.DEFAULT to emptyList()
        }
    }

    fun save(petState: PetState, history: List<ChatMessage>) {
        val storedMessages = history.takeLast(AppConfig.maxHistoryCount).map {
            StoredChatMessage(role = it.role, content = it.content, timestamp = it.timestamp)
        }
        val stored = StoredState(
            petState = petState,
            conversationHistory = storedMessages,
            lastSavedAt = Instant.now().toString(),
        )
        prefs.edit()
            .putString(AppConfig.stateStorageKey, json.encodeToString(stored))
            .apply()
    }

    fun loadMemoryItems(): List<MemoryItem> {
        val raw = prefs.getString(AppConfig.memoryStorageKey, null) ?: return emptyList()
        return try {
            json.decodeFromString<List<MemoryItem>>(raw)
        } catch (_: Exception) {
            // Migrate legacy {content, createdAt} list
            try {
                val legacy = json.decodeFromString<List<LegacyMemory>>(raw)
                legacy.map {
                    MemoryItem(content = it.content, createdAt = it.createdAt)
                }
            } catch (_: Exception) {
                emptyList()
            }
        }
    }

    fun saveMemoryItems(memories: List<MemoryItem>) {
        prefs.edit()
            .putString(AppConfig.memoryStorageKey, json.encodeToString(memories))
            .apply()
    }

    fun encodeExport(data: MemoryExportData): String = json.encodeToString(data)

    fun decodeExport(text: String): MemoryExportData? = try {
        json.decodeFromString<MemoryExportData>(text)
    } catch (_: Exception) {
        null
    }

    @Serializable
    private data class LegacyMemory(
        val content: String,
        val createdAt: String = "",
    )
}
