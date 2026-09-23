import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchMagicItems } from './shop';

/**
 * The shop's item search is built from one Open5e query per rarity. Four items —
 * spell scrolls, healing potions and the two giant-strength lines — carry rarity
 * "varies", so no rarity query returns them and they were silently unsearchable.
 * That meant no restock rule could be written for them, even though the restock
 * code has always known how to expand them.
 */

const RARITY_PAGE = {
  next: null,
  results: [
    { slug: 'bag-of-holding', name: 'Bag of Holding', rarity: 'uncommon', desc: 'A bag.' },
  ],
};

function mockOpen5e() {
  return vi.fn(async (url: string) => {
    // A single item fetched by slug: /magicitems/<slug>/?format=json
    const bySlug = /\/magicitems\/([a-z-]+)\/\?/.exec(url);
    if (bySlug) {
      const slug = bySlug[1];
      return {
        ok: true,
        json: async () => ({
          slug,
          name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          rarity: 'varies',
          desc: 'Rarity varies.',
        }),
      };
    }
    // A rarity page: /magicitems/?format=json&limit=200&rarity=<r>
    return { ok: true, json: async () => RARITY_PAGE };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shop item search', () => {
  it('finds the items whose rarity varies', async () => {
    vi.stubGlobal('fetch', mockOpen5e());

    const potions = await searchMagicItems('potion of healing');
    expect(potions.map((i) => i.index)).toContain('potion-of-healing');

    const scrolls = await searchMagicItems('spell scroll');
    expect(scrolls.map((i) => i.index)).toContain('spell-scroll');

    const belts = await searchMagicItems('giant strength');
    expect(belts.map((i) => i.index)).toEqual(
      expect.arrayContaining(['potion-of-giant-strength', 'belt-of-giant-strength']),
    );
  });

  it('still finds the ordinary rarity-filtered items', async () => {
    vi.stubGlobal('fetch', mockOpen5e());

    const results = await searchMagicItems('bag of holding');
    expect(results.map((i) => i.index)).toContain('bag-of-holding');
  });

  it('lists each item once', async () => {
    vi.stubGlobal('fetch', mockOpen5e());

    const results = await searchMagicItems('');
    const indexes = results.map((i) => i.index);
    expect(indexes).toEqual([...new Set(indexes)]);
  });
});
