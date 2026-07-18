package com.neonpaw.app.ui

import android.Manifest
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.neonpaw.app.data.APIClient
import com.neonpaw.app.data.PetStateManager
import com.neonpaw.app.data.PetStateStore
import com.neonpaw.app.model.ChatMessage
import com.neonpaw.app.model.PetMode
import com.neonpaw.app.speech.SpeechManager
import com.neonpaw.app.speech.SpeechSynthesizerManager
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen
import com.neonpaw.app.ui.theme.TerminalRed
import kotlinx.coroutines.launch

@Composable
fun MainScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val store = remember { PetStateStore(context) }
    val petManager: PetStateManager = viewModel(factory = PetStateManager.Factory(store))
    val apiClient = remember { APIClient() }
    val speechManager = remember { SpeechManager(context) }
    val ttsManager = remember { SpeechSynthesizerManager(context) }

    val petUi by petManager.uiState.collectAsStateWithLifecycle()
    val speechState by speechManager.state.collectAsStateWithLifecycle()
    val ttsState by ttsManager.state.collectAsStateWithLifecycle()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            beginListening(petManager, speechManager) { text ->
                scope.launch {
                    runVoiceInteraction(text, petManager, apiClient, ttsManager)
                }
            }
        } else {
            petManager.setError()
        }
    }

    LaunchedEffect(Unit) {
        petManager.runBootSequence()
    }

    DisposableEffect(Unit) {
        onDispose {
            speechManager.release()
            ttsManager.release()
        }
    }

    val statusLabel = petUi.petState.mode.apiValue
    val footerHint = when (petUi.petState.mode) {
        PetMode.SLEEPING -> "TAP SCREEN TO WAKE"
        PetMode.AWAKE -> "TAP MICROPHONE TO TALK"
        PetMode.LISTENING -> "LISTENING..."
        PetMode.THINKING -> "PET BRAIN PROCESSING..."
        PetMode.SPEAKING -> "NEON PAW IS TALKING..."
        PetMode.ERROR -> "SIGNAL ERROR // RETRY"
        PetMode.BOOTING -> "INITIALIZING..."
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

            if (speechState.isListening && speechState.interimTranscript.isNotBlank()) {
                Text(
                    text = speechState.interimTranscript,
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

            speechState.errorMessage?.let { err ->
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
                isListening = speechState.isListening,
                isThinking = petUi.petState.mode == PetMode.THINKING,
                isSpeaking = ttsState.isSpeaking,
                isError = petUi.petState.mode == PetMode.ERROR,
                isSupported = speechState.isSupported,
                onTap = {
                    if (speechState.isListening) {
                        speechManager.stop()
                        return@VoiceButton
                    }

                    val granted = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.RECORD_AUDIO,
                    ) == PackageManager.PERMISSION_GRANTED

                    if (!granted) {
                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    } else {
                        beginListening(petManager, speechManager) { text ->
                            scope.launch {
                                runVoiceInteraction(text, petManager, apiClient, ttsManager)
                            }
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
    apiClient: APIClient,
    ttsManager: SpeechSynthesizerManager,
) {
    val trimmed = text.trim()
    if (trimmed.isEmpty()) return

    petManager.setThinking()
    petManager.addMessage(ChatMessage(role = "user", content = trimmed))

    val request = petManager.buildChatRequest(trimmed)
    try {
        val response = apiClient.chat(request)
        petManager.setConnected(true)
        petManager.addMessage(ChatMessage(role = "assistant", content = response.reply))
        petManager.applyResponse(response)
        petManager.setSpeaking()
        ttsManager.speak(response.reply, response.voiceStyle) {
            petManager.setIdle()
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
    }
}
