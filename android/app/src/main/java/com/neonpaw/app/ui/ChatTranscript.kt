package com.neonpaw.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neonpaw.app.model.ChatMessage
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen

@Composable
fun ChatTranscript(
    messages: List<ChatMessage>,
    modifier: Modifier = Modifier,
) {
    if (messages.isEmpty()) return

    val listState = rememberLazyListState()
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    Column(modifier = modifier.fillMaxWidth().padding(top = 12.dp)) {
        Spacer(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(TerminalGreen.copy(alpha = 0.15f)),
        )
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 180.dp)
                .padding(top = 8.dp),
        ) {
            items(messages, key = { it.id }) { msg ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                ) {
                    Text(
                        text = if (msg.isUser) "USR" else "PAW",
                        color = TerminalGreen.copy(alpha = 0.6f),
                        fontFamily = MonoFont,
                        fontSize = 11.sp,
                        modifier = Modifier.width(36.dp),
                    )
                    Text(
                        text = msg.content,
                        color = TerminalGreen.copy(alpha = if (msg.isUser) 0.5f else 1f),
                        fontFamily = MonoFont,
                        fontSize = 11.sp,
                        maxLines = 3,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}
