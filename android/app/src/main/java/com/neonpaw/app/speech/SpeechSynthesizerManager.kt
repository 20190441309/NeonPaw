package com.neonpaw.app.speech

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.neonpaw.app.AppConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.Locale
import java.util.UUID

/**
 * Text-to-Speech via Android TextToSpeech.
 * Ported from iOS SpeechSynthesizerManager / frontend useSpeechSynthesis.
 */
class SpeechSynthesizerManager(context: Context) : TextToSpeech.OnInitListener {

    data class State(
        val isSpeaking: Boolean = false,
        val isReady: Boolean = false,
        val isSupported: Boolean = true,
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)
    private var onEnd: (() -> Unit)? = null
    private var pendingSpeak: (() -> Unit)? = null

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

    fun speak(
        text: String,
        voiceStyle: String = "soft_robotic",
        onEnd: (() -> Unit)? = null,
    ) {
        val action = {
            val engine = tts
            if (engine == null) {
                onEnd?.invoke()
            } else {
                this.onEnd = onEnd
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

    fun cancel() {
        tts?.stop()
        finishSpeaking()
    }

    fun release() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        onEnd = null
        pendingSpeak = null
        _state.update { State(isSupported = false) }
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
        _state.update { it.copy(isSpeaking = false) }
        val callback = onEnd
        onEnd = null
        callback?.invoke()
    }
}
