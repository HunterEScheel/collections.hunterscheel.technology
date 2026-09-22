import { convert, formatQuantity } from './pantry';
import type { KitchenItem, KitchenRecipe, RecipeIngredient } from './types';

/**
 * Whether the kitchen can cover one line of a recipe. The same four verdicts the
 * Android app reaches, from the same rules — the two clients must not disagree
 * about whether you can cook something.
 */
export type Availability = 'have' | 'short' | 'missing' | 'unknown';

export interface IngredientCheck {
  ingredient: RecipeIngredient;
  pantryItem: KitchenItem | null;
  availability: Availability;
  /** How much more is needed, in the ingredient's own unit. Zero unless short. */
  shortfall: number;
}

export function needsBuying(availability: Availability): boolean {
  return availability === 'short' || availability === 'missing';
}

/** What to buy for one line, in the ingredient's unit. */
export function amountToBuy(check: IngredientCheck): number {
  if (check.availability === 'missing') return check.ingredient.quantity;
  if (check.availability === 'short') return check.shortfall;
  return 0;
}

/** Pantry lookup key: names match ignoring case and surrounding space. */
export function pantryKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Rounding slack, so 0.9999 cups of flour is not "short" of 1 cup. */
const TOLERANCE = 1e-6;

export function checkIngredient(
  ingredient: RecipeIngredient,
  pantry: KitchenItem[],
): IngredientCheck {
  const match =
    pantry.find((item) => pantryKey(item.name) === pantryKey(ingredient.name)) ?? null;

  if (!match) return { ingredient, pantryItem: null, availability: 'missing', shortfall: 0 };
  if (match.quantity <= 0) {
    return { ingredient, pantryItem: match, availability: 'missing', shortfall: 0 };
  }

  const onHand = convert(match.quantity, match.unit, ingredient.unit);
  if (onHand === null) {
    return { ingredient, pantryItem: match, availability: 'unknown', shortfall: 0 };
  }

  if (onHand + TOLERANCE >= ingredient.quantity) {
    return { ingredient, pantryItem: match, availability: 'have', shortfall: 0 };
  }
  return {
    ingredient,
    pantryItem: match,
    availability: 'short',
    shortfall: ingredient.quantity - onHand,
  };
}

export function checkRecipe(recipe: KitchenRecipe, pantry: KitchenItem[]): IngredientCheck[] {
  return recipe.ingredients.map((ingredient) => checkIngredient(ingredient, pantry));
}

export interface RecipeReadiness {
  total: number;
  have: number;
  missing: number;
  short: number;
  unknown: number;
  canCookNow: boolean;
  toBuy: number;
}

export function readiness(checks: IngredientCheck[]): RecipeReadiness {
  const count = (kind: Availability) => checks.filter((c) => c.availability === kind).length;
  const missing = count('missing');
  const short = count('short');
  return {
    total: checks.length,
    have: count('have'),
    missing,
    short,
    unknown: count('unknown'),
    canCookNow: checks.length > 0 && missing === 0 && short === 0,
    toBuy: missing + short,
  };
}

/** A shopping line that came from a recipe rather than a stock level. */
export interface RecipeNeed {
  name: string;
  amount: number;
  unit: string;
  recipes: string[];
  /** True when the item is in the pantry but there isn't enough of it. */
  partial: boolean;
}

export function needLabel(need: RecipeNeed): string {
  return `${formatQuantity(need.amount)} ${need.unit}`;
}

/**
 * Everything the planned recipes need that the kitchen can't cover, summed per
 * ingredient. Two recipes each short 100 g of butter produce one 200 g line;
 * amounts in units that can't be added together stay on separate lines.
 */
export function recipeShoppingNeeds(
  planned: KitchenRecipe[],
  pantry: KitchenItem[],
): RecipeNeed[] {
  const needs = new Map<string, RecipeNeed>();

  for (const recipe of planned) {
    for (const check of checkRecipe(recipe, pantry)) {
      if (!needsBuying(check.availability)) continue;

      const key = `${pantryKey(check.ingredient.name)}|${check.ingredient.unit}`;
      const existing = needs.get(key);
      if (!existing) {
        needs.set(key, {
          name: check.ingredient.name.trim(),
          amount: amountToBuy(check),
          unit: check.ingredient.unit,
          recipes: [recipe.name],
          partial: check.availability === 'short',
        });
      } else {
        existing.amount += amountToBuy(check);
        if (!existing.recipes.includes(recipe.name)) existing.recipes.push(recipe.name);
        existing.partial = existing.partial && check.availability === 'short';
      }
    }
  }

  return [...needs.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}
