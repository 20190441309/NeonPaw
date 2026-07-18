package com.neonpaw.app.speech

import android.content.Context
import android.media.MediaPlayer
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.neonpaw.app.AppConfig
import com.neonpaw.app.data.APIClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale
import java.util.UUID

/**
 * Text-to-Speech with backend preference:
 * 1. If /api/speech/status says TTS available → POST /api/speech/tts → MediaPlayer WAV
 * 2. Else → Android TextToSpeech
 */
class SpeechSynthesizerManager(
    private val context: Context,
    private val apiClient: APIClient,
) : TextToSpeech.OnInitListener {

    data class State(
        val isSpeaking: Boolean = false,
        val isReady: Boolean = false,
        val isSupported: Boolean = true,
        val backendAvailable: Boolean = false,
        val engineLabel: String = "device",
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    private val mainHandler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)
    private var mediaPlayer: MediaPlayer? = null
    private var tempWavFile: File? = null
    private var onEnd: (() -> Unit)? = null
    private var pendingSpeak: (() -> Unit)? = null
    private var speakGeneration = 0

    override fun onInit(status: Int) {
        val engine = tts
        if (status != TextToSpeech.SUCCESS || engine == null) {
            _state.update { it.copy(isReady = false, isSupported = false) }
            return
        }

        val locale = Locale.forLanguageTag(AppConfig.speechSynthesisLanguage)
        engine.setLanguage(locale)

        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                _state.update { it.copy(isSpeaking = true) }
            }

            override fun onDone(utteranceId: String?) {
                finishSpeaking()
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                finishSpeaking()
            }

            override fun onError(utteranceId: String?, errorCode: Int) {
                finishSpeaking()
            }
        })

        _state.update { it.copy(isReady = true, isSupported = true) }
        pendingSpeak?.invoke()
        pendingSpeak = null
    }

    fun refreshBackendStatus() {
        scope.launch {
            val status = withContext(Dispatchers.IO) { apiClient.speechStatus() }
            val available = status?.tts?.available == true
            val engine = if (available) {
                status?.tts?.engine?.ifBlank { "backend" } ?: "backend"
            } else {
                "device"
            }
            _state.update {
                it.copy(
                    backendAvailable = available,
                    engineLabel = engine,
                )
            }
        }
    }

    fun speak(
        text: String,
        voiceStyle: String = "soft_robotic",
        onEnd: (() -> Unit)? = null,
    ) {
        val generation = ++speakGeneration
        cancelPlaybackOnly()
        this.onEnd = onEnd

        scope.launch {
            if (_state.value.backendAvailable) {
                val wav = withContext(Dispatchers.IO) {
                    try {
                        apiClient.tts(text)
                    } catch (_: Exception) {
                        null
                    }
                }
                if (generation != speakGeneration) return@launch
                if (wav != null && wav.isNotEmpty()) {
                    val played = playWavBytes(
                        wav = wav,
                        generation = generation,
                        fallbackText = text,
                        fallbackVoiceStyle = voiceStyle,
                    )
                    if (played) return@launch
                }
            }

            // Device fallback
            if (generation != speakGeneration) return@launch
            speakWithDevice(text, voiceStyle)
        }
    }

    fun cancel() {
        speakGeneration++
        cancelPlaybackOnly()
        tts?.stop()
        finishSpeaking()
    }

    fun release() {
        speakGeneration++
        cancelPlaybackOnly()
        tts?.stop()
        tts?.shutdown()
        tts = null
        onEnd = null
        pendingSpeak = null
        scope.cancel()
        _state.update { State(isSupported = false) }
    }

    private fun speakWithDevice(text: String, voiceStyle: String) {
        val action = {
            val engine = tts
            if (engine == null) {
                finishSpeaking()
            } else {
                engine.stop()
                applyVoiceStyle(engine, voiceStyle)
                val utteranceId = UUID.randomUUID().toString()
                engine.speak(text, TextToSpeech.QUEUE_FLUSH, Bundle(), utteranceId)
            }
        }

        if (_state.value.isReady) {
            action()
        } else {
            pendingSpeak = action
        }
    }

    private fun playWavBytes(
        wav: ByteArray,
        generation: Int,
        fallbackText: String,
        fallbackVoiceStyle: String,
    ): Boolean {
        return try {
            cleanupTempFile()
            val file = File.createTempFile("neon_paw_tts_", ".wav", context.cacheDir)
            file.writeBytes(wav)
            tempWavFile = file

            val player = MediaPlayer()
            mediaPlayer = player
            player.setDataSource(file.absolutePath)
            player.setOnPreparedListener {
                if (generation != speakGeneration) {
                    it.release()
                    return@setOnPreparedListener
                }
                _state.update { it.copy(isSpeaking = true) }
                it.start()
            }
            player.setOnCompletionListener {
                it.release()
                if (mediaPlayer === it) mediaPlayer = null
                cleanupTempFile()
                if (generation == speakGeneration) {
                    finishSpeaking()
                }
            }
            player.setOnErrorListener { mp, _, _ ->
                mp.release()
                if (mediaPlayer === mp) mediaPlayer = null
                cleanupTempFile()
                if (generation == speakGeneration) {
                    speakWithDevice(fallbackText, fallbackVoiceStyle)
                }
                true
            }
            player.prepareAsync()
            true
        } catch (_: Exception) {
            cleanupTempFile()
            false
        }
    }

    private fun cancelPlaybackOnly() {
        try {
            mediaPlayer?.stop()
        } catch (_: Exception) {
        }
        try {
            mediaPlayer?.release()
        } catch (_: Exception) {
        }
        mediaPlayer = null
        cleanupTempFile()
    }

    private fun cleanupTempFile() {
        try {
            tempWavFile?.delete()
        } catch (_: Exception) {
        }
        tempWavFile = null
    }

    private fun applyVoiceStyle(engine: TextToSpeech, voiceStyle: String) {
        when (voiceStyle) {
            "soft_robotic" -> {
                engine.setSpeechRate(0.9f)
                engine.setPitch(1.1f)
            }
            "gentle" -> {
                engine.setSpeechRate(0.85f)
                engine.setPitch(1.15f)
            }
            "cheerful" -> {
                engine.setSpeechRate(1.05f)
                engine.setPitch(1.25f)
            }
            else -> {
                engine.setSpeechRate(1.0f)
                engine.setPitch(1.1f)
            }
        }
    }

    private fun finishSpeaking() {
        mainHandler.post {
            _state.update { it.copy(isSpeaking = false) }
            val callback = onEnd
            onEnd = null
            callback?.invoke()
        }
    }
}
