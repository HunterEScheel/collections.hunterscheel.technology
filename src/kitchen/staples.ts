import type { KitchenItem } from './types';

/** A staple as it is seeded: the columns the server fills in are added on insert. */
export type StapleSeed = Omit<KitchenItem, 'id' | 'user_id' | 'updated_at' | 'deleted_at'>;

/**
 * A reasonable starting point so a new kitchen is not an empty list. Offered from the
 * empty state; never inserted behind anyone's back.
 *
 * Two units, by kind rather than by shelf: anything dry is weighed in grams, anything
 * canned or liquid is in ounces. Counting jars tells you nothing about how much is
 * actually left, and a kitchen that measures the same way throughout is one where a
 * recipe's 200 g of flour can be checked against the bag without conversion in your
 * head.
 *
 * Quantities are a full container of each at the sizes things are sold in, so a
 * freshly shopped kitchen reads true.
 */
export function starterPantry(): StapleSeed[] {
  return [
    // Baking — dry goods by weight, vanilla is a liquid.
    dry('All-purpose flour', 'BAKING', 2000, 500, 100, 'Pantry'),
    dry('Granulated sugar', 'BAKING', 1000, 250, 100, 'Pantry'),
    dry('Brown sugar', 'BAKING', 500, 200, 50, 'Pantry'),
    dry('Baking powder', 'BAKING', 200, 50, 10, 'Pantry'),
    dry('Baking soda', 'BAKING', 450, 100, 25, 'Pantry'),
    dry('Active dry yeast', 'BAKING', 21, 14, 7, 'Fridge door'),
    dry('Cocoa powder', 'BAKING', 250, 100, 25, 'Pantry'),
    wet('Vanilla extract', 'BAKING', 4, 1, 0.5, 'Pantry'),

    // Grains and pasta.
    dry('Long-grain rice', 'GRAINS', 2000, 500, 100, 'Pantry'),
    dry('Rolled oats', 'GRAINS', 1000, 300, 50, 'Pantry'),
    dry('Spaghetti', 'GRAINS', 1000, 500, 100, 'Pantry'),
    dry('Quinoa', 'GRAINS', 500, 200, 50, 'Pantry'),
    dry('Dried lentils', 'GRAINS', 500, 200, 50, 'Pantry'),

    // Spices, in the small amounts a jar actually holds.
    dry('Salt', 'SPICES', 750, 150, 50, 'Spice drawer'),
    dry('Black peppercorns', 'SPICES', 50, 15, 5, 'Spice drawer'),
    dry('Ground cumin', 'SPICES', 45, 15, 5, 'Spice drawer'),
    dry('Smoked paprika', 'SPICES', 45, 15, 5, 'Spice drawer'),
    dry('Cinnamon', 'SPICES', 45, 15, 5, 'Spice drawer'),
    dry('Chili flakes', 'SPICES', 40, 10, 5, 'Spice drawer'),
    dry('Dried oregano', 'SPICES', 25, 10, 5, 'Spice drawer'),
    dry('Bay leaves', 'SPICES', 10, 5, 2, 'Spice drawer'),
    dry('Garlic powder', 'SPICES', 60, 15, 5, 'Spice drawer'),

    // Oils and vinegars.
    wet('Olive oil', 'OILS', 34, 8, 2, 'Pantry'),
    wet('Neutral cooking oil', 'OILS', 32, 8, 2, 'Pantry'),
    wet('White vinegar', 'OILS', 32, 8, 2, 'Pantry'),

    // Canned goods, at the sizes the tins are sold in.
    wet('Canned tomatoes', 'CANNED', 58, 29, 14.5, 'Pantry'),
    wet('Chickpeas', 'CANNED', 46.5, 31, 15.5, 'Pantry'),
    wet('Coconut milk', 'CANNED', 27, 13.5, 13.5, 'Pantry'),

    // Sauces and spreads.
    wet('Soy sauce', 'SAUCES', 15, 5, 1, 'Pantry'),
    wet('Honey', 'SAUCES', 12, 4, 1, 'Pantry'),
    wet('Peanut butter', 'SAUCES', 16, 6, 2, 'Pantry'),
  ];
}

/** Anything dry: weighed in grams. */
function dry(
  name: string,
  category: string,
  quantity: number,
  lowThreshold: number,
  step: number,
  location: string,
): StapleSeed {
  return staple(name, category, quantity, 'GRAMS', lowThreshold, step, location);
}

/** Anything canned or liquid: measured in ounces. */
function wet(
  name: string,
  category: string,
  quantity: number,
  lowThreshold: number,
  step: number,
  location: string,
): StapleSeed {
  return staple(name, category, quantity, 'OUNCES', lowThreshold, step, location);
}

function staple(
  name: string,
  category: string,
  quantity: number,
  unit: string,
  low_threshold: number,
  step: number,
  location: string,
): StapleSeed {
  return {
    name,
    category,
    quantity,
    unit,
    low_threshold,
    step,
    location,
    expires_on: null,
    notes: '',
  };
}
