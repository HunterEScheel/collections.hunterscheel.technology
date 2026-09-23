import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Home } from './pages/Home.tsx'
import { Builder } from './pages/Builder.tsx'
import { Sheet } from './pages/Sheet.tsx'
import { RunningTheGame } from './pages/RunningTheGame.tsx'
import { MonsterMaker } from './pages/MonsterMaker.tsx'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'builder', element: <Builder /> },
      { path: 'builder/:id', element: <Builder /> },
      { path: 'sheet/:id', element: <Sheet /> },
      { path: 'running-the-game', element: <RunningTheGame /> },
      { path: 'monster-maker', element: <MonsterMaker /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
