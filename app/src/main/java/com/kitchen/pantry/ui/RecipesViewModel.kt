package com.kitchen.pantry.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.kitchen.pantry.data.IngredientCheck
import com.kitchen.pantry.data.PantryRepository
import com.kitchen.pantry.data.Recipe
import com.kitchen.pantry.data.RecipeReadiness
import com.kitchen.pantry.data.RecipeRepository
import com.kitchen.pantry.data.RecipeWithIngredients
import com.kitchen.pantry.data.check
import com.kitchen.pantry.data.readiness
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** A recipe alongside how well the kitchen can cover it right now. */
data class RecipeCard(
    val recipe: RecipeWithIngredients,
    val checks: List<IngredientCheck>,
) {
    val readiness: RecipeReadiness = checks.readiness()
    val id: Long get() = recipe.recipe.id
    val name: String get() = recipe.recipe.name
    val planned: Boolean get() = recipe.recipe.planned
}

data class RecipesUiState(
    val loading: Boolean = true,
    val recipes: List<RecipeCard> = emptyList(),
    val query: String = "",
) {
    val isEmpty: Boolean get() = !loading && recipes.isEmpty()

    val visible: List<RecipeCard>
        get() = if (query.isBlank()) {
            recipes
        } else {
            val needle = query.trim()
            recipes.filter { card ->
                card.name.contains(needle, ignoreCase = true) ||
                    card.recipe.ingredients.any { it.name.contains(needle, ignoreCase = true) }
            }
        }

    val plannedCount: Int get() = recipes.count { it.planned }
}

class RecipesViewModel(
    private val recipes: RecipeRepository,
    pantry: PantryRepository,
) : ViewModel() {

    private val query = MutableStateFlow("")
    private val pantryItems = pantry.observeAll()

    val uiState: StateFlow<RecipesUiState> =
        combine(recipes.observeAll(), pantryItems, query) { all, items, text ->
            RecipesUiState(
                loading = false,
                recipes = all.map { RecipeCard(it, it.check(items)) },
                query = text,
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = RecipesUiState(),
        )

    /** The one recipe a detail screen is showing, re-checked as the pantry changes. */
    fun recipeCard(id: Long): StateFlow<RecipeCard?> =
        combine(recipes.observeRecipe(id), pantryItems) { recipe, items ->
            recipe?.let { RecipeCard(it, it.check(items)) }
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = null,
        )

    fun setQuery(value: String) {
        query.value = value
    }

    fun togglePlanned(recipe: Recipe) = viewModelScope.launch {
        recipes.setPlanned(recipe, !recipe.planned)
    }

    fun delete(recipe: Recipe) = viewModelScope.launch {
        recipes.delete(recipe)
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                RecipesViewModel(kitchenApp.recipeRepository, kitchenApp.repository)
            }
        }
    }
}
