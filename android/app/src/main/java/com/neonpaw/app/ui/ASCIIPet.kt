package com.neonpaw.app.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.neonpaw.app.ui.theme.AsciiFontSize
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen

@Composable
fun ASCIIPet(
    frame: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = frame,
        color = TerminalGreen,
        fontFamily = MonoFont,
        fontSize = AsciiFontSize,
        textAlign = TextAlign.Center,
        softWrap = false,
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .shadow(3.dp, spotColor = Color.Green.copy(alpha = 0.6f)),
    )
}
