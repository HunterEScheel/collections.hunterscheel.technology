import type { User } from '@supabase/supabase-js';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useKitchen } from './useKitchen';
import { PantryPage } from './PantryPage';
import { ItemEditorPage } from './ItemEditorPage';
import { RecipesPage } from './RecipesPage';
import { RecipeDetailPage } from './RecipeDetailPage';
import { RecipeEditorPage } from './RecipeEditorPage';
import { ShoppingPage } from './ShoppingPage';
import { needsRestock } from './pantry';
import { recipeShoppingNeeds } from './recipes';

/**
 * The kitchen, with the same three places the phone app has. The data is loaded
 * once here and handed down, so switching tabs never refetches.
 */
export function KitchenApp({ user }: { user: User }) {
  const kitchen = useKitchen(user);

  const toBuy =
    kitchen.items.filter(needsRestock).length +
    recipeShoppingNeeds(
      kitchen.recipes.filter((r) => r.planned),
      kitchen.items,
    ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Collections
        </Link>
        <h1 className="text-lg font-semibold">Kitchen</h1>
        <nav className="ml-auto flex gap-1">
          <Tab to="/kitchen">Pantry</Tab>
          <Tab to="/kitchen/recipes">Recipes</Tab>
          <Tab to="/kitchen/shopping">Shopping{toBuy > 0 ? ` (${toBuy})` : ''}</Tab>
        </nav>
      </header>

      {kitchen.error && <p className="text-sm text-red-400">{kitchen.error}</p>}

      <Routes>
        <Route index element={<PantryPage kitchen={kitchen} />} />
        <Route path="item/:itemId" element={<ItemEditorPage kitchen={kitchen} />} />
        <Route path="recipes" element={<RecipesPage kitchen={kitchen} />} />
        <Route path="recipes/:recipeId" element={<RecipeDetailPage kitchen={kitchen} />} />
        <Route path="recipes/:recipeId/edit" element={<RecipeEditorPage kitchen={kitchen} />} />
        <Route path="shopping" element={<ShoppingPage kitchen={kitchen} />} />
        <Route path="*" element={<Navigate to="/kitchen" replace />} />
      </Routes>
    </div>
  );
}

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/kitchen'}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm ${
          isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
