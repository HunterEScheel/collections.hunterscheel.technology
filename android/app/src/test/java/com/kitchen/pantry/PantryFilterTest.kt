package com.kitchen.pantry

import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.PantryFilter
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.SortOrder
import com.kitchen.pantry.data.applyFilter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class PantryFilterTest {

    private val cumin = PantryItem(
        id = 1,
        name = "Ground cumin",
        category = Category.SPICES,
        quantity = 1.0,
        unit = MeasureUnit.JARS,
        lowThreshold = 1.0,
        location = "Spice drawer",
        updatedAt = 100,
    )
    private val flour = PantryItem(
        id = 2,
        name = "Bread flour",
        category = Category.BAKING,
        quantity = 3.0,
        unit = MeasureUnit.KILOGRAMS,
        location = "Pantry",
        expiresOn = LocalDate.of(2026, 3, 1).toEpochDay(),
        updatedAt = 300,
    )
    private val rice = PantryItem(
        id = 3,
        name = "Arborio rice",
        category = Category.GRAINS,
        quantity = 0.0,
        unit = MeasureUnit.KILOGRAMS,
        notes = "for risotto",
        expiresOn = LocalDate.of(2026, 1, 1).toEpochDay(),
        updatedAt = 200,
    )
    private val items = listOf(cumin, flour, rice)

    @Test
    fun `no filter sorts by name`() {
        assertEquals(listOf(rice, flour, cumin), items.applyFilter(PantryFilter()))
    }

    @Test
    fun `search matches name, location, notes and category`() {
        assertEquals(listOf(flour), items.applyFilter(PantryFilter(query = "bread")))
        assertEquals(listOf(cumin), items.applyFilter(PantryFilter(query = "spice drawer")))
        assertEquals(listOf(rice), items.applyFilter(PantryFilter(query = "risotto")))
        assertEquals(listOf(flour), items.applyFilter(PantryFilter(query = "Baking")))
    }

    @Test
    fun `search ignores case and surrounding space`() {
        assertEquals(listOf(cumin), items.applyFilter(PantryFilter(query = "  CUMIN ")))
    }

    @Test
    fun `category filter keeps one shelf`() {
        assertEquals(listOf(rice), items.applyFilter(PantryFilter(category = Category.GRAINS)))
    }

    @Test
    fun `restock filter keeps empty and low items`() {
        val result = items.applyFilter(PantryFilter(restockOnly = true))
        assertEquals(listOf(rice, cumin), result)
    }

    @Test
    fun `filters combine`() {
        val result = items.applyFilter(
            PantryFilter(query = "rice", category = Category.BAKING, restockOnly = true),
        )
        assertTrue(result.isEmpty())
    }

    @Test
    fun `expiry sort puts undated items last`() {
        val result = items.applyFilter(PantryFilter(sortOrder = SortOrder.EXPIRY))
        assertEquals(listOf(rice, flour, cumin), result)
    }

    @Test
    fun `recent sort is newest first`() {
        val result = items.applyFilter(PantryFilter(sortOrder = SortOrder.RECENT))
        assertEquals(listOf(flour, rice, cumin), result)
    }

    @Test
    fun `category sort follows the shelf order then the name`() {
        val result = items.applyFilter(PantryFilter(sortOrder = SortOrder.CATEGORY))
        assertEquals(listOf(flour, rice, cumin), result)
    }
}
