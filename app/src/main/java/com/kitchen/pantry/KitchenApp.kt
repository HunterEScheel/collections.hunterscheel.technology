package com.kitchen.pantry

import android.app.Application
import com.kitchen.pantry.data.PantryDatabase
import com.kitchen.pantry.data.PantryRepository
import com.kitchen.pantry.data.RecipeRepository
import com.kitchen.pantry.data.sync.SessionStore
import com.kitchen.pantry.data.sync.SupabaseClient
import com.kitchen.pantry.data.sync.SyncEngine

/**
 * Hand-rolled dependency container. Two repositories over one database — a DI
 * framework would be more machinery than this app needs.
 */
class KitchenApp : Application() {
    private val database by lazy { PantryDatabase.get(this) }

    val repository: PantryRepository by lazy {
        PantryRepository(database.pantryDao(), database.syncDao())
    }

    val recipeRepository: RecipeRepository by lazy {
        RecipeRepository(database.recipeDao(), database.syncDao())
    }

    val sessionStore: SessionStore by lazy { SessionStore(this) }

    val supabaseClient: SupabaseClient by lazy { SupabaseClient(sessionStore) }

    val syncEngine: SyncEngine by lazy {
        SyncEngine(
            pantryDao = database.pantryDao(),
            recipeDao = database.recipeDao(),
            syncDao = database.syncDao(),
            client = supabaseClient,
            session = sessionStore,
        )
    }
}
