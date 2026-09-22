package com.kitchen.pantry

import com.kitchen.pantry.data.Availability
import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.Recipe
import com.kitchen.pantry.data.RecipeIngredient
import com.kitchen.pantry.data.RecipeWithIngredients
import com.kitchen.pantry.data.check
import com.kitchen.pantry.data.checkIngredient
import com.kitchen.pantry.data.readiness
import com.kitchen.pantry.data.recipeShoppingNeeds
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RecipeMatchingTest {

    private fun pantry(name: String, quantity: Double, unit: MeasureUnit) = PantryItem(
        name = name,
        category = Category.OTHER,
        quantity = quantity,
        unit = unit,
    )

    private fun line(name: String, quantity: Double, unit: MeasureUnit, id: Long = 0) =
        RecipeIngredient(id = id, recipeId = 1, name = name, quantity = quantity, unit = unit)

    private fun recipe(name: String, vararg lines: RecipeIngredient, planned: Boolean = true) =
        RecipeWithIngredients(
            recipe = Recipe(id = 1, name = name, planned = planned),
            ingredients = lines.toList(),
        )

    // --- unit conversion ---

    @Test
    fun `mass converts within its own dimension`() {
        assertEquals(1000.0, MeasureUnit.KILOGRAMS.convert(1.0, MeasureUnit.GRAMS)!!, 0.0001)
        assertEquals(0.5, MeasureUnit.GRAMS.convert(500.0, MeasureUnit.KILOGRAMS)!!, 0.0001)
        assertEquals(453.59237, MeasureUnit.POUNDS.convert(1.0, MeasureUnit.GRAMS)!!, 0.0001)
    }

    @Test
    fun `volume converts within its own dimension`() {
        assertEquals(1000.0, MeasureUnit.LITERS.convert(1.0, MeasureUnit.MILLILITERS)!!, 0.0001)
        assertEquals(3.0, MeasureUnit.TABLESPOONS.convert(1.0, MeasureUnit.TEASPOONS)!!, 0.0001)
        assertEquals(1.0 / 3.0, MeasureUnit.TEASPOONS.convert(1.0, MeasureUnit.TABLESPOONS)!!, 0.0001)
    }

    @Test
    fun `mass and volume do not convert into each other`() {
        assertNull(MeasureUnit.GRAMS.convert(100.0, MeasureUnit.MILLILITERS))
    }

    @Test
    fun `one kind of container is not another`() {
        assertNull(MeasureUnit.JARS.convert(2.0, MeasureUnit.BOTTLES))
        assertEquals(2.0, MeasureUnit.JARS.convert(2.0, MeasureUnit.JARS)!!, 0.0001)
    }

    // --- one ingredient against the pantry ---

    @Test
    fun `an ingredient the pantry never heard of is missing`() {
        val check = checkIngredient(line("Saffron", 1.0, MeasureUnit.GRAMS), emptyList())
        assertEquals(Availability.MISSING, check.availability)
        assertEquals(1.0, check.amountToBuy, 0.0001)
    }

    @Test
    fun `an item you have run out of is missing`() {
        val check = checkIngredient(
            line("Flour", 200.0, MeasureUnit.GRAMS),
            listOf(pantry("Flour", 0.0, MeasureUnit.KILOGRAMS)),
        )
        assertEquals(Availability.MISSING, check.availability)
        assertEquals(200.0, check.amountToBuy, 0.0001)
    }

    @Test
    fun `a kilo of flour covers two hundred grams`() {
        val check = checkIngredient(
            line("Flour", 200.0, MeasureUnit.GRAMS),
            listOf(pantry("Flour", 1.0, MeasureUnit.KILOGRAMS)),
        )
        assertEquals(Availability.HAVE, check.availability)
        assertEquals(0.0, check.amountToBuy, 0.0001)
    }

    @Test
    fun `not enough on hand reports the shortfall in the recipe's unit`() {
        val check = checkIngredient(
            line("Flour", 500.0, MeasureUnit.GRAMS),
            listOf(pantry("Flour", 0.2, MeasureUnit.KILOGRAMS)),
        )
        assertEquals(Availability.SHORT, check.availability)
        assertEquals(300.0, check.shortfall, 0.0001)
        assertEquals(300.0, check.amountToBuy, 0.0001)
    }

    @Test
    fun `incomparable units are flagged rather than guessed at`() {
        val check = checkIngredient(
            line("Honey", 100.0, MeasureUnit.MILLILITERS),
            listOf(pantry("Honey", 2.0, MeasureUnit.JARS)),
        )
        assertEquals(Availability.UNKNOWN, check.availability)
        assertEquals(0.0, check.amountToBuy, 0.0001)
        assertFalse(check.availability.needsBuying)
    }

    @Test
    fun `names match ignoring case and surrounding space`() {
        val check = checkIngredient(
            line("  olive OIL ", 1.0, MeasureUnit.TABLESPOONS),
            listOf(pantry("Olive oil", 1.0, MeasureUnit.LITERS)),
        )
        assertEquals(Availability.HAVE, check.availability)
    }

    @Test
    fun `an exact match is not short of itself`() {
        val check = checkIngredient(
            line("Rice", 1.0, MeasureUnit.KILOGRAMS),
            listOf(pantry("Rice", 1000.0, MeasureUnit.GRAMS)),
        )
        assertEquals(Availability.HAVE, check.availability)
    }

    // --- whole recipes ---

    @Test
    fun `readiness counts each kind of line`() {
        val kitchen = listOf(
            pantry("Flour", 1.0, MeasureUnit.KILOGRAMS),
            pantry("Butter", 50.0, MeasureUnit.GRAMS),
            pantry("Honey", 1.0, MeasureUnit.JARS),
        )
        val readiness = recipe(
            "Scones",
            line("Flour", 300.0, MeasureUnit.GRAMS, id = 1),
            line("Butter", 100.0, MeasureUnit.GRAMS, id = 2),
            line("Honey", 30.0, MeasureUnit.MILLILITERS, id = 3),
            line("Buttermilk", 200.0, MeasureUnit.MILLILITERS, id = 4),
        ).check(kitchen).readiness()

        assertEquals(4, readiness.total)
        assertEquals(1, readiness.have)
        assertEquals(1, readiness.short)
        assertEquals(1, readiness.missing)
        assertEquals(1, readiness.unknown)
        assertEquals(2, readiness.toBuy)
        assertFalse(readiness.canCookNow)
    }

    @Test
    fun `a fully stocked recipe can be cooked now`() {
        val readiness = recipe(
            "Toast",
            line("Bread", 2.0, MeasureUnit.PIECES, id = 1),
        ).check(listOf(pantry("Bread", 6.0, MeasureUnit.PIECES))).readiness()

        assertTrue(readiness.canCookNow)
        assertEquals(0, readiness.toBuy)
    }

    // --- the shopping list ---

    @Test
    fun `shopping needs only cover what is missing or short`() {
        val kitchen = listOf(pantry("Flour", 1.0, MeasureUnit.KILOGRAMS))
        val needs = recipeShoppingNeeds(
            listOf(
                recipe(
                    "Pancakes",
                    line("Flour", 300.0, MeasureUnit.GRAMS, id = 1),
                    line("Eggs", 3.0, MeasureUnit.PIECES, id = 2),
                ),
            ),
            kitchen,
        )

        assertEquals(1, needs.size)
        assertEquals("Eggs", needs.first().name)
        assertEquals(3.0, needs.first().amount, 0.0001)
        assertFalse(needs.first().partial)
    }

    @Test
    fun `the same ingredient across recipes is summed once`() {
        val pancakes = RecipeWithIngredients(
            recipe = Recipe(id = 1, name = "Pancakes", planned = true),
            ingredients = listOf(line("Eggs", 3.0, MeasureUnit.PIECES, id = 1)),
        )
        val custard = RecipeWithIngredients(
            recipe = Recipe(id = 2, name = "Custard", planned = true),
            ingredients = listOf(
                RecipeIngredient(id = 2, recipeId = 2, name = "eggs", quantity = 4.0, unit = MeasureUnit.PIECES),
            ),
        )

        val needs = recipeShoppingNeeds(listOf(pancakes, custard), emptyList())

        assertEquals(1, needs.size)
        assertEquals(7.0, needs.first().amount, 0.0001)
        assertEquals(listOf("Pancakes", "Custard"), needs.first().recipes)
    }

    @Test
    fun `amounts that cannot be added stay on their own lines`() {
        val soup = RecipeWithIngredients(
            recipe = Recipe(id = 1, name = "Soup", planned = true),
            ingredients = listOf(
                line("Stock", 500.0, MeasureUnit.MILLILITERS, id = 1),
                RecipeIngredient(id = 2, recipeId = 1, name = "Stock", quantity = 2.0, unit = MeasureUnit.CANS),
            ),
        )
        val needs = recipeShoppingNeeds(listOf(soup), emptyList())
        assertEquals(2, needs.size)
    }

    @Test
    fun `a partial need says it is a top-up`() {
        val needs = recipeShoppingNeeds(
            listOf(recipe("Bread", line("Flour", 500.0, MeasureUnit.GRAMS, id = 1))),
            listOf(pantry("Flour", 200.0, MeasureUnit.GRAMS)),
        )
        assertEquals(1, needs.size)
        assertEquals(300.0, needs.first().amount, 0.0001)
        assertTrue(needs.first().partial)
    }

    @Test
    fun `an empty plan needs nothing`() {
        assertTrue(recipeShoppingNeeds(emptyList(), emptyList()).isEmpty())
    }
}
