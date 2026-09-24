import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * The front door, and public: what is on this site and who made it. The apps
 * that hold my own data (cards, kitchen, Hexcraft) ask for sign-in when opened;
 * the rest are open to anyone.
 */

interface Project {
  href: string;
  emoji: string;
  title: string;
  blurb: string;
  tags: string[];
  /** A route in this app (Link) rather than a separate page (plain anchor). */
  internal: boolean;
  signIn: boolean;
}

const PROJECTS: Project[] = [
  {
    href: '/mtg',
    emoji: '🃏',
    title: 'Card Collection',
    blurb:
      'My Magic: The Gathering collection, searchable with Scryfall syntax across binders, quantities and prices, with Moxfield export and shareable binders.',
    tags: ['React', 'Supabase', 'Query parser'],
    internal: true,
    signIn: true,
  },
  {
    href: '/hexcraft',
    emoji: '🎲',
    title: 'Hexcraft',
    blurb:
      'Character builder for my own tabletop RPG: sheets, a monster maker and the GM guide, with semantic skill search over pgvector embeddings.',
    tags: ['Game design', 'pgvector', 'React'],
    internal: true,
    signIn: true,
  },
  {
    href: '/kitchen',
    emoji: '🍳',
    title: 'Kitchen',
    blurb:
      'The pantry, recipes that know what you are missing, and a shopping list built from both.',
    tags: ['React', 'Supabase'],
    internal: true,
    signIn: true,
  },
  {
    href: '/hexmap',
    emoji: '🗺️',
    title: 'Guild Hexmap',
    blurb:
      'Hexploration campaign companion for my D&D group: the map, quests, a restocking shop and an initiative tracker, synced to Discord.',
    tags: ['Edge Functions', 'Discord', 'D&D'],
    internal: false,
    signIn: false,
  },
  {
    href: '/fireworks',
    emoji: '🎆',
    title: 'Firework Fund',
    blurb:
      'Pledges toward the neighbourhood fireworks show, with receipts for what the money bought. Each event is unlocked with its own passcode.',
    tags: ['Postgres RPCs', 'React'],
    internal: false,
    signIn: false,
  },
];

export function Portfolio() {
  const user = useUser();

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-indigo-400">My Portfolio</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Hunter Scheel</h1>
        <p className="max-w-2xl text-zinc-400">
          Software developer — React and .NET by day, tabletop systems by night. Everything
          below runs on this site; pick one to try it.
        </p>
        <a
          href="/bio"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-300 hover:text-indigo-200"
        >
          About me, résumé and more →
        </a>
      </header>

      <main className="grid gap-4 sm:grid-cols-2">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.href} project={p} />
        ))}
      </main>

      <footer className="mt-auto flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        {/* Plain anchors: /bio is its own page, not a route in here. */}
        <a href="/bio" className="hover:text-zinc-300">
          Bio
        </a>
        <a href="https://github.com/hunterEdward98" target="_blank" rel="noreferrer" className="hover:text-zinc-300">
          GitHub
        </a>
        {user && (
          <>
            <span className="ml-auto">{user.email}</span>
            <button
              onClick={() => void supabase.auth.signOut()}
              className="rounded-md px-2 py-1 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-300"
            >
              Sign out
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const className =
    'group flex flex-col rounded-xl bg-zinc-900 p-5 ring-1 ring-zinc-800 transition hover:bg-zinc-800/80 hover:ring-indigo-500/50';
  const body = (
    <>
      <div className="mb-2 flex items-start justify-between">
        <span className="text-3xl">{p.emoji}</span>
        {p.signIn && (
          <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 ring-1 ring-zinc-700">
            Sign-in
          </span>
        )}
      </div>
      <h2 className="text-lg font-medium group-hover:text-indigo-300">{p.title}</h2>
      <p className="mt-1 flex-1 text-sm text-zinc-400">{p.blurb}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {p.tags.map((t) => (
          <span key={t} className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
            {t}
          </span>
        ))}
      </div>
    </>
  );

  return p.internal ? (
    <Link to={p.href} className={className}>
      {body}
    </Link>
  ) : (
    <a href={p.href} className={className}>
      {body}
    </a>
  );
}

/** Who is signed in, if anyone — the page works the same either way. */
function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return user;
}
