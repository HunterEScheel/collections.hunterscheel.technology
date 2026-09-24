import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Magic links and OAuth both return to the bare origin, which is the public
 * portfolio. So the gate notes where sign-in started, and `useResumeAfterSignIn`
 * on the portfolio sends you back there once the session arrives.
 */
const RESUME_PATH_KEY = 'resume-path';
const RESUME_MAX_AGE_MS = 60 * 60 * 1000;

function rememberPath() {
  try {
    localStorage.setItem(
      RESUME_PATH_KEY,
      JSON.stringify({ path: window.location.pathname + window.location.search, at: Date.now() }),
    );
  } catch {
    // Storage unavailable: sign-in still works, it just lands on the portfolio.
  }
}

export function useResumeAfterSignIn() {
  const navigate = useNavigate();

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(RESUME_PATH_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return; // link not followed yet; keep it for when it is
      localStorage.removeItem(RESUME_PATH_KEY);
      try {
        const { path, at } = JSON.parse(raw) as { path: string; at: number };
        if (Date.now() - at < RESUME_MAX_AGE_MS && path.startsWith('/') && path !== '/') {
          navigate(path, { replace: true });
        }
      } catch {
        // Malformed entry: already removed, stay on the portfolio.
      }
    });
  }, [navigate]);
}

export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function oauth(provider: 'github' | 'discord') {
    setError(null);
    rememberPath();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    rememberPath();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  if (!ready) return <div className="p-8 text-zinc-400">Loading…</div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <form onSubmit={sendLink} className="w-80 space-y-4 rounded-xl bg-zinc-900 p-6">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="-mt-2 text-xs text-zinc-500">Cards, Kitchen and Hexcraft share one account.</p>
          <div className="space-y-2">
            {([
              ['github', 'Continue with GitHub'],
              ['discord', 'Continue with Discord'],
            ] as const).map(([provider, label]) => (
              <button
                key={provider}
                type="button"
                onClick={() => oauth(provider)}
                className="w-full rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium ring-1 ring-zinc-700 hover:bg-zinc-700"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-zinc-700" /> or email link <span className="h-px flex-1 bg-zinc-700" />
          </div>
          {sent ? (
            <p className="text-sm text-emerald-400">
              Check your email for a sign-in link.
            </p>
          ) : (
            <>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md bg-zinc-800 px-3 py-2 text-sm outline-none ring-1 ring-zinc-700 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
              >
                Send magic link
              </button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </>
          )}
          <Link to="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300">
            ← Back to the portfolio
          </Link>
        </form>
      </div>
    );
  }

  return <>{children(user)}</>;
}
