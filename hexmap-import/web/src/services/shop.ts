import { supabase } from "../supabase";
import { callAdminAction } from "../hooks/useFirebase";

const OPEN5E_BASE = "https://api.open5e.com/v1";

// --- Types ---

export interface ShopItem {
  id: string;
  itemIndex: string;
  itemName: string;
  rarity: string;
  description: string;
  quantity: number;
  price: string;
}

export interface RestockRule {
  id: string;
  itemIndex: string;
  itemName: string;
  rarity: string;
  dice: string;
  price: string;
  enabled: boolean;
}

export interface RestockSettings {
  rarity: string;
  count: number;
}

export interface PurchasedItem {
  id: string;
  itemIndex: string;
  itemName: string;
  rarity: string;
  price: string;
  description: string;
  buyer: string | null;
  purchasedAt: string;
}

export interface EquipmentItem {
  index: string;
  name: string;
  category: string;
  cost: string;
  weight: string;
  damage?: string;
  armorClass?: string;
  properties?: string[];
  stealth?: string;
  strength?: string;
}

interface MagicItemDetail {
  index: string;
  name: string;
  rarity: string;
  description: string;
}

// --- Equipment (from Open5e) ---

let equipmentCache: EquipmentItem[] | null = null;

async function fetchPaginated<T>(baseUrl: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = baseUrl;
  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as { next: string | null; results: T[] };
    results.push(...data.results);
    url = data.next;
  }
  return results;
}

export async function fetchEquipment(): Promise<EquipmentItem[]> {
  if (equipmentCache) return equipmentCache;

  const [weapons, armor] = await Promise.all([
    fetchPaginated<{
      slug: string; name: string; category: string; cost: string;
      weight: string; damage_dice: string; damage_type: string;
      properties: string[];
    }>(`${OPEN5E_BASE}/weapons/?format=json&limit=200`),
    fetchPaginated<{
      slug: string; name: string; category: string; cost: string;
      weight: string; ac_string: string; stealth_disadvantage: boolean;
      strength_requirement: number | null;
    }>(`${OPEN5E_BASE}/armor/?format=json&limit=200`),
  ]);

  const items: EquipmentItem[] = [];

  for (const w of weapons) {
    items.push({
      index: w.slug,
      name: w.name,
      category: w.category,
      cost: w.cost || "—",
      weight: w.weight || "—",
      damage: w.damage_dice ? `${w.damage_dice} ${w.damage_type}` : undefined,
      properties: w.properties?.length ? w.properties : undefined,
    });
  }

  for (const a of armor) {
    items.push({
      index: a.slug,
      name: a.name,
      category: a.category,
      cost: a.cost || "—",
      weight: a.weight || "—",
      armorClass: a.ac_string || undefined,
      stealth: a.stealth_disadvantage ? "Disadvantage" : undefined,
      strength: a.strength_requirement ? `Str ${a.strength_requirement}` : undefined,
    });
  }

  equipmentCache = items;
  return items;
}

// --- Shop Inventory (Supabase) ---

export async function fetchShopInventory(): Promise<ShopItem[]> {
  const { data, error } = await supabase
    .from("shop_inventory")
    .select("*")
    .gt("quantity", 0)
    .order("rarity")
    .order("item_name");

  if (error) {
    console.error("Shop inventory fetch error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    itemIndex: row.item_index,
    itemName: row.item_name,
    rarity: row.rarity,
    description: row.description,
    quantity: row.quantity,
    price: row.price ?? "",
  }));
}

// --- Restock Rules (Supabase) ---

export async function fetchRestockRules(): Promise<RestockRule[]> {
  const { data } = await supabase
    .from("shop_restock_rules")
    .select("*")
    .order("item_name");

  return (data ?? []).map((row) => ({
    id: row.id,
    itemIndex: row.item_index,
    itemName: row.item_name,
    rarity: row.rarity,
    dice: row.dice,
    price: row.price ?? "",
    enabled: row.enabled,
  }));
}

