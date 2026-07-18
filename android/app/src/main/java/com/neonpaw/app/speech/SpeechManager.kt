package com.neonpaw.app.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.neonpaw.app.AppConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Speech-to-Text via Android SpeechRecognizer.
 * Ported from frontend useSpeechRecognition.
 */
class SpeechManager(private val context: Context) {

    data class State(
        val isListening: Boolean = false,
        val transcript: String = "",
        val interimTranscript: String = "",
        val errorMessage: String? = null,
        val lastConfidence: Float? = null,
        val isSupported: Boolean = false,
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    private val mainHandler = Handler(Looper.getMainLooper())
    private var speechRecognizer: SpeechRecognizer? = null
    private var onResult: ((String, Float?) -> Unit)? = null
    private var onLowConfidence: ((String, Float?) -> Unit)? = null
    private var resultDelivered = false

    init {
        _state.update {
            it.copy(isSupported = SpeechRecognizer.isRecognitionAvailable(context))
        }
    }

    fun start(
        onResult: (String, Float?) -> Unit,
        onLowConfidence: ((String, Float?) -> Unit)? = null,
    ) {
        this.onResult = onResult
        this.onLowConfidence = onLowConfidence
        resultDelivered = false

        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _state.update {
                it.copy(
                    isSupported = false,
                    errorMessage = "语音识别不可用",
                )
            }
            return
        }

        mainHandler.post {
            destroyRecognizer()
            val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
            speechRecognizer = recognizer
            recognizer.setRecognitionListener(listener)

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
                )
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, AppConfig.speechRecognitionLanguage)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, AppConfig.speechRecognitionLanguage)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                // Prefer continuous capture until silence ends the utterance
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1500)
            }

            _state.update {
                it.copy(
                    isListening = true,
                    transcript = "",
                    interimTranscript = "",
                    errorMessage = null,
                    isSupported = true,
                )
            }
            recognizer.startListening(intent)
        }
    }

    fun stop() {
        mainHandler.post {
            speechRecognizer?.stopListening()
            destroyRecognizer()
            _state.update { it.copy(isListening = false, interimTranscript = "") }
        }
    }

    fun release() {
        mainHandler.post {
            destroyRecognizer()
            _state.update { it.copy(isListening = false) }
        }
    }

    private fun destroyRecognizer() {
        speechRecognizer?.setRecognitionListener(null)
        speechRecognizer?.cancel()
        speechRecognizer?.destroy()
        speechRecognizer = null
    }

    private fun deliverResult(text: String, confidence: Float?) {
        if (resultDelivered) return
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        resultDelivered = true

        _state.update {
            it.copy(
                isListening = false,
                transcript = trimmed,
                interimTranscript = "",
                lastConfidence = confidence,
            )
        }
        destroyRecognizer()

        if (confidence != null && confidence < 0.5f && onLowConfidence != null) {
            onLowConfidence?.invoke(trimmed, confidence)
        } else {
            onResult?.invoke(trimmed, confidence)
        }
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            _state.update { it.copy(errorMessage = null) }
        }

        override fun onBeginningOfSpeech() = Unit

        override fun onRmsChanged(rmsdB: Float) = Unit

        override fun onBufferReceived(buffer: ByteArray?) = Unit

        override fun onEndOfSpeech() {
            _state.update { it.copy(isListening = false) }
        }

        override fun onError(error: Int) {
            val message = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH,
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
                -> "我没有听清，再说一次？"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "请允许麦克风权限"
                SpeechRecognizer.ERROR_NETWORK,
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
                -> "语音识别网络异常"
                SpeechRecognizer.ERROR_CLIENT -> null // often cancellation
                else -> "语音识别出错 ($error)"
            }
            destroyRecognizer()
            _state.update {
                it.copy(
                    isListening = false,
                    interimTranscript = "",
                    errorMessage = message,
                )
            }
        }

        override fun onResults(results: Bundle?) {
            val texts = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val confidences = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
            val text = texts?.firstOrNull().orEmpty()
            val confidence = confidences?.firstOrNull()
            deliverResult(text, confidence)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val text = partialResults
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
            if (text.isNotBlank()) {
                _state.update { it.copy(interimTranscript = text) }
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }
}
