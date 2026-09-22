import { describe, expect, it } from 'vitest';
import { convert } from './pantry';
import {
  amountToBuy,
  checkIngredient,
  checkRecipe,
  readiness,
  recipeShoppingNeeds,
} from './recipes';
import type { KitchenItem, KitchenRecipe, RecipeIngredient } from './types';

function pantry(name: string, quantity: number, unit: string): KitchenItem {
  return {
    id: name,
    user_id: 'user',
    name,
    category: 'OTHER',
    quantity,
    unit,
    low_threshold: 0,
    step: 0,
    expires_on: null,
    notes: '',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  };
}

function line(name: string, quantity: number, unit: string): RecipeIngredient {
  return { name, quantity, unit };
}

function recipe(name: string, ingredients: RecipeIngredient[]): KitchenRecipe {
  return {
    id: name,
    user_id: 'user',
    name,
    servings: 2,
    notes: '',
    planned: true,
    ingredients,
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  };
}

describe('unit conversion', () => {
  it('converts mass within its own dimension', () => {
    expect(convert(1, 'KILOGRAMS', 'GRAMS')).toBeCloseTo(1000);
    expect(convert(500, 'GRAMS', 'KILOGRAMS')).toBeCloseTo(0.5);
    expect(convert(1, 'POUNDS', 'GRAMS')).toBeCloseTo(453.59237);
  });

  it('converts volume within its own dimension', () => {
    expect(convert(1, 'LITERS', 'MILLILITERS')).toBeCloseTo(1000);
    expect(convert(1, 'TABLESPOONS', 'TEASPOONS')).toBeCloseTo(3);
    expect(convert(1, 'TEASPOONS', 'TABLESPOONS')).toBeCloseTo(1 / 3);
  });

  it('refuses to cross dimensions', () => {
    expect(convert(100, 'GRAMS', 'MILLILITERS')).toBeNull();
  });

  it('treats one container as unlike another', () => {
    expect(convert(2, 'JARS', 'BOTTLES')).toBeNull();
    expect(convert(2, 'JARS', 'JARS')).toBe(2);
  });
});

describe('one ingredient against the pantry', () => {
  it('is missing when the pantry never heard of it', () => {
    const check = checkIngredient(line('Saffron', 1, 'GRAMS'), []);
    expect(check.availability).toBe('missing');
    expect(amountToBuy(check)).toBe(1);
  });

  it('is missing when you have run out', () => {
    const check = checkIngredient(line('Flour', 200, 'GRAMS'), [pantry('Flour', 0, 'KILOGRAMS')]);
    expect(check.availability).toBe('missing');
    expect(amountToBuy(check)).toBe(200);
  });

  it('is covered when a kilo bag answers a 200 g line', () => {
    const check = checkIngredient(line('Flour', 200, 'GRAMS'), [pantry('Flour', 1, 'KILOGRAMS')]);
    expect(check.availability).toBe('have');
    expect(amountToBuy(check)).toBe(0);
  });

  it('reports the shortfall in the recipe unit', () => {
    const check = checkIngredient(line('Flour', 500, 'GRAMS'), [pantry('Flour', 0.2, 'KILOGRAMS')]);
    expect(check.availability).toBe('short');
    expect(check.shortfall).toBeCloseTo(300);
    expect(amountToBuy(check)).toBeCloseTo(300);
  });

  it('flags incomparable units instead of guessing', () => {
    const check = checkIngredient(line('Honey', 100, 'MILLILITERS'), [pantry('Honey', 2, 'JARS')]);
    expect(check.availability).toBe('unknown');
    expect(amountToBuy(check)).toBe(0);
  });

  it('matches names ignoring case and surrounding space', () => {
    const check = checkIngredient(line('  olive OIL ', 1, 'TABLESPOONS'), [
      pantry('Olive oil', 1, 'LITERS'),
    ]);
    expect(check.availability).toBe('have');
  });

  it('is not short of itself', () => {
    const check = checkIngredient(line('Rice', 1, 'KILOGRAMS'), [pantry('Rice', 1000, 'GRAMS')]);
    expect(check.availability).toBe('have');
  });
});

describe('a whole recipe', () => {
  it('counts each kind of line', () => {
    const kitchen = [
      pantry('Flour', 1, 'KILOGRAMS'),
      pantry('Butter', 50, 'GRAMS'),
      pantry('Honey', 1, 'JARS'),
    ];
    const result = readiness(
      checkRecipe(
        recipe('Scones', [
          line('Flour', 300, 'GRAMS'),
          line('Butter', 100, 'GRAMS'),
          line('Honey', 30, 'MILLILITERS'),
          line('Buttermilk', 200, 'MILLILITERS'),
        ]),
        kitchen,
      ),
    );

    expect(result).toMatchObject({
      total: 4,
      have: 1,
      short: 1,
      missing: 1,
      unknown: 1,
      toBuy: 2,
      canCookNow: false,
    });
  });

  it('knows when you can cook now', () => {
    const result = readiness(
      checkRecipe(recipe('Toast', [line('Bread', 2, 'PIECES')]), [pantry('Bread', 6, 'PIECES')]),
    );
    expect(result.canCookNow).toBe(true);
    expect(result.toBuy).toBe(0);
  });

  it('an empty recipe cannot be cooked', () => {
    expect(readiness([]).canCookNow).toBe(false);
  });
});

describe('the shopping list', () => {
  it('only covers what is missing or short', () => {
    const needs = recipeShoppingNeeds(
      [recipe('Pancakes', [line('Flour', 300, 'GRAMS'), line('Eggs', 3, 'PIECES')])],
      [pantry('Flour', 1, 'KILOGRAMS')],
    );
    expect(needs).toHaveLength(1);
    expect(needs[0]).toMatchObject({ name: 'Eggs', amount: 3, partial: false });
  });

  it('sums the same ingredient across recipes', () => {
    const needs = recipeShoppingNeeds(
      [
        recipe('Pancakes', [line('Eggs', 3, 'PIECES')]),
        recipe('Custard', [line('eggs', 4, 'PIECES')]),
      ],
      [],
    );
    expect(needs).toHaveLength(1);
    expect(needs[0].amount).toBe(7);
    expect(needs[0].recipes).toEqual(['Pancakes', 'Custard']);
  });

  it('keeps amounts that cannot be added on their own lines', () => {
    const needs = recipeShoppingNeeds(
      [recipe('Soup', [line('Stock', 500, 'MILLILITERS'), line('Stock', 2, 'CANS')])],
      [],
    );
    expect(needs).toHaveLength(2);
  });

  it('says when a need is only a top-up', () => {
    const needs = recipeShoppingNeeds(
      [recipe('Bread', [line('Flour', 500, 'GRAMS')])],
      [pantry('Flour', 200, 'GRAMS')],
    );
    expect(needs).toHaveLength(1);
    expect(needs[0].amount).toBeCloseTo(300);
    expect(needs[0].partial).toBe(true);
  });

  it('needs nothing from an empty plan', () => {
    expect(recipeShoppingNeeds([], [])).toEqual([]);
  });
});
