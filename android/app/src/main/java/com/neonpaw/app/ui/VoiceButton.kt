package com.neonpaw.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen
import com.neonpaw.app.ui.theme.TerminalRed

@Composable
fun VoiceButton(
    isListening: Boolean,
    isThinking: Boolean,
    isSpeaking: Boolean,
    isError: Boolean,
    isSupported: Boolean,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val disabled = isThinking || isSpeaking || !isSupported
    val label = when {
        !isSupported -> "语音不可用"
        isError -> "信号异常"
        isListening -> "正在听..."
        isThinking -> "思考中..."
        isSpeaking -> "回复中..."
        else -> "点击说话"
    }
    val buttonColor = when {
        !isSupported -> Color.Gray.copy(alpha = 0.3f)
        isError -> TerminalRed.copy(alpha = 0.6f)
        isListening -> TerminalRed
        isThinking -> TerminalGreen.copy(alpha = 0.6f)
        isSpeaking -> TerminalGreen.copy(alpha = 0.3f)
        else -> TerminalGreen.copy(alpha = 0.6f)
    }

    val pulse = rememberInfiniteTransition(label = "voicePulse")
    val scale by pulse.animateFloat(
        initialValue = 1f,
        targetValue = if (isListening) 1.15f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scale",
    )
    val spin by pulse.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "spin",
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.padding(top = 12.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(56.dp)
                .scale(if (isListening) 1.05f else 1f)
                .border(2.dp, buttonColor, CircleShape)
                .background(buttonColor.copy(alpha = if (isListening) 0.2f else 0.05f), CircleShape)
                .clickable(enabled = !disabled, onClick = onTap),
        ) {
            when {
                isThinking -> Text(
                    text = "◎",
                    color = TerminalGreen,
                    fontSize = 22.sp,
                    modifier = Modifier.scale(1f + (spin % 360) / 3600f),
                )
                isSpeaking -> Text(text = "≋", color = TerminalGreen, fontSize = 22.sp)
                isListening -> Box(
                    Modifier
                        .size(14.dp)
                        .scale(scale)
                        .background(TerminalRed, CircleShape),
                )
                isError -> Text(text = "!", color = TerminalRed.copy(alpha = 0.7f), fontSize = 22.sp)
                !isSupported -> Text(text = "⌀", color = Color.Gray.copy(alpha = 0.5f), fontSize = 20.sp)
                else -> Text(text = "◉", color = TerminalGreen.copy(alpha = 0.7f), fontSize = 22.sp)
            }
        }
        Text(
            text = label,
            color = when {
                !isSupported -> Color.Gray.copy(alpha = 0.5f)
                isError -> TerminalRed.copy(alpha = 0.7f)
                else -> TerminalGreen.copy(alpha = 0.5f)
            },
            fontFamily = MonoFont,
            fontSize = 10.sp,
            letterSpacing = 1.sp,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