export async function addRestockRule(
  pin: string,
  itemIndex: string,
  itemName: string,
  rarity: string,
  dice: string
): Promise<void> {
  await callAdminAction(pin, "restock_rule_upsert", {
    itemIndex,
    itemName,
    rarity,
    dice,
    price: "",
    enabled: true,
  });
}

export async function updateRestockRule(
  pin: string,
  id: string,
  updates: Partial<{ dice: string; price: string; rarity: string; enabled: boolean }>
): Promise<void> {
  await callAdminAction(pin, "restock_rule_update", { id, ...updates });
}

export async function deleteRestockRule(pin: string, id: string): Promise<void> {
  await callAdminAction(pin, "restock_rule_delete", { id });
}

// --- Restock Settings ---

export async function fetchRestockSettings(): Promise<RestockSettings[]> {
  const { data } = await supabase
    .from("shop_restock_settings")
    .select("*")
    .order("rarity");

  return (data ?? []).map((row) => ({
    rarity: row.rarity,
    count: row.count,
  }));
}

export async function updateRestockSetting(
  pin: string,
  rarity: string,
  count: number
): Promise<void> {
  await callAdminAction(pin, "restock_setting_update", { rarity, count });
}

// --- Dice Rolling ---

export function rollDice(dice: string): number {
  // Supports: "1d4", "2d6+1", "1d4+2", "3", etc.
  const match = dice.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return parseInt(dice, 10) || 0;

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = parseInt(match[3] ?? "0", 10);

  let total = modifier;
  for (let i = 0; i < count; i++) {
    total += 1 + Math.floor(Math.random() * sides);
  }
  return Math.max(0, total);
}

// --- Restock Execution ---

// Cached magic item details from Open5e API, keyed by rarity
const rarityCache = new Map<string, MagicItemDetail[]>();

// Fetch magic items for a single rarity from Open5e (cached)
async function fetchItemsByRarity(rarity: string): Promise<MagicItemDetail[]> {
  const key = rarity.toLowerCase();
  if (rarityCache.has(key)) return rarityCache.get(key)!;

  const items: MagicItemDetail[] = [];
  let url: string | null = `${OPEN5E_BASE}/magicitems/?format=json&limit=200&rarity=${encodeURIComponent(key)}`;

  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as {
      next: string | null;
      results: { slug: string; name: string; rarity: string; desc: string }[];
    };
    for (const d of data.results) {
      items.push({
        index: d.slug,
        name: d.name,
        rarity: rarity.charAt(0).toUpperCase() + rarity.slice(1),
        description: d.desc ?? "",
      });
    }
    url = data.next;
  }

  rarityCache.set(key, items);
  return items;
}

// Fetch all items (for search) — lazy, builds from per-rarity caches
let allItemsCache: MagicItemDetail[] | null = null;

async function fetchAllMagicItems(): Promise<MagicItemDetail[]> {
  if (allItemsCache) return allItemsCache;
  const rarities = ["common", "uncommon", "rare", "very rare", "legendary"];
  const batches = await Promise.all(rarities.map((r) => fetchItemsByRarity(r)));
  allItemsCache = batches.flat();
  return allItemsCache;
}

// --- Variant expansion for "varies" rarity items ---

type Variant = { name: string; rarity: string; desc: string };

const HEALING_POTIONS: Variant[] = [
  { name: "Potion of Healing", rarity: "Common", desc: "You regain 2d4 + 2 hit points." },
  { name: "Potion of Greater Healing", rarity: "Uncommon", desc: "You regain 4d4 + 4 hit points." },
  { name: "Potion of Superior Healing", rarity: "Rare", desc: "You regain 8d4 + 8 hit points." },
  { name: "Potion of Supreme Healing", rarity: "Very Rare", desc: "You regain 10d4 + 20 hit points." },
];

