package com.neonpaw.app.data

import com.neonpaw.app.AppConfig
import com.neonpaw.app.model.ChatRequest
import com.neonpaw.app.model.ChatResponse
import com.neonpaw.app.model.MemoryClearResponse
import com.neonpaw.app.model.MemoryCreateRequest
import com.neonpaw.app.model.MemoryExportData
import com.neonpaw.app.model.MemoryImportRequest
import com.neonpaw.app.model.MemoryImportResponse
import com.neonpaw.app.model.MemoryInfo
import com.neonpaw.app.model.MemoryItem
import com.neonpaw.app.model.MemoryListResponse
import com.neonpaw.app.model.MemoryUpdateRequest
import com.neonpaw.app.model.SpeechStatusResponse
import com.neonpaw.app.model.StateDelta
import com.neonpaw.app.model.SttResponse
import com.neonpaw.app.model.TraceEntry
import com.neonpaw.app.model.TtsRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class APIClient(
    baseUrl: String = AppConfig.apiBaseURL,
) {
    private val baseUrl = baseUrl.trimEnd('/')
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(45, TimeUnit.SECONDS)
        .build()

    suspend fun chat(request: ChatRequest): ChatResponse = withContext(Dispatchers.IO) {
        val body = json.encodeToString(request)
            .toRequestBody(JSON_MEDIA)

        val httpRequest = Request.Builder()
            .url("$baseUrl/api/chat")
            .post(body)
            .header("Content-Type", "application/json")
            .build()

        client.newCall(httpRequest).execute().use { response ->
            if (!response.isSuccessful) {
                throw APIException.HttpError(response.code)
            }
            val payload = response.body?.string()
                ?: throw APIException.InvalidResponse
            try {
                json.decodeFromString<ChatResponse>(payload)
            } catch (e: Exception) {
                throw APIException.DecodingFailed(e)
            }
        }
    }

    /** GET /api/speech/status */
    suspend fun speechStatus(): SpeechStatusResponse? = withContext(Dispatchers.IO) {
        val httpRequest = Request.Builder()
            .url("$baseUrl/api/speech/status")
            .get()
            .build()
        try {
            client.newCall(httpRequest).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val payload = response.body?.string() ?: return@withContext null
                json.decodeFromString<SpeechStatusResponse>(payload)
            }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * POST /api/speech/stt — multipart file upload.
     * Prefer WAV for FunASR compatibility.
     */
    suspend fun stt(audioBytes: ByteArray, filename: String = "recording.wav"): SttResponse? =
        withContext(Dispatchers.IO) {
            val mediaType = when {
                filename.endsWith(".wav", ignoreCase = true) -> "audio/wav".toMediaType()
                filename.endsWith(".webm", ignoreCase = true) -> "audio/webm".toMediaType()
                else -> "application/octet-stream".toMediaType()
            }
            val fileBody = audioBytes.toRequestBody(mediaType)
            val multipart = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", filename, fileBody)
                .build()

            val httpRequest = Request.Builder()
                .url("$baseUrl/api/speech/stt")
                .post(multipart)
                .build()

            try {
                client.newCall(httpRequest).execute().use { response ->
                    if (!response.isSuccessful) return@withContext null
                    val payload = response.body?.string() ?: return@withContext null
                    json.decodeFromString<SttResponse>(payload)
                }
            } catch (_: Exception) {
                null
            }
        }

    /**
     * POST /api/speech/tts — returns WAV bytes, or null if unavailable.
     */
    suspend fun tts(text: String, voice: String? = null): ByteArray? = withContext(Dispatchers.IO) {
        val body = json.encodeToString(TtsRequest(text = text, voice = voice))
            .toRequestBody(JSON_MEDIA)

        val httpRequest = Request.Builder()
            .url("$baseUrl/api/speech/tts")
            .post(body)
            .header("Content-Type", "application/json")
            .build()

        try {
            client.newCall(httpRequest).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                response.body?.bytes()
            }
        } catch (_: Exception) {
            null
        }
    }

    // --- Memory API ---

    suspend fun listMemories(category: String? = null): MemoryListResponse? =
        withContext(Dispatchers.IO) {
            val url = if (category.isNullOrBlank()) {
                "$baseUrl/api/memory"
            } else {
                val encoded = java.net.URLEncoder.encode(category, Charsets.UTF_8.name())
                "$baseUrl/api/memory?category=$encoded"
            }
            getJson(url)
        }

    suspend fun createMemory(content: String, category: String = "custom"): MemoryItem? =
        withContext(Dispatchers.IO) {
            val body = json.encodeToString(MemoryCreateRequest(content, category))
                .toRequestBody(JSON_MEDIA)
            val request = Request.Builder()
                .url("$baseUrl/api/memory")
                .post(body)
                .header("Content-Type", "application/json")
                .build()
            try {
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@withContext null
                    val payload = response.body?.string() ?: return@withContext null
                    json.decodeFromString<MemoryItem>(payload)
                }
            } catch (_: Exception) {
                null
            }
        }

    suspend fun updateMemory(
        id: Int,
        content: String? = null,
        category: String? = null,
        pinned: Boolean? = null,
    ): MemoryItem? = withContext(Dispatchers.IO) {
        val body = json.encodeToString(
            MemoryUpdateRequest(content = content, category = category, pinned = pinned),
        ).toRequestBody(JSON_MEDIA)
        val request = Request.Builder()
            .url("$baseUrl/api/memory/$id")
            .put(body)
            .header("Content-Type", "application/json")
            .build()
        try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val payload = response.body?.string() ?: return@withContext null
                json.decodeFromString<MemoryItem>(payload)
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun deleteMemory(id: Int): Boolean = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/api/memory/$id")
            .delete()
            .build()
        try {
            client.newCall(request).execute().use { it.isSuccessful }
        } catch (_: Exception) {
            false
        }
    }

    suspend fun clearMemories(): Boolean = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/api/memory")
            .delete()
            .build()
        try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext false
                // parse optional body
                response.body?.string()?.let {
                    runCatching { json.decodeFromString<MemoryClearResponse>(it) }
                }
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    suspend fun exportMemories(): MemoryExportData? = withContext(Dispatchers.IO) {
        getJson("$baseUrl/api/memory/export")
    }

    suspend fun importMemories(items: List<com.neonpaw.app.model.MemoryExportItem>): MemoryImportResponse? =
        withContext(Dispatchers.IO) {
            val body = json.encodeToString(MemoryImportRequest(items)).toRequestBody(JSON_MEDIA)
            val request = Request.Builder()
                .url("$baseUrl/api/memory/import")
                .post(body)
                .header("Content-Type", "application/json")
                .build()
            try {
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@withContext null
                    val payload = response.body?.string() ?: return@withContext null
                    json.decodeFromString<MemoryImportResponse>(payload)
                }
            } catch (_: Exception) {
                null
            }
        }

    private inline fun <reified T> getJson(url: String): T? {
        val request = Request.Builder().url(url).get().build()
        return try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val payload = response.body?.string() ?: return null
                json.decodeFromString<T>(payload)
            }
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

        val fallbackResponse = ChatResponse(
            reply = "核心信号有点不稳定……但我还在这里。",
            emotion = "glitch",
            action = "glitch",
            voiceStyle = "soft_robotic",
            stateDelta = StateDelta(energy = -1, mood = -1, affinity = 0, hunger = 0, stability = -3),
            memory = MemoryInfo(shouldSave = false, content = ""),
            trace = listOf(
                TraceEntry(module = "fallback", message = "Network request failed."),
            ),
        )
    }
}

sealed class APIException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    data object InvalidResponse : APIException("无效的服务器响应")
    data class HttpError(val code: Int) : APIException("服务器错误 (HTTP $code)")
    data class DecodingFailed(val error: Throwable) : APIException("响应解析失败", error)
}
