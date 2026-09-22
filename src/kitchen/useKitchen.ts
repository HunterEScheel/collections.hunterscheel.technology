import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { KitchenItem } from './types';
import { effectiveStep } from './pantry';

/**
 * Everything in the signed-in user's kitchen.
 *
 * The whole pantry is a few hundred rows at most, so it is fetched once and
 * filtered in the browser — the same choice the Android app makes, and it keeps
 * the search instant instead of round-tripping every keystroke.
 */
export function useKitchen() {
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kitchen_items')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    if (error) setError(error.message);
    else {
      setItems((data ?? []) as KitchenItem[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Nudges a quantity, clamped at zero. The row is updated locally first so the
   * button feels instant, and put back if the write fails.
   */
  const adjust = useCallback(async (item: KitchenItem, direction: 1 | -1) => {
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
  }, []);

  return { items, loading, error, reload: load, adjust };
}
