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
import kotlinx.coroutines.CancellationException
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
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.coroutineContext
import kotlin.math.sqrt

/**
 * Continuous wake-word + hands-free session manager.
 *
 * Prefer backend STT when available:
 *   short WAV chunks → POST /api/speech/stt → phrase match
 * Fall back to device SpeechRecognizer loop otherwise.
 *
 * Modes:
 * - idle
 * - wake_listening: waiting for "小爪醒醒" / "NEON PAW"
 * - command_listening: woke, waiting for the next utterance
 * - session_listening: multi-turn hands-free after first command
 */
class WakeWordManager(
    private val context: Context,
    private val apiClient: APIClient,
) {
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
        val backendAvailable: Boolean = false,
        val engineLabel: String = "device",
        val isProcessing: Boolean = false,
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
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private var recognizer: SpeechRecognizer? = null
    private var backendLoopJob: Job? = null
    private var activeRecorder: AudioWavRecorder? = null
    private val stopChunk = AtomicBoolean(false)

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
    private var consecutiveSilent = 0
    private var consecutiveSttFail = 0

    fun setCallbacks(
        onWake: (WakeResult) -> Unit,
        onCommand: (String) -> Unit,
        onCommandTimeout: () -> Unit,
    ) {
        this.onWake = onWake
        this.onCommand = onCommand
        this.onCommandTimeout = onCommandTimeout
    }

    /** Probe /api/speech/status — call on launch and when toggling wake mode. */
    fun refreshBackendStatus(onDone: (() -> Unit)? = null) {
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
            onDone?.invoke()
        }
    }

    fun setEnabled(enabled: Boolean) {
        if (enabled == _state.value.enabled) return
        if (enabled) {
            _state.update {
                it.copy(enabled = true, error = null, statusHint = "探测语音引擎…")
            }
            paused = false
            refreshBackendStatus {
                if (_state.value.enabled && !paused && !destroyed) {
                    startWakeListening()
                }
            }
        } else {
            stopInternal(clearEnabled = true)
        }
    }

    /** Pause while click-to-talk or TTS is active. */
    fun pause() {
        if (!_state.value.enabled) return
        paused = true
        cancelTimers()
        stopListeningSources()
        _state.update {
            it.copy(
                mode = Mode.IDLE,
                statusHint = "唤醒已暂停",
                interim = "",
                isProcessing = false,
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
                statusHint = if (it.enabled) wakeHint() else null,
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
        scope.cancel()
    }

    // --- listening modes ---

    private fun startWakeListening() {
        if (destroyed || paused || !_state.value.enabled) return
        commandRetries = 0
        consecutiveSilent = 0
        _state.update {
            it.copy(
                mode = Mode.WAKE_LISTENING,
                sessionActive = false,
                statusHint = wakeHint(),
                interim = "",
                error = null,
                isProcessing = false,
            )
        }
        startListeningEngine()
    }

    private fun startCommandListening() {
        if (destroyed || paused || !_state.value.enabled) return
        _state.update {
            it.copy(
                mode = Mode.COMMAND_LISTENING,
                statusHint = commandHint(),
                interim = "",
                isProcessing = false,
            )
        }
        armCommandTimeout()
        startListeningEngine()
    }

    private fun startSessionListening() {
        if (destroyed || paused || !_state.value.enabled) return
        _state.update {
            it.copy(
                mode = Mode.SESSION_LISTENING,
                sessionActive = true,
                statusHint = sessionHint(),
                interim = "",
                isProcessing = false,
            )
        }
        armSessionTimeout()
        startListeningEngine()
    }

    private fun startListeningEngine() {
        stopListeningSources()
        if (_state.value.backendAvailable) {
            startBackendLoop()
        } else {
            startDeviceRecognizer()
        }
    }

    private fun stopListeningSources() {
        stopChunk.set(true)
        backendLoopJob?.cancel()
        backendLoopJob = null
        try {
            activeRecorder?.cancel()
        } catch (_: Exception) {
        }
        activeRecorder = null
        stopRecognizerOnly()
        stopChunk.set(false)
    }

    // --- Backend STT loop ---

    private fun startBackendLoop() {
        backendLoopJob?.cancel()
        stopChunk.set(false)
        backendLoopJob = scope.launch {
            while (coroutineContext.isActive && !destroyed && !paused && _state.value.enabled) {
                val mode = _state.value.mode
                if (mode == Mode.IDLE) break

                try {
                    _state.update {
                        it.copy(
                            interim = if (mode == Mode.WAKE_LISTENING) {
                                "后端监听中…"
                            } else {
                                "后端录音中…"
                            },
                            isProcessing = false,
                        )
                    }

                    val chunkMs = when (mode) {
                        Mode.WAKE_LISTENING -> WAKE_CHUNK_MS
                        Mode.COMMAND_LISTENING -> COMMAND_CHUNK_MS
                        Mode.SESSION_LISTENING -> SESSION_CHUNK_MS
                        Mode.IDLE -> WAKE_CHUNK_MS
                    }

                    val wav = recordChunk(chunkMs)
                    if (destroyed || paused || !_state.value.enabled) break
                    if (wav.isEmpty()) {
                        delay(BACKEND_GAP_MS)
                        continue
                    }

                    if (isMostlySilent(wav)) {
                        consecutiveSilent++
                        // Still advance command/session timeouts via silence
                        if (mode == Mode.WAKE_LISTENING) {
                            _state.update { it.copy(interim = "") }
                        }
                        delay(BACKEND_GAP_MS)
                        continue
                    }
                    consecutiveSilent = 0

                    _state.update {
                        it.copy(
                            interim = "后端识别中…",
                            isProcessing = true,
                        )
                    }

                    val result = withContext(Dispatchers.IO) {
                        apiClient.stt(wav, "wake_chunk.wav")
                    }

                    if (destroyed || paused || !_state.value.enabled) break

                    if (result == null || !result.success) {
                        consecutiveSttFail++
                        if (consecutiveSttFail >= 3) {
                            // Backend flaky — fall back to device for this session
                            _state.update {
                                it.copy(
                                    backendAvailable = false,
                                    engineLabel = "device",
                                    error = "后端 STT 不稳定，改用设备识别",
                                    isProcessing = false,
                                )
                            }
                            consecutiveSttFail = 0
                            startDeviceRecognizer()
                            return@launch
                        }
                        delay(BACKEND_GAP_MS)
                        continue
                    }
                    consecutiveSttFail = 0

                    val text = result.text.trim()
                    _state.update {
                        it.copy(
                            interim = text.ifBlank { "" },
                            isProcessing = false,
                            error = null,
                        )
                    }

                    if (text.isNotBlank()) {
                        when (handleFinalText(text)) {
                            ListenAction.CONTINUE -> Unit
                            ListenAction.HANDOFF -> {
                                // Host pause() during chat; leave loop until resume()
                                break
                            }
                            ListenAction.SWITCH_COMMAND -> {
                                // Start command mode outside this cancelled loop
                                break
                            }
                            ListenAction.STOP -> break
                        }
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    if (destroyed || paused) break
                    _state.update {
                        it.copy(
                            error = "后端唤醒出错，稍后重试",
                            isProcessing = false,
                        )
                    }
                    delay(800)
                }

                delay(BACKEND_GAP_MS)
            }
            _state.update { it.copy(isProcessing = false) }

            // After loop ends for SWITCH_COMMAND, startCommandListening may already be running.
            // HANDOFF relies on host calling pause()/resume().
        }
    }

    private enum class ListenAction {
        /** Keep chunk loop running */
        CONTINUE,
        /** Stop loop; host will pause() for chat/TTS */
        HANDOFF,
        /** Stop current loop and enter command_listening */
        SWITCH_COMMAND,
        /** Stop current loop; endSession already started wake again */
        STOP,
    }

    private fun handleFinalText(text: String): ListenAction {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return ListenAction.CONTINUE

        return when (_state.value.mode) {
            Mode.WAKE_LISTENING -> handleWakeTranscript(trimmed)
            Mode.COMMAND_LISTENING -> {
                if (StopPhrases.isStopPhrase(trimmed)) {
                    scheduleReturnToWake()
                    ListenAction.STOP
                } else {
                    handleCommandTranscript(trimmed)
                    ListenAction.HANDOFF
                }
            }
            Mode.SESSION_LISTENING -> {
                if (StopPhrases.isStopPhrase(trimmed)) {
                    scheduleReturnToWake()
                    ListenAction.STOP
                } else {
                    handleSessionTranscript(trimmed)
                    ListenAction.HANDOFF
                }
            }
            Mode.IDLE -> ListenAction.CONTINUE
        }
    }

    /** End hands-free and restart wake listening after current loop exits. */
    private fun scheduleReturnToWake() {
        cancelTimers()
        sessionRetries = 0
        commandRetries = 0
        _state.update {
            it.copy(
                sessionActive = false,
                mode = Mode.IDLE,
                statusHint = "会话结束，返回唤醒…",
                interim = "",
            )
        }
        mainHandler.post {
            if (!destroyed && _state.value.enabled && !paused) {
                startWakeListening()
            }
        }
    }

    private suspend fun recordChunk(durationMs: Long): ByteArray {
        return withContext(Dispatchers.IO) {
            val recorder = AudioWavRecorder()
            activeRecorder = recorder
            try {
                recorder.start()
                val step = 50L
                var waited = 0L
                while (waited < durationMs && !stopChunk.get() && !destroyed && !paused) {
                    Thread.sleep(step)
                    waited += step
                }
                if (stopChunk.get() || destroyed || paused) {
                    recorder.cancel()
                    ByteArray(0)
                } else {
                    recorder.stop()
                }
            } catch (_: Exception) {
                try {
                    recorder.cancel()
                } catch (_: Exception) {
                }
                ByteArray(0)
            } finally {
                if (activeRecorder === recorder) activeRecorder = null
            }
        }
    }

    /** crude silence gate — skip near-empty PCM to save STT calls */
    private fun isMostlySilent(wav: ByteArray): Boolean {
        if (wav.size <= 44) return true
        val pcm = wav.copyOfRange(44, wav.size)
        if (pcm.size < 2) return true
        var sumSq = 0.0
        var n = 0
        var i = 0
        while (i + 1 < pcm.size) {
            val sample = (pcm[i].toInt() and 0xff) or (pcm[i + 1].toInt() shl 8)
            val s = sample.toShort().toInt()
            sumSq += (s * s).toDouble()
            n++
            i += 2
        }
        if (n == 0) return true
        val rms = sqrt(sumSq / n)
        return rms < SILENCE_RMS_THRESHOLD
    }

    // --- Device STT path (fallback) ---

    private fun startDeviceRecognizer() {
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
            r.setRecognitionListener(deviceListener)

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
            } catch (_: Exception) {
                _state.update { it.copy(error = "无法启动语音识别") }
                scheduleDeviceRestart(800)
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
        stopListeningSources()
        _state.update {
            it.copy(
                enabled = if (clearEnabled) false else it.enabled,
                mode = Mode.IDLE,
                sessionActive = false,
                statusHint = null,
                interim = "",
                isProcessing = false,
            )
        }
        paused = false
    }

    private fun scheduleDeviceRestart(delayMs: Long = 500) {
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
        val r = Runnable { endSession() }
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

    private fun handleWakeTranscript(text: String): ListenAction {
        val match = WakePhrases.splitWakePhraseAndCommand(text)
        if (!match.hasWakeWord) {
            if (!_state.value.backendAvailable) {
                scheduleDeviceRestart(300)
            }
            return ListenAction.CONTINUE
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
            return ListenAction.HANDOFF
        }

        val result = WakeResult(
            mode = "followup",
            isFuzzy = match.isFuzzy,
            phrase = match.phrase,
        )
        onWake?.invoke(result)
        // Schedule command mode after this loop iteration ends (avoid cancel-self)
        mainHandler.post {
            if (!destroyed && _state.value.enabled && !paused) {
                startCommandListening()
            }
        }
        return ListenAction.SWITCH_COMMAND
    }

    private fun handleCommandTranscript(text: String) {
        cancelTimers()
        commandRetries = 0
        _state.update {
            it.copy(sessionActive = true, statusHint = "处理中…")
        }
        onCommand?.invoke(text)
    }

    private fun handleSessionTranscript(text: String) {
        cancelTimers()
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

    private fun wakeHint(): String {
        return if (_state.value.backendAvailable) {
            "后端STT · 说「小爪醒醒」"
        } else {
            "说「小爪醒醒」或「NEON PAW」"
        }
    }

    private fun commandHint(): String {
        return if (_state.value.backendAvailable) "后端STT · 我在听…" else "我在听，请说…"
    }

    private fun sessionHint(): String {
        return if (_state.value.backendAvailable) "后端STT · 免提会话中…" else "免提会话中…"
    }

    private val deviceListener = object : RecognitionListener {
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
                -> scheduleDeviceRestart(350)
                SpeechRecognizer.ERROR_CLIENT -> scheduleDeviceRestart(400)
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> scheduleDeviceRestart(700)
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                    _state.update { it.copy(error = "请允许麦克风权限") }
                }
                SpeechRecognizer.ERROR_NETWORK,
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
                -> {
                    _state.update { it.copy(error = "语音识别网络异常") }
                    scheduleDeviceRestart(1200)
                }
                else -> scheduleDeviceRestart(600)
            }
        }

        override fun onResults(results: Bundle?) {
            val text = results
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
            when (handleFinalText(text)) {
                ListenAction.CONTINUE -> {
                    if (_state.value.enabled && !paused && !destroyed &&
                        _state.value.mode == Mode.WAKE_LISTENING
                    ) {
                        scheduleDeviceRestart(300)
                    }
                }
                ListenAction.HANDOFF, ListenAction.STOP -> Unit
                ListenAction.SWITCH_COMMAND -> Unit // already posted startCommandListening
            }
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
        private const val COMMAND_TIMEOUT_MS = 12_000L
        private const val SESSION_TIMEOUT_MS = 30_000L

        /** Wake chunks: short for lower latency */
        private const val WAKE_CHUNK_MS = 2_800L
        /** Command / session: slightly longer for full phrases */
        private const val COMMAND_CHUNK_MS = 3_500L
        private const val SESSION_CHUNK_MS = 3_500L
        private const val BACKEND_GAP_MS = 200L

        /** 16-bit PCM RMS threshold — below this skip STT */
        private const val SILENCE_RMS_THRESHOLD = 280.0
    }
}
