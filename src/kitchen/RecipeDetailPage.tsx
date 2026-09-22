import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Kitchen } from './useKitchen';
import { checkRecipe, readiness, type IngredientCheck } from './recipes';
import { formatQuantity, unitLabel } from './pantry';
import type { KitchenItem } from './types';
import { Badge, primaryButtonClass, subtleButtonClass } from './ui';

export function RecipeDetailPage({ kitchen }: { kitchen: Kitchen }) {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const recipe = kitchen.recipes.find((r) => r.id === recipeId);

  if (!recipe) {
    return (
      <p className="text-zinc-400">
        {kitchen.loading ? 'Loading…' : 'That recipe is not here any more.'}
      </p>
    );
  }

  const checks = checkRecipe(recipe, kitchen.items);
  const ready = readiness(checks);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-medium">{recipe.name}</h2>
        <span className="text-xs text-zinc-500">Serves {recipe.servings}</span>
        <Link
          to={`/kitchen/recipes/${recipe.id}/edit`}
          className="ml-auto text-sm text-zinc-400 hover:text-zinc-200"
        >
          Edit
        </Link>
      </div>

      <p className={`text-sm ${ready.canCookNow ? 'text-emerald-400' : 'text-red-400'}`}>
        {ready.canCookNow
          ? 'Everything is in the kitchen.'
          : `${ready.toBuy} of ${ready.total} ingredients need buying.`}
      </p>

      <button
        onClick={() => void kitchen.setPlanned(recipe, !recipe.planned)}
        className={recipe.planned ? subtleButtonClass : primaryButtonClass}
      >
        {recipe.planned
          ? 'On the shopping plan — take it off'
          : "Add what I'm missing to the shopping list"}
      </button>

      <ul className="divide-y divide-zinc-800 rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
        {checks.map((check, index) => (
          <li key={`${check.ingredient.name}-${index}`} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {formatQuantity(check.ingredient.quantity)} {unitLabel(check.ingredient.unit)}{' '}
                {check.ingredient.name}
              </p>
              <p className="text-xs text-zinc-500">{detail(check)}</p>
            </div>
            {check.availability === 'have' && <Badge tone="ok">HAVE</Badge>}
            {check.availability === 'short' && <Badge tone="warn">SHORT</Badge>}
            {check.availability === 'unknown' && <Badge tone="warn">CHECK</Badge>}
            {check.availability === 'missing' && <Badge tone="bad">NEED</Badge>}
          </li>
        ))}
      </ul>

      {recipe.notes && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-zinc-300">{recipe.notes}</p>
        </div>
      )}

      <button onClick={() => navigate('/kitchen/recipes')} className={subtleButtonClass}>
        Back to recipes
      </button>
    </div>
  );
}

function detail(check: IngredientCheck): string {
  const onHand = (item: KitchenItem | null) =>
    item ? `${formatQuantity(item.quantity)} ${unitLabel(item.unit)}` : 'none';

  switch (check.availability) {
    case 'missing':
      return check.pantryItem ? "You're out of it" : 'Not in your pantry';
    case 'short':
      return `Have ${onHand(check.pantryItem)} · buy ${formatQuantity(check.shortfall)} ${unitLabel(
        check.ingredient.unit,
      )}`;
    case 'unknown':
      return `Have ${onHand(check.pantryItem)} — different units, so check the shelf`;
    default:
      return `Have ${onHand(check.pantryItem)}`;
  }
}
