package com.kitchen.pantry.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.RecipeNeed
import com.kitchen.pantry.ui.ShoppingUiState
import com.kitchen.pantry.ui.ShoppingViewModel
import java.time.format.DateTimeFormatter

private val dateFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM")

/**
 * What to buy: items the pantry is low on, everything the planned recipes need and
 * the kitchen can't cover, and a nudge about food that is about to go off.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShoppingListScreen(
    viewModel: ShoppingViewModel,
    onOpenItem: (Long) -> Unit,
    bottomBar: @Composable () -> Unit,
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    // Ticked boxes are a shopping-trip scratchpad, not stored state.
    val tickedItems = rememberSaveable(saver = TickedSaver) { mutableStateOf(emptySet<Long>()) }
    val tickedNeeds = rememberSaveable(saver = TextTickedSaver) { mutableStateOf(emptySet<String>()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Shopping list") },
                actions = {
                    IconButton(
                        onClick = {
                            val text = shareText(state)
                            if (text.isNotBlank()) {
                                val send = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, "Shopping list")
                                    putExtra(Intent.EXTRA_TEXT, text)
                                }
                                context.startActivity(Intent.createChooser(send, "Share list"))
                            }
                        },
                    ) {
                        Icon(Icons.Filled.Share, contentDescription = "Share list")
                    }
                },
            )
        },
        bottomBar = bottomBar,
    ) { padding ->
        if (state.isEmpty) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = if (state.pantryEmpty) {
                        "Add items to your pantry, or put a recipe on the plan, " +
                            "and this list fills itself."
                    } else {
                        "Nothing to buy. The kitchen is stocked."
                    },
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(24.dp),
                )
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (state.recipeNeeds.isNotEmpty()) {
                item {
                    SectionHeader("For your recipes (${state.recipeNeeds.size})")
                    Text(
                        text = "From ${state.plannedRecipeNames.joinToString(", ")}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                items(state.recipeNeeds, key = { "need-${it.name}-${it.unit.name}" }) { need ->
                    val key = "${need.name}|${need.unit.name}"
                    NeedRow(
                        need = need,
                        checked = key in tickedNeeds.value,
                        onCheckedChange = { checked ->
                            tickedNeeds.value = if (checked) {
                                tickedNeeds.value + key
                            } else {
                                tickedNeeds.value - key
                            }
                        },
                    )
                }
            }

            if (state.restockItems.isNotEmpty()) {
                item {
                    if (state.recipeNeeds.isNotEmpty()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    }
                    SectionHeader("Running low (${state.restockItems.size})")
                }
                items(state.restockItems, key = { "buy-${it.id}" }) { pantryItem ->
                    ShoppingRow(
                        item = pantryItem,
                        checked = pantryItem.id in tickedItems.value,
                        onCheckedChange = { checked ->
                            tickedItems.value = if (checked) {
                                tickedItems.value + pantryItem.id
                            } else {
                                tickedItems.value - pantryItem.id
                            }
                        },
                        onClick = { onOpenItem(pantryItem.id) },
                    )
                }
            }

            if (state.expiringItems.isNotEmpty()) {
                item {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    SectionHeader("Use soon (${state.expiringItems.size})")
                }
                items(state.expiringItems, key = { "soon-${it.id}" }) { pantryItem ->
                    ExpiringRow(item = pantryItem, onClick = { onOpenItem(pantryItem.id) })
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(vertical = 8.dp),
    )
}

@Composable
private fun NeedRow(need: RecipeNeed, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = checked, onCheckedChange = onCheckedChange)
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${need.amountLabel} ${need.unit.abbreviation} ${need.name}",
                style = MaterialTheme.typography.bodyLarge,
                textDecoration = if (checked) TextDecoration.LineThrough else TextDecoration.None,
            )
            Text(
                text = buildString {
                    if (need.partial) append("Topping up · ")
                    append(need.recipes.joinToString(", "))
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ShoppingRow(
    item: PantryItem,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    onClick: () -> Unit,
) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = checked, onCheckedChange = onCheckedChange)
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.name,
                style = MaterialTheme.typography.bodyLarge,
                textDecoration = if (checked) TextDecoration.LineThrough else TextDecoration.None,
            )
            Text(
                text = "${item.category.label} · ${item.quantityLabel} ${item.unit.abbreviation} left",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        TextButton(onClick = onClick) { Text("Edit") }
    }
}

@Composable
private fun ExpiringRow(item: PantryItem, onClick: () -> Unit) {
    val days = item.daysUntilExpiry() ?: return
    val note = when {
        days < 0 -> "Expired"
        days == 0L -> "Today"
        else -> "${item.expirationDate?.format(dateFormat)} ($days d)"
    }
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = item.category.emoji, modifier = Modifier.padding(end = 12.dp))
        Text(text = item.name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Text(
            text = note,
            style = MaterialTheme.typography.bodySmall,
            color = if (days <= 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
        )
        TextButton(onClick = onClick) { Text("Open") }
    }
}

private fun shareText(state: ShoppingUiState): String = buildString {
    state.recipeNeeds.forEach { need ->
        appendLine("- ${need.amountLabel} ${need.unit.abbreviation} ${need.name}")
    }
    state.restockItems.forEach { item ->
        appendLine("- ${item.name} (${item.category.label})")
    }
}.trim()

/** Ticks survive rotation but not the trip home; a LongArray is bundle-friendly. */
private val TickedSaver = Saver<MutableState<Set<Long>>, LongArray>(
    save = { it.value.toLongArray() },
    restore = { mutableStateOf(it.toSet()) },
)

private val TextTickedSaver = Saver<MutableState<Set<String>>, ArrayList<String>>(
    save = { ArrayList(it.value) },
    restore = { mutableStateOf(it.toSet()) },
)
