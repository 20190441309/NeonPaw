package com.neonpaw.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen

@Composable
fun SpeechEngineBadge(
    sttLabel: String,
    ttsLabel: String,
    sttBackend: Boolean,
    ttsBackend: Boolean,
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .border(1.dp, TerminalGreen.copy(alpha = 0.2f))
            .background(TerminalGreen.copy(alpha = 0.04f))
            .padding(horizontal = 10.dp, vertical = 6.dp),
    ) {
        Text(
            text = "SPEECH",
            color = TerminalGreen.copy(alpha = 0.45f),
            fontFamily = MonoFont,
            fontSize = 9.sp,
            letterSpacing = 1.sp,
        )
        Spacer(Modifier.width(10.dp))
        EngineChip(name = "STT", value = sttLabel, active = sttBackend)
        Spacer(Modifier.width(8.dp))
        EngineChip(name = "TTS", value = ttsLabel, active = ttsBackend)
    }
}

@Composable
private fun EngineChip(name: String, value: String, active: Boolean) {
    Text(
        text = "$name:${value.uppercase()}",
        color = if (active) TerminalGreen.copy(alpha = 0.85f) else TerminalGreen.copy(alpha = 0.4f),
        fontFamily = MonoFont,
        fontSize = 9.sp,
    )
}
