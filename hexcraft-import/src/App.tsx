import { Link, Outlet, useLocation } from 'react-router-dom'

function App() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold">Hexcraft RPG</h1>
            <span className="text-xs text-zinc-500">
              {pathname.startsWith('/builder')
                ? 'Builder'
                : pathname.startsWith('/sheet')
                  ? 'Sheet'
                  : pathname.startsWith('/running-the-game')
                    ? 'GM guide'
                    : pathname.startsWith('/monster-maker')
                      ? 'Monster maker'
                      : 'Roster'}
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to="/"
              className={
                pathname === '/'
                  ? 'text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100'
              }
            >
              Characters
            </Link>
            <Link
              to="/running-the-game"
              className={
                pathname.startsWith('/running-the-game')
                  ? 'text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100'
              }
            >
              Running the game
            </Link>
            <Link
              to="/monster-maker"
              className={
                pathname.startsWith('/monster-maker')
                  ? 'text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100'
              }
            >
              Monsters
            </Link>
            <Link
              to="/builder"
              className="rounded bg-amber-500 hover:bg-amber-400 px-3 py-1.5 font-medium text-zinc-950"
            >
              New
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default App
