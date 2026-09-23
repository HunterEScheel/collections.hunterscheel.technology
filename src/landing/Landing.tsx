import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * The gate. You sign in once, then pick which collection you want to search —
 * cards or kitchen. Both live in the same Supabase project under the same account,
 * so there is no second login on the way through.
 */
export function Landing({ user }: { user: User }) {
  const counts = useCounts();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-sm text-zinc-400">
          What are you looking for?
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <CategoryCard
          to="/mtg"
          emoji="🃏"
          title="Cards"
          blurb="Search your Magic collection with Scryfall syntax, by binder, quantity and price."
          detail={counts.cards === null ? null : `${counts.cards.toLocaleString()} cards`}
        />
        <CategoryCard
          to="/hexcraft"
          emoji="🎲"
          title="Hexcraft"
          blurb="Build characters for the Hexcraft RPG, run the game, make monsters."
          detail={
            counts.characters === null
              ? null
              : `${counts.characters.toLocaleString()} character${counts.characters === 1 ? '' : 's'}`
          }
        />
        <CategoryCard
          to="/kitchen"
          emoji="🍳"
          title="Kitchen"
          blurb="The pantry, recipes, and a shopping list that knows what you already have."
          detail={
            counts.kitchen === null
              ? null
              : `${counts.kitchen.toLocaleString()} item${counts.kitchen === 1 ? '' : 's'}`
          }
        />
      </div>

      <footer className="flex items-center gap-3 text-xs text-zinc-500">
        <span>{user.email}</span>
        {/* A plain anchor, not a Link: /bio is its own page, not a route in here. */}
        <a href="/bio" className="hover:text-zinc-300">
          Bio
        </a>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="rounded-md px-2 py-1 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-300"
        >
          Sign out
        </button>
      </footer>
    </div>
  );
}

function CategoryCard({
  to,
  emoji,
  title,
  blurb,
  detail,
}: {
  to: string;
  emoji: string;
  title: string;
  blurb: string;
  detail: string | null;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl bg-zinc-900 p-5 ring-1 ring-zinc-800 transition hover:bg-zinc-800/80 hover:ring-indigo-500/50"
    >
      <div className="mb-2 text-3xl">{emoji}</div>
      <h2 className="text-lg font-medium group-hover:text-indigo-300">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{blurb}</p>
      <p className="mt-3 h-4 text-xs text-zinc-600">{detail ?? ''}</p>
    </Link>
  );
}

/** Row counts for the two cards, fetched head-only so nothing large comes back. */
function useCounts() {
  const [counts, setCounts] = useState<{
    cards: number | null;
    kitchen: number | null;
    characters: number | null;
  }>({ cards: null, kitchen: null, characters: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [cards, kitchen, characters] = await Promise.all([
        supabase.from('collection_cards').select('id', { count: 'exact', head: true }),
        supabase.from('kitchen_items').select('id', { count: 'exact', head: true }),
        supabase.from('hexcraft_characters').select('id', { count: 'exact', head: true }),
      ]);
      if (cancelled) return;
      setCounts({
        cards: cards.count ?? null,
        kitchen: kitchen.count ?? null,
        characters: characters.count ?? null,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
