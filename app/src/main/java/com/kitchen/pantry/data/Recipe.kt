package com.kitchen.pantry.data

import androidx.room.ColumnInfo
import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation

/** Something you cook. Ingredients live in [RecipeIngredient], keyed by [id]. */
@Entity(
    tableName = "recipes",
    indices = [Index(value = ["remote_id"], unique = true)],
)
data class Recipe(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val servings: Int = 2,
    /** Method, a link, a note about whose recipe it is — free text. */
    val notes: String = "",
    /** On the shopping plan: what it needs and you lack shows up on the list. */
    val planned: Boolean = false,
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
    /** Stable id shared with the server. Generated locally so upserts are idempotent. */
    @ColumnInfo(name = "remote_id") val remoteId: String = newRemoteId(),
    /** Changed since the last successful push. */
    @ColumnInfo(name = "dirty") val dirty: Boolean = true,
)

/**
 * One line of a recipe. It is matched to the pantry by [name] rather than by a
 * stored id, so renaming a pantry item re-points every recipe that mentions it and
 * nothing is left dangling when an item is deleted.
 */
@Entity(
    tableName = "recipe_ingredients",
    foreignKeys = [
        ForeignKey(
            entity = Recipe::class,
            parentColumns = ["id"],
            childColumns = ["recipe_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("recipe_id")],
)
data class RecipeIngredient(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "recipe_id") val recipeId: Long,
    val name: String,
    val quantity: Double = 1.0,
    val unit: MeasureUnit = MeasureUnit.PIECES,
    /** Ordering within the recipe, so the list reads the way it was typed. */
    val position: Int = 0,
) {
    val quantityLabel: String get() = PantryItem.formatQuantity(quantity)
}

/** A recipe with its lines, which is how every screen wants it. */
data class RecipeWithIngredients(
    @Embedded val recipe: Recipe,
    @Relation(parentColumn = "id", entityColumn = "recipe_id")
    val ingredients: List<RecipeIngredient>,
) {
    /** Lines in the order they were entered. */
    val orderedIngredients: List<RecipeIngredient>
        get() = ingredients.sortedWith(compareBy({ it.position }, { it.id }))
}
