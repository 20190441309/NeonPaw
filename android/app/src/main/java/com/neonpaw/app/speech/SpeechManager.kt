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
import com.neonpaw.app.data.APIClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Speech-to-Text with backend preference:
 * 1. If /api/speech/status says STT available → record WAV → POST /api/speech/stt
 * 2. Else → Android SpeechRecognizer (device)
 *
 * Backend mode is push-to-talk: first start() begins recording, second start()/stop() ends and uploads.
 * Max recording length is [MAX_RECORD_MS] for safety.
 */
class SpeechManager(
    private val context: Context,
    private val apiClient: APIClient,
) {
    data class State(
        val isListening: Boolean = false,
        val isUploading: Boolean = false,
        val transcript: String = "",
        val interimTranscript: String = "",
        val errorMessage: String? = null,
        val lastConfidence: Float? = null,
        val isSupported: Boolean = false,
        val backendAvailable: Boolean = false,
        val engineLabel: String = "device",
        /** When true, user should tap again to finish backend recording. */
        val backendRecording: Boolean = false,
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    private val mainHandler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private var speechRecognizer: SpeechRecognizer? = null
    private var onResult: ((String, Float?) -> Unit)? = null
    private var onLowConfidence: ((String, Float?) -> Unit)? = null
    private var resultDelivered = false

    private var wavRecorder: AudioWavRecorder? = null
    private var maxRecordJob: Job? = null

    init {
        _state.update {
            it.copy(isSupported = SpeechRecognizer.isRecognitionAvailable(context))
        }
    }

    fun refreshBackendStatus() {
        scope.launch {
            val status = withContext(Dispatchers.IO) { apiClient.speechStatus() }
            val available = status?.stt?.available == true
            val engine = if (available) {
                status?.stt?.engine?.ifBlank { "backend" } ?: "backend"
            } else {
                "device"
            }
            _state.update {
                it.copy(
                    backendAvailable = available,
                    engineLabel = engine,
                    isSupported = available || SpeechRecognizer.isRecognitionAvailable(context),
                )
            }
        }
    }

    fun start(
        onResult: (String, Float?) -> Unit,
        onLowConfidence: ((String, Float?) -> Unit)? = null,
    ) {
        this.onResult = onResult
        this.onLowConfidence = onLowConfidence
        resultDelivered = false

        // Toggle: if already recording via backend, stop & upload
        if (_state.value.backendRecording) {
            stopBackendRecording()
            return
        }

        if (_state.value.backendAvailable) {
            startBackendRecording()
        } else {
            startDeviceRecognition()
        }
    }

    fun stop() {
        if (_state.value.backendRecording) {
            stopBackendRecording()
            return
        }
        mainHandler.post {
            destroyRecognizer()
            _state.update {
                it.copy(isListening = false, interimTranscript = "", backendRecording = false)
            }
        }
    }

    fun release() {
        maxRecordJob?.cancel()
        cancelBackendRecording()
        destroyRecognizer()
        scope.cancel()
        _state.update { State(isSupported = false) }
    }

    // --- Backend STT path ---

    private fun startBackendRecording() {
        try {
            val recorder = AudioWavRecorder()
            recorder.start()
            wavRecorder = recorder
            maxRecordJob?.cancel()
            maxRecordJob = scope.launch {
                delay(MAX_RECORD_MS)
                if (_state.value.backendRecording) {
                    stopBackendRecording()
                }
            }
            _state.update {
                it.copy(
                    isListening = true,
                    backendRecording = true,
                    isUploading = false,
                    transcript = "",
                    interimTranscript = "录音中…再点一次结束",
                    errorMessage = null,
                )
            }
        } catch (e: Exception) {
            _state.update {
                it.copy(
                    errorMessage = "录音启动失败，改用设备识别",
                    backendRecording = false,
                    isListening = false,
                )
            }
            // Fall back to device STT for this turn
            startDeviceRecognition()
        }
    }

    private fun stopBackendRecording() {
        maxRecordJob?.cancel()
        maxRecordJob = null
        val recorder = wavRecorder ?: return
        wavRecorder = null

        _state.update {
            it.copy(
                isListening = false,
                backendRecording = false,
                isUploading = true,
                interimTranscript = "上传识别中…",
            )
        }

        scope.launch {
            val wavBytes = withContext(Dispatchers.IO) {
                try {
                    recorder.stop()
                } catch (_: Exception) {
                    ByteArray(0)
                }
            }

            if (wavBytes.size < 1000) {
                _state.update {
                    it.copy(
                        isUploading = false,
                        interimTranscript = "",
                        errorMessage = "录音太短，请再说一次",
                    )
                }
                return@launch
            }

            val result = withContext(Dispatchers.IO) {
                apiClient.stt(wavBytes, "recording.wav")
            }

            _state.update { it.copy(isUploading = false, interimTranscript = "") }

            if (result != null && result.text.isNotBlank()) {
                val text = result.text.trim()
                val confidence = result.confidence
                _state.update {
                    it.copy(
                        transcript = text,
                        lastConfidence = confidence,
                        errorMessage = null,
                    )
                }
                deliverResult(text, confidence)
            } else {
                _state.update {
                    it.copy(errorMessage = "后端语音识别未返回结果，改用设备识别")
                }
                // One-shot fallback to device
                startDeviceRecognition()
            }
        }
    }

    private fun cancelBackendRecording() {
        maxRecordJob?.cancel()
        maxRecordJob = null
        try {
            wavRecorder?.cancel()
        } catch (_: Exception) {
        }
        wavRecorder = null
        _state.update {
            it.copy(backendRecording = false, isUploading = false, isListening = false)
        }
    }

    // --- Device STT path ---

    private fun startDeviceRecognition() {
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
                    backendRecording = false,
                )
            }
            recognizer.startListening(intent)
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
                SpeechRecognizer.ERROR_CLIENT -> null
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
            _state.update {
                it.copy(
                    isListening = false,
                    transcript = text.trim(),
                    interimTranscript = "",
                    lastConfidence = confidence,
                )
            }
            destroyRecognizer()
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

    companion object {
        private const val MAX_RECORD_MS = 15_000L
    }
}
