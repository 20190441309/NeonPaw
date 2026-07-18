package com.neonpaw.app.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neonpaw.app.ui.theme.LabelFontSize
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalBlack
import com.neonpaw.app.ui.theme.TerminalGreen
import com.neonpaw.app.ui.theme.TerminalGreenFaint

@Composable
fun TerminalShell(
    statusLabel: String,
    footerHint: String,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val flickerTransition = rememberInfiniteTransition(label = "flicker")
    val flickerAlpha by flickerTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.97f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 80),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "flickerAlpha",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(TerminalBlack),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp)
                .alpha(flickerAlpha)
                .border(1.dp, TerminalGreen.copy(alpha = 0.3f), RectangleShape),
        ) {
            // Scanlines behind UI so buttons / scroll remain interactive
            ScanlineOverlay(Modifier.fillMaxSize())

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onTap,
                    ),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "NEON PAW // TERMINAL PET OS",
                        color = TerminalGreen.copy(alpha = 0.8f),
                        fontFamily = MonoFont,
                        fontSize = LabelFontSize,
                        fontWeight = FontWeight.Normal,
                        letterSpacing = 1.sp,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = statusLabel.uppercase(),
                        color = TerminalGreen.copy(alpha = 0.7f),
                        fontFamily = MonoFont,
                        fontSize = LabelFontSize,
                        letterSpacing = 2.sp,
                    )
                }
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(TerminalGreenFaint),
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                ) {
                    content()
                }

                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(TerminalGreenFaint),
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                ) {
                    Spacer(Modifier.weight(1f))
                    Text(
                        text = footerHint.uppercase(),
                        color = TerminalGreen.copy(alpha = 0.4f),
                        fontFamily = MonoFont,
                        fontSize = LabelFontSize,
                        letterSpacing = 1.sp,
                    )
                }
            }
        }
    }
}
