package com.kitchen.pantry.data

/** How the pantry list is ordered. */
enum class SortOrder(val label: String) {
    NAME("Name"),
    CATEGORY("Category"),
    EXPIRY("Expires soonest"),
    RECENT("Recently updated"),
    ;

    companion object {
        fun fromName(name: String): SortOrder = entries.firstOrNull { it.name == name } ?: NAME
    }
}

/** The current view of the pantry: what the user typed, tapped and toggled. */
data class PantryFilter(
    val query: String = "",
    val category: Category? = null,
    val restockOnly: Boolean = false,
    val sortOrder: SortOrder = SortOrder.NAME,
) {
    val isActive: Boolean
        get() = query.isNotBlank() || category != null || restockOnly
}

/**
 * Filtering and sorting live here rather than in SQL so the rules stay in one
 * readable place — a home pantry is a few hundred rows at most.
 */
fun List<PantryItem>.applyFilter(filter: PantryFilter): List<PantryItem> {
    val needle = filter.query.trim()
    val matched = filter {
        (filter.category == null || it.category == filter.category) &&
            (!filter.restockOnly || it.status.needsRestock) &&
            (needle.isEmpty() || it.matches(needle))
    }
    return when (filter.sortOrder) {
        SortOrder.NAME -> matched.sortedBy { it.name.lowercase() }
        SortOrder.CATEGORY -> matched.sortedWith(
            compareBy({ it.category.ordinal }, { it.name.lowercase() }),
        )
        // Items without a date sort last; among dated items, soonest first.
        SortOrder.EXPIRY -> matched.sortedWith(
            compareBy({ it.expiresOn ?: Long.MAX_VALUE }, { it.name.lowercase() }),
        )
        SortOrder.RECENT -> matched.sortedByDescending { it.updatedAt }
    }
}

private fun PantryItem.matches(needle: String): Boolean =
    name.contains(needle, ignoreCase = true) ||
        location.contains(needle, ignoreCase = true) ||
        notes.contains(needle, ignoreCase = true) ||
        category.label.contains(needle, ignoreCase = true)
