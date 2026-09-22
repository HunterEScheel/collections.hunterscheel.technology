import { useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { AndroidDownload } from './AndroidDownload';
import { useKitchen } from './useKitchen';
import {
  applyFilters,
  categoryEmoji,
  categoryLabel,
  daysUntilExpiry,
  formatQuantity,
  needsRestock,
  stockStatus,
  unitLabel,
} from './pantry';
import { EMPTY_KITCHEN_FILTERS, type KitchenItem, type KitchenSort } from './types';

const SORTS: { value: KitchenSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'expiry', label: 'Expires soonest' },
  { value: 'recent', label: 'Recently updated' },
];

export function KitchenApp({ user }: { user: User }) {
  const { items, loading, error, adjust, reload } = useKitchen();
  const [filters, setFilters] = useState(EMPTY_KITCHEN_FILTERS);

  const visible = useMemo(() => applyFilters(items, filters), [items, filters]);
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))),
    [items],
  );
  const restockCount = useMemo(() => items.filter(needsRestock).length, [items]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Collections
        </Link>
        <h1 className="text-lg font-semibold">Kitchen</h1>
        <span className="text-sm text-zinc-500">
          {items.length} item{items.length === 1 ? '' : 's'}
          {restockCount > 0 && ` · ${restockCount} to restock`}
        </span>
        <button
          onClick={() => void reload()}
          className="ml-auto rounded-md bg-zinc-800 px-3 py-1.5 text-sm ring-1 ring-zinc-700 hover:bg-zinc-700"
        >
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          placeholder="Search the pantry…"
          className="min-w-64 flex-1 rounded-md bg-zinc-800 px-3 py-2 text-sm outline-none ring-1 ring-zinc-700 focus:ring-indigo-500"
        />
        <select
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as KitchenSort }))}
          className="rounded-md bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-700"
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip
          active={filters.restockOnly}
          onClick={() => setFilters((f) => ({ ...f, restockOnly: !f.restockOnly }))}
        >
          Needs restock
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category}
            active={filters.category === category}
            onClick={() =>
              setFilters((f) => ({ ...f, category: f.category === category ? null : category }))
            }
          >
            {categoryEmoji(category)} {categoryLabel(category)}
          </Chip>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-zinc-400">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyKitchen />
      ) : visible.length === 0 ? (
        <p className="text-zinc-400">Nothing matches that.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <PantryRow key={item.id} item={item} onAdjust={adjust} />
          ))}
        </ul>
      )}

      <AndroidDownload />

      <p className="text-xs text-zinc-600">
        Signed in as {user.email}. Adding and editing items, and the recipe book, live in
        the Android app for now — this page reads the same synced kitchen.
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

function PantryRow({
  item,
  onAdjust,
}: {
  item: KitchenItem;
  onAdjust: (item: KitchenItem, direction: 1 | -1) => void;
}) {
  const status = stockStatus(item);
  const days = daysUntilExpiry(item);

  return (
    <li className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3 ring-1 ring-zinc-800">
      <span className="text-xl">{categoryEmoji(item.category)}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.name}</span>
          {status !== 'ok' && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                status === 'out' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {status === 'out' ? 'OUT' : 'LOW'}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500">
          {[categoryLabel(item.category), item.location].filter(Boolean).join(' · ')}
        </p>
        {days !== null && (
          <p className={`text-xs ${days <= 7 ? 'text-red-400' : 'text-zinc-500'}`}>
            {days < 0
              ? 'Expired'
              : days === 0
                ? 'Expires today'
                : `Expires in ${days} day${days === 1 ? '' : 's'}`}
          </p>
        )}
      </div>

      <span
        className={`tabular-nums ${
          status === 'out' ? 'text-red-400' : status === 'low' ? 'text-amber-400' : 'text-zinc-200'
        }`}
      >
        {formatQuantity(item.quantity)} {unitLabel(item.unit)}
      </span>

      <div className="flex gap-1">
        <StepButton label={`Use some ${item.name}`} onClick={() => onAdjust(item, -1)}>
          −
        </StepButton>
        <StepButton label={`Restock ${item.name}`} onClick={() => onAdjust(item, 1)}>
          +
        </StepButton>
      </div>
    </li>
  );
}

function StepButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="h-8 w-8 rounded-md bg-zinc-800 text-lg leading-none ring-1 ring-zinc-700 hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}

function EmptyKitchen() {
  return (
    <div className="rounded-lg bg-zinc-900 p-6 text-sm text-zinc-400 ring-1 ring-zinc-800">
      <p className="mb-2 font-medium text-zinc-200">Nothing here yet</p>
      <p>
        The kitchen fills up from the Android app. Sign in there with this same account
        and press Sync, and everything you have shows up here.
      </p>
    </div>
  );
}
