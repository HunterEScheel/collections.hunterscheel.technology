/**
 * The kitchen half of the collection, as `public.kitchen_items` stores it.
 *
 * The names mirror the columns exactly rather than being prettied up, so what you
 * read here is what is in the table.
 */
export interface KitchenItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  low_threshold: number;
  step: number;
  location: string;
  /** Epoch day, or null when it doesn't expire. */
  expires_on: number | null;
  notes: string;
  updated_at: string;
  deleted_at: string | null;
}

/** How urgently an item needs restocking — the same three states as the phone. */
export type StockStatus = 'out' | 'low' | 'ok';

export interface KitchenFilters {
  query: string;
  category: string | null;
  restockOnly: boolean;
  sort: KitchenSort;
}

export type KitchenSort = 'name' | 'category' | 'expiry' | 'recent';

export const EMPTY_KITCHEN_FILTERS: KitchenFilters = {
  query: '',
  category: null,
  restockOnly: false,
  sort: 'name',
};

/** One line of a recipe, as it is stored inside the recipe's `ingredients` jsonb. */
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

/** A recipe, as `public.kitchen_recipes` stores it. */
export interface KitchenRecipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  notes: string;
  /** On the shopping plan: what it needs and you lack joins the shopping list. */
  planned: boolean;
  ingredients: RecipeIngredient[];
  updated_at: string;
  deleted_at: string | null;
}
