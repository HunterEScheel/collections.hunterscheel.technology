import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  daysUntilExpiry,
  effectiveStep,
  formatQuantity,
  needsRestock,
  stockStatus,
} from './pantry';
import { EMPTY_KITCHEN_FILTERS, type KitchenItem } from './types';

function item(overrides: Partial<KitchenItem> = {}): KitchenItem {
  return {
    id: 'id',
    user_id: 'user',
    name: 'Flour',
    category: 'BAKING',
    quantity: 1,
    unit: 'KILOGRAMS',
    low_threshold: 0,
    step: 0,
    expires_on: null,
    notes: '',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('stock status', () => {
  it('calls an empty shelf out', () => {
    expect(stockStatus(item({ quantity: 0 }))).toBe('out');
  });

  it('counts the threshold itself as low', () => {
    expect(stockStatus(item({ quantity: 0.5, low_threshold: 0.5 }))).toBe('low');
  });

  it('leaves a stocked item alone', () => {
    expect(stockStatus(item({ quantity: 2, low_threshold: 0.5 }))).toBe('ok');
  });

  it('only flags an empty shelf when no threshold is set', () => {
    expect(stockStatus(item({ quantity: 0.1 }))).toBe('ok');
    expect(needsRestock(item({ quantity: 0.1 }))).toBe(false);
    expect(needsRestock(item({ quantity: 0 }))).toBe(true);
  });
});

describe('increments', () => {
  it('falls back to the unit default', () => {
    expect(effectiveStep(item({ unit: 'KILOGRAMS' }))).toBe(0.5);
    expect(effectiveStep(item({ unit: 'GRAMS' }))).toBe(50);
  });

  it('prefers the item override', () => {
    expect(effectiveStep(item({ unit: 'KILOGRAMS', step: 0.25 }))).toBe(0.25);
  });

  it('treats an unknown unit as one', () => {
    expect(effectiveStep(item({ unit: 'FURLONGS' }))).toBe(1);
  });
});

describe('formatting', () => {
  it('drops the decimal tail on whole numbers', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(1.5)).toBe('1.5');
    expect(formatQuantity(0.25)).toBe('0.25');
  });
});

describe('expiry', () => {
  it('counts days against a given today', () => {
    const today = new Date(Date.UTC(2026, 0, 10));
    // 2026-01-12 is epoch day 20465.
    const epochDay = Math.floor(Date.UTC(2026, 0, 12) / 86_400_000);
    expect(daysUntilExpiry(item({ expires_on: epochDay }), today)).toBe(2);
  });

  it('is null when nothing expires', () => {
    expect(daysUntilExpiry(item(), new Date())).toBeNull();
  });
});

describe('filtering', () => {
  const cumin = item({
    id: '1',
    name: 'Ground cumin',
    category: 'SPICES',
    quantity: 1,
    unit: 'JARS',
    low_threshold: 1,
    updated_at: '2026-01-01T00:00:00Z',
  });
  const flour = item({
    id: '2',
    name: 'Bread flour',
    category: 'BAKING',
    quantity: 3,
    expires_on: 20_000,
    updated_at: '2026-03-01T00:00:00Z',
  });
  const rice = item({
    id: '3',
    name: 'Arborio rice',
    category: 'GRAINS',
    quantity: 0,
    notes: 'for risotto',
    expires_on: 19_000,
    updated_at: '2026-02-01T00:00:00Z',
  });
  const all = [cumin, flour, rice];

  it('sorts by name with no filter', () => {
    expect(applyFilters(all, EMPTY_KITCHEN_FILTERS).map((i) => i.id)).toEqual(['3', '2', '1']);
  });

  it('searches name, notes and category', () => {
    const find = (query: string) =>
      applyFilters(all, { ...EMPTY_KITCHEN_FILTERS, query }).map((i) => i.id);
    expect(find('bread')).toEqual(['2']);
    expect(find('risotto')).toEqual(['3']);
    expect(find('Baking')).toEqual(['2']);
    expect(find('  CUMIN ')).toEqual(['1']);
  });

  it('keeps one shelf when a category is picked', () => {
    expect(
      applyFilters(all, { ...EMPTY_KITCHEN_FILTERS, category: 'GRAINS' }).map((i) => i.id),
    ).toEqual(['3']);
  });

  it('keeps only what needs restocking', () => {
    expect(
      applyFilters(all, { ...EMPTY_KITCHEN_FILTERS, restockOnly: true }).map((i) => i.id),
    ).toEqual(['3', '1']);
  });

  it('puts undated items last when sorting by expiry', () => {
    expect(
      applyFilters(all, { ...EMPTY_KITCHEN_FILTERS, sort: 'expiry' }).map((i) => i.id),
    ).toEqual(['3', '2', '1']);
  });

  it('sorts recent newest first', () => {
    expect(
      applyFilters(all, { ...EMPTY_KITCHEN_FILTERS, sort: 'recent' }).map((i) => i.id),
    ).toEqual(['2', '3', '1']);
  });

  it('follows shelf order then name when sorting by category', () => {
    expect(
      applyFilters(all, { ...EMPTY_KITCHEN_FILTERS, sort: 'category' }).map((i) => i.id),
    ).toEqual(['2', '3', '1']);
  });

  it('combines filters', () => {
    expect(
      applyFilters(all, {
        ...EMPTY_KITCHEN_FILTERS,
        query: 'rice',
        category: 'BAKING',
        restockOnly: true,
      }),
    ).toEqual([]);
  });
});
