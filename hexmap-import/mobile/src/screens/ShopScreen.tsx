// Port of web Shop (player tabs only): Equipment (Open5e, infinite stock)
// and Magic Items (shop_inventory, optimistic buy).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  fetchEquipment,
  fetchShopInventory,
  purchaseEquipment,
  purchaseItem,
} from "../data/shop";
import { useStore } from "../store";
import { colors } from "../theme";
import type { EquipmentItem, ShopItem } from "../types";

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  "very rare": "#a855f7",
  legendary: "#fbbf24",
};
const RARITY_ORDER = ["common", "uncommon", "rare", "very rare", "legendary"];

type Tab = "equipment" | "magic";

interface ShopScreenProps {
  onBack: () => void;
}

export function ShopScreen({ onBack }: ShopScreenProps) {
  const playerName = useStore((s) => s.playerName);
  const [tab, setTab] = useState<Tab>("equipment");

  // Equipment
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [equipLoading, setEquipLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [buyingIndex, setBuyingIndex] = useState<string | null>(null);

  // Magic items
  const [inventory, setInventory] = useState<ShopItem[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEquipment()
      .then(setEquipment)
      .finally(() => setEquipLoading(false));
  }, []);

  const loadInventory = useCallback(async () => {
    setInventory(await fetchShopInventory());
    setInvLoading(false);
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredEquipment = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter(
      (e) =>
        e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    );
  }, [equipment, filter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ShopItem[]>();
    for (const item of inventory) {
      const r = item.rarity.toLowerCase();
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r)!.push(item);
    }
    return groups;
  }, [inventory]);

  async function buyEquipment(item: EquipmentItem) {
    if (!playerName) return;
    setBuyingIndex(item.index);
    try {
      await purchaseEquipment(playerName, item);
    } catch (err) {
      Alert.alert("Purchase failed", String((err as Error).message));
    } finally {
      setBuyingIndex(null);
    }
  }

  async function buyMagicItem(item: ShopItem) {
    if (!playerName) return;
    setBuyingId(item.id);
    // Optimistic: decrement/remove locally, revert by refetch on failure.
    setInventory((prev) =>
      item.quantity <= 1
        ? prev.filter((i) => i.id !== item.id)
        : prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
          )
    );
    try {
      await purchaseItem(item.id, playerName);
    } catch (err) {
      await loadInventory();
      Alert.alert("Purchase failed", String((err as Error).message));
    } finally {
      setBuyingId(null);
    }
  }

  function equipNotes(e: EquipmentItem): string {
    const parts = [
      ...(e.properties ?? []),
      ...(e.stealth ? [e.stealth] : []),
      ...(e.strength ? [e.strength] : []),
    ];
    return parts.length > 0 ? parts.join(", ") : "—";
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Shop" onBack={onBack} />

      <View style={styles.tabs}>
        {(
          [
            ["equipment", "Equipment"],
            ["magic", "Magic Items"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!playerName && (
        <Text style={styles.nameNote}>
          Set a player name on the homepage to buy items.
        </Text>
      )}

      {tab === "equipment" && (
        <View style={styles.body}>
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter by name or category..."
            placeholderTextColor={colors.textFaint}
            style={styles.search}
          />
          <ScrollView contentContainerStyle={styles.listContent}>
            {equipLoading ? (
              <Text style={styles.loading}>Stocking shelves...</Text>
            ) : (
              filteredEquipment.map((e) => (
                <View key={e.index} style={styles.equipRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{e.name}</Text>
                    <Text style={styles.itemMeta}>
                      {e.category} · {e.damage ?? e.armorClass ?? "—"} ·{" "}
                      {e.weight}
                    </Text>
                    {equipNotes(e) !== "—" && (
                      <Text style={styles.itemNotes}>{equipNotes(e)}</Text>
                    )}
                  </View>
                  <Text style={styles.price}>{e.cost}</Text>
                  {playerName && (
                    <Pressable
                      onPress={() => buyEquipment(e)}
                      disabled={buyingIndex === e.index}
                      style={styles.buyButton}
                    >
                      <Text style={styles.buyButtonText}>
                        {buyingIndex === e.index ? "Buying…" : "Buy"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {tab === "magic" && (
        <ScrollView contentContainerStyle={styles.listContent}>
          {invLoading ? (
            <Text style={styles.loading}>Stocking shelves...</Text>
          ) : inventory.length === 0 ? (
            <Text style={styles.loading}>The shop is empty.</Text>
          ) : (
            RARITY_ORDER.filter((r) => grouped.has(r)).map((rarity) => (
              <View key={rarity} style={styles.rarityGroup}>
                <Text
                  style={[
                    styles.rarityHeading,
                    { color: RARITY_COLORS[rarity] ?? colors.textMuted },
                  ]}
                >
                  {rarity.charAt(0).toUpperCase() + rarity.slice(1)}{" "}
                  <Text style={styles.rarityCount}>
                    ({grouped.get(rarity)!.length})
                  </Text>
                </Text>
                {grouped.get(rarity)!.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setExpandedId((cur) => (cur === item.id ? null : item.id))
                    }
                    style={styles.magicRow}
                  >
                    <View style={styles.magicMain}>
                      <Text style={[styles.itemName, { flex: 1 }]}>
                        {item.itemName}
                      </Text>
                      <Text style={styles.price}>
                        {item.price === "" ? "Ask DM" : item.price}
                      </Text>
                      <Text style={styles.quantity}>×{item.quantity}</Text>
                      {playerName && (
                        <Pressable
                          onPress={() => buyMagicItem(item)}
                          disabled={buyingId === item.id}
                          style={styles.buyButton}
                        >
                          <Text style={styles.buyButtonText}>
                            {buyingId === item.id ? "Buying…" : "Buy"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    {expandedId === item.id && item.description !== "" && (
                      <Text style={styles.description}>{item.description}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.indigo },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: colors.text },
  nameNote: {
    color: colors.gold,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  body: { flex: 1 },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
    margin: 12,
    marginBottom: 4,
  },
  listContent: { padding: 12, paddingBottom: 40 },
  loading: { color: colors.textFaint, fontSize: 13, textAlign: "center", marginTop: 24 },
  equipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  itemName: { color: colors.text, fontSize: 14, fontWeight: "600" },
  itemMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  itemNotes: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  price: { color: colors.gold, fontSize: 12, fontWeight: "600" },
  quantity: { color: colors.textFaint, fontSize: 12 },
  buyButton: {
    backgroundColor: colors.green,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  buyButtonText: { color: "#0a0a0a", fontSize: 11, fontWeight: "700" },
  rarityGroup: { marginBottom: 16 },
  rarityHeading: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  rarityCount: { color: colors.textFaint, fontSize: 12, fontWeight: "400" },
  magicRow: {
    backgroundColor: colors.card,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  magicMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    padding: 8,
  },
});
