package com.neonpaw.app.data

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.neonpaw.app.model.MemoryEntry
import com.neonpaw.app.model.MemoryExportItem
import com.neonpaw.app.model.MemoryItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Server-first memory bank with local SharedPreferences fallback.
 * Ported from frontend useMemory.ts.
 */
class MemoryManager(
    private val apiClient: APIClient,
    private val store: PetStateStore,
) : ViewModel() {

    data class UiState(
        val memories: List<MemoryItem> = emptyList(),
        val backendAvailable: Boolean = false,
        val hydrated: Boolean = false,
        val lastSaved: String? = null,
        val notice: String? = null,
        val busy: Boolean = false,
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        hydrate()
    }

    fun hydrate() {
        viewModelScope.launch {
            _uiState.update { it.copy(busy = true) }
            val remote = apiClient.listMemories()
            if (remote != null) {
                _uiState.update {
                    it.copy(
                        memories = remote.memories,
                        backendAvailable = true,
                        hydrated = true,
                        busy = false,
                        notice = null,
                    )
                }
                // Keep a local mirror for offline chat payload
                store.saveMemoryItems(remote.memories)
            } else {
                val local = store.loadMemoryItems()
                _uiState.update {
                    it.copy(
                        memories = local,
                        backendAvailable = false,
                        hydrated = true,
                        busy = false,
                    )
                }
            }
        }
    }

    fun refresh() = hydrate()

    /** Payload injected into /api/chat. */
    fun chatMemories(): List<MemoryEntry> {
        return _uiState.value.memories
            .sortedWith(compareByDescending<MemoryItem> { it.pinned }.thenByDescending { it.createdAt })
            .take(MAX_CHAT_MEMORIES)
            .map { it.toChatEntry() }
    }

    /**
     * Called when agent returns memory.should_save.
     * @return true if saved (or already present).
     */
    fun saveFromAgent(content: String, category: String = "custom") {
        val trimmed = content.trim()
        if (trimmed.isEmpty()) return
        if (isDuplicate(trimmed)) return

        viewModelScope.launch {
            if (_uiState.value.backendAvailable) {
                val created = apiClient.createMemory(trimmed, category)
                if (created != null) {
                    _uiState.update {
                        it.copy(
                            memories = (listOf(created) + it.memories).distinctByContent().take(MAX_MEMORIES),
                            lastSaved = trimmed,
                            notice = "已写入服务端记忆",
                        )
                    }
                    persistLocalMirror()
                } else {
                    // 409 duplicate or network blip — try refresh
                    hydrate()
                }
            } else {
                val item = MemoryItem(
                    id = null,
                    content = trimmed,
                    category = category,
                    pinned = false,
                    createdAt = Instant.now().toString(),
                )
                _uiState.update {
                    it.copy(
                        memories = (it.memories + item).distinctByContent().takeLast(MAX_MEMORIES),
                        lastSaved = trimmed,
                        notice = "已写入本地记忆（离线）",
                    )
                }
                persistLocalMirror()
            }
        }
    }

    fun removeMemory(item: MemoryItem) {
        viewModelScope.launch {
            val backend = _uiState.value.backendAvailable
            val id = item.id
            if (backend && id != null) {
                val ok = apiClient.deleteMemory(id)
                if (ok) {
                    _uiState.update { state ->
                        state.copy(memories = state.memories.filter { it.id != id })
                    }
                    persistLocalMirror()
                }
            } else {
                _uiState.update { state ->
                    state.copy(
                        memories = state.memories.filterNot {
                            normalize(it.content) == normalize(item.content) &&
                                it.createdAt == item.createdAt
                        },
                    )
                }
                persistLocalMirror()
            }
        }
    }

    fun togglePin(id: Int) {
        viewModelScope.launch {
            if (!_uiState.value.backendAvailable) return@launch
            val current = _uiState.value.memories.find { it.id == id } ?: return@launch
            val updated = apiClient.updateMemory(id, pinned = !current.pinned) ?: return@launch
            _uiState.update { state ->
                state.copy(
                    memories = state.memories
                        .map { if (it.id == id) updated else it }
                        .sortedWith(
                            compareByDescending<MemoryItem> { it.pinned }
                                .thenByDescending { it.createdAt },
                        ),
                )
            }
            persistLocalMirror()
        }
    }

    fun updateContent(id: Int, content: String) {
        val trimmed = content.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            if (_uiState.value.backendAvailable) {
                val updated = apiClient.updateMemory(id, content = trimmed) ?: return@launch
                _uiState.update { state ->
                    state.copy(memories = state.memories.map { if (it.id == id) updated else it })
                }
                persistLocalMirror()
            } else {
                _uiState.update { state ->
                    state.copy(
                        memories = state.memories.mapIndexed { index, item ->
                            // local: id may be null — treat idOrIndex as match by content index not used
                            if (item.id == id) item.copy(content = trimmed) else item
                        },
                    )
                }
                persistLocalMirror()
            }
        }
    }

    fun clearAll() {
        viewModelScope.launch {
            if (_uiState.value.backendAvailable) {
                apiClient.clearMemories()
            }
            _uiState.update { it.copy(memories = emptyList(), lastSaved = null) }
            store.saveMemoryItems(emptyList())
        }
    }

    fun clearNotice() {
        _uiState.update { it.copy(notice = null, lastSaved = null) }
    }

    /** Export JSON string for share/save. */
    suspend fun exportJson(): String? {
        return if (_uiState.value.backendAvailable) {
            val data = apiClient.exportMemories() ?: return null
            // simple encode via store json
            store.encodeExport(data)
        } else {
            val items = _uiState.value.memories.map {
                MemoryExportItem(it.content, it.category, it.pinned)
            }
            store.encodeExport(
                com.neonpaw.app.model.MemoryExportData(version = 1, memories = items),
            )
        }
    }

    suspend fun importFromJson(jsonText: String): Pair<Int, Int>? {
        return try {
            val data = store.decodeExport(jsonText) ?: return null
            if (_uiState.value.backendAvailable) {
                val result = apiClient.importMemories(data.memories) ?: return null
                hydrate()
                result.imported to result.skipped
            } else {
                var imported = 0
                var skipped = 0
                val existing = _uiState.value.memories.toMutableList()
                for (item in data.memories) {
                    val content = item.content.trim()
                    if (content.isEmpty() || existing.any { normalize(it.content) == normalize(content) }) {
                        skipped++
                        continue
                    }
                    existing.add(
                        MemoryItem(
                            content = content,
                            category = item.category,
                            pinned = item.pinned,
                            createdAt = Instant.now().toString(),
                        ),
                    )
                    imported++
                }
                _uiState.update { it.copy(memories = existing.takeLast(MAX_MEMORIES)) }
                persistLocalMirror()
                imported to skipped
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun isDuplicate(content: String): Boolean {
        val n = normalize(content)
        return _uiState.value.memories.any { normalize(it.content) == n }
    }

    private fun persistLocalMirror() {
        store.saveMemoryItems(_uiState.value.memories)
    }

    private fun List<MemoryItem>.distinctByContent(): List<MemoryItem> {
        val seen = mutableSetOf<String>()
        return filter { seen.add(normalize(it.content)) }
    }

    private fun normalize(s: String): String =
        s.trim().lowercase().replace(Regex("\\s+"), " ")

    class Factory(
        private val apiClient: APIClient,
        private val store: PetStateStore,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return MemoryManager(apiClient, store) as T
        }
    }

    companion object {
        private const val MAX_MEMORIES = 30
        private const val MAX_CHAT_MEMORIES = 12
    }
}
