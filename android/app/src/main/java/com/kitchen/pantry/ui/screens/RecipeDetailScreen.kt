package com.kitchen.pantry.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kitchen.pantry.data.Availability
import com.kitchen.pantry.data.IngredientCheck
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.ui.RecipesViewModel
import com.kitchen.pantry.ui.components.AvailabilityBadge

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeDetailScreen(
    viewModel: RecipesViewModel,
    recipeId: Long,
    onBack: () -> Unit,
    onEdit: (Long) -> Unit,
) {
    val cardFlow = remember(recipeId) { viewModel.recipeCard(recipeId) }
    val card by cardFlow.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(card?.name ?: "Recipe") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { onEdit(recipeId) }) {
                        Icon(Icons.Filled.Edit, contentDescription = "Edit recipe")
                    }
                },
            )
        },
    ) { padding ->
        val current = card ?: return@Scaffold

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text(
                    text = "Serves ${current.recipe.recipe.servings}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            item {
                val readiness = current.readiness
                Text(
                    text = if (readiness.canCookNow) {
                        "Everything is in the kitchen."
                    } else {
                        "${readiness.toBuy} of ${readiness.total} ingredients need buying."
                    },
                    style = MaterialTheme.typography.titleSmall,
                    color = if (readiness.canCookNow) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.error
                    },
                )
            }

            item {
                if (current.planned) {
                    OutlinedButton(
                        onClick = { viewModel.togglePlanned(current.recipe.recipe) },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("On the shopping plan — take it off") }
                } else {
                    Button(
                        onClick = { viewModel.togglePlanned(current.recipe.recipe) },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Add what I'm missing to the shopping list") }
                }
            }

            item { HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp)) }

            items(current.checks, key = { it.ingredient.id }) { check ->
                IngredientLine(check)
            }

            if (current.recipe.recipe.notes.isNotBlank()) {
                item {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    Text("Notes", style = MaterialTheme.typography.titleSmall)
                }
                item {
                    Text(
                        text = current.recipe.recipe.notes,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
    }
}

@Composable
private fun IngredientLine(check: IngredientCheck) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${check.ingredient.quantityLabel} " +
                    "${check.ingredient.unit.abbreviation} ${check.ingredient.name}",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
            )
            Text(
                text = detail(check),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        AvailabilityBadge(check.availability)
    }
}

private fun detail(check: IngredientCheck): String {
    val item = check.pantryItem
    return when (check.availability) {
        Availability.MISSING ->
            if (item == null) "Not in your pantry" else "You're out of it"
        Availability.SHORT ->
            "Have ${onHand(item)} · buy " +
                "${PantryItem.formatQuantity(check.shortfall)} ${check.ingredient.unit.abbreviation}"
        Availability.UNKNOWN -> "Have ${onHand(item)} — different units, so check the shelf"
        Availability.HAVE -> "Have ${onHand(item)}"
    }
}

private fun onHand(item: PantryItem?): String =
    item?.let { "${it.quantityLabel} ${it.unit.abbreviation}" } ?: "none"
