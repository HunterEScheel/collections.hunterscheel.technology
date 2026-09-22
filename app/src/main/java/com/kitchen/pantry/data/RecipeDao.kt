package com.kitchen.pantry.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface RecipeDao {

    @Transaction
    @Query("SELECT * FROM recipes ORDER BY name COLLATE NOCASE ASC")
    fun observeAll(): Flow<List<RecipeWithIngredients>>

    @Transaction
    @Query("SELECT * FROM recipes WHERE planned = 1 ORDER BY name COLLATE NOCASE ASC")
    fun observePlanned(): Flow<List<RecipeWithIngredients>>

    @Transaction
    @Query("SELECT * FROM recipes WHERE id = :id")
    fun observeById(id: Long): Flow<RecipeWithIngredients?>

    @Transaction
    @Query("SELECT * FROM recipes WHERE id = :id")
    suspend fun findById(id: Long): RecipeWithIngredients?

    @Upsert
    suspend fun upsertRecipe(recipe: Recipe): Long

    @Delete
    suspend fun deleteRecipe(recipe: Recipe)

    @Query("UPDATE recipes SET planned = :planned, updated_at = :updatedAt WHERE id = :id")
    suspend fun setPlanned(id: Long, planned: Boolean, updatedAt: Long)

    @Insert
    suspend fun insertIngredients(ingredients: List<RecipeIngredient>)

    @Query("DELETE FROM recipe_ingredients WHERE recipe_id = :recipeId")
    suspend fun deleteIngredientsFor(recipeId: Long)

    /** Rewrites a recipe and its lines in one go, which is how the editor saves. */
    @Transaction
    suspend fun saveRecipe(recipe: Recipe, ingredients: List<RecipeIngredient>): Long {
        val id = upsertRecipe(recipe)
        val recipeId = if (recipe.id == 0L) id else recipe.id
        deleteIngredientsFor(recipeId)
        insertIngredients(
            ingredients.mapIndexed { index, ingredient ->
                ingredient.copy(id = 0, recipeId = recipeId, position = index)
            },
        )
        return recipeId
    }
}
