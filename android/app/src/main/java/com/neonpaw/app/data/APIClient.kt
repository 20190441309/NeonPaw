package com.neonpaw.app.data

import com.neonpaw.app.AppConfig
import com.neonpaw.app.model.ChatRequest
import com.neonpaw.app.model.ChatResponse
import com.neonpaw.app.model.MemoryInfo
import com.neonpaw.app.model.StateDelta
import com.neonpaw.app.model.TraceEntry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
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
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
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
