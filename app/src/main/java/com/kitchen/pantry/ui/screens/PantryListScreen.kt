package com.kitchen.pantry.ui.screens

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sort
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kitchen.pantry.data.SortOrder
import com.kitchen.pantry.ui.PantryViewModel
import com.kitchen.pantry.ui.components.PantryItemRow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PantryListScreen(
    viewModel: PantryViewModel,
    onAddItem: () -> Unit,
    onOpenItem: (Long) -> Unit,
    onOpenSync: () -> Unit,
    bottomBar: @Composable () -> Unit,
) {
    val state by viewModel.uiState.collectAsState()
    val deleted by viewModel.lastDeleted.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var sortMenuOpen by remember { mutableStateOf(false) }

    LaunchedEffect(deleted) {
        val item = deleted ?: return@LaunchedEffect
        val result = snackbarHostState.showSnackbar(
            message = "Removed ${item.name}",
            actionLabel = "Undo",
        )
        if (result == SnackbarResult.ActionPerformed) viewModel.undoDelete() else viewModel.clearUndo()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Kitchen") },
                actions = {
                    IconButton(onClick = onOpenSync) {
                        Icon(Icons.Filled.CloudSync, contentDescription = "Sync")
                    }
                    IconButton(onClick = { sortMenuOpen = true }) {
                        Icon(Icons.Filled.Sort, contentDescription = "Sort")
                    }
                    DropdownMenu(expanded = sortMenuOpen, onDismissRequest = { sortMenuOpen = false }) {
                        SortOrder.entries.forEach { order ->
                            DropdownMenuItem(
                                text = { Text(order.label) },
                                onClick = {
                                    viewModel.setSortOrder(order)
                                    sortMenuOpen = false
                                },
                            )
                        }
                    }
                },
            )
        },
        bottomBar = bottomBar,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddItem) {
                Icon(Icons.Filled.Add, contentDescription = "Add an item")
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = state.filter.query,
                onValueChange = viewModel::setQuery,
                singleLine = true,
                label = { Text("Search the pantry") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.filter.query.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setQuery("") }) {
                            Icon(Icons.Filled.Close, contentDescription = "Clear search")
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp),
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = state.filter.restockOnly,
                    onClick = viewModel::toggleRestockOnly,
                    label = { Text("Needs restock") },
                )
                state.usedCategories.forEach { category ->
                    FilterChip(
                        selected = state.filter.category == category,
                        onClick = { viewModel.toggleCategory(category) },
                        label = { Text("${category.emoji} ${category.label}") },
                    )
                }
            }

            when {
                state.loading -> Unit

                state.isEmptyPantry -> EmptyPantry(
                    onSeed = { viewModel.seedStarterPantry() },
                    onAdd = onAddItem,
                    modifier = Modifier.fillMaxSize(),
                )

                state.visibleItems.isEmpty() -> EmptyResult(
                    onClearFilters = viewModel::clearFilters,
                    modifier = Modifier.fillMaxSize(),
                )

                else -> LazyColumn(
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    item {
                        Text(
                            text = summary(state.visibleItems.size, state.outCount, state.lowCount),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    items(state.visibleItems, key = { it.id }) { pantryItem ->
                        PantryItemRow(
                            item = pantryItem,
                            onClick = { onOpenItem(pantryItem.id) },
                            onAdjust = { delta -> viewModel.adjust(pantryItem, delta) },
                        )
                    }
                }
            }
        }
    }
}

private fun summary(shown: Int, out: Int, low: Int): String {
    val tail = listOfNotNull(
        out.takeIf { it > 0 }?.let { "$it out" },
        low.takeIf { it > 0 }?.let { "$it running low" },
    ).joinToString(", ")
    val head = "$shown item${if (shown == 1) "" else "s"}"
    return if (tail.isEmpty()) head else "$head · $tail"
}

@Composable
private fun EmptyPantry(onSeed: () -> Unit, onAdd: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(24.dp),
        ) {
            Text("Nothing in the kitchen yet", style = MaterialTheme.typography.titleMedium)
            Text(
                "Add your first item, or start from a list of common staples you can edit.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(onClick = onSeed) {
                    Text("Start with staples")
                }
                Button(onClick = onAdd) {
                    Text("Add an item")
                }
            }
        }
    }
}

@Composable
private fun EmptyResult(onClearFilters: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(24.dp),
        ) {
            Text("No matches", style = MaterialTheme.typography.titleMedium)
            TextButton(onClick = onClearFilters) {
                Text("Clear filters")
            }
        }
    }
}
