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
 * Continuous wake-word + hands-free session manager.
 * Simplified port of frontend useWakeWord.ts for Android SpeechRecognizer.
 *
 * Modes:
 * - idle
 * - wake_listening: waiting for "小爪醒醒" / "NEON PAW"
 * - command_listening: woke, waiting for the next utterance
 * - session_listening: multi-turn hands-free after first command
 */
class WakeWordManager(private val context: Context) {

    enum class Mode {
        IDLE,
        WAKE_LISTENING,
        COMMAND_LISTENING,
        SESSION_LISTENING,
    }

    data class State(
        val enabled: Boolean = false,
        val mode: Mode = Mode.IDLE,
        val sessionActive: Boolean = false,
        val statusHint: String? = null,
        val interim: String = "",
        val error: String? = null,
        val isSupported: Boolean = false,
    )

    data class WakeResult(
        val mode: String, // "inline" | "followup"
        val command: String? = null,
        val isFuzzy: Boolean = false,
        val phrase: String? = null,
    )

    private val _state = MutableStateFlow(
        State(isSupported = SpeechRecognizer.isRecognitionAvailable(context)),
    )
    val state: StateFlow<State> = _state.asStateFlow()

    private val mainHandler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var paused = false
    private var destroyed = false

    private var onWake: ((WakeResult) -> Unit)? = null
    private var onCommand: ((String) -> Unit)? = null
    private var onCommandTimeout: (() -> Unit)? = null

    private var commandTimeoutRunnable: Runnable? = null
    private var sessionTimeoutRunnable: Runnable? = null
    private var restartRunnable: Runnable? = null

    private var commandRetries = 0
    private var sessionRetries = 0

    fun setCallbacks(
        onWake: (WakeResult) -> Unit,
        onCommand: (String) -> Unit,
        onCommandTimeout: () -> Unit,
    ) {
        this.onWake = onWake
        this.onCommand = onCommand
        this.onCommandTimeout = onCommandTimeout
    }

    fun setEnabled(enabled: Boolean) {
        if (enabled == _state.value.enabled) return
        if (enabled) {
            _state.update {
                it.copy(enabled = true, error = null, statusHint = "唤醒待命中…")
            }
            paused = false
            startWakeListening()
        } else {
            stopInternal(clearEnabled = true)
        }
    }

    /** Pause while click-to-talk or TTS is active. */
    fun pause() {
        if (!_state.value.enabled) return
        paused = true
        cancelTimers()
        stopRecognizerOnly()
        _state.update {
            it.copy(
                mode = Mode.IDLE,
                statusHint = "唤醒已暂停",
                interim = "",
            )
        }
    }

    /** Resume wake listening after TTS / click-to-talk ends. */
    fun resume() {
        if (!_state.value.enabled || !paused) return
        paused = false
        if (_state.value.sessionActive) {
            startSessionListening()
        } else {
            startWakeListening()
        }
    }

    fun endSession() {
        sessionRetries = 0
        commandRetries = 0
        _state.update {
            it.copy(
                sessionActive = false,
                mode = if (it.enabled && !paused) Mode.WAKE_LISTENING else Mode.IDLE,
                statusHint = if (it.enabled) "唤醒待命中…" else null,
            )
        }
        cancelTimers()
        if (_state.value.enabled && !paused) {
            startWakeListening()
        }
    }

    fun release() {
        destroyed = true
        stopInternal(clearEnabled = true)
    }

    // --- listening modes ---

    private fun startWakeListening() {
        if (destroyed || paused || !_state.value.enabled) return
        commandRetries = 0
        _state.update {
            it.copy(
                mode = Mode.WAKE_LISTENING,
                sessionActive = false,
                statusHint = "说「小爪醒醒」或「NEON PAW」",
                interim = "",
                error = null,
            )
        }
        startRecognizer()
    }

    private fun startCommandListening() {
        if (destroyed || paused || !_state.value.enabled) return
        _state.update {
            it.copy(
                mode = Mode.COMMAND_LISTENING,
                statusHint = "我在听，请说…",
                interim = "",
            )
        }
        armCommandTimeout()
        startRecognizer()
    }

    private fun startSessionListening() {
        if (destroyed || paused || !_state.value.enabled) return
        _state.update {
            it.copy(
                mode = Mode.SESSION_LISTENING,
                sessionActive = true,
                statusHint = "免提会话中…",
                interim = "",
            )
        }
        armSessionTimeout()
        startRecognizer()
    }

