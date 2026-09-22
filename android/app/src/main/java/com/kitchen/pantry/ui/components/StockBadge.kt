package com.kitchen.pantry.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kitchen.pantry.data.StockStatus
import com.kitchen.pantry.ui.theme.StockLow
import com.kitchen.pantry.ui.theme.StockLowDark
import com.kitchen.pantry.ui.theme.StockOk
import com.kitchen.pantry.ui.theme.StockOkDark
import com.kitchen.pantry.ui.theme.StockOut
import com.kitchen.pantry.ui.theme.StockOutDark

/** Readable on both themes, so the colors flip rather than dim. */
@Composable
fun stockColor(status: StockStatus): Color {
    val dark = isSystemInDarkTheme()
    return when (status) {
        StockStatus.OUT -> if (dark) StockOutDark else StockOut
        StockStatus.LOW -> if (dark) StockLowDark else StockLow
        StockStatus.OK -> if (dark) StockOkDark else StockOk
    }
}

@Composable
fun StockBadge(status: StockStatus, modifier: Modifier = Modifier) {
    if (status == StockStatus.OK) return
    val color = stockColor(status)
    Text(
        text = if (status == StockStatus.OUT) "OUT" else "LOW",
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = modifier
            .clip(MaterialTheme.shapes.small)
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}
