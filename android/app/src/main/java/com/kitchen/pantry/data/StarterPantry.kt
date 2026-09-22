package com.kitchen.pantry.data

/**
 * A reasonable starting point so the app is not an empty list on first launch.
 * Offered from the empty state; never inserted behind the user's back.
 *
 * Two units, by kind rather than by shelf: anything dry is weighed in grams,
 * anything canned or liquid is in ounces. Counting jars and packets tells you
 * nothing about how much is actually left, and a kitchen that measures the same
 * way throughout is one where a recipe's 200 g of flour can be checked against
 * the bag without any conversion in your head.
 *
 * Quantities are a full container of each, so the amounts read like what you would
 * find if you had just shopped.
 */
fun starterPantry(): List<PantryItem> = listOf(
    // Baking — dry goods by weight, vanilla is a liquid.
    dry("All-purpose flour", Category.BAKING, 2000.0, 500.0, 100.0, "Pantry"),
    dry("Granulated sugar", Category.BAKING, 1000.0, 250.0, 100.0, "Pantry"),
    dry("Brown sugar", Category.BAKING, 500.0, 200.0, 50.0, "Pantry"),
    dry("Baking powder", Category.BAKING, 200.0, 50.0, 10.0, "Pantry"),
    dry("Baking soda", Category.BAKING, 450.0, 100.0, 25.0, "Pantry"),
    dry("Active dry yeast", Category.BAKING, 21.0, 14.0, 7.0, "Fridge door"),
    dry("Cocoa powder", Category.BAKING, 250.0, 100.0, 25.0, "Pantry"),
    wet("Vanilla extract", Category.BAKING, 4.0, 1.0, 0.5, "Pantry"),

    // Grains and pasta.
    dry("Long-grain rice", Category.GRAINS, 2000.0, 500.0, 100.0, "Pantry"),
    dry("Rolled oats", Category.GRAINS, 1000.0, 300.0, 50.0, "Pantry"),
    dry("Spaghetti", Category.GRAINS, 1000.0, 500.0, 100.0, "Pantry"),
    dry("Quinoa", Category.GRAINS, 500.0, 200.0, 50.0, "Pantry"),
    dry("Dried lentils", Category.GRAINS, 500.0, 200.0, 50.0, "Pantry"),

    // Spices, in the small amounts a jar actually holds.
    dry("Salt", Category.SPICES, 750.0, 150.0, 50.0, "Spice drawer"),
    dry("Black peppercorns", Category.SPICES, 50.0, 15.0, 5.0, "Spice drawer"),
    dry("Ground cumin", Category.SPICES, 45.0, 15.0, 5.0, "Spice drawer"),
    dry("Smoked paprika", Category.SPICES, 45.0, 15.0, 5.0, "Spice drawer"),
    dry("Cinnamon", Category.SPICES, 45.0, 15.0, 5.0, "Spice drawer"),
    dry("Chili flakes", Category.SPICES, 40.0, 10.0, 5.0, "Spice drawer"),
    dry("Dried oregano", Category.SPICES, 25.0, 10.0, 5.0, "Spice drawer"),
    dry("Bay leaves", Category.SPICES, 10.0, 5.0, 2.0, "Spice drawer"),
    dry("Garlic powder", Category.SPICES, 60.0, 15.0, 5.0, "Spice drawer"),

    // Oils and vinegars.
    wet("Olive oil", Category.OILS, 34.0, 8.0, 2.0, "Pantry"),
    wet("Neutral cooking oil", Category.OILS, 32.0, 8.0, 2.0, "Pantry"),
    wet("White vinegar", Category.OILS, 32.0, 8.0, 2.0, "Pantry"),

    // Canned goods, at the sizes the tins are sold in.
    wet("Canned tomatoes", Category.CANNED, 58.0, 29.0, 14.5, "Pantry"),
    wet("Chickpeas", Category.CANNED, 46.5, 31.0, 15.5, "Pantry"),
    wet("Coconut milk", Category.CANNED, 27.0, 13.5, 13.5, "Pantry"),

    // Sauces and spreads.
    wet("Soy sauce", Category.SAUCES, 15.0, 5.0, 1.0, "Pantry"),
    wet("Honey", Category.SAUCES, 12.0, 4.0, 1.0, "Pantry"),
    wet("Peanut butter", Category.SAUCES, 16.0, 6.0, 2.0, "Pantry"),
)

/** Anything dry: weighed in grams. */
private fun dry(
    name: String,
    category: Category,
    quantity: Double,
    lowThreshold: Double,
    step: Double,
    location: String,
) = staple(name, category, quantity, MeasureUnit.GRAMS, lowThreshold, step, location)

/** Anything canned or liquid: measured in ounces. */
private fun wet(
    name: String,
    category: Category,
    quantity: Double,
    lowThreshold: Double,
    step: Double,
    location: String,
) = staple(name, category, quantity, MeasureUnit.OUNCES, lowThreshold, step, location)

private fun staple(
    name: String,
    category: Category,
    quantity: Double,
    unit: MeasureUnit,
    lowThreshold: Double,
    step: Double,
    location: String,
) = PantryItem(
    name = name,
    category = category,
    quantity = quantity,
    unit = unit,
    lowThreshold = lowThreshold,
    location = location,
    step = step,
)
