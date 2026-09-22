package com.kitchen.pantry.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.PantryRepository
import com.kitchen.pantry.data.RecipeNeed
import com.kitchen.pantry.data.RecipeRepository
import com.kitchen.pantry.data.recipeShoppingNeeds
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

/** The shopping tab: what stock levels say to buy, plus what the plan needs. */
data class ShoppingUiState(
    val loading: Boolean = true,
    val pantryEmpty: Boolean = true,
    val restockItems: List<PantryItem> = emptyList(),
    val expiringItems: List<PantryItem> = emptyList(),
    val recipeNeeds: List<RecipeNeed> = emptyList(),
    val plannedRecipeNames: List<String> = emptyList(),
) {
    val isEmpty: Boolean
        get() = restockItems.isEmpty() && expiringItems.isEmpty() && recipeNeeds.isEmpty()
}

class ShoppingViewModel(pantry: PantryRepository, recipes: RecipeRepository) : ViewModel() {

    val uiState: StateFlow<ShoppingUiState> =
        combine(pantry.observeAll(), recipes.observePlanned()) { items, planned ->
            ShoppingUiState(
                loading = false,
                pantryEmpty = items.isEmpty(),
                restockItems = items.filter { it.status.needsRestock }
                    .sortedWith(compareBy({ it.category.ordinal }, { it.name.lowercase() })),
                expiringItems = items
                    .filter { it.isExpired() || it.expiresWithin(EXPIRY_HORIZON_DAYS) }
                    .sortedBy { it.expiresOn ?: Long.MAX_VALUE },
                recipeNeeds = recipeShoppingNeeds(planned, items),
                plannedRecipeNames = planned.map { it.recipe.name },
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = ShoppingUiState(),
        )

    companion object {
        const val EXPIRY_HORIZON_DAYS = 14L

        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer { ShoppingViewModel(kitchenApp.repository, kitchenApp.recipeRepository) }
        }
    }
}