const GIANT_STRENGTH_POTIONS: Variant[] = [
  { name: "Potion of Hill Giant Strength", rarity: "Uncommon", desc: "Your Strength score becomes 21 for 1 hour." },
  { name: "Potion of Frost Giant Strength", rarity: "Rare", desc: "Your Strength score becomes 23 for 1 hour." },
  { name: "Potion of Stone Giant Strength", rarity: "Rare", desc: "Your Strength score becomes 23 for 1 hour." },
  { name: "Potion of Fire Giant Strength", rarity: "Rare", desc: "Your Strength score becomes 25 for 1 hour." },
  { name: "Potion of Cloud Giant Strength", rarity: "Very Rare", desc: "Your Strength score becomes 27 for 1 hour." },
  { name: "Potion of Storm Giant Strength", rarity: "Legendary", desc: "Your Strength score becomes 29 for 1 hour." },
];

const BELT_GIANT_STRENGTH: Variant[] = [
  { name: "Belt of Hill Giant Strength", rarity: "Rare", desc: "Your Strength score is 21 while wearing this belt. Requires attunement." },
  { name: "Belt of Frost Giant Strength", rarity: "Very Rare", desc: "Your Strength score is 23 while wearing this belt. Requires attunement." },
  { name: "Belt of Stone Giant Strength", rarity: "Very Rare", desc: "Your Strength score is 23 while wearing this belt. Requires attunement." },
  { name: "Belt of Fire Giant Strength", rarity: "Very Rare", desc: "Your Strength score is 25 while wearing this belt. Requires attunement." },
  { name: "Belt of Cloud Giant Strength", rarity: "Legendary", desc: "Your Strength score is 27 while wearing this belt. Requires attunement." },
  { name: "Belt of Storm Giant Strength", rarity: "Legendary", desc: "Your Strength score is 29 while wearing this belt. Requires attunement." },
];

const SCROLL_RARITY_BY_LEVEL: Record<number, string> = {
  0: "Common", 1: "Common", 2: "Uncommon", 3: "Uncommon",
  4: "Rare", 5: "Rare", 6: "Very Rare", 7: "Very Rare",
  8: "Very Rare", 9: "Legendary",
};

const RARITY_SPELL_LEVELS: Record<string, number[]> = {
  common: [0, 1], uncommon: [2, 3], rare: [4, 5],
  "very rare": [6, 7, 8], legendary: [9],
};

const spellLevelCache = new Map<number, { slug: string; name: string }[]>();

async function fetchSpellsForLevel(level: number): Promise<{ slug: string; name: string }[]> {
  if (spellLevelCache.has(level)) return spellLevelCache.get(level)!;

  const spells: { slug: string; name: string }[] = [];
  let url: string | null = `${OPEN5E_BASE}/spells/?format=json&limit=200&level_int=${level}`;
  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as { next: string | null; results: { slug: string; name: string }[] };
    for (const s of data.results) spells.push({ slug: s.slug, name: s.name });
    url = data.next;
  }

  spellLevelCache.set(level, spells);
  return spells;
}

