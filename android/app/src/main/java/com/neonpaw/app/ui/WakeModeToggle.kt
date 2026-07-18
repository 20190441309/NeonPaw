package com.neonpaw.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import com.neonpaw.app.ui.theme.TerminalRed

@Composable
fun WakeModeToggle(
    enabled: Boolean,
    statusHint: String?,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 10.dp)
            .border(1.dp, TerminalGreen.copy(alpha = 0.25f))
            .background(TerminalGreen.copy(alpha = 0.05f))
            .clickable(onClick = onToggle)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(
            text = if (enabled) "●" else "○",
            color = if (enabled) TerminalGreen else TerminalGreen.copy(alpha = 0.4f),
            fontFamily = MonoFont,
            fontSize = 12.sp,
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = "WAKE MODE",
            color = TerminalGreen.copy(alpha = 0.7f),
            fontFamily = MonoFont,
            fontSize = 10.sp,
            letterSpacing = 1.sp,
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = if (enabled) "ON" else "OFF",
            color = if (enabled) TerminalGreen else TerminalRed.copy(alpha = 0.6f),
            fontFamily = MonoFont,
            fontSize = 10.sp,
        )
        if (!statusHint.isNullOrBlank()) {
            Spacer(Modifier.width(10.dp))
            Text(
                text = statusHint,
                color = TerminalGreen.copy(alpha = 0.45f),
                fontFamily = MonoFont,
                fontSize = 9.sp,
                maxLines = 1,
                modifier = Modifier.weight(1f),
            )
        }
    }
}
