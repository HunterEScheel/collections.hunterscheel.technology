import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Kitchen } from './useKitchen';
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
import { Badge, Chip, inputClass, primaryButtonClass, subtleButtonClass } from './ui';

const SORTS: { value: KitchenSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'expiry', label: 'Expires soonest' },
  { value: 'recent', label: 'Recently updated' },
];

export function PantryPage({ kitchen }: { kitchen: Kitchen }) {
  const { items, loading, adjust, reload, seedStaples } = kitchen;
  const [filters, setFilters] = useState(EMPTY_KITCHEN_FILTERS);
  const navigate = useNavigate();

  const visible = useMemo(() => applyFilters(items, filters), [items, filters]);
  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const restockCount = useMemo(() => items.filter(needsRestock).length, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          placeholder="Search the pantry…"
          className={`${inputClass} min-w-64 flex-1`}
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
        <button onClick={() => void reload()} className={subtleButtonClass}>
          Refresh
        </button>
        <button onClick={() => navigate('/kitchen/item/new')} className={primaryButtonClass}>
          Add item
        </button>
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

      <p className="text-xs text-zinc-500">
        {visible.length} item{visible.length === 1 ? '' : 's'}
        {restockCount > 0 && ` · ${restockCount} to restock`}
      </p>

      {loading ? (
        <p className="text-zinc-400">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyKitchen onSeed={seedStaples} onAdd={() => navigate('/kitchen/item/new')} />
      ) : visible.length === 0 ? (
        <p className="text-zinc-400">Nothing matches that.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <PantryRow key={item.id} item={item} onAdjust={adjust} />
          ))}
        </ul>
      )}

    </div>
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

      <Link to={`/kitchen/item/${item.id}`} className="min-w-0 flex-1 hover:text-indigo-300">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.name}</span>
          {status === 'out' && <Badge tone="bad">OUT</Badge>}
          {status === 'low' && <Badge tone="warn">LOW</Badge>}
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
      </Link>

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

function EmptyKitchen({
  onSeed,
  onAdd,
}: {
  onSeed: () => Promise<number>;
  onAdd: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seed() {
    setBusy(true);
    setError(null);
    try {
      await onSeed();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That did not work');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg bg-zinc-900 p-6 text-sm text-zinc-400 ring-1 ring-zinc-800">
      <p className="font-medium text-zinc-200">Nothing in the kitchen yet</p>
      <p>
        Add your first item, or start from a list of about thirty common staples you can
        then edit — flour, rice, the spice drawer, oil, a few tins.
      </p>
      <div className="flex items-center gap-2">
        <button onClick={() => void seed()} disabled={busy} className={primaryButtonClass}>
          {busy ? 'Filling the shelves…' : 'Start with staples'}
        </button>
        <button onClick={onAdd} className={subtleButtonClass}>
          Add an item
        </button>
      </div>
      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}
