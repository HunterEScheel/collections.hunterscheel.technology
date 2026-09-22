package com.kitchen.pantry.data

/**
 * How a quantity is counted. [abbreviation] is what shows up next to the number in
 * the list; [step] is how much one tap of +/- moves the quantity.
 */
enum class MeasureUnit(val abbreviation: String, val step: Double) {
    GRAMS("g", 50.0),
    KILOGRAMS("kg", 0.5),
    OUNCES("oz", 1.0),
    POUNDS("lb", 0.5),
    MILLILITERS("ml", 50.0),
    LITERS("L", 0.5),
    CUPS("cups", 0.5),
    TABLESPOONS("tbsp", 1.0),
    TEASPOONS("tsp", 1.0),
    PIECES("pcs", 1.0),
    PACKAGES("pkg", 1.0),
    CANS("cans", 1.0),
    JARS("jars", 1.0),
    BAGS("bags", 1.0),
    BOXES("boxes", 1.0),
    BOTTLES("bottles", 1.0),
    ;

    companion object {
        fun fromName(name: String): MeasureUnit = entries.firstOrNull { it.name == name } ?: PIECES
    }
}
