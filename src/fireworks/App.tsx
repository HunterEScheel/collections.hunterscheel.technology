import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AdminProvider } from './lib/admin'
import { EventSessionProvider } from './lib/eventSession'
import { ContributePage } from './pages/ContributePage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { AdminPage } from './pages/AdminPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter basename="/fireworks">
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
        <AdminProvider>
          <EventSessionProvider>
            <Routes>
              <Route path="/" element={<ContributePage />} />
              <Route path="/receipts" element={<ReceiptsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </EventSessionProvider>
        </AdminProvider>
      </main>
    </BrowserRouter>
  )
}
