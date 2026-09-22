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
import com.kitchen.pantry.data.Availability
import com.kitchen.pantry.ui.theme.StockLow
import com.kitchen.pantry.ui.theme.StockLowDark
import com.kitchen.pantry.ui.theme.StockOk
import com.kitchen.pantry.ui.theme.StockOkDark
import com.kitchen.pantry.ui.theme.StockOut
import com.kitchen.pantry.ui.theme.StockOutDark

@Composable
fun availabilityColor(availability: Availability): Color {
    val dark = isSystemInDarkTheme()
    return when (availability) {
        Availability.HAVE -> if (dark) StockOkDark else StockOk
        Availability.SHORT, Availability.UNKNOWN -> if (dark) StockLowDark else StockLow
        Availability.MISSING -> if (dark) StockOutDark else StockOut
    }
}

fun availabilityLabel(availability: Availability): String = when (availability) {
    Availability.HAVE -> "HAVE"
    Availability.SHORT -> "SHORT"
    Availability.MISSING -> "NEED"
    Availability.UNKNOWN -> "CHECK"
}

@Composable
fun AvailabilityBadge(availability: Availability, modifier: Modifier = Modifier) {
    val color = availabilityColor(availability)
    Text(
        text = availabilityLabel(availability),
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = modifier
            .clip(MaterialTheme.shapes.small)
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}
