package com.kitchen.pantry

import android.app.Application
import com.kitchen.pantry.data.PantryDatabase
import com.kitchen.pantry.data.PantryRepository

/**
 * Hand-rolled dependency container. One repository, one database — a DI framework
 * would be more machinery than this app needs.
 */
class KitchenApp : Application() {
    val repository: PantryRepository by lazy {
        PantryRepository(PantryDatabase.get(this).pantryDao())
    }
}
