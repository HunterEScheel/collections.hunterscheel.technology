import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchMagicItems } from './shop';

/**
 * The shop's item search is built from one Open5e query per rarity. Items like
 * spell scrolls, healing potions and the two giant-strength lines carry rarity
 * "varies", so the ordinary rarity queries never returned them and they were
 * silently unsearchable. That meant no restock rule could be written for them,
 * even though the restock code has always known how to expand them. Search now
 * sweeps "varies" as a rarity of its own and only falls back to fetching the
 * known slugs one by one for whatever that sweep misses.
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

describe('shop item search when the slugs are wrong', () => {
  /**
   * The slug list is a guess about Open5e's spelling, so the sweep has to carry
   * the feature on its own: with every by-slug fetch 404ing, the varying items
   * must still be searchable.
   */
  it('finds the varying items from the rarity sweep alone', async () => {
    vi.resetModules();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (/\/magicitems\/[a-z-]+\/\?/.test(url)) return { ok: false, json: async () => ({}) };
        if (url.includes('rarity=varies')) {
          return {
            ok: true,
            json: async () => ({
              next: null,
              results: [
                { slug: 'potion-of-healing', name: 'Potion of Healing', rarity: 'varies', desc: '' },
              ],
            }),
          };
        }
        return { ok: true, json: async () => RARITY_PAGE };
      }),
    );

    const { searchMagicItems: search } = await import('./shop');
    const results = await search('potion of healing');
    expect(results.map((i) => i.index)).toContain('potion-of-healing');
  });
});
