import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Kitchen } from './useKitchen';
import { checkRecipe, readiness, type RecipeReadiness } from './recipes';
import type { KitchenRecipe } from './types';
import { Chip, inputClass, primaryButtonClass } from './ui';

export function RecipesPage({ kitchen }: { kitchen: Kitchen }) {
  const { recipes, items, loading, setPlanned } = kitchen;
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const cards = useMemo(
    () =>
      recipes.map((recipe) => ({
        recipe,
        readiness: readiness(checkRecipe(recipe, items)),
      })),
    [recipes, items],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter(
      ({ recipe }) =>
        recipe.name.toLowerCase().includes(needle) ||
        recipe.ingredients.some((i) => i.name.toLowerCase().includes(needle)),
    );
  }, [cards, query]);

  const plannedCount = recipes.filter((r) => r.planned).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes and ingredients…"
          className={`${inputClass} min-w-64 flex-1`}
        />
        <button onClick={() => navigate('/kitchen/recipes/new/edit')} className={primaryButtonClass}>
          Add recipe
        </button>
      </div>

      {plannedCount > 0 && (
        <p className="text-xs text-indigo-400">{plannedCount} on the shopping plan</p>
      )}

      {loading ? (
        <p className="text-zinc-400">Loading…</p>
      ) : recipes.length === 0 ? (
        <div className="rounded-lg bg-zinc-900 p-6 text-sm text-zinc-400 ring-1 ring-zinc-800">
          <p className="mb-2 font-medium text-zinc-200">No recipes yet</p>
          <p>Add one and you'll be told what you're missing before you start cooking.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-zinc-400">Nothing here uses that.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map(({ recipe, readiness: ready }) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              readiness={ready}
              onTogglePlanned={() => void setPlanned(recipe, !recipe.planned)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeRow({
  recipe,
  readiness: ready,
  onTogglePlanned,
}: {
  recipe: KitchenRecipe;
  readiness: RecipeReadiness;
  onTogglePlanned: () => void;
}) {
  return (
    <li className="rounded-lg bg-zinc-900 p-3 ring-1 ring-zinc-800">
      <Link to={`/kitchen/recipes/${recipe.id}`} className="block hover:text-indigo-300">
        <span className="font-medium">{recipe.name}</span>
        <p
          className={`mt-0.5 text-xs ${
            ready.canCookNow ? 'text-emerald-400' : 'text-zinc-500'
          }`}
        >
          {readinessLine(ready)}
        </p>
      </Link>
      <div className="mt-2">
        <Chip active={recipe.planned} onClick={onTogglePlanned}>
          {recipe.planned ? 'On the plan' : 'Add to plan'}
        </Chip>
      </div>
    </li>
  );
}

function readinessLine(ready: RecipeReadiness): string {
  if (ready.total === 0) return 'No ingredients yet';
  if (ready.canCookNow) {
    return ready.unknown > 0
      ? `You can cook this now (${ready.unknown} to eyeball)`
      : 'You can cook this now';
  }
  return `${ready.have} of ${ready.total} on hand · ${ready.toBuy} to buy`;
}
