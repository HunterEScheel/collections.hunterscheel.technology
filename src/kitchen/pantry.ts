import type { KitchenFilters, KitchenItem, StockStatus } from './types';

/**
 * The pantry rules, kept as pure functions — the same shape as the Kotlin ones in
 * the Android app, so the two clients agree about what "low" means.
 */

export function stockStatus(item: KitchenItem): StockStatus {
  if (item.quantity <= 0) return 'out';
  if (item.quantity <= item.low_threshold) return 'low';
  return 'ok';
}

export function needsRestock(item: KitchenItem): boolean {
  return stockStatus(item) !== 'ok';
}

/** The amount one +/- press moves, falling back to the unit's own step. */
export function effectiveStep(item: KitchenItem): number {
  return item.step > 0 ? item.step : (UNIT_STEPS[item.unit] ?? 1);
}

/** Quantities render without a trailing ".0" on whole numbers. */
export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? titleCase(category);
}

export function categoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? '📦';
}

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit.toLowerCase();
}

/** Days until the best-before date; negative once it has passed. */
export function daysUntilExpiry(item: KitchenItem, today = new Date()): number | null {
  if (item.expires_on === null) return null;
  const todayEpochDay = Math.floor(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) / 86_400_000,
  );
  return item.expires_on - todayEpochDay;
}

export function applyFilters(items: KitchenItem[], filters: KitchenFilters): KitchenItem[] {
  const needle = filters.query.trim().toLowerCase();

  const matched = items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.restockOnly && !needsRestock(item)) return false;
    if (!needle) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      item.location.toLowerCase().includes(needle) ||
      item.notes.toLowerCase().includes(needle) ||
      categoryLabel(item.category).toLowerCase().includes(needle)
    );
  });

  const byName = (a: KitchenItem, b: KitchenItem) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase());

  switch (filters.sort) {
    case 'category':
      return [...matched].sort(
        (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || byName(a, b),
      );
    case 'expiry':
      // Undated items sort last; among the dated ones, soonest first.
      return [...matched].sort(
        (a, b) =>
          (a.expires_on ?? Number.MAX_SAFE_INTEGER) - (b.expires_on ?? Number.MAX_SAFE_INTEGER) ||
          byName(a, b),
      );
    case 'recent':
      return [...matched].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    default:
      return [...matched].sort(byName);
  }
}

function categoryOrder(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** Shelf order, matching the enum the Android app stores. */
export const CATEGORY_ORDER = [
  'BAKING',
  'GRAINS',
  'SPICES',
  'OILS',
  'CANNED',
  'SAUCES',
  'PRODUCE',
  'DAIRY',
  'MEAT',
  'FROZEN',
  'SNACKS',
  'DRINKS',
  'OTHER',
];

const CATEGORY_LABELS: Record<string, string> = {
  BAKING: 'Baking',
  GRAINS: 'Grains & Pasta',
  SPICES: 'Spices & Herbs',
  OILS: 'Oils & Vinegars',
  CANNED: 'Canned & Jarred',
  SAUCES: 'Sauces & Condiments',
  PRODUCE: 'Produce',
  DAIRY: 'Dairy & Eggs',
  MEAT: 'Meat & Seafood',
  FROZEN: 'Frozen',
  SNACKS: 'Snacks',
  DRINKS: 'Drinks',
  OTHER: 'Other',
};

const CATEGORY_EMOJI: Record<string, string> = {
  BAKING: '🧁',
  GRAINS: '🌾',
  SPICES: '🌿',
  OILS: '🫒',
  CANNED: '🥫',
  SAUCES: '🧂',
  PRODUCE: '🥕',
  DAIRY: '🧀',
  MEAT: '🍗',
  FROZEN: '❄️',
  SNACKS: '🍪',
  DRINKS: '☕',
  OTHER: '📦',
};

const UNIT_LABELS: Record<string, string> = {
  GRAMS: 'g',
  KILOGRAMS: 'kg',
  OUNCES: 'oz',
  POUNDS: 'lb',
  MILLILITERS: 'ml',
  LITERS: 'L',
  CUPS: 'cups',
  TABLESPOONS: 'tbsp',
  TEASPOONS: 'tsp',
  PIECES: 'pcs',
  PACKAGES: 'pkg',
  CANS: 'cans',
  JARS: 'jars',
  BAGS: 'bags',
  BOXES: 'boxes',
  BOTTLES: 'bottles',
};

const UNIT_STEPS: Record<string, number> = {
  GRAMS: 50,
  KILOGRAMS: 0.5,
  OUNCES: 1,
  POUNDS: 0.5,
  MILLILITERS: 50,
  LITERS: 0.5,
  CUPS: 0.5,
  TABLESPOONS: 1,
  TEASPOONS: 1,
  PIECES: 1,
  PACKAGES: 1,
  CANS: 1,
  JARS: 1,
  BAGS: 1,
  BOXES: 1,
  BOTTLES: 1,
};