    private fun startRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _state.update {
                it.copy(isSupported = false, error = "语音识别不可用")
            }
            return
        }

        mainHandler.post {
            if (destroyed || paused) return@post
            stopRecognizerOnly()

            val r = SpeechRecognizer.createSpeechRecognizer(context)
            recognizer = r
            r.setRecognitionListener(listener)

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
                )
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, AppConfig.speechRecognitionLanguage)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1200)
                putExtra(
                    RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS,
                    1200,
                )
            }
            try {
                r.startListening(intent)
            } catch (e: Exception) {
                _state.update { it.copy(error = "无法启动语音识别") }
                scheduleRestart(800)
            }
        }
    }

    private fun stopRecognizerOnly() {
        try {
            recognizer?.setRecognitionListener(null)
            recognizer?.cancel()
            recognizer?.destroy()
        } catch (_: Exception) {
        }
        recognizer = null
    }

    private fun stopInternal(clearEnabled: Boolean) {
        cancelTimers()
        stopRecognizerOnly()
        _state.update {
            it.copy(
                enabled = if (clearEnabled) false else it.enabled,
                mode = Mode.IDLE,
                sessionActive = false,
                statusHint = null,
                interim = "",
            )
        }
        paused = false
    }

    private fun scheduleRestart(delayMs: Long = 500) {
        restartRunnable?.let { mainHandler.removeCallbacks(it) }
        val mode = _state.value.mode
        val runnable = Runnable {
            if (destroyed || paused || !_state.value.enabled) return@Runnable
            when (mode) {
                Mode.WAKE_LISTENING -> startWakeListening()
                Mode.COMMAND_LISTENING -> startCommandListening()
                Mode.SESSION_LISTENING -> startSessionListening()
                Mode.IDLE -> if (_state.value.enabled) startWakeListening()
            }
        }
        restartRunnable = runnable
        mainHandler.postDelayed(runnable, delayMs)
    }

    private fun armCommandTimeout() {
        commandTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        val r = Runnable {
            commandRetries += 1
            if (commandRetries >= 3) {
                onCommandTimeout?.invoke()
                endSession()
            } else {
                _state.update { it.copy(statusHint = "没听清，请再说一次…") }
                startCommandListening()
            }
        }
        commandTimeoutRunnable = r
        mainHandler.postDelayed(r, COMMAND_TIMEOUT_MS)
    }

    private fun armSessionTimeout() {
        sessionTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        val r = Runnable {
            endSession()
        }
        sessionTimeoutRunnable = r
        mainHandler.postDelayed(r, SESSION_TIMEOUT_MS)
    }

    private fun cancelTimers() {
        commandTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        sessionTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        restartRunnable?.let { mainHandler.removeCallbacks(it) }
        commandTimeoutRunnable = null
        sessionTimeoutRunnable = null
        restartRunnable = null
    }

    private fun handleFinalText(text: String) {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) {
            scheduleRestart(400)
            return
        }

        when (_state.value.mode) {
            Mode.WAKE_LISTENING -> handleWakeTranscript(trimmed)
            Mode.COMMAND_LISTENING -> handleCommandTranscript(trimmed)
            Mode.SESSION_LISTENING -> handleSessionTranscript(trimmed)
            Mode.IDLE -> Unit
        }
    }

    private fun handleWakeTranscript(text: String) {
        val match = WakePhrases.splitWakePhraseAndCommand(text)
        if (!match.hasWakeWord) {
            // keep listening
            scheduleRestart(300)
            return
        }

        if (match.command.isNotBlank()) {
            val result = WakeResult(
                mode = "inline",
                command = match.command,
                isFuzzy = match.isFuzzy,
                phrase = match.phrase,
            )
            _state.update {
                it.copy(sessionActive = true, statusHint = "收到指令…")
            }
            onWake?.invoke(result)
            // command will be processed by host; host should pause us during chat/TTS
        } else {
            val result = WakeResult(
                mode = "followup",
                isFuzzy = match.isFuzzy,
                phrase = match.phrase,
            )
            onWake?.invoke(result)
            startCommandListening()
        }
    }

    private fun handleCommandTranscript(text: String) {
        cancelTimers()
        if (StopPhrases.isStopPhrase(text)) {
            endSession()
            return
        }
        commandRetries = 0
        _state.update {
            it.copy(sessionActive = true, statusHint = "处理中…")
        }
        onCommand?.invoke(text)
    }

    private fun handleSessionTranscript(text: String) {
        cancelTimers()
        if (StopPhrases.isStopPhrase(text)) {
            endSession()
            return
        }
        // wake word again with inline command still ok
        val match = WakePhrases.splitWakePhraseAndCommand(text)
        val payload = if (match.hasWakeWord && match.command.isNotEmpty()) {
            match.command
        } else {
            text
        }
        sessionRetries = 0
        _state.update { it.copy(statusHint = "处理中…") }
        onCommand?.invoke(payload)
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            _state.update { it.copy(error = null) }
        }

        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit

        override fun onEndOfSpeech() = Unit

        override fun onError(error: Int) {
            when (error) {
                SpeechRecognizer.ERROR_NO_MATCH,
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
                -> {
                    // silence is normal in wake loop
                    scheduleRestart(350)
                }
                SpeechRecognizer.ERROR_CLIENT -> scheduleRestart(400)
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> scheduleRestart(700)
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                    _state.update { it.copy(error = "请允许麦克风权限") }
                }
                SpeechRecognizer.ERROR_NETWORK,
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
                -> {
                    _state.update { it.copy(error = "语音识别网络异常") }
                    scheduleRestart(1200)
                }
                else -> scheduleRestart(600)
            }
        }

        override fun onResults(results: Bundle?) {
            val text = results
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
            handleFinalText(text)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val text = partialResults
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
            if (text.isNotBlank()) {
                _state.update { it.copy(interim = text) }
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }

    companion object {
        private const val COMMAND_TIMEOUT_MS = 10_000L
        private const val SESSION_TIMEOUT_MS = 25_000L
    }
}
