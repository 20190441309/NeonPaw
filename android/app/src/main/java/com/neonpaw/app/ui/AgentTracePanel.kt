package com.neonpaw.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neonpaw.app.model.TraceEntry
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen
import com.neonpaw.app.ui.theme.TerminalPanelBg

@Composable
fun AgentTracePanel(
    trace: List<TraceEntry>,
    modifier: Modifier = Modifier,
) {
    if (trace.isEmpty()) return

    var isOpen by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .background(TerminalPanelBg)
            .border(1.dp, TerminalGreen.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { isOpen = !isOpen }
                .padding(horizontal = 12.dp, vertical = 6.dp),
        ) {
            Text(
                text = "AGENT TRACE",
                color = TerminalGreen.copy(alpha = 0.5f),
                fontFamily = MonoFont,
                fontSize = 10.sp,
                letterSpacing = 1.sp,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = if (isOpen) "▼" else "▶",
                color = TerminalGreen.copy(alpha = 0.5f),
                fontFamily = MonoFont,
                fontSize = 8.sp,
            )
        }

        if (isOpen) {
            Spacer(
                Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(TerminalGreen.copy(alpha = 0.1f)),
            )
            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                trace.forEach { entry ->
                    Row(Modifier.padding(vertical = 2.dp)) {
                        Text(
                            text = "[${entry.module}]",
                            color = TerminalGreen.copy(alpha = 0.4f),
                            fontFamily = MonoFont,
                            fontSize = 9.sp,
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = entry.message,
                            color = TerminalGreen.copy(alpha = 0.6f),
                            fontFamily = MonoFont,
                            fontSize = 9.sp,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
    }
}
