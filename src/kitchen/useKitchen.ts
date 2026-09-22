import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { KitchenItem, KitchenRecipe } from './types';
import { effectiveStep } from './pantry';
import { starterPantry } from './staples';

/**
 * The whole kitchen, fetched once and worked on in the browser.
 *
 * A home pantry is a few hundred rows, so filtering here rather than round-tripping
 * every keystroke keeps the search instant.
 *
 * Deletes are soft: `deleted_at` is set and the row stays. That keeps the door open
 * for a second client to learn about a deletion by pulling the change, which a hard
 * delete cannot express.
 */
export function useKitchen(user: User) {
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [recipes, setRecipes] = useState<KitchenRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemRows, recipeRows] = await Promise.all([
      supabase.from('kitchen_items').select('*').is('deleted_at', null).order('name'),
      supabase.from('kitchen_recipes').select('*').is('deleted_at', null).order('name'),
    ]);

    const failure = itemRows.error ?? recipeRows.error;
    if (failure) setError(failure.message);
    else {
      setItems((itemRows.data ?? []) as KitchenItem[]);
      setRecipes((recipeRows.data ?? []) as KitchenRecipe[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Nudges a quantity, clamped at zero, showing the new value straight away. */
  const adjust = useCallback(
    async (item: KitchenItem, direction: 1 | -1) => {
      const next = Math.max(0, item.quantity + direction * effectiveStep(item));
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, quantity: next } : row)),
      );

      const { error } = await supabase
        .from('kitchen_items')
        .update({ quantity: next })
        .eq('id', item.id);

      if (error) {
        setError(error.message);
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, quantity: item.quantity } : row)),
        );
      }
    },
    [],
  );

  const saveItem = useCallback(
    async (draft: Partial<KitchenItem> & { name: string }, id?: string) => {
      const row = {
        id: id ?? crypto.randomUUID(),
        user_id: user.id,
        name: draft.name,
        category: draft.category ?? 'OTHER',
        quantity: draft.quantity ?? 0,
        unit: draft.unit ?? 'PIECES',
        low_threshold: draft.low_threshold ?? 0,
        step: draft.step ?? 0,
        expires_on: draft.expires_on ?? null,
        notes: draft.notes ?? '',
      };
      const { error } = await supabase.from('kitchen_items').upsert(row);
      if (error) throw new Error(error.message);
      await load();
      return row.id;
    },
    [user.id, load],
  );

  const deleteItem = useCallback(
    async (item: KitchenItem) => {
      const { error } = await supabase
        .from('kitchen_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw new Error(error.message);
      setItems((current) => current.filter((row) => row.id !== item.id));
    },
    [],
  );

  const saveRecipe = useCallback(
    async (draft: Partial<KitchenRecipe> & { name: string }, id?: string) => {
      const row = {
        id: id ?? crypto.randomUUID(),
        user_id: user.id,
        name: draft.name,
        servings: draft.servings ?? 2,
        notes: draft.notes ?? '',
        planned: draft.planned ?? false,
        ingredients: draft.ingredients ?? [],
      };
      const { error } = await supabase.from('kitchen_recipes').upsert(row);
      if (error) throw new Error(error.message);
      await load();
      return row.id;
    },
    [user.id, load],
  );

  const setPlanned = useCallback(async (recipe: KitchenRecipe, planned: boolean) => {
    setRecipes((current) =>
      current.map((row) => (row.id === recipe.id ? { ...row, planned } : row)),
    );
    const { error } = await supabase
      .from('kitchen_recipes')
      .update({ planned })
      .eq('id', recipe.id);
    if (error) {
      setError(error.message);
      setRecipes((current) =>
        current.map((row) => (row.id === recipe.id ? { ...row, planned: recipe.planned } : row)),
      );
    }
  }, []);

  /** Fills an empty kitchen with common staples. Refuses if anything is there. */
  const seedStaples = useCallback(async () => {
    const { count, error: countError } = await supabase
      .from('kitchen_items')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);
    if (countError) throw new Error(countError.message);
    if (count && count > 0) return 0;

    const rows = starterPantry().map((staple) => ({
      ...staple,
      id: crypto.randomUUID(),
      user_id: user.id,
    }));
    const { error } = await supabase.from('kitchen_items').insert(rows);
    if (error) throw new Error(error.message);
    await load();
    return rows.length;
  }, [user.id, load]);

  const deleteRecipe = useCallback(async (recipe: KitchenRecipe) => {
    const { error } = await supabase
      .from('kitchen_recipes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recipe.id);
    if (error) throw new Error(error.message);
    setRecipes((current) => current.filter((row) => row.id !== recipe.id));
  }, []);

  return {
    items,
    recipes,
    loading,
    error,
    reload: load,
    adjust,
    saveItem,
    deleteItem,
    saveRecipe,
    setPlanned,
    deleteRecipe,
    seedStaples,
  };
}

export type Kitchen = ReturnType<typeof useKitchen>;
