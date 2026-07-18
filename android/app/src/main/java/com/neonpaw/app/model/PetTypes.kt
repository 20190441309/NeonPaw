package com.neonpaw.app.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

@Serializable
enum class PetMode {
    @SerialName("booting") BOOTING,
    @SerialName("sleeping") SLEEPING,
    @SerialName("awake") AWAKE,
    @SerialName("listening") LISTENING,
    @SerialName("thinking") THINKING,
    @SerialName("speaking") SPEAKING,
    @SerialName("error") ERROR;

    val apiValue: String
        get() = name.lowercase()
}

@Serializable
enum class PetEmotion {
    @SerialName("neutral") NEUTRAL,
    @SerialName("happy") HAPPY,
    @SerialName("sad") SAD,
    @SerialName("sleepy") SLEEPY,
    @SerialName("curious") CURIOUS,
    @SerialName("comforting") COMFORTING,
    @SerialName("glitch") GLITCH;

    val apiValue: String
        get() = name.lowercase()
}

@Serializable
enum class PetAction {
    @SerialName("wake") WAKE,
    @SerialName("sleep") SLEEP,
    @SerialName("listen") LISTEN,
    @SerialName("think") THINK,
    @SerialName("speak") SPEAK,
    @SerialName("happy") HAPPY,
    @SerialName("comfort") COMFORT,
    @SerialName("idle") IDLE,
    @SerialName("glitch") GLITCH,
    @SerialName("error") ERROR;

    val apiValue: String
        get() = name.lowercase()
}

@Serializable
data class PetState(
    val name: String = "NEON PAW",
    val mode: PetMode = PetMode.SLEEPING,
    val emotion: PetEmotion = PetEmotion.SLEEPY,
    val energy: Int = 80,
    val mood: Int = 70,
    val affinity: Int = 20,
    val hunger: Int = 30,
    val stability: Int = 95,
    val lastInteractionAt: String = "",
) {
    companion object {
        val DEFAULT = PetState()
    }
}

@Serializable
data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String,
    val content: String,
    val timestamp: String = Instant.now().toString(),
) {
    val isUser: Boolean get() = role == "user"
}

@Serializable
data class TraceEntry(
    val module: String,
    val message: String,
)

@Serializable
data class StateDelta(
    val energy: Int = 0,
    val mood: Int = 0,
    val affinity: Int = 0,
    val hunger: Int = 0,
    val stability: Int = 0,
)

@Serializable
data class MemoryInfo(
    @SerialName("should_save") val shouldSave: Boolean = false,
    val content: String = "",
)

/** Chat-request memory payload (backend schemas.MemoryEntry). */
@Serializable
data class MemoryEntry(
    val content: String,
    val createdAt: String = Instant.now().toString(),
)

@Serializable
data class ConversationMessage(
    val role: String,
    val content: String,
)

@Serializable
data class ChatRequest(
    val message: String,
    @SerialName("pet_state") val petState: PetState,
    @SerialName("conversation_history") val conversationHistory: List<ConversationMessage>,
    val memories: List<MemoryEntry>,
)

@Serializable
data class ChatResponse(
    val reply: String,
    val emotion: String,
    val action: String,
    @SerialName("voice_style") val voiceStyle: String = "soft_robotic",
    @SerialName("state_delta") val stateDelta: StateDelta = StateDelta(),
    val memory: MemoryInfo = MemoryInfo(),
    val trace: List<TraceEntry> = emptyList(),
) {
    fun resolvedEmotion(): PetEmotion =
        PetEmotion.entries.find { it.apiValue == emotion } ?: PetEmotion.NEUTRAL

    fun resolvedAction(): PetAction =
        PetAction.entries.find { it.apiValue == action } ?: PetAction.SPEAK
}
