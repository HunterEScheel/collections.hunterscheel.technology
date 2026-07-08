import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { EventSessionProvider } from './lib/eventSession'
import { ContributePage } from './pages/ContributePage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { AdminPage } from './pages/AdminPage'
import './App.css'

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '80px auto' }}>
        <h3>⚙️ Setup needed</h3>
        <p className="muted">
          Supabase is not configured. Copy <code>env.example</code> to <code>.env.local</code>,
          fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from your
          Supabase project (Settings &gt; API), then restart the dev server.
        </p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <header className="site-header">
        <h1>🎆 Firework Fund</h1>
        <nav>
          <NavLink to="/" end>
            Contribute
          </NavLink>
          <NavLink to="/receipts">Receipts</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main>
        <EventSessionProvider>
          <Routes>
            <Route path="/" element={<ContributePage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </EventSessionProvider>
      </main>
    </BrowserRouter>
  )
}
