package com.kitchen.pantry.data

import androidx.room.TypeConverter

/** Room stores the enums as their [Enum.name], falling back to a safe default on unknown values. */
class Converters {
    @TypeConverter
    fun categoryToString(category: Category): String = category.name

    @TypeConverter
    fun stringToCategory(value: String): Category = Category.fromName(value)

    @TypeConverter
    fun unitToString(unit: MeasureUnit): String = unit.name

    @TypeConverter
    fun stringToUnit(value: String): MeasureUnit = MeasureUnit.fromName(value)
}
