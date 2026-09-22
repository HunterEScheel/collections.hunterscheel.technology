package com.kitchen.pantry.data

import kotlinx.coroutines.flow.Flow

/** The single door between the UI and the recipe tables. */
class RecipeRepository(private val dao: RecipeDao) {

    fun observeAll(): Flow<List<RecipeWithIngredients>> = dao.observeAll()

    fun observePlanned(): Flow<List<RecipeWithIngredients>> = dao.observePlanned()

    fun observeRecipe(id: Long): Flow<RecipeWithIngredients?> = dao.observeById(id)

    suspend fun find(id: Long): RecipeWithIngredients? = dao.findById(id)

    suspend fun save(recipe: Recipe, ingredients: List<RecipeIngredient>): Long =
        dao.saveRecipe(recipe.copy(updatedAt = System.currentTimeMillis()), ingredients)

    suspend fun delete(recipe: Recipe) = dao.deleteRecipe(recipe)

    suspend fun setPlanned(recipe: Recipe, planned: Boolean) =
        dao.setPlanned(recipe.id, planned, System.currentTimeMillis())
}
