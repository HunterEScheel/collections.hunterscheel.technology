package com.kitchen.pantry.data.sync

import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.Recipe
import com.kitchen.pantry.data.RecipeIngredient
import com.kitchen.pantry.data.RecipeWithIngredients

/**
 * Translation between the local Room rows and the shapes the shared Supabase project
 * stores. Kept as pure functions so the round trip can be tested without a database
 * or a network.
 */

fun PantryItem.toRemote(userId: String): RemoteItem = RemoteItem(
    id = remoteId,
    userId = userId,
    name = name,
    category = category.name,
    quantity = quantity,
    unit = unit.name,
    lowThreshold = lowThreshold,
    step = step,
    location = location,
    expiresOn = expiresOn,
    notes = notes,
)

/**
 * [localId] and [updatedAt] come from the row being replaced, so applying a remote
 * change keeps the local primary key — anything holding that id keeps working.
 */
fun RemoteItem.toLocal(localId: Long, updatedAt: Long): PantryItem = PantryItem(
    id = localId,
    name = name,
    category = Category.fromName(category),
    quantity = quantity,
    unit = MeasureUnit.fromName(unit),
    lowThreshold = lowThreshold,
    location = location,
    expiresOn = expiresOn,
    step = step,
    notes = notes,
    updatedAt = updatedAt,
    remoteId = id,
    dirty = false,
)

fun RecipeWithIngredients.toRemote(userId: String): RemoteRecipe = RemoteRecipe(
    id = recipe.remoteId,
    userId = userId,
    name = recipe.name,
    servings = recipe.servings,
    notes = recipe.notes,
    planned = recipe.planned,
    ingredients = orderedIngredients.map {
        RemoteIngredient(name = it.name, quantity = it.quantity, unit = it.unit.name)
    },
)

fun RemoteRecipe.toLocalRecipe(localId: Long, updatedAt: Long): Recipe = Recipe(
    id = localId,
    name = name,
    servings = servings,
    notes = notes,
    planned = planned,
    updatedAt = updatedAt,
    remoteId = id,
    dirty = false,
)

fun RemoteRecipe.toLocalIngredients(recipeId: Long): List<RecipeIngredient> =
    ingredients.mapIndexed { index, ingredient ->
        RecipeIngredient(
            recipeId = recipeId,
            name = ingredient.name,
            quantity = ingredient.quantity,
            unit = MeasureUnit.fromName(ingredient.unit),
            position = index,
        )
    }
