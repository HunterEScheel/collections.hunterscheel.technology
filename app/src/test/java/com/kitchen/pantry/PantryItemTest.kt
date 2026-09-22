package com.kitchen.pantry

import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.StockStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class PantryItemTest {

    private fun item(
        quantity: Double,
        threshold: Double = 0.0,
        expires: LocalDate? = null,
        step: Double = 0.0,
    ) = PantryItem(
        name = "Flour",
        category = Category.BAKING,
        quantity = quantity,
        unit = MeasureUnit.KILOGRAMS,
        lowThreshold = threshold,
        expiresOn = expires?.toEpochDay(),
        step = step,
    )

    @Test
    fun `empty item is out of stock`() {
        assertEquals(StockStatus.OUT, item(0.0).status)
    }

    @Test
    fun `quantity at the threshold counts as low`() {
        assertEquals(StockStatus.LOW, item(quantity = 0.5, threshold = 0.5).status)
    }

    @Test
    fun `quantity above the threshold is fine`() {
        assertEquals(StockStatus.OK, item(quantity = 2.0, threshold = 0.5).status)
    }

    @Test
    fun `a zero threshold only flags an empty shelf`() {
        assertEquals(StockStatus.OK, item(quantity = 0.1).status)
        assertEquals(StockStatus.OUT, item(quantity = 0.0).status)
    }

    @Test
    fun `only out and low need restocking`() {
        assertTrue(StockStatus.OUT.needsRestock)
        assertTrue(StockStatus.LOW.needsRestock)
        assertFalse(StockStatus.OK.needsRestock)
    }

    @Test
    fun `whole numbers lose their decimal tail`() {
        assertEquals("2", PantryItem.formatQuantity(2.0))
        assertEquals("0", PantryItem.formatQuantity(0.0))
        assertEquals("1.5", PantryItem.formatQuantity(1.5))
        assertEquals("0.25", PantryItem.formatQuantity(0.25))
    }

    @Test
    fun `expiry is measured against a given day`() {
        val today = LocalDate.of(2026, 1, 10)
        val soon = item(1.0, expires = LocalDate.of(2026, 1, 12))
        val gone = item(1.0, expires = LocalDate.of(2026, 1, 1))

        assertEquals(2L, soon.daysUntilExpiry(today))
        assertTrue(soon.expiresWithin(7, today))
        assertFalse(soon.isExpired(today))
        assertTrue(gone.isExpired(today))
        assertFalse(gone.expiresWithin(7, today))
    }

    @Test
    fun `an item with no override steps by its unit`() {
        assertEquals(MeasureUnit.KILOGRAMS.step, item(quantity = 1.0).effectiveStep, 0.0001)
    }

    @Test
    fun `an override wins over the unit default`() {
        assertEquals(0.25, item(quantity = 1.0, step = 0.25).effectiveStep, 0.0001)
    }

    @Test
    fun `a zero or negative override falls back to the unit`() {
        val unitStep = MeasureUnit.KILOGRAMS.step
        assertEquals(unitStep, item(quantity = 1.0, step = 0.0).effectiveStep, 0.0001)
        assertEquals(unitStep, item(quantity = 1.0, step = -2.0).effectiveStep, 0.0001)
    }

    @Test
    fun `items without a date never expire`() {
        val undated = item(1.0)
        assertEquals(null, undated.daysUntilExpiry(LocalDate.of(2026, 1, 10)))
        assertFalse(undated.isExpired())
        assertFalse(undated.expiresWithin(30))
    }
}
