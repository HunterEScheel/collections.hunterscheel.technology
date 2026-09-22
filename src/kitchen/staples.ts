import type { KitchenItem } from './types';

/** A staple as it is seeded: the columns the server fills in are added on insert. */
export type StapleSeed = Omit<KitchenItem, 'id' | 'user_id' | 'updated_at'>;

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
    dry('All-purpose flour', 'BAKING', 2000, 500, 100),
    dry('Granulated sugar', 'BAKING', 1000, 250, 100),
    dry('Brown sugar', 'BAKING', 500, 200, 50),
    dry('Baking powder', 'BAKING', 200, 50, 10),
    dry('Baking soda', 'BAKING', 450, 100, 25),
    dry('Active dry yeast', 'BAKING', 21, 14, 7),
    dry('Cocoa powder', 'BAKING', 250, 100, 25),
    wet('Vanilla extract', 'BAKING', 4, 1, 0.5),

    // Grains and pasta.
    dry('Long-grain rice', 'GRAINS', 2000, 500, 100),
    dry('Rolled oats', 'GRAINS', 1000, 300, 50),
    dry('Spaghetti', 'GRAINS', 1000, 500, 100),
    dry('Quinoa', 'GRAINS', 500, 200, 50),
    dry('Dried lentils', 'GRAINS', 500, 200, 50),

    // Spices, in the small amounts a jar actually holds.
    dry('Salt', 'SPICES', 750, 150, 50),
    dry('Black peppercorns', 'SPICES', 50, 15, 5),
    dry('Ground cumin', 'SPICES', 45, 15, 5),
    dry('Smoked paprika', 'SPICES', 45, 15, 5),
    dry('Cinnamon', 'SPICES', 45, 15, 5),
    dry('Chili flakes', 'SPICES', 40, 10, 5),
    dry('Dried oregano', 'SPICES', 25, 10, 5),
    dry('Bay leaves', 'SPICES', 10, 5, 2),
    dry('Garlic powder', 'SPICES', 60, 15, 5),

    // Oils and vinegars.
    wet('Olive oil', 'OILS', 34, 8, 2),
    wet('Neutral cooking oil', 'OILS', 32, 8, 2),
    wet('White vinegar', 'OILS', 32, 8, 2),

    // Canned goods, at the sizes the tins are sold in.
    wet('Canned tomatoes', 'CANNED', 58, 29, 14.5),
    wet('Chickpeas', 'CANNED', 46.5, 31, 15.5),
    wet('Coconut milk', 'CANNED', 27, 13.5, 13.5),

    // Sauces and spreads.
    wet('Soy sauce', 'SAUCES', 15, 5, 1),
    wet('Honey', 'SAUCES', 12, 4, 1),
    wet('Peanut butter', 'SAUCES', 16, 6, 2),
  ];
}

/** Anything dry: weighed in grams. */
function dry(
  name: string,
  category: string,
  quantity: number,
  lowThreshold: number,
  step: number,
): StapleSeed {
  return staple(name, category, quantity, 'GRAMS', lowThreshold, step);
}

/** Anything canned or liquid: measured in ounces. */
function wet(
  name: string,
  category: string,
  quantity: number,
  lowThreshold: number,
  step: number,
): StapleSeed {
  return staple(name, category, quantity, 'OUNCES', lowThreshold, step);
}

function staple(
  name: string,
  category: string,
  quantity: number,
  unit: string,
  low_threshold: number,
  step: number,
): StapleSeed {
  return {
    name,
    category,
    quantity,
    unit,
    low_threshold,
    step,
    expires_on: null,
    notes: '',
  };
}
