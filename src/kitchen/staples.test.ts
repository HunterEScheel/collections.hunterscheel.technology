import { describe, expect, it } from 'vitest';
import { starterPantry } from './staples';
import { unitDimension } from './pantry';

describe('the starter pantry', () => {
  const staples = starterPantry();

  it('is usable as-is', () => {
    expect(staples.length).toBeGreaterThan(20);
    expect(staples.every((s) => s.name.trim())).toBe(true);
    expect(new Set(staples.map((s) => s.name)).size).toBe(staples.length);
  });

  it('weighs everything in grams or measures it in ounces', () => {
    expect(new Set(staples.map((s) => s.unit))).toEqual(new Set(['GRAMS', 'OUNCES']));
  });

  it('never counts by the container', () => {
    expect(staples.some((s) => unitDimension(s.unit) === 'count')).toBe(false);
  });

  it('keeps dry goods in grams', () => {
    for (const name of [
      'All-purpose flour', 'Granulated sugar', 'Brown sugar', 'Baking powder',
      'Baking soda', 'Active dry yeast', 'Cocoa powder', 'Long-grain rice',
      'Rolled oats', 'Spaghetti', 'Quinoa', 'Dried lentils',
    ]) {
      expect(staples.find((s) => s.name === name)?.unit, name).toBe('GRAMS');
    }
  });

  it('keeps every spice in grams', () => {
    for (const spice of staples.filter((s) => s.category === 'SPICES')) {
      expect(spice.unit, spice.name).toBe('GRAMS');
    }
  });

  it('keeps canned goods in ounces', () => {
    for (const tin of staples.filter((s) => s.category === 'CANNED')) {
      expect(tin.unit, tin.name).toBe('OUNCES');
    }
  });

  it('keeps liquids and spreads in ounces', () => {
    for (const name of [
      'Vanilla extract', 'Olive oil', 'Neutral cooking oil', 'White vinegar',
      'Soy sauce', 'Honey', 'Peanut butter',
    ]) {
      expect(staples.find((s) => s.name === name)?.unit, name).toBe('OUNCES');
    }
  });

  it('starts everything stocked and above its restock level', () => {
    for (const staple of staples) {
      expect(staple.quantity, staple.name).toBeGreaterThan(0);
      expect(staple.quantity, staple.name).toBeGreaterThan(staple.low_threshold);
    }
  });

  it('sizes the step to the item rather than the unit', () => {
    // A 45 g jar of cumin must not move in the 50 g default step of grams.
    for (const staple of staples) {
      expect(staple.step, staple.name).toBeGreaterThan(0);
      expect(staple.step, staple.name).toBeLessThanOrEqual(staple.quantity);
    }
    expect(staples.find((s) => s.name === 'Ground cumin')?.step).toBe(5);
    expect(staples.find((s) => s.name === 'All-purpose flour')?.step).toBe(100);
  });
});
