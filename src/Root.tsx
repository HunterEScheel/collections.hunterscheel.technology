import type { User } from '@supabase/supabase-js';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, useResumeAfterSignIn } from './components/AuthGate';
import { Portfolio } from './portfolio/Portfolio';
import { KitchenApp } from './kitchen/KitchenApp';
import { HexcraftApp } from './hexcraft/HexcraftApp';
import { Main as MtgApp } from './App';

/**
 * `/` is the public portfolio. Everything else here holds my own data, so one
 * gate sits above those routes rather than inside each app. `/mtg/*` and
 * `/kitchen/*` both swallow their sub-paths so each app can grow its own routes
 * later without touching this file.
 */
export function Root() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="*"
        element={
          <AuthGate>
            {(user: User) => (
              <Routes>
                <Route path="mtg/*" element={<MtgApp user={user} />} />
                <Route path="kitchen/*" element={<KitchenApp user={user} />} />
                <Route path="hexcraft/*" element={<HexcraftApp />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </AuthGate>
        }
      />
    </Routes>
  );
}

function Home() {
  useResumeAfterSignIn();
  return <Portfolio />;
}