// Expand a "varies" item into a specific variant for the target rarity
async function expandVariant(
  slug: string,
  targetRarity: string
): Promise<MagicItemDetail | null> {
  const pick = <T extends { rarity: string }>(variants: T[]): T | null => {
    const match = variants.filter((v) => v.rarity.toLowerCase() === targetRarity.toLowerCase());
    return match.length > 0 ? match[Math.floor(Math.random() * match.length)] : null;
  };

  if (slug === "potion-of-healing") {
    const v = pick(HEALING_POTIONS);
    if (!v) return null;
    return { index: v.name.toLowerCase().replace(/\s+/g, "-"), name: v.name, rarity: v.rarity, description: v.desc };
  }

  if (slug === "potion-of-giant-strength") {
    const v = pick(GIANT_STRENGTH_POTIONS);
    if (!v) return null;
    return { index: v.name.toLowerCase().replace(/\s+/g, "-"), name: v.name, rarity: v.rarity, description: v.desc };
  }

  if (slug === "belt-of-giant-strength") {
    const v = pick(BELT_GIANT_STRENGTH);
    if (!v) return null;
    return { index: v.name.toLowerCase().replace(/\s+/g, "-"), name: v.name, rarity: v.rarity, description: v.desc };
  }

  if (slug === "spell-scroll") {
    const levels = RARITY_SPELL_LEVELS[targetRarity.toLowerCase()] ?? [0, 1];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const pool = await fetchSpellsForLevel(level);
    if (pool.length === 0) return null;
    const spell = pool[Math.floor(Math.random() * pool.length)];
    return {
      index: `spell-scroll-${spell.slug}`,
      name: `Spell Scroll: ${spell.name} (${level === 0 ? "Cantrip" : `Level ${level}`})`,
      rarity: SCROLL_RARITY_BY_LEVEL[level] ?? targetRarity,
      description: `A spell scroll bearing the spell ${spell.name}.`,
    };
  }

  return null;
}

// Slugs that need variant expansion — they have rarity "varies" in Open5e
const VARIANT_SLUGS = new Set([
  "spell-scroll", "potion-of-healing", "potion-of-giant-strength", "belt-of-giant-strength",
]);

const DEFAULT_PRICES: Record<string, string> = {
  common: "75 gp",
  uncommon: "300 gp",
  rare: "2,500 gp",
  "very rare": "25,000 gp",
  legendary: "75,000 gp",
  artifact: "Priceless",
};

function defaultPrice(rarity: string): string {
  return DEFAULT_PRICES[rarity.toLowerCase()] ?? "Ask DM";
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function executeRestock(pin: string): Promise<{ added: number }> {
  const [settings, rules, allItems, currentInventory] = await Promise.all([
    fetchRestockSettings(),
    fetchRestockRules(),
    fetchAllMagicItems(),
    fetchShopInventory(),
  ]);

  const existingByIndex = new Map<string, ShopItem>();
  for (const item of currentInventory) {
    existingByIndex.set(item.itemIndex, item);
  }

  const inserts: {
    item_index: string;
    item_name: string;
    rarity: string;
    description: string;
    quantity: number;
    price: string;
  }[] = [];

  const ruleIndexes = new Set(
    rules.filter((r) => r.enabled).map((r) => r.itemIndex)
  );

  // Track quantity bumps so we issue one update per existing row
  const bumps = new Map<string, number>(); // id -> delta

  for (const setting of settings) {
    if (setting.count <= 0) continue;
    const pool = await fetchItemsByRarity(setting.rarity);
    const filtered = pool.filter((i) => !ruleIndexes.has(i.index));

    const variantCount = Math.max(1, Math.floor(setting.count / 10));
    const expandedVariants: MagicItemDetail[] = [];
    for (const slug of VARIANT_SLUGS) {
      for (let i = 0; i < variantCount; i++) {
        const expanded = await expandVariant(slug, setting.rarity);
        if (expanded) expandedVariants.push(expanded);
      }
    }

    const combined = shuffle([...filtered, ...expandedVariants]);
    const picked = combined.slice(0, setting.count);

    for (const item of picked) {
      const existing = existingByIndex.get(item.index);
      if (existing) {
        bumps.set(existing.id, (bumps.get(existing.id) ?? 0) + 1);
        existing.quantity += 1;
      } else {
        inserts.push({
          item_index: item.index,
          item_name: item.name,
          rarity: item.rarity,
          description: item.description,
          quantity: 1,
          price: defaultPrice(item.rarity),
        });
      }
    }
  }

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const qty = rollDice(rule.dice);
    if (qty <= 0) continue;

    if (VARIANT_SLUGS.has(rule.itemIndex)) {
      for (let i = 0; i < qty; i++) {
        const expanded = await expandVariant(rule.itemIndex, rule.rarity);
        if (!expanded) continue;
        const existing = existingByIndex.get(expanded.index);
        if (existing) {
          bumps.set(existing.id, (bumps.get(existing.id) ?? 0) + 1);
          existing.quantity += 1;
        } else {
          const placeholder: ShopItem = {
            id: crypto.randomUUID(),
            itemIndex: expanded.index,
            itemName: expanded.name,
            rarity: expanded.rarity,
            description: expanded.description,
            quantity: 1,
            price: rule.price || defaultPrice(expanded.rarity),
          };
          existingByIndex.set(expanded.index, placeholder);
          inserts.push({
            item_index: expanded.index,
            item_name: expanded.name,
            rarity: expanded.rarity,
            description: expanded.description,
            quantity: 1,
            price: rule.price || defaultPrice(expanded.rarity),
          });
        }
      }
    } else {
      const detail = allItems.find((i) => i.index === rule.itemIndex);
      const itemDesc = detail?.description ?? "";
      const existing = existingByIndex.get(rule.itemIndex);
      if (existing) {
        bumps.set(existing.id, (bumps.get(existing.id) ?? 0) + qty);
        existing.quantity += qty;
      } else {
        inserts.push({
          item_index: rule.itemIndex,
          item_name: rule.itemName,
          rarity: rule.rarity,
          description: itemDesc,
          quantity: qty,
          price: rule.price || defaultPrice(rule.rarity),
        });
      }
    }
  }

  // Apply all writes via admin-action (one quantity-update per existing row,
  // one batch insert for new items).
  const currentQtyById = new Map<string, number>();
  for (const item of currentInventory) currentQtyById.set(item.id, item.quantity);
  await Promise.all(
    [...bumps.entries()].map(([id, delta]) =>
      callAdminAction(pin, "shop_update_quantity", {
        id,
        quantity: (currentQtyById.get(id) ?? 0) + delta,
      })
    )
  );
  if (inserts.length > 0) {
    await callAdminAction(pin, "shop_insert_items", { items: inserts });
  }

  return { added: inserts.length };
}

