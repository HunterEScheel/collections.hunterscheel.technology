import type { ReactNode } from 'react';

/** The handful of shared bits of chrome the kitchen pages use. */

export const inputClass =
  'w-full rounded-md bg-zinc-800 px-3 py-2 text-sm outline-none ring-1 ring-zinc-700 focus:ring-indigo-500';

export const primaryButtonClass =
  'rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40';

export const subtleButtonClass =
  'rounded-md bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-700 hover:bg-zinc-700 disabled:opacity-40';

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs ring-1 transition ${
        active
          ? 'bg-indigo-600 text-white ring-indigo-500'
          : 'bg-zinc-900 text-zinc-300 ring-zinc-700 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-red-400">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-zinc-600">{hint}</span>
      ) : null}
    </label>
  );
}

export function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: ReactNode }) {
  const tones = {
    ok: 'bg-emerald-500/15 text-emerald-400',
    warn: 'bg-amber-500/15 text-amber-400',
    bad: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
