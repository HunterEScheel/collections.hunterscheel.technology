package com.kitchen.pantry.data

/** What a unit actually measures. Only units of the same kind can be compared. */
enum class Dimension { MASS, VOLUME, COUNT }

/**
 * How a quantity is counted. [abbreviation] is what shows up next to the number in
 * the list; [step] is how much one tap of +/- moves the quantity; [inBaseUnits] is
 * the size of one unit in its dimension's base (grams, millilitres, or one thing).
 */
enum class MeasureUnit(
    val abbreviation: String,
    val step: Double,
    val dimension: Dimension,
    val inBaseUnits: Double,
) {
    GRAMS("g", 50.0, Dimension.MASS, 1.0),
    KILOGRAMS("kg", 0.5, Dimension.MASS, 1000.0),
    OUNCES("oz", 1.0, Dimension.MASS, 28.349523125),
    POUNDS("lb", 0.5, Dimension.MASS, 453.59237),
    MILLILITERS("ml", 50.0, Dimension.VOLUME, 1.0),
    LITERS("L", 0.5, Dimension.VOLUME, 1000.0),
    CUPS("cups", 0.5, Dimension.VOLUME, 236.5882365),
    TABLESPOONS("tbsp", 1.0, Dimension.VOLUME, 14.78676478125),
    TEASPOONS("tsp", 1.0, Dimension.VOLUME, 4.92892159375),
    PIECES("pcs", 1.0, Dimension.COUNT, 1.0),
    PACKAGES("pkg", 1.0, Dimension.COUNT, 1.0),
    CANS("cans", 1.0, Dimension.COUNT, 1.0),
    JARS("jars", 1.0, Dimension.COUNT, 1.0),
    BAGS("bags", 1.0, Dimension.COUNT, 1.0),
    BOXES("boxes", 1.0, Dimension.COUNT, 1.0),
    BOTTLES("bottles", 1.0, Dimension.COUNT, 1.0),
    ;

    /**
     * [amount] of this unit expressed in [target], or null when the two cannot be
     * compared: different dimensions, or two different kinds of container — a jar
     * of honey is not a bottle of honey, and guessing would be worse than admitting
     * we don't know.
     */
    fun convert(amount: Double, target: MeasureUnit): Double? = when {
        this == target -> amount
        dimension != target.dimension -> null
        dimension == Dimension.COUNT -> null
        else -> amount * inBaseUnits / target.inBaseUnits
    }

    companion object {
        fun fromName(name: String): MeasureUnit = entries.firstOrNull { it.name == name } ?: PIECES
    }
}
