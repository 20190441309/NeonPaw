package com.neonpaw.app.model

import kotlinx.serialization.Serializable

@Serializable
data class ServiceStatus(
    val available: Boolean = false,
    val engine: String = "",
    val model: String = "",
    val error: String? = null,
)

@Serializable
data class SpeechStatusResponse(
    val stt: ServiceStatus = ServiceStatus(),
    val tts: ServiceStatus = ServiceStatus(),
)

@Serializable
data class SttResponse(
    val text: String = "",
    val confidence: Float = 0.95f,
    val engine: String = "",
    val success: Boolean = true,
    val error: String? = null,
)

@Serializable
data class TtsRequest(
    val text: String,
    val voice: String? = null,
)
