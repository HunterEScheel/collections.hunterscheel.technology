package com.kitchen.pantry.data

/**
 * The shelf an item lives on. Stored in the database by [name], so entries may be
 * added freely but existing names must not be renamed without a migration.
 */
enum class Category(val label: String, val emoji: String) {
    BAKING("Baking", "🧁"),
    GRAINS("Grains & Pasta", "🌾"),
    SPICES("Spices & Herbs", "🌿"),
    OILS("Oils & Vinegars", "🫒"),
    CANNED("Canned & Jarred", "🥫"),
    SAUCES("Sauces & Condiments", "🧂"),
    PRODUCE("Produce", "🥕"),
    DAIRY("Dairy & Eggs", "🧀"),
    MEAT("Meat & Seafood", "🍗"),
    FROZEN("Frozen", "❄️"),
    SNACKS("Snacks", "🍪"),
    DRINKS("Drinks", "☕"),
    OTHER("Other", "📦"),
    ;

    companion object {
        fun fromName(name: String): Category = entries.firstOrNull { it.name == name } ?: OTHER
    }
}
