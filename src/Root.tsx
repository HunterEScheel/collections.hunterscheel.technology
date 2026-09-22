import type { User } from '@supabase/supabase-js';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { Landing } from './landing/Landing';
import { KitchenApp } from './kitchen/KitchenApp';
import { Main as MtgApp } from './App';

/**
 * One sign-in covers everything, so the gate sits above the routes rather than
 * inside each app. `/mtg/*` and `/kitchen/*` both swallow their sub-paths so each
 * app can grow its own routes later without touching this file.
 */
export function Root() {
  return (
    <AuthGate>
      {(user: User) => (
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/mtg/*" element={<MtgApp user={user} />} />
          <Route path="/kitchen/*" element={<KitchenApp user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </AuthGate>
  );
}
