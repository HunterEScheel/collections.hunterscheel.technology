package com.kitchen.pantry.data

/**
 * A reasonable starting point so the app is not an empty list on first launch.
 * Offered from the empty state; never inserted behind the user's back.
 */
fun starterPantry(): List<PantryItem> = listOf(
    staple("All-purpose flour", Category.BAKING, 2.0, MeasureUnit.KILOGRAMS, 0.5, "Pantry"),
    staple("Granulated sugar", Category.BAKING, 1.0, MeasureUnit.KILOGRAMS, 0.25, "Pantry"),
    staple("Brown sugar", Category.BAKING, 500.0, MeasureUnit.GRAMS, 200.0, "Pantry"),
    staple("Baking powder", Category.BAKING, 1.0, MeasureUnit.JARS, 1.0, "Pantry"),
    staple("Baking soda", Category.BAKING, 1.0, MeasureUnit.BOXES, 1.0, "Pantry"),
    staple("Vanilla extract", Category.BAKING, 1.0, MeasureUnit.BOTTLES, 1.0, "Pantry"),
    staple("Active dry yeast", Category.BAKING, 3.0, MeasureUnit.PACKAGES, 2.0, "Fridge door"),
    staple("Cocoa powder", Category.BAKING, 250.0, MeasureUnit.GRAMS, 100.0, "Pantry"),

    staple("Long-grain rice", Category.GRAINS, 2.0, MeasureUnit.KILOGRAMS, 0.5, "Pantry"),
    staple("Rolled oats", Category.GRAINS, 1.0, MeasureUnit.KILOGRAMS, 0.3, "Pantry"),
    staple("Spaghetti", Category.GRAINS, 2.0, MeasureUnit.PACKAGES, 1.0, "Pantry"),
    staple("Quinoa", Category.GRAINS, 500.0, MeasureUnit.GRAMS, 200.0, "Pantry"),
    staple("Dried lentils", Category.GRAINS, 500.0, MeasureUnit.GRAMS, 200.0, "Pantry"),

    staple("Salt", Category.SPICES, 1.0, MeasureUnit.BOXES, 1.0, "Spice drawer"),
    staple("Black peppercorns", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),
    staple("Ground cumin", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),
    staple("Smoked paprika", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),
    staple("Cinnamon", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),
    staple("Chili flakes", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),
    staple("Dried oregano", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),
    staple("Bay leaves", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),
    staple("Garlic powder", Category.SPICES, 1.0, MeasureUnit.JARS, 1.0, "Spice drawer"),

    staple("Olive oil", Category.OILS, 1.0, MeasureUnit.BOTTLES, 1.0, "Pantry"),
    staple("Neutral cooking oil", Category.OILS, 1.0, MeasureUnit.BOTTLES, 1.0, "Pantry"),
    staple("White vinegar", Category.OILS, 1.0, MeasureUnit.BOTTLES, 1.0, "Pantry"),

    staple("Canned tomatoes", Category.CANNED, 4.0, MeasureUnit.CANS, 2.0, "Pantry"),
    staple("Chickpeas", Category.CANNED, 3.0, MeasureUnit.CANS, 2.0, "Pantry"),
    staple("Coconut milk", Category.CANNED, 2.0, MeasureUnit.CANS, 1.0, "Pantry"),

    staple("Soy sauce", Category.SAUCES, 1.0, MeasureUnit.BOTTLES, 1.0, "Pantry"),
    staple("Honey", Category.SAUCES, 1.0, MeasureUnit.JARS, 1.0, "Pantry"),
    staple("Peanut butter", Category.SAUCES, 1.0, MeasureUnit.JARS, 1.0, "Pantry"),
)

private fun staple(
    name: String,
    category: Category,
    quantity: Double,
    unit: MeasureUnit,
    lowThreshold: Double,
    location: String,
) = PantryItem(
    name = name,
    category = category,
    quantity = quantity,
    unit = unit,
    lowThreshold = lowThreshold,
    location = location,
)
