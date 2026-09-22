package com.kitchen.pantry.data

/** How urgently an item needs restocking. */
enum class StockStatus {
    OUT,
    LOW,
    OK,
    ;

    /** True when the item belongs on the shopping list. */
    val needsRestock: Boolean get() = this != OK
}
