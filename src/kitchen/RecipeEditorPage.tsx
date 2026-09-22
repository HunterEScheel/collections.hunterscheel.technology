import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Kitchen } from './useKitchen';
import { UNITS, formatQuantity, unitLabel } from './pantry';
import type { KitchenRecipe, RecipeIngredient } from './types';
import { Field, inputClass, primaryButtonClass, subtleButtonClass } from './ui';

/** Add or edit a recipe. `/kitchen/recipes/new/edit` is the add form. */
export function RecipeEditorPage({ kitchen }: { kitchen: Kitchen }) {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const existing = kitchen.recipes.find((r) => r.id === recipeId) ?? null;
  const isNew = recipeId === 'new';

  if (!isNew && !existing) {
    return (
      <p className="text-zinc-400">
        {kitchen.loading ? 'Loading…' : 'That recipe is not here any more.'}
      </p>
    );
  }

  return (
    <RecipeForm
      key={existing?.id ?? 'new'}
      recipe={existing}
      onCancel={() => navigate(-1)}
      onSave={async (draft) => {
        await kitchen.saveRecipe(draft, existing?.id);
        navigate('/kitchen/recipes');
      }}
      onDelete={
        existing
          ? async () => {
              await kitchen.deleteRecipe(existing);
              navigate('/kitchen/recipes');
            }
          : undefined
      }
    />
  );
}

/** A row being edited. `key` keeps list identity stable while typing. */
interface DraftLine {
  key: number;
  name: string;
  quantity: string;
  unit: string;
}

let nextKey = 1;

function RecipeForm({
  recipe,
  onSave,
  onCancel,
  onDelete,
}: {
  recipe: KitchenRecipe | null;
  onSave: (draft: Partial<KitchenRecipe> & { name: string }) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(recipe?.name ?? '');
  const [servings, setServings] = useState(String(recipe?.servings ?? 2));
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [planned, setPlanned] = useState(recipe?.planned ?? false);
  const [lines, setLines] = useState<DraftLine[]>(
    recipe && recipe.ingredients.length > 0
      ? recipe.ingredients.map((ingredient) => ({
          key: nextKey++,
          name: ingredient.name,
          quantity: formatQuantity(ingredient.quantity),
          unit: ingredient.unit,
        }))
      : [{ key: nextKey++, name: '', quantity: '1', unit: 'PIECES' }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = lines.filter((line) => line.name.trim());
  const nameError = name.trim() ? null : 'Give it a name';
  const servingsError = Number(servings) >= 1 ? null : 'Whole number, at least 1';
  const linesError =
    filled.length === 0
      ? 'Add at least one ingredient'
      : filled.some((line) => !Number.isFinite(Number(line.quantity)) || !line.quantity.trim())
        ? 'Check the amounts'
        : null;
  const canSave = !nameError && !servingsError && !linesError && !busy;

  function update(key: number, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const ingredients: RecipeIngredient[] = filled.map((line) => ({
      name: line.name.trim(),
      quantity: Number(line.quantity) || 0,
      unit: line.unit,
    }));
    try {
      await onSave({
        name: name.trim(),
        servings: Number(servings) || 1,
        notes: notes.trim(),
        planned,
        ingredients,
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That did not save');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-base font-medium">{recipe ? 'Edit recipe' : 'Add recipe'}</h2>

      <Field label="Recipe name" error={name ? nameError : null}>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>

      <Field label="Serves" error={servingsError}>
        <input
          inputMode="numeric"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={planned}
          onChange={(e) => setPlanned(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
        />
        <span>
          On the shopping plan
          <span className="block text-xs text-zinc-500">
            Anything it needs and you lack joins the shopping list.
          </span>
        </span>
      </label>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Ingredients</h3>
        <p className="text-xs text-zinc-500">
          Names are matched against your pantry, so “Olive oil” finds the olive oil you
          already have.
        </p>
        {linesError && <p className="text-xs text-red-400">{linesError}</p>}

        {lines.map((line) => (
          <div key={line.key} className="flex flex-wrap items-center gap-2">
            <input
              value={line.name}
              onChange={(e) => update(line.key, { name: e.target.value })}
              placeholder="Ingredient"
              className={`${inputClass} min-w-40 flex-1`}
            />
            <input
              inputMode="decimal"
              value={line.quantity}
              onChange={(e) => update(line.key, { quantity: e.target.value })}
              className={`${inputClass} w-24`}
            />
            <select
              value={line.unit}
              onChange={(e) => update(line.key, { unit: e.target.value })}
              className={`${inputClass} w-32`}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
            <button
              aria-label={`Remove ${line.name || 'ingredient'}`}
              onClick={() =>
                setLines((current) => {
                  const remaining = current.filter((row) => row.key !== line.key);
                  return remaining.length > 0
                    ? remaining
                    : [{ key: nextKey++, name: '', quantity: '1', unit: 'PIECES' }];
                })
              }
              className="rounded-md px-2 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={() =>
            setLines((current) => [
              ...current,
              { key: nextKey++, name: '', quantity: '1', unit: 'PIECES' },
            ])
          }
          className={subtleButtonClass}
        >
          Add ingredient
        </button>
      </div>

      <Field label="Method and notes">
        <textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button onClick={() => void submit()} disabled={!canSave} className={primaryButtonClass}>
          {recipe ? 'Save changes' : 'Save recipe'}
        </button>
        <button onClick={onCancel} className={subtleButtonClass}>
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete ${recipe?.name}?`)) void onDelete();
            }}
            className="ml-auto rounded-md px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/10"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
