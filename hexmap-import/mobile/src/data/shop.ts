// Port of web src/services/shop.ts — player-facing parts only (no restock,
// no price editing, no purchases log).
import { supabase } from "../supabase";
import type { EquipmentItem, PurchasedItem, ShopItem } from "../types";

const OPEN5E_V1 = "https://api.open5e.com/v1";

// --- Equipment (Open5e v1, infinite stock) ---

interface V1Weapon {
  slug: string;
  name: string;
  category: string;
  cost: string | null;
  weight: string | null;
  damage_dice: string | null;
  damage_type: string | null;
  properties: string[] | null;
}

interface V1Armor {
  slug: string;
  name: string;
  category: string;
  cost: string | null;
  weight: string | null;
  ac_string: string | null;
  stealth_disadvantage: boolean;
  strength_requirement: number | null;
}

async function fetchAll<T>(url: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next);
    const data = (await res.json()) as { next: string | null; results: T[] };
    out.push(...data.results);
    next = data.next;
  }
  return out;
}

let equipmentCache: EquipmentItem[] | null = null;

export async function fetchEquipment(): Promise<EquipmentItem[]> {
  if (equipmentCache) return equipmentCache;

  const [weapons, armor] = await Promise.all([
    fetchAll<V1Weapon>(`${OPEN5E_V1}/weapons/?format=json&limit=200`),
    fetchAll<V1Armor>(`${OPEN5E_V1}/armor/?format=json&limit=200`),
  ]);

  const items: EquipmentItem[] = [
    ...weapons.map((w) => ({
      index: w.slug,
      name: w.name,
      category: w.category,
      cost: w.cost ?? "—",
      weight: w.weight ?? "—",
      damage:
        w.damage_dice && w.damage_type
          ? `${w.damage_dice} ${w.damage_type}`
          : undefined,
      properties:
        w.properties && w.properties.length > 0 ? w.properties : undefined,
    })),
    ...armor.map((a) => ({
      index: a.slug,
      name: a.name,
      category: a.category,
      cost: a.cost ?? "—",
      weight: a.weight ?? "—",
      armorClass: a.ac_string ?? undefined,
      stealth: a.stealth_disadvantage ? "Disadvantage" : undefined,
      strength: a.strength_requirement
        ? `Str ${a.strength_requirement}`
        : undefined,
    })),
  ];

  equipmentCache = items;
  return items;
}

export async function purchaseEquipment(
  buyer: string,
  item: EquipmentItem
): Promise<void> {
  const parts: string[] = [];
  if (item.damage) parts.push(`Damage: ${item.damage}`);
  if (item.armorClass) parts.push(`AC: ${item.armorClass}`);
  if (item.weight && item.weight !== "—") parts.push(`Weight: ${item.weight}`);
  if (item.properties?.length)
    parts.push(`Properties: ${item.properties.join(", ")}`);
  if (item.stealth) parts.push(item.stealth);
  if (item.strength) parts.push(item.strength);

  const { error } = await supabase.rpc("purchase_equipment", {
    p_buyer: buyer,
    p_item_index: item.index,
    p_item_name: item.name,
    p_category: item.category,
    p_cost: item.cost,
    p_description: parts.join("\n"),
  });
  if (error) throw new Error(error.message);
}

// --- Magic items (Supabase shop_inventory) ---

function mapShopItem(row: Record<string, unknown>): ShopItem {
  return {
    id: row.id as string,
    itemIndex: row.item_index as string,
    itemName: row.item_name as string,
    rarity: (row.rarity as string) ?? "",
    description: (row.description as string) ?? "",
    quantity: (row.quantity as number) ?? 0,
    price: (row.price as string) ?? "",
  };
}

export async function fetchShopInventory(): Promise<ShopItem[]> {
  const { data, error } = await supabase
    .from("shop_inventory")
    .select("*")
    .gt("quantity", 0)
    .order("rarity")
    .order("item_name");
  if (error) {
    console.warn("fetchShopInventory failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapShopItem);
}

export async function purchaseItem(
  id: string,
  buyer?: string | null
): Promise<void> {
  const { error } = await supabase.rpc("purchase_shop_item", {
    p_id: id,
    p_buyer: buyer ?? null,
  });
  if (error) throw new Error(`purchase_shop_item failed: ${error.message}`);
}

// --- Purchases (My Items) ---

function mapPurchase(row: Record<string, unknown>): PurchasedItem {
  return {
    id: row.id as string,
    itemIndex: row.item_index as string,
    itemName: row.item_name as string,
    rarity: (row.rarity as string) ?? "",
    price: (row.price as string) ?? "",
    description: (row.description as string) ?? "",
    buyer: (row.buyer as string) ?? null,
    purchasedAt: row.purchased_at as string,
  };
}

export async function fetchShopPurchases(): Promise<PurchasedItem[]> {
  const { data, error } = await supabase
    .from("shop_purchases")
    .select("*")
    .order("purchased_at", { ascending: false });
  if (error) {
    console.warn("fetchShopPurchases failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapPurchase);
}

export async function sellPurchase(
  id: string,
  player: string
): Promise<number> {
  const { data, error } = await supabase.rpc("sell_purchase", {
    p_id: id,
    p_player: player,
  });
  if (error) throw new Error(`sell_purchase failed: ${error.message}`);
  return Number(data) || 0;
}

export async function disposePurchase(
  id: string,
  player: string
): Promise<void> {
  const { error } = await supabase.rpc("dispose_purchase", {
    p_id: id,
    p_player: player,
  });
  if (error) throw new Error(`dispose_purchase failed: ${error.message}`);
}

/** Digits-only price parse; 0 when not numeric. Sell credit = 75%. */
export function parsePriceValue(price: string): number {
  const n = parseInt(price.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}
