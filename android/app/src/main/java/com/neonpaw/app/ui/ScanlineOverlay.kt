package com.neonpaw.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color

/** CRT scanline overlay. Drawn behind interactive content so it never steals touches. */
@Composable
fun ScanlineOverlay(
    modifier: Modifier = Modifier,
    lineOpacity: Float = 0.08f,
    lineSpacing: Float = 3f,
) {
    val transition = rememberInfiniteTransition(label = "scanline")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = lineSpacing,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 100, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "phase",
    )
    val beam by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "beam",
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        var y = -lineSpacing + phase
        while (y < size.height) {
            drawLine(
                color = Color.Green.copy(alpha = lineOpacity),
                start = Offset(0f, y),
                end = Offset(size.width, y),
                strokeWidth = 1f,
            )
            y += lineSpacing
        }
        val beamY = beam * (size.height + 40f) - 20f
        drawLine(
            color = Color.Green.copy(alpha = 0.06f),
            start = Offset(0f, beamY),
            end = Offset(size.width, beamY),
            strokeWidth = 2f,
        )
    }
}