export async function purchaseItem(
  id: string,
  buyer?: string | null
): Promise<void> {
  // Player-facing: goes through a Postgres RPC that decrements or deletes
  // and logs the purchase into shop_purchases with the buyer's name.
  const { error } = await supabase.rpc("purchase_shop_item", {
    p_id: id,
    p_buyer: buyer ?? null,
  });
  if (error) throw new Error(`purchase_shop_item failed: ${error.message}`);
}

/**
 * Purchase a piece of equipment (weapon, armor, or other Open5e item).
 * Equipment isn't stocked in shop_inventory — it's fetched from Open5e — so
 * we route through a dedicated RPC that takes the item's snapshot fields
 * directly and logs the purchase into shop_purchases.
 */
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

/**
 * Sell a purchased item back for 75% of its gp value. Credits the owner's
 * character gold and removes the item. Returns the gp credited.
 */
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

/** Dispose of a purchased item (removes it, no gold back). */
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

export async function fetchShopPurchases(): Promise<PurchasedItem[]> {
  const { data, error } = await supabase
    .from("shop_purchases")
    .select("*")
    .order("purchased_at", { ascending: false });
  if (error) {
    console.error("Shop purchases fetch error:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    itemIndex: row.item_index,
    itemName: row.item_name,
    rarity: row.rarity,
    price: row.price ?? "",
    description: row.description ?? "",
    buyer: row.buyer,
    purchasedAt: row.purchased_at,
  }));
}

export async function updateShopItemPrice(
  pin: string,
  id: string,
  price: string
): Promise<void> {
  await callAdminAction(pin, "shop_update_price", { id, price });
}

// --- Magic Item Search (for adding restock rules) ---

export async function searchMagicItems(
  query: string
): Promise<MagicItemDetail[]> {
  const all = await fetchAllMagicItems();
  const q = query.toLowerCase();
  return all.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 20);
}
