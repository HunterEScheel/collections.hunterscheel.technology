package com.kitchen.pantry.data.sync

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** A pantry row as `public.kitchen_items` stores it. */
@Serializable
data class RemoteItem(
    val id: String,
    @SerialName("user_id") val userId: String? = null,
    val name: String,
    val category: String,
    val quantity: Double,
    val unit: String,
    @SerialName("low_threshold") val lowThreshold: Double,
    val step: Double,
    val location: String,
    @SerialName("expires_on") val expiresOn: Long? = null,
    val notes: String,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("deleted_at") val deletedAt: String? = null,
)

/** One line of a recipe, stored inside the recipe's `ingredients` jsonb. */
@Serializable
data class RemoteIngredient(
    val name: String,
    val quantity: Double,
    val unit: String,
)

/** A recipe as `public.kitchen_recipes` stores it. */
@Serializable
data class RemoteRecipe(
    val id: String,
    @SerialName("user_id") val userId: String? = null,
    val name: String,
    val servings: Int,
    val notes: String,
    val planned: Boolean,
    val ingredients: List<RemoteIngredient> = emptyList(),
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("deleted_at") val deletedAt: String? = null,
)

/**
 * A soft delete: the columns the server needs to tombstone a row, and no others, so
 * the upsert leaves the rest of the row alone. [name] is here only to satisfy the
 * not-null column in the case where the row was created and deleted between two syncs
 * and the server has never seen it.
 */
@Serializable
data class RemoteDeletion(
    val id: String,
    @SerialName("user_id") val userId: String,
    val name: String = "",
    @SerialName("deleted_at") val deletedAt: String,
)
