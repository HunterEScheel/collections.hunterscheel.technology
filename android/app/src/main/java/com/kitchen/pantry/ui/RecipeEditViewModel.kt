package com.kitchen.pantry.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.Recipe
import com.kitchen.pantry.data.RecipeIngredient
import com.kitchen.pantry.data.RecipeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** One editable ingredient row. [key] keeps list identity stable while typing. */
data class IngredientDraft(
    val key: Long,
    val name: String = "",
    val quantity: String = "1",
    val unit: MeasureUnit = MeasureUnit.PIECES,
) {
    val quantityError: String? get() = if (quantity.toDoubleOrNull() == null) "Numbers only" else null
    val isBlank: Boolean get() = name.isBlank()
    val isValid: Boolean get() = !isBlank && quantityError == null
}

data class RecipeEditState(
    val id: Long = 0,
    val name: String = "",
    val servings: String = "2",
    val notes: String = "",
    val planned: Boolean = false,
    val ingredients: List<IngredientDraft> = listOf(IngredientDraft(key = 1)),
    val loading: Boolean = true,
    val saved: Boolean = false,
) {
    val isNew: Boolean get() = id == 0L
    val nameError: String? get() = if (name.isBlank()) "Give it a name" else null
    val servingsError: String?
        get() = if (servings.toIntOrNull()?.let { it > 0 } == true) null else "Whole number, at least 1"

    /** Rows left entirely blank are ignored rather than rejected. */
    private val filled: List<IngredientDraft> get() = ingredients.filterNot { it.isBlank }

    val ingredientsError: String?
        get() = when {
            filled.isEmpty() -> "Add at least one ingredient"
            filled.any { !it.isValid } -> "Check the amounts"
            else -> null
        }

    val canSave: Boolean
        get() = nameError == null && servingsError == null && ingredientsError == null

    fun toRecipe() = Recipe(
        id = id,
        name = name.trim(),
        servings = servings.toIntOrNull() ?: 1,
        notes = notes.trim(),
        planned = planned,
    )

    fun toIngredients(): List<RecipeIngredient> = filled.mapIndexed { index, draft ->
        RecipeIngredient(
            recipeId = id,
            name = draft.name.trim(),
            quantity = draft.quantity.toDoubleOrNull() ?: 0.0,
            unit = draft.unit,
            position = index,
        )
    }
}

class RecipeEditViewModel(
    private val repository: RecipeRepository,
    private val recipeId: Long,
) : ViewModel() {

    private val _state = MutableStateFlow(RecipeEditState(loading = recipeId != 0L))
    val state: StateFlow<RecipeEditState> = _state.asStateFlow()

    private var nextKey = 100L

    init {
        if (recipeId != 0L) {
            viewModelScope.launch {
                val existing = repository.find(recipeId)
                _state.value = if (existing == null) {
                    RecipeEditState(loading = false)
                } else {
                    RecipeEditState(
                        id = existing.recipe.id,
                        name = existing.recipe.name,
                        servings = existing.recipe.servings.toString(),
                        notes = existing.recipe.notes,
                        planned = existing.recipe.planned,
                        ingredients = existing.orderedIngredients.map { ingredient ->
                            IngredientDraft(
                                key = nextKey++,
                                name = ingredient.name,
                                quantity = PantryItem.formatQuantity(ingredient.quantity),
                                unit = ingredient.unit,
                            )
                        }.ifEmpty { listOf(IngredientDraft(key = nextKey++)) },
                        loading = false,
                    )
                }
            }
        }
    }

    fun setName(value: String) = _state.update { it.copy(name = value) }
    fun setServings(value: String) = _state.update { it.copy(servings = value) }
    fun setNotes(value: String) = _state.update { it.copy(notes = value) }
    fun setPlanned(value: Boolean) = _state.update { it.copy(planned = value) }

    fun addIngredient() = _state.update {
        it.copy(ingredients = it.ingredients + IngredientDraft(key = nextKey++))
    }

    fun removeIngredient(key: Long) = _state.update { current ->
        val remaining = current.ingredients.filterNot { it.key == key }
        current.copy(
            ingredients = remaining.ifEmpty { listOf(IngredientDraft(key = nextKey++)) },
        )
    }

    fun updateIngredient(key: Long, transform: (IngredientDraft) -> IngredientDraft) =
        _state.update { current ->
            current.copy(
                ingredients = current.ingredients.map { if (it.key == key) transform(it) else it },
            )
        }

    fun save() {
        val current = _state.value
        if (!current.canSave) return
        viewModelScope.launch {
            repository.save(current.toRecipe(), current.toIngredients())
            _state.update { it.copy(saved = true) }
        }
    }

    fun delete() {
        val current = _state.value
        if (current.isNew) return
        viewModelScope.launch {
            repository.find(current.id)?.let { repository.delete(it.recipe) }
            _state.update { it.copy(saved = true) }
        }
    }

    companion object {
        fun factory(recipeId: Long): ViewModelProvider.Factory = viewModelFactory {
            initializer { RecipeEditViewModel(kitchenApp.recipeRepository, recipeId) }
        }
    }
}
