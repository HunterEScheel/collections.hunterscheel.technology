package com.kitchen.pantry

import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.Dimension
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.starterPantry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class StarterPantryTest {

    private val staples = starterPantry()

    private fun unitOf(name: String): MeasureUnit =
        staples.first { it.name == name }.unit

    @Test
    fun `the list is usable as-is`() {
        assertTrue(staples.size > 20)
        assertTrue(staples.all { it.name.isNotBlank() })
        assertEquals(staples.size, staples.map { it.name }.distinct().size)
    }

    @Test
    fun `everything is weighed in grams or measured in ounces`() {
        val units = staples.map { it.unit }.distinct()
        assertEquals(setOf(MeasureUnit.GRAMS, MeasureUnit.OUNCES), units.toSet())
    }

    @Test
    fun `dry goods are in grams`() {
        listOf(
            "All-purpose flour", "Granulated sugar", "Brown sugar", "Baking powder",
            "Baking soda", "Active dry yeast", "Cocoa powder", "Long-grain rice",
            "Rolled oats", "Spaghetti", "Quinoa", "Dried lentils",
        ).forEach { assertEquals(it, MeasureUnit.GRAMS, unitOf(it)) }
    }

    @Test
    fun `every spice is in grams`() {
        staples.filter { it.category == Category.SPICES }
            .forEach { assertEquals(it.name, MeasureUnit.GRAMS, it.unit) }
    }

    @Test
    fun `canned goods are in ounces`() {
        staples.filter { it.category == Category.CANNED }
            .forEach { assertEquals(it.name, MeasureUnit.OUNCES, it.unit) }
    }

    @Test
    fun `liquids and spreads are in ounces`() {
        listOf(
            "Vanilla extract", "Olive oil", "Neutral cooking oil", "White vinegar",
            "Soy sauce", "Honey", "Peanut butter",
        ).forEach { assertEquals(it, MeasureUnit.OUNCES, unitOf(it)) }
    }

    @Test
    fun `nothing is counted by the container`() {
        // Counting jars tells you nothing about how much is left in one.
        assertTrue(staples.none { it.unit.dimension == Dimension.COUNT })
    }

    @Test
    fun `every staple starts stocked and above its restock level`() {
        staples.forEach {
            assertTrue(it.name, it.quantity > 0.0)
            assertTrue(it.name, it.quantity > it.lowThreshold)
        }
    }

    @Test
    fun `steps are sized to the item rather than the unit`() {
        // A 45 g jar of cumin must not move in the 50 g default steps of grams.
        staples.forEach {
            assertTrue(it.name, it.step > 0.0)
            assertTrue(it.name, it.step <= it.quantity)
        }
        assertEquals(5.0, staples.first { it.name == "Ground cumin" }.effectiveStep, 0.0001)
        assertEquals(100.0, staples.first { it.name == "All-purpose flour" }.effectiveStep, 0.0001)
    }
}
