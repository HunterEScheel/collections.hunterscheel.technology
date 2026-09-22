import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Kitchen } from './useKitchen';
import {
  categoryEmoji,
  categoryLabel,
  daysUntilExpiry,
  formatQuantity,
  needsRestock,
  unitLabel,
} from './pantry';
import { recipeShoppingNeeds, type RecipeNeed } from './recipes';
import type { KitchenItem } from './types';
import { subtleButtonClass } from './ui';

const EXPIRY_HORIZON_DAYS = 14;

/**
 * What to buy: everything the planned recipes need and the kitchen can't cover,
 * then whatever is low on stock, then a nudge about food about to go off.
 */
export function ShoppingPage({ kitchen }: { kitchen: Kitchen }) {
  const { items, recipes, loading } = kitchen;
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const planned = useMemo(() => recipes.filter((r) => r.planned), [recipes]);
  const needs = useMemo(() => recipeShoppingNeeds(planned, items), [planned, items]);

  const restock = useMemo(
    () =>
      items
        .filter(needsRestock)
        .sort(
          (a, b) =>
            categoryLabel(a.category).localeCompare(categoryLabel(b.category)) ||
            a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
        ),
    [items],
  );

  const expiring = useMemo(
    () =>
      items
        .filter((item) => {
          const days = daysUntilExpiry(item);
          return days !== null && days <= EXPIRY_HORIZON_DAYS;
        })
        .sort((a, b) => (a.expires_on ?? 0) - (b.expires_on ?? 0)),
    [items],
  );

  function toggle(key: string) {
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function copyList() {
    const text = [
      ...needs.map((need) => `- ${formatQuantity(need.amount)} ${unitLabel(need.unit)} ${need.name}`),
      ...restock.map((item) => `- ${item.name} (${categoryLabel(item.category)})`),
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="text-zinc-400">Loading…</p>;

  if (needs.length === 0 && restock.length === 0 && expiring.length === 0) {
    return (
      <p className="text-zinc-400">
        {items.length === 0
          ? 'Add items to the pantry, or put a recipe on the plan, and this list fills itself.'
          : 'Nothing to buy. The kitchen is stocked.'}
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => void copyList()} className={subtleButtonClass}>
          {copied ? 'Copied' : 'Copy list'}
        </button>
      </div>

      {needs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-indigo-400">
            For your recipes ({needs.length})
          </h2>
          <p className="text-xs text-zinc-500">
            From {planned.map((r) => r.name).join(', ')}
          </p>
          <ul className="space-y-1">
            {needs.map((need) => (
              <NeedRow
                key={`${need.name}|${need.unit}`}
                need={need}
                checked={ticked.has(`need:${need.name}|${need.unit}`)}
                onToggle={() => toggle(`need:${need.name}|${need.unit}`)}
              />
            ))}
          </ul>
        </section>
      )}

      {restock.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-indigo-400">Running low ({restock.length})</h2>
          <ul className="space-y-1">
            {restock.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                checked={ticked.has(`item:${item.id}`)}
                onToggle={() => toggle(`item:${item.id}`)}
              />
            ))}
          </ul>
        </section>
      )}

      {expiring.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-indigo-400">Use soon ({expiring.length})</h2>
          <ul className="space-y-1">
            {expiring.map((item) => {
              const days = daysUntilExpiry(item) ?? 0;
              return (
                <li key={item.id} className="flex items-center gap-3 py-1">
                  <span>{categoryEmoji(item.category)}</span>
                  <Link to={`/kitchen/item/${item.id}`} className="flex-1 hover:text-indigo-300">
                    {item.name}
                  </Link>
                  <span className={`text-xs ${days <= 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {days < 0 ? 'Expired' : days === 0 ? 'Today' : `${days} d`}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function NeedRow({
  need,
  checked,
  onToggle,
}: {
  need: RecipeNeed;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
      />
      <div className="min-w-0 flex-1">
        <p className={checked ? 'text-zinc-500 line-through' : ''}>
          {formatQuantity(need.amount)} {unitLabel(need.unit)} {need.name}
        </p>
        <p className="text-xs text-zinc-500">
          {need.partial && 'Topping up · '}
          {need.recipes.join(', ')}
        </p>
      </div>
    </li>
  );
}

function ItemRow({
  item,
  checked,
  onToggle,
}: {
  item: KitchenItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/kitchen/item/${item.id}`}
          className={`hover:text-indigo-300 ${checked ? 'text-zinc-500 line-through' : ''}`}
        >
          {item.name}
        </Link>
        <p className="text-xs text-zinc-500">
          {categoryLabel(item.category)} · {formatQuantity(item.quantity)} {unitLabel(item.unit)}{' '}
          left
        </p>
      </div>
    </li>
  );
}
