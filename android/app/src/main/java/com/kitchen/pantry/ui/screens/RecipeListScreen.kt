package com.kitchen.pantry.ui.screens

import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kitchen.pantry.ui.RecipeCard
import com.kitchen.pantry.ui.RecipesViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeListScreen(
    viewModel: RecipesViewModel,
    onAddRecipe: () -> Unit,
    onOpenRecipe: (Long) -> Unit,
    bottomBar: @Composable () -> Unit,
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Recipes") }) },
        bottomBar = bottomBar,
        floatingActionButton = {
            FloatingActionButton(onClick = onAddRecipe) {
                Icon(Icons.Filled.Add, contentDescription = "Add a recipe")
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::setQuery,
                singleLine = true,
                label = { Text("Search recipes and ingredients") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.query.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setQuery("") }) {
                            Icon(Icons.Filled.Close, contentDescription = "Clear search")
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
            )

            when {
                state.loading -> Unit

                state.isEmpty -> EmptyBox(
                    title = "No recipes yet",
                    body = "Add one, and the app will tell you what you're missing " +
                        "before you start cooking.",
                )

                state.visible.isEmpty() -> EmptyBox(
                    title = "No matches",
                    body = "Nothing here uses that.",
                )

                else -> LazyColumn(
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    if (state.plannedCount > 0) {
                        item {
                            Text(
                                text = "${state.plannedCount} on the shopping plan",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                    items(state.visible, key = { it.id }) { card ->
                        RecipeRow(
                            card = card,
                            onClick = { onOpenRecipe(card.id) },
                            onTogglePlanned = { viewModel.togglePlanned(card.recipe.recipe) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RecipeRow(card: RecipeCard, onClick: () -> Unit, onTogglePlanned: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.clickable(onClick = onClick).padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = card.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
            )
            Text(
                text = readinessLine(card),
                style = MaterialTheme.typography.bodySmall,
                color = if (card.readiness.canCookNow) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                FilterChip(
                    selected = card.planned,
                    onClick = onTogglePlanned,
                    label = { Text(if (card.planned) "On the plan" else "Add to plan") },
                )
            }
        }
    }
}

private fun readinessLine(card: RecipeCard): String {
    val readiness = card.readiness
    if (readiness.total == 0) return "No ingredients yet"
    if (readiness.canCookNow) {
        val tail = if (readiness.unknown > 0) " (${readiness.unknown} to eyeball)" else ""
        return "You can cook this now$tail"
    }
    return "${readiness.have} of ${readiness.total} on hand · ${readiness.toBuy} to buy"
}

@Composable
private fun EmptyBox(title: String, body: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(24.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(
                body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
