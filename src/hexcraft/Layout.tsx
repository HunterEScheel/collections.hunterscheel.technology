import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

/** The Hexcraft chrome: its own nav, plus the way back to the other collections. */
export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300">
              ←
            </Link>
            <Link to="/hexcraft" className="flex items-baseline gap-2">
              <h1 className="text-xl font-semibold">Hexcraft RPG</h1>
              <span className="text-xs text-zinc-500">{sectionName(pathname)}</span>
            </Link>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            <Tab to="/hexcraft" end>
              Characters
            </Tab>
            <Tab to="/hexcraft/running-the-game">Running the game</Tab>
            <Tab to="/hexcraft/monster-maker">Monsters</Tab>
            <Link
              to="/hexcraft/builder"
              className="rounded bg-amber-500 px-3 py-1.5 font-medium text-zinc-950 hover:bg-amber-400"
            >
              New
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function Tab({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'
      }
    >
      {children}
    </NavLink>
  );
}

function sectionName(pathname: string): string {
  if (pathname.startsWith('/hexcraft/builder')) return 'Builder';
  if (pathname.startsWith('/hexcraft/sheet')) return 'Sheet';
  if (pathname.startsWith('/hexcraft/running-the-game')) return 'GM guide';
  if (pathname.startsWith('/hexcraft/monster-maker')) return 'Monster maker';
  return 'Roster';
}
