package com.kitchen.pantry

import android.app.Application
import com.kitchen.pantry.data.PantryDatabase
import com.kitchen.pantry.data.PantryRepository
import com.kitchen.pantry.data.RecipeRepository

/**
 * Hand-rolled dependency container. Two repositories over one database — a DI
 * framework would be more machinery than this app needs.
 */
class KitchenApp : Application() {
    private val database by lazy { PantryDatabase.get(this) }

    val repository: PantryRepository by lazy { PantryRepository(database.pantryDao()) }

    val recipeRepository: RecipeRepository by lazy { RecipeRepository(database.recipeDao()) }
}
