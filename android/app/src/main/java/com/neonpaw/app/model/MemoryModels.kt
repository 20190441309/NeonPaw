package com.neonpaw.app.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant

/** Categories aligned with backend VALID_CATEGORIES / frontend MemoryCategory. */
object MemoryCategories {
    val ALL = listOf("name", "preference", "goal", "habit", "project", "custom")

    fun label(category: String): String = when (category) {
        "name" -> "NAME"
        "preference" -> "PREF"
        "goal" -> "GOAL"
        "habit" -> "HABIT"
        "project" -> "PROJ"
        "custom" -> "NOTE"
        else -> category.uppercase()
    }
}

/**
 * Full server memory item from GET/POST /api/memory.
 * Local fallback items may have null [id].
 */
@Serializable
data class MemoryItem(
    val id: Int? = null,
    val content: String,
    val category: String = "custom",
    val pinned: Boolean = false,
    @SerialName("created_at") val createdAt: String = Instant.now().toString(),
    @SerialName("updated_at") val updatedAt: String = "",
) {
    /** Payload for /api/chat (backend only needs content + createdAt). */
    fun toChatEntry(): MemoryEntry = MemoryEntry(
        content = content,
        createdAt = createdAt.ifBlank { Instant.now().toString() },
    )
}

@Serializable
data class MemoryListResponse(
    val memories: List<MemoryItem> = emptyList(),
    val total: Int = 0,
    val categories: List<String> = emptyList(),
)

@Serializable
data class MemoryCreateRequest(
    val content: String,
    val category: String = "custom",
)

@Serializable
data class MemoryUpdateRequest(
    val content: String? = null,
    val category: String? = null,
    val pinned: Boolean? = null,
)

@Serializable
data class MemoryDeleteResponse(
    val deleted: Boolean = false,
)

@Serializable
data class MemoryClearResponse(
    val deleted: Int = 0,
)

@Serializable
data class MemoryExportItem(
    val content: String,
    val category: String = "custom",
    val pinned: Boolean = false,
)

@Serializable
data class MemoryExportData(
    val version: Int = 1,
    val memories: List<MemoryExportItem> = emptyList(),
)

@Serializable
data class MemoryImportRequest(
    val memories: List<MemoryExportItem>,
)

@Serializable
data class MemoryImportResponse(
    val imported: Int = 0,
    val skipped: Int = 0,
    val total: Int = 0,
)
