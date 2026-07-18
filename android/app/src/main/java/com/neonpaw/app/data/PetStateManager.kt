package com.neonpaw.app.data

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.neonpaw.app.AppConfig
import com.neonpaw.app.model.ChatMessage
import com.neonpaw.app.model.ChatRequest
import com.neonpaw.app.model.ChatResponse
import com.neonpaw.app.model.ConversationMessage
import com.neonpaw.app.model.MemoryEntry
import com.neonpaw.app.model.PetAction
import com.neonpaw.app.model.PetEmotion
import com.neonpaw.app.model.PetFrames
import com.neonpaw.app.model.PetMode
import com.neonpaw.app.model.PetState
import com.neonpaw.app.model.TraceEntry
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Central pet state machine — ported from iOS PetStateManager / frontend usePetState.
 */
class PetStateManager(
    private val store: PetStateStore,
) : ViewModel() {

    data class UiState(
        val petState: PetState = PetState.DEFAULT,
        val history: List<ChatMessage> = emptyList(),
        val trace: List<TraceEntry> = emptyList(),
        val lastAction: PetAction? = null,
        val memories: List<MemoryEntry> = emptyList(),
        val isConnected: Boolean = true,
        val hasBooted: Boolean = false,
    ) {
        val currentFrame: String
            get() = PetFrames.selectFrame(petState.mode, petState.emotion, lastAction)
    }

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private var idleJob: Job? = null

    init {
        val (state, history) = store.load()
        val memories = store.loadMemories()
        _uiState.value = UiState(
            petState = state,
            history = history,
            memories = memories,
        )
        resetIdleTimer()
    }

    fun runBootSequence() {
        if (_uiState.value.hasBooted) return
        viewModelScope.launch {
            _uiState.update {
                it.copy(petState = it.petState.copy(mode = PetMode.BOOTING), hasBooted = true)
            }
            delay(1500)
            _uiState.update {
                it.copy(petState = it.petState.copy(mode = PetMode.SLEEPING, emotion = PetEmotion.SLEEPY))
            }
            persist()
        }
    }

    fun wake() {
        val mode = _uiState.value.petState.mode
        if (mode != PetMode.SLEEPING && mode != PetMode.AWAKE) return
        _uiState.update { state ->
            val pet = state.petState
            state.copy(
                petState = pet.copy(
                    mode = PetMode.AWAKE,
                    emotion = PetEmotion.CURIOUS,
                    energy = clamp(pet.energy - 1),
                    affinity = clamp(pet.affinity + 1),
                    lastInteractionAt = Instant.now().toString(),
                ),
                lastAction = PetAction.WAKE,
            )
        }
        resetIdleTimer()
        persist()
    }

    fun setListening() {
        _uiState.update {
            it.copy(
                petState = it.petState.copy(mode = PetMode.LISTENING, emotion = PetEmotion.NEUTRAL),
                lastAction = null,
            )
        }
        persist()
    }

    fun setThinking() {
        _uiState.update {
            it.copy(
                petState = it.petState.copy(mode = PetMode.THINKING, emotion = PetEmotion.NEUTRAL),
                lastAction = null,
            )
        }
        persist()
    }

    fun setSpeaking() {
        _uiState.update {
            it.copy(petState = it.petState.copy(mode = PetMode.SPEAKING))
        }
        persist()
    }

    fun setIdle() {
        _uiState.update {
            it.copy(
                petState = it.petState.copy(mode = PetMode.AWAKE),
                lastAction = null,
            )
        }
        resetIdleTimer()
        persist()
    }

    fun setError() {
        _uiState.update {
            it.copy(
                petState = it.petState.copy(mode = PetMode.ERROR, emotion = PetEmotion.GLITCH),
                lastAction = PetAction.ERROR,
            )
        }
        persist()
    }

    fun setConnected(connected: Boolean) {
        _uiState.update { it.copy(isConnected = connected) }
    }

    fun applyResponse(response: ChatResponse) {
        _uiState.update { state ->
            val pet = state.petState
            val delta = response.stateDelta
            var next = state.copy(
                petState = pet.copy(
                    emotion = response.resolvedEmotion(),
                    mode = PetMode.SPEAKING,
                    energy = clamp(pet.energy + delta.energy),
                    mood = clamp(pet.mood + delta.mood),
                    affinity = clamp(pet.affinity + delta.affinity),
                    hunger = clamp(pet.hunger + delta.hunger),
                    stability = clamp(pet.stability + delta.stability),
                    lastInteractionAt = Instant.now().toString(),
                ),
                lastAction = response.resolvedAction(),
                trace = response.trace,
            )
            if (response.memory.shouldSave && response.memory.content.isNotBlank()) {
                val memories = next.memories + MemoryEntry(content = response.memory.content)
                next = next.copy(memories = memories)
                store.saveMemories(memories)
            }
            next
        }
        persist()
    }

    fun addMessage(message: ChatMessage) {
        _uiState.update { state ->
            val history = (state.history + message).takeLast(AppConfig.maxHistoryCount)
            state.copy(history = history)
        }
        persist()
    }

    fun buildChatRequest(message: String): ChatRequest {
        val state = _uiState.value
        val conversation = state.history.takeLast(10).map {
            ConversationMessage(role = it.role, content = it.content)
        }
        return ChatRequest(
            message = message,
            petState = state.petState,
            conversationHistory = conversation,
            memories = state.memories,
        )
    }

    private fun resetIdleTimer() {
        idleJob?.cancel()
        if (_uiState.value.petState.mode != PetMode.AWAKE) return
        idleJob = viewModelScope.launch {
            delay(AppConfig.idleTimeoutMs)
            if (_uiState.value.petState.mode == PetMode.AWAKE) {
                _uiState.update {
                    it.copy(
                        petState = it.petState.copy(
                            mode = PetMode.SLEEPING,
                            emotion = PetEmotion.SLEEPY,
                        ),
                        lastAction = null,
                    )
                }
                persist()
            }
        }
    }

    private fun clamp(value: Int): Int = value.coerceIn(0, 100)

    private fun persist() {
        val state = _uiState.value
        store.save(state.petState, state.history)
    }

    class Factory(private val store: PetStateStore) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return PetStateManager(store) as T
        }
    }
}
