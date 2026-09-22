package com.kitchen.pantry.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.roundToLong

/** One thing in the kitchen: a bag of flour, a jar of cumin, a carton of eggs. */
@Entity(tableName = "pantry_items")
data class PantryItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val category: Category = Category.OTHER,
    val quantity: Double = 0.0,
    val unit: MeasureUnit = MeasureUnit.PIECES,
    /** Restock at or below this quantity. Zero means "only tell me when it runs out". */
    @ColumnInfo(name = "low_threshold") val lowThreshold: Double = 0.0,
    /** Where it lives: "pantry", "spice drawer", "chest freezer". */
    val location: String = "",
    /** Expiry or best-before date as an epoch day, or null when it doesn't expire. */
    @ColumnInfo(name = "expires_on") val expiresOn: Long? = null,
    /**
     * How much one tap of +/- moves the quantity. Zero means "whatever suits the
     * unit", so an item follows [MeasureUnit.step] until someone overrides it.
     */
    @ColumnInfo(name = "step") val step: Double = 0.0,
    val notes: String = "",
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
) {
    val expirationDate: LocalDate? get() = expiresOn?.let(LocalDate::ofEpochDay)

    val status: StockStatus
        get() = when {
            quantity <= 0.0 -> StockStatus.OUT
            quantity <= lowThreshold -> StockStatus.LOW
            else -> StockStatus.OK
        }

    /** The amount the +/- buttons actually move, override or unit default. */
    val effectiveStep: Double get() = if (step > 0.0) step else unit.step

    /** Quantity rendered without a trailing ".0" on whole numbers. */
    val quantityLabel: String get() = formatQuantity(quantity)

    /** Days until expiry: negative when already expired, null when there is no date. */
    fun daysUntilExpiry(today: LocalDate = LocalDate.now()): Long? =
        expirationDate?.let { ChronoUnit.DAYS.between(today, it) }

    fun isExpired(today: LocalDate = LocalDate.now()): Boolean =
        daysUntilExpiry(today)?.let { it < 0 } == true

    fun expiresWithin(days: Long, today: LocalDate = LocalDate.now()): Boolean =
        daysUntilExpiry(today)?.let { it in 0..days } == true

    companion object {
        fun formatQuantity(value: Double): String {
            val rounded = (value * 100).roundToLong() / 100.0
            return if (abs(rounded - rounded.roundToLong()) < 0.001) {
                rounded.roundToLong().toString()
            } else {
                rounded.toString()
            }
        }
    }
}
