package com.kitchen.pantry

import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.Recipe
import com.kitchen.pantry.data.RecipeIngredient
import com.kitchen.pantry.data.RecipeWithIngredients
import com.kitchen.pantry.data.sync.RemoteIngredient
import com.kitchen.pantry.data.sync.RemoteItem
import com.kitchen.pantry.data.sync.RemoteRecipe
import com.kitchen.pantry.data.sync.SyncRules
import com.kitchen.pantry.data.sync.toLocal
import com.kitchen.pantry.data.sync.toLocalIngredients
import com.kitchen.pantry.data.sync.toLocalRecipe
import com.kitchen.pantry.data.sync.toRemote
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncTest {

    private val item = PantryItem(
        id = 7,
        name = "Smoked paprika",
        category = Category.SPICES,
        quantity = 1.5,
        unit = MeasureUnit.JARS,
        lowThreshold = 1.0,
        location = "Spice drawer",
        expiresOn = 20_000L,
        step = 0.5,
        notes = "the good Spanish one",
        remoteId = "11111111-1111-4111-8111-111111111111",
    )

    @Test
    fun `an item survives the round trip`() {
        val restored = item.toRemote("user-1").toLocal(localId = 7, updatedAt = item.updatedAt)

        assertEquals(item.copy(dirty = false), restored)
    }

    @Test
    fun `an item carries its id and owner up`() {
        val remote = item.toRemote("user-1")

        assertEquals("11111111-1111-4111-8111-111111111111", remote.id)
        assertEquals("user-1", remote.userId)
        assertEquals("SPICES", remote.category)
        assertEquals("JARS", remote.unit)
        assertEquals(20_000L, remote.expiresOn)
    }

    @Test
    fun `an unknown category or unit lands somewhere safe`() {
        val remote = RemoteItem(
            id = "22222222-2222-4222-8222-222222222222",
            name = "Mystery",
            category = "NOT_A_CATEGORY",
            quantity = 1.0,
            unit = "FURLONGS",
            lowThreshold = 0.0,
            step = 0.0,
            location = "",
            notes = "",
        )
        val local = remote.toLocal(localId = 0, updatedAt = 1)

        assertEquals(Category.OTHER, local.category)
        assertEquals(MeasureUnit.PIECES, local.unit)
    }

    @Test
    fun `an applied remote row keeps the local primary key and is not dirty`() {
        val local = item.toRemote("user-1").toLocal(localId = 42, updatedAt = 99)

        assertEquals(42L, local.id)
        assertEquals(99L, local.updatedAt)
        assertFalse(local.dirty)
    }

    @Test
    fun `a recipe round trips with its lines in order`() {
        val recipe = RecipeWithIngredients(
            recipe = Recipe(
                id = 3,
                name = "Dal",
                servings = 4,
                notes = "simmer an hour",
                planned = true,
                remoteId = "33333333-3333-4333-8333-333333333333",
            ),
            ingredients = listOf(
                RecipeIngredient(id = 2, recipeId = 3, name = "Cumin", quantity = 1.0, unit = MeasureUnit.TEASPOONS, position = 1),
                RecipeIngredient(id = 1, recipeId = 3, name = "Lentils", quantity = 300.0, unit = MeasureUnit.GRAMS, position = 0),
            ),
        )

        val remote = recipe.toRemote("user-1")
        assertEquals(listOf("Lentils", "Cumin"), remote.ingredients.map { it.name })
        assertEquals("33333333-3333-4333-8333-333333333333", remote.id)
        assertTrue(remote.planned)

        val restoredRecipe = remote.toLocalRecipe(localId = 3, updatedAt = 5)
        assertEquals("Dal", restoredRecipe.name)
        assertEquals(4, restoredRecipe.servings)
        assertFalse(restoredRecipe.dirty)

        val restoredLines = remote.toLocalIngredients(recipeId = 3)
        assertEquals(listOf(0, 1), restoredLines.map { it.position })
        assertEquals(MeasureUnit.GRAMS, restoredLines.first().unit)
        assertEquals(300.0, restoredLines.first().quantity, 0.0001)
    }

    @Test
    fun `a recipe with no lines is fine`() {
        val remote = RemoteRecipe(
            id = "44444444-4444-4444-8444-444444444444",
            name = "Toast",
            servings = 1,
            notes = "",
            planned = false,
            ingredients = emptyList(),
        )
        assertTrue(remote.toLocalIngredients(recipeId = 1).isEmpty())
    }

    @Test
    fun `remote lines keep their own units`() {
        val remote = RemoteRecipe(
            id = "55555555-5555-4555-8555-555555555555",
            name = "Soup",
            servings = 2,
            notes = "",
            planned = false,
            ingredients = listOf(RemoteIngredient("Stock", 500.0, "MILLILITERS")),
        )
        assertEquals(MeasureUnit.MILLILITERS, remote.toLocalIngredients(1).first().unit)
    }

    // --- conflict rules ---

    @Test
    fun `a row we have never seen is applied`() {
        assertTrue(SyncRules.shouldApply(localExists = false, localIsDirty = false))
    }

    @Test
    fun `a clean local row gives way to the server`() {
        assertTrue(SyncRules.shouldApply(localExists = true, localIsDirty = false))
    }

    @Test
    fun `an unpushed local edit is not clobbered`() {
        assertFalse(SyncRules.shouldApply(localExists = true, localIsDirty = true))
    }

    // --- the pull cursor ---

    @Test
    fun `the cursor advances to the newest stamp in the batch`() {
        val next = SyncRules.nextCursor(
            current = "2026-01-01T00:00:00Z",
            seen = listOf("2026-01-02T00:00:00Z", "2026-01-03T00:00:00Z"),
        )
        assertEquals("2026-01-03T00:00:00Z", next)
    }

    @Test
    fun `an empty batch leaves the cursor alone`() {
        assertEquals("2026-01-01T00:00:00Z", SyncRules.nextCursor("2026-01-01T00:00:00Z", emptyList()))
        assertNull(SyncRules.nextCursor(null, emptyList()))
    }

    @Test
    fun `the cursor never goes backwards`() {
        val next = SyncRules.nextCursor(
            current = "2026-06-01T00:00:00Z",
            seen = listOf("2026-01-02T00:00:00Z", null),
        )
        assertEquals("2026-06-01T00:00:00Z", next)
    }

    @Test
    fun `a first pull takes whatever it is given`() {
        assertEquals("2026-01-02T00:00:00Z", SyncRules.nextCursor(null, listOf("2026-01-02T00:00:00Z")))
    }
}
