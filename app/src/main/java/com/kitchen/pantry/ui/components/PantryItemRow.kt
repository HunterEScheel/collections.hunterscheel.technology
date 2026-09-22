package com.kitchen.pantry.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Card
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kitchen.pantry.data.PantryItem
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val dateFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM yyyy")

@Composable
fun PantryItemRow(
    item: PantryItem,
    onClick: () -> Unit,
    onAdjust: (Double) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .clickable(onClick = onClick)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = item.category.emoji, style = MaterialTheme.typography.titleLarge)

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = item.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    StockBadge(status = item.status, modifier = Modifier.padding(start = 6.dp))
                }
                Text(
                    text = subtitle(item),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                ExpiryLine(item)
            }

            Text(
                text = "${item.quantityLabel} ${item.unit.abbreviation}",
                style = MaterialTheme.typography.titleMedium,
                color = stockColor(item.status),
            )

            FilledTonalIconButton(
                onClick = { onAdjust(-item.effectiveStep) },
                modifier = Modifier
                    .padding(start = 8.dp)
                    .size(36.dp),
            ) {
                Icon(Icons.Filled.Remove, contentDescription = "Use some ${item.name}")
            }
            FilledTonalIconButton(
                onClick = { onAdjust(item.effectiveStep) },
                modifier = Modifier
                    .padding(start = 4.dp)
                    .size(36.dp),
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Restock ${item.name}")
            }
        }
    }
}

private fun subtitle(item: PantryItem): String =
    listOf(item.category.label, item.location).filter { it.isNotBlank() }.joinToString(" · ")

@Composable
private fun ExpiryLine(item: PantryItem, today: LocalDate = LocalDate.now()) {
    val date = item.expirationDate ?: return
    val days = item.daysUntilExpiry(today) ?: return
    val (text, warn) = when {
        days < 0 -> "Expired ${date.format(dateFormat)}" to true
        days == 0L -> "Expires today" to true
        days <= 7 -> "Expires in $days day${if (days == 1L) "" else "s"}" to true
        else -> "Best before ${date.format(dateFormat)}" to false
    }
    Text(
        text = text,
        style = MaterialTheme.typography.bodySmall,
        color = if (warn) {
            MaterialTheme.colorScheme.error
        } else {
            MaterialTheme.colorScheme.onSurfaceVariant
        },
    )
}
