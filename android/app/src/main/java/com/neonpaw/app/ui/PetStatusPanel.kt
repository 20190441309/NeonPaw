package com.neonpaw.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neonpaw.app.model.PetState
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen
import com.neonpaw.app.ui.theme.TerminalGreenFaint

@Composable
fun PetStatusPanel(
    petState: PetState,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 12.dp),
    ) {
        Spacer(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(TerminalGreen.copy(alpha = 0.15f)),
        )
        Spacer(Modifier.height(8.dp))
        StatusBar("Energy", petState.energy)
        StatusBar("Mood", petState.mood)
        StatusBar("Bond", petState.affinity)
        StatusBar("Hunger", petState.hunger)
        StatusBar("Stability", petState.stability)
    }
}

@Composable
private fun StatusBar(label: String, value: Int) {
    val filled = (value / 10).coerceIn(0, 10)
    val empty = 10 - filled
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
    ) {
        Text(
            text = label.uppercase(),
            color = TerminalGreen.copy(alpha = 0.5f),
            fontFamily = MonoFont,
            fontSize = 10.sp,
            modifier = Modifier.width(72.dp),
        )
        Text(
            text = "█".repeat(filled),
            color = TerminalGreen,
            fontFamily = MonoFont,
            fontSize = 10.sp,
        )
        Text(
            text = "░".repeat(empty),
            color = TerminalGreenFaint,
            fontFamily = MonoFont,
            fontSize = 10.sp,
        )
        Text(
            text = " $value",
            color = TerminalGreen.copy(alpha = 0.4f),
            fontFamily = MonoFont,
            fontSize = 10.sp,
            modifier = Modifier.width(36.dp),
        )
    }
}
