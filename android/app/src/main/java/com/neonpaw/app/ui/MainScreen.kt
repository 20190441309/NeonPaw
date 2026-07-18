package com.neonpaw.app.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.neonpaw.app.data.APIClient
import com.neonpaw.app.data.MemoryManager
import com.neonpaw.app.data.PetStateManager
import com.neonpaw.app.data.PetStateStore
import com.neonpaw.app.model.ChatMessage
import com.neonpaw.app.model.PetMode
import com.neonpaw.app.speech.SpeechManager
import com.neonpaw.app.speech.SpeechSynthesizerManager
import com.neonpaw.app.speech.WakeWordManager
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen
import com.neonpaw.app.ui.theme.TerminalRed
import kotlinx.coroutines.launch

private const val WAKE_MODE_PREF = "neon_paw_prefs"
private const val WAKE_MODE_KEY = "wake_mode_enabled"

@Composable
fun MainScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences(WAKE_MODE_PREF, Context.MODE_PRIVATE) }

    val store = remember { PetStateStore(context) }
    val apiClient = remember { APIClient() }
    val petManager: PetStateManager = viewModel(factory = PetStateManager.Factory(store))
    val memoryManager: MemoryManager = viewModel(
        factory = MemoryManager.Factory(apiClient, store),
    )
    val speechManager = remember { SpeechManager(context, apiClient) }
    val ttsManager = remember { SpeechSynthesizerManager(context, apiClient) }
    val wakeManager = remember { WakeWordManager(context, apiClient) }

    val petUi by petManager.uiState.collectAsStateWithLifecycle()
    val memoryUi by memoryManager.uiState.collectAsStateWithLifecycle()
    val speechState by speechManager.state.collectAsStateWithLifecycle()
    val ttsState by ttsManager.state.collectAsStateWithLifecycle()
    val wakeState by wakeManager.state.collectAsStateWithLifecycle()

    var wakeModeEnabled by remember {
        mutableStateOf(prefs.getBoolean(WAKE_MODE_KEY, false))
    }

    fun persistWakeMode(enabled: Boolean) {
        wakeModeEnabled = enabled
        prefs.edit().putBoolean(WAKE_MODE_KEY, enabled).apply()
        wakeManager.setEnabled(enabled)
    }

    fun hasMicPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO,
        ) == PackageManager.PERMISSION_GRANTED
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            if (wakeModeEnabled) {
                wakeManager.setEnabled(true)
            }
        } else {
            petManager.setError()
            if (wakeModeEnabled) {
                persistWakeMode(false)
            }
        }
    }

    LaunchedEffect(Unit) {
        petManager.runBootSequence()
        speechManager.refreshBackendStatus()
        ttsManager.refreshBackendStatus()
        wakeManager.refreshBackendStatus()
        // memoryManager hydrates in init

        wakeManager.setCallbacks(
            onWake = { result ->
                val mode = petManager.uiState.value.petState.mode
                if (mode == PetMode.SLEEPING || mode == PetMode.AWAKE) {
                    petManager.wake()
                }
                val command = result.command
                if (result.mode == "inline" && !command.isNullOrBlank()) {
                    wakeManager.pause()
                    scope.launch {
                        runVoiceInteraction(
                            text = command,
                            petManager = petManager,
                            memoryManager = memoryManager,
                            apiClient = apiClient,
                            ttsManager = ttsManager,
                            onFinished = { wakeManager.resume() },
                        )
                    }
                }
            },
            onCommand = { text ->
                wakeManager.pause()
                scope.launch {
                    runVoiceInteraction(
                        text = text,
                        petManager = petManager,
                        memoryManager = memoryManager,
                        apiClient = apiClient,
                        ttsManager = ttsManager,
                        onFinished = { wakeManager.resume() },
                    )
                }
            },
            onCommandTimeout = {},
        )
        if (wakeModeEnabled && hasMicPermission()) {
            wakeManager.setEnabled(true)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            speechManager.release()
            ttsManager.release()
            wakeManager.release()
        }
    }

    val statusLabel = petUi.petState.mode.apiValue
    val footerHint = when {
        speechState.isUploading -> "UPLOADING TO BACKEND STT..."
        speechState.backendRecording -> "RECORDING... TAP AGAIN TO SEND"
        wakeState.enabled && wakeState.mode == WakeWordManager.Mode.WAKE_LISTENING ->
            if (wakeState.backendAvailable) "WAKE · BACKEND STT..." else "WAKE LISTENING..."
        wakeState.enabled && wakeState.mode == WakeWordManager.Mode.COMMAND_LISTENING ->
            if (wakeState.backendAvailable) "COMMAND · BACKEND STT..." else "COMMAND LISTENING..."
        wakeState.enabled && wakeState.mode == WakeWordManager.Mode.SESSION_LISTENING ->
            if (wakeState.backendAvailable) "SESSION · BACKEND STT..." else "HANDS-FREE SESSION..."
        petUi.petState.mode == PetMode.SLEEPING -> "TAP SCREEN TO WAKE"
        petUi.petState.mode == PetMode.AWAKE -> "TAP MICROPHONE TO TALK"
        petUi.petState.mode == PetMode.LISTENING -> "LISTENING..."
        petUi.petState.mode == PetMode.THINKING -> "PET BRAIN PROCESSING..."
        petUi.petState.mode == PetMode.SPEAKING -> "NEON PAW IS TALKING..."
        petUi.petState.mode == PetMode.ERROR -> "SIGNAL ERROR // RETRY"
        petUi.petState.mode == PetMode.BOOTING -> "INITIALIZING..."
        else -> "NEON PAW"
    }

    TerminalShell(
        statusLabel = statusLabel,
        footerHint = footerHint,
        onTap = {
            if (petUi.petState.mode == PetMode.SLEEPING) {
                petManager.wake()
            }
        },
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
        ) {
            ASCIIPet(frame = petUi.currentFrame)

            val interim = when {
                speechState.isListening && speechState.interimTranscript.isNotBlank() ->
                    speechState.interimTranscript
                speechState.isUploading && speechState.interimTranscript.isNotBlank() ->
                    speechState.interimTranscript
                wakeState.enabled && wakeState.interim.isNotBlank() ->
                    wakeState.interim
                else -> null
            }
            if (interim != null) {
                Text(
                    text = interim,
                    color = TerminalGreen.copy(alpha = 0.4f),
                    fontFamily = MonoFont,
                    fontSize = 11.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                )
            }

            ChatTranscript(messages = petUi.history)
            PetStatusPanel(petState = petUi.petState)
            AgentTracePanel(trace = petUi.trace)

            MemoryPanel(
                memories = memoryUi.memories,
                backendAvailable = memoryUi.backendAvailable,
                notice = memoryUi.notice ?: memoryUi.lastSaved?.let { "记住了：$it" },
                onRemove = { item -> memoryManager.removeMemory(item) },
                onTogglePin = { memoryManager.togglePin(it) },
                onClearAll = { memoryManager.clearAll() },
                onDismissNotice = { memoryManager.clearNotice() },
                onRefresh = { memoryManager.refresh() },
            )

            SpeechEngineBadge(
                sttLabel = if (wakeModeEnabled) {
                    "wake/${wakeState.engineLabel}"
                } else {
                    speechState.engineLabel
                },
                ttsLabel = ttsState.engineLabel,
                sttBackend = if (wakeModeEnabled) {
                    wakeState.backendAvailable
                } else {
                    speechState.backendAvailable
                },
                ttsBackend = ttsState.backendAvailable,
            )

            // Memory source badge next to speech
            Text(
                text = "MEMORY:${if (memoryUi.backendAvailable) "SERVER" else "LOCAL"} (${memoryUi.memories.size})",
                color = TerminalGreen.copy(alpha = 0.4f),
                fontFamily = MonoFont,
                fontSize = 9.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
            )

            WakeModeToggle(
                enabled = wakeModeEnabled,
                statusHint = buildString {
                    if (wakeState.backendAvailable) append("[后端STT] ")
                    wakeState.statusHint?.let { append(it) }
                    if (wakeState.isProcessing) append(" …")
                }.ifBlank { wakeState.statusHint },
                onToggle = {
                    val next = !wakeModeEnabled
                    if (next && !hasMicPermission()) {
                        wakeModeEnabled = true
                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        prefs.edit().putBoolean(WAKE_MODE_KEY, true).apply()
                    } else {
                        if (next) speechManager.stop()
                        persistWakeMode(next)
                    }
                },
            )

            val errorText = speechState.errorMessage ?: wakeState.error
            errorText?.let { err ->
                Text(
                    text = err,
                    color = TerminalRed.copy(alpha = 0.7f),
                    fontFamily = MonoFont,
                    fontSize = 10.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                )
            }

            VoiceButton(
                isListening = speechState.isListening ||
                    speechState.backendRecording ||
                    speechState.isUploading ||
                    wakeState.mode == WakeWordManager.Mode.COMMAND_LISTENING ||
                    wakeState.mode == WakeWordManager.Mode.SESSION_LISTENING,
                isThinking = petUi.petState.mode == PetMode.THINKING || speechState.isUploading,
                isSpeaking = ttsState.isSpeaking,
                isError = petUi.petState.mode == PetMode.ERROR,
                isSupported = speechState.isSupported || wakeState.isSupported,
                onTap = {
                    if (speechState.backendRecording || speechState.isListening) {
                        speechManager.stop()
                        return@VoiceButton
                    }

                    wakeManager.pause()

                    if (!hasMicPermission()) {
                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        return@VoiceButton
                    }

                    beginListening(petManager, speechManager) { text ->
                        scope.launch {
                            runVoiceInteraction(
                                text = text,
                                petManager = petManager,
                                memoryManager = memoryManager,
                                apiClient = apiClient,
                                ttsManager = ttsManager,
                                onFinished = { wakeManager.resume() },
                            )
                        }
                    }
                },
            )

            Spacer(Modifier.height(8.dp))
        }
    }
}

