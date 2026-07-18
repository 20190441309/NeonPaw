package com.neonpaw.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neonpaw.app.model.MemoryCategories
import com.neonpaw.app.model.MemoryItem
import com.neonpaw.app.ui.theme.MonoFont
import com.neonpaw.app.ui.theme.TerminalGreen
import com.neonpaw.app.ui.theme.TerminalPanelBg
import com.neonpaw.app.ui.theme.TerminalRed

@Composable
fun MemoryPanel(
    memories: List<MemoryItem>,
    backendAvailable: Boolean,
    notice: String?,
    onRemove: (MemoryItem) -> Unit,
    onTogglePin: (id: Int) -> Unit,
    onClearAll: () -> Unit,
    onDismissNotice: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (memories.isEmpty() && notice == null) return

    var open by remember { mutableStateOf(false) }
    var confirmClear by remember { mutableStateOf(false) }
    var showHow by remember { mutableStateOf(false) }
    var filter by remember { mutableStateOf("all") }

    val filtered = if (filter == "all") {
        memories
    } else {
        memories.filter { it.category == filter }
    }
    val categories = memories.map { it.category }.distinct()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .background(TerminalPanelBg)
            .border(1.dp, TerminalGreen.copy(alpha = 0.2f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { open = !open }
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "MEMORY BANK",
                color = TerminalGreen.copy(alpha = 0.5f),
                fontFamily = MonoFont,
                fontSize = 10.sp,
                letterSpacing = 1.sp,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = if (backendAvailable) "SERVER" else "LOCAL",
                color = if (backendAvailable) {
                    TerminalGreen.copy(alpha = 0.55f)
                } else {
                    TerminalGreen.copy(alpha = 0.35f)
                },
                fontFamily = MonoFont,
                fontSize = 8.sp,
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "${memories.size} ENTRIES ${if (open) "▼" else "▶"}",
                color = TerminalGreen.copy(alpha = 0.45f),
                fontFamily = MonoFont,
                fontSize = 8.sp,
            )
        }

        notice?.let { msg ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp)
                    .clickable(onClick = onDismissNotice),
            ) {
                Text(
                    text = "✓ $msg",
                    color = TerminalGreen.copy(alpha = 0.7f),
                    fontFamily = MonoFont,
                    fontSize = 9.sp,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "DISMISS",
                    color = TerminalGreen.copy(alpha = 0.4f),
                    fontFamily = MonoFont,
                    fontSize = 8.sp,
                )
            }
        }

        if (open) {
            Spacer(
                Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(TerminalGreen.copy(alpha = 0.1f)),
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 220.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text(
                    text = if (showHow) "▼ HOW MEMORY WORKS" else "▶ HOW MEMORY WORKS",
                    color = TerminalGreen.copy(alpha = 0.35f),
                    fontFamily = MonoFont,
                    fontSize = 8.sp,
                    modifier = Modifier
                        .clickable { showHow = !showHow }
                        .padding(bottom = 4.dp),
                )
                if (showHow) {
                    Column(Modifier.padding(start = 6.dp, bottom = 6.dp)) {
                        HowLine("NEON PAW 只保存稳定事实 / 偏好")
                        HowLine(
                            if (backendAvailable) {
                                "当前：服务端 SQLite（跨设备共享）"
                            } else {
                                "当前：本地缓存（后端不可用）"
                            },
                        )
                        HowLine("可删除、置顶；Agent 决定 should_save 时写入")
                    }
                }

                if (categories.size > 1) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        FilterChip("ALL", filter == "all") { filter = "all" }
                        categories.forEach { cat ->
                            FilterChip(MemoryCategories.label(cat), filter == cat) {
                                filter = cat
                            }
                        }
                    }
                }

                if (filtered.isEmpty()) {
                    Text(
                        text = "(empty)",
                        color = TerminalGreen.copy(alpha = 0.3f),
                        fontFamily = MonoFont,
                        fontSize = 9.sp,
                    )
                } else {
                    filtered.forEach { item ->
                        MemoryRow(
                            item = item,
                            backendAvailable = backendAvailable,
                            onRemove = onRemove,
                            onTogglePin = onTogglePin,
                        )
                        Spacer(Modifier.height(4.dp))
                    }
                }

                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "REFRESH",
                        color = TerminalGreen.copy(alpha = 0.5f),
                        fontFamily = MonoFont,
                        fontSize = 8.sp,
                        modifier = Modifier.clickable(onClick = onRefresh),
                    )
                    if (memories.isNotEmpty()) {
                        if (!confirmClear) {
                            Text(
                                text = "CLEAR ALL",
                                color = TerminalRed.copy(alpha = 0.55f),
                                fontFamily = MonoFont,
                                fontSize = 8.sp,
                                modifier = Modifier.clickable { confirmClear = true },
                            )
                        } else {
                            Text(
                                text = "CONFIRM?",
                                color = TerminalRed.copy(alpha = 0.8f),
                                fontFamily = MonoFont,
                                fontSize = 8.sp,
                                modifier = Modifier.clickable {
                                    confirmClear = false
                                    onClearAll()
                                },
                            )
                            Text(
                                text = "CANCEL",
                                color = TerminalGreen.copy(alpha = 0.4f),
                                fontFamily = MonoFont,
                                fontSize = 8.sp,
                                modifier = Modifier.clickable { confirmClear = false },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HowLine(text: String) {
    Text(
        text = "- $text",
        color = TerminalGreen.copy(alpha = 0.3f),
        fontFamily = MonoFont,
        fontSize = 8.sp,
        lineHeight = 12.sp,
    )
}

@Composable
private fun FilterChip(label: String, active: Boolean, onClick: () -> Unit) {
    Text(
        text = label,
        color = if (active) TerminalGreen else TerminalGreen.copy(alpha = 0.35f),
        fontFamily = MonoFont,
        fontSize = 8.sp,
        modifier = Modifier
            .border(1.dp, TerminalGreen.copy(alpha = if (active) 0.5f else 0.2f))
            .clickable(onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

@Composable
private fun MemoryRow(
    item: MemoryItem,
    backendAvailable: Boolean,
    localIndex: Int,
    onRemove: (Int) -> Unit,
    onTogglePin: (Int) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            text = MemoryCategories.label(item.category),
            color = TerminalGreen.copy(alpha = 0.35f),
            fontFamily = MonoFont,
            fontSize = 8.sp,
            modifier = Modifier.width(40.dp),
        )
        Column(Modifier.weight(1f)) {
            Text(
                text = buildString {
                    if (item.pinned) append("★ ")
                    append(item.content)
                },
                color = TerminalGreen.copy(alpha = 0.75f),
                fontFamily = MonoFont,
                fontSize = 9.sp,
                maxLines = 3,
            )
        }
        if (backendAvailable && item.id != null) {
            Text(
                text = if (item.pinned) "UNPIN" else "PIN",
                color = TerminalGreen.copy(alpha = 0.4f),
                fontFamily = MonoFont,
                fontSize = 8.sp,
                modifier = Modifier
                    .padding(start = 4.dp)
                    .clickable { onTogglePin(item.id) },
            )
        }
        Text(
            text = "DEL",
            color = TerminalRed.copy(alpha = 0.5f),
            fontFamily = MonoFont,
            fontSize = 8.sp,
            modifier = Modifier
                .padding(start = 6.dp)
                .clickable {
                    if (backendAvailable && item.id != null) {
                        onRemove(item.id)
                    } else {
                        onRemove(localIndex)
                    }
                },
        )
    }
}
