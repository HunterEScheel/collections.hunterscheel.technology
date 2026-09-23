import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { Home } from './pages/Home';
import { Builder } from './pages/Builder';
import { Sheet } from './pages/Sheet';
import { RunningTheGame } from './pages/RunningTheGame';
import { MonsterMaker } from './pages/MonsterMaker';

/**
 * Hexcraft's own routes, under /hexcraft. It came in using a hash router of its
 * own; nesting it here instead means its pages get real URLs, shareable and
 * refreshable, alongside /mtg and /kitchen.
 */
export function HexcraftApp() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="builder" element={<Builder />} />
        <Route path="builder/:id" element={<Builder />} />
        <Route path="sheet/:id" element={<Sheet />} />
        <Route path="running-the-game" element={<RunningTheGame />} />
        <Route path="monster-maker" element={<MonsterMaker />} />
      </Route>
    </Routes>
  );
}
