package com.kitchen.pantry.data

/** Whether the kitchen can cover one line of a recipe. */
enum class Availability {
    /** Enough on hand. */
    HAVE,

    /** In the pantry, but not enough of it. */
    SHORT,

    /** Not in the pantry at all, or down to zero. */
    MISSING,

    /**
     * On hand, but in units that can't be compared — two jars of honey against a
     * recipe asking for 100 ml. Shown as "check" rather than guessed at.
     */
    UNKNOWN,
    ;

    val needsBuying: Boolean get() = this == SHORT || this == MISSING
}

/** One recipe line judged against the pantry. */
data class IngredientCheck(
    val ingredient: RecipeIngredient,
    val pantryItem: PantryItem?,
    val availability: Availability,
    /** How much more is needed, in the ingredient's own unit. Zero unless SHORT. */
    val shortfall: Double = 0.0,
) {
    /** What to buy for this line, in the ingredient's unit. */
    val amountToBuy: Double
        get() = when (availability) {
            Availability.MISSING -> ingredient.quantity
            Availability.SHORT -> shortfall
            else -> 0.0
        }
}

/** Pantry lookup key: names match ignoring case and surrounding space. */
internal fun String.pantryKey(): String = trim().lowercase()

/** Judges one recipe line against everything in the kitchen. */
fun checkIngredient(ingredient: RecipeIngredient, pantry: List<PantryItem>): IngredientCheck {
    val match = pantry.firstOrNull { it.name.pantryKey() == ingredient.name.pantryKey() }
        ?: return IngredientCheck(ingredient, null, Availability.MISSING)

    if (match.quantity <= 0.0) {
        return IngredientCheck(ingredient, match, Availability.MISSING)
    }

    val onHand = match.unit.convert(match.quantity, ingredient.unit)
        ?: return IngredientCheck(ingredient, match, Availability.UNKNOWN)

    return if (onHand + TOLERANCE >= ingredient.quantity) {
        IngredientCheck(ingredient, match, Availability.HAVE)
    } else {
        IngredientCheck(ingredient, match, Availability.SHORT, ingredient.quantity - onHand)
    }
}

fun RecipeWithIngredients.check(pantry: List<PantryItem>): List<IngredientCheck> =
    orderedIngredients.map { checkIngredient(it, pantry) }

/** How a recipe is doing overall, for the list screen. */
data class RecipeReadiness(
    val total: Int,
    val have: Int,
    val missing: Int,
    val short: Int,
    val unknown: Int,
) {
    val canCookNow: Boolean get() = total > 0 && missing == 0 && short == 0
    val toBuy: Int get() = missing + short
}

fun List<IngredientCheck>.readiness(): RecipeReadiness = RecipeReadiness(
    total = size,
    have = count { it.availability == Availability.HAVE },
    missing = count { it.availability == Availability.MISSING },
    short = count { it.availability == Availability.SHORT },
    unknown = count { it.availability == Availability.UNKNOWN },
)

/** A line on the shopping list that came from a recipe rather than a stock level. */
data class RecipeNeed(
    val name: String,
    val amount: Double,
    val unit: MeasureUnit,
    /** Which recipes asked for it, in the order they were considered. */
    val recipes: List<String>,
    /** True when the item exists in the pantry but there isn't enough of it. */
    val partial: Boolean,
) {
    val amountLabel: String get() = PantryItem.formatQuantity(amount)
}

/**
 * Everything the planned recipes need that the kitchen can't cover, summed per
 * ingredient. Two recipes each short 100 g of butter produce one 200 g line;
 * amounts in units that can't be added together stay on separate lines.
 */
fun recipeShoppingNeeds(
    plannedRecipes: List<RecipeWithIngredients>,
    pantry: List<PantryItem>,
): List<RecipeNeed> {
    val needs = LinkedHashMap<Pair<String, MeasureUnit>, RecipeNeed>()

    for (recipe in plannedRecipes) {
        for (check in recipe.check(pantry)) {
            if (!check.availability.needsBuying) continue
            val key = check.ingredient.name.pantryKey() to check.ingredient.unit
            val existing = needs[key]
            needs[key] = if (existing == null) {
                RecipeNeed(
                    name = check.ingredient.name.trim(),
                    amount = check.amountToBuy,
                    unit = check.ingredient.unit,
                    recipes = listOf(recipe.recipe.name),
                    partial = check.availability == Availability.SHORT,
                )
            } else {
                existing.copy(
                    amount = existing.amount + check.amountToBuy,
                    recipes = (existing.recipes + recipe.recipe.name).distinct(),
                    partial = existing.partial && check.availability == Availability.SHORT,
                )
            }
        }
    }

    return needs.values.sortedBy { it.name.lowercase() }
}

/** Rounding slack, so 0.9999 cups of flour is not "short" of 1 cup. */
private const val TOLERANCE = 1e-6