private fun beginListening(
    petManager: PetStateManager,
    speechManager: SpeechManager,
    onText: (String) -> Unit,
) {
    petManager.setListening()
    speechManager.start(
        onResult = { text, _ -> onText(text) },
        onLowConfidence = { text, _ -> onText(text) },
    )
}

private suspend fun runVoiceInteraction(
    text: String,
    petManager: PetStateManager,
    memoryManager: MemoryManager,
    apiClient: APIClient,
    ttsManager: SpeechSynthesizerManager,
    onFinished: (() -> Unit)? = null,
) {
    val trimmed = text.trim()
    if (trimmed.isEmpty()) {
        onFinished?.invoke()
        return
    }

    petManager.setThinking()
    petManager.addMessage(ChatMessage(role = "user", content = trimmed))

    val request = petManager.buildChatRequest(trimmed, memoryManager.chatMemories())
    try {
        val response = apiClient.chat(request)
        petManager.setConnected(true)
        petManager.addMessage(ChatMessage(role = "assistant", content = response.reply))
        petManager.applyResponse(response)

        if (response.memory.shouldSave && response.memory.content.isNotBlank()) {
            memoryManager.saveFromAgent(response.memory.content)
        }

        petManager.setSpeaking()
        ttsManager.speak(response.reply, response.voiceStyle) {
            petManager.setIdle()
            onFinished?.invoke()
        }
    } catch (_: Exception) {
        petManager.setConnected(false)
        petManager.setError()
        petManager.addMessage(
            ChatMessage(
                role = "assistant",
                content = "核心信号有点不稳定……但我还在这里。",
            ),
        )
        onFinished?.invoke()
    }
}
