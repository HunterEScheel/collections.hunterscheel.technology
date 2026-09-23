// Port of web MyItems — purse cards, quest loot, purchases (sell/dispose).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  disposePurchase,
  fetchShopPurchases,
  parsePriceValue,
  sellPurchase,
} from "../data/shop";
import { useStore } from "../store";
import { colors } from "../theme";
import type { PurchasedItem } from "../types";

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  "very rare": "#a855f7",
  legendary: "#fbbf24",
};

interface ItemsScreenProps {
  onBack: () => void;
  onSetPlayerName: () => void;
  onOpenCharacter: () => void;
}

export function ItemsScreen({
  onBack,
  onSetPlayerName,
  onOpenCharacter,
}: ItemsScreenProps) {
  const playerName = useStore((s) => s.playerName);
  const characters = useStore((s) => s.characters);
  const quests = useStore((s) => s.quests);
  const character = playerName ? characters.get(playerName) : undefined;

  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setPurchases(await fetchShopPurchases());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const myPurchases = useMemo(
    () => purchases.filter((p) => p.buyer === playerName),
    [purchases, playerName]
  );

  const questLoot = useMemo(() => {
    if (!playerName) return [];
    const loot: {
      id: string;
      name: string;
      description: string;
      value: number;
      questTitle: string;
    }[] = [];
    for (const q of quests) {
      for (const it of q.foundItems) {
        if (it.assignedTo === playerName) {
          loot.push({ ...it, questTitle: q.title });
        }
      }
    }
    return loot;
  }, [quests, playerName]);

  const totalSpent = useMemo(
    () => myPurchases.reduce((sum, p) => sum + parsePriceValue(p.price), 0),
    [myPurchases]
  );

  function sell(item: PurchasedItem) {
    if (!playerName || busyId) return;
    const credit = Math.floor(parsePriceValue(item.price) * 0.75);
    Alert.alert(`Sell "${item.itemName}" for ${credit} gp?`, "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sell",
        onPress: async () => {
          setBusyId(item.id);
          try {
            await sellPurchase(item.id, playerName);
            await reload();
          } catch (err) {
            Alert.alert("Sell failed", String((err as Error).message));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  function dispose(item: PurchasedItem) {
    if (!playerName || busyId) return;
    Alert.alert(`Dispose of "${item.itemName}"?`, "No gold is returned.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dispose",
        style: "destructive",
        onPress: async () => {
          setBusyId(item.id);
          try {
            await disposePurchase(item.id, playerName);
            await reload();
          } catch (err) {
            Alert.alert("Dispose failed", String((err as Error).message));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  if (!playerName) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="My Items" onBack={onBack} />
        <View style={styles.namePrompt}>
          <Text style={styles.namePromptText}>
            Set a player name to see your inventory.
          </Text>
          <Pressable onPress={onSetPlayerName} style={styles.nameButton}>
            <Text style={styles.nameButtonText}>Set Player Name</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My Items" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.purseRow}>
          <PurseCard label="Character" value={playerName} accent={colors.purple} />
          <PurseCard
            label="Gold on hand"
            value={`${(character?.gold ?? 0).toLocaleString()} gp`}
            accent={colors.gold}
            onPress={onOpenCharacter}
          />
          <PurseCard
            label="Total spent"
            value={`${totalSpent.toLocaleString()} gp`}
            accent="#60a5fa"
          />
          <PurseCard
            label="Items purchased"
            value={String(myPurchases.length)}
            accent={colors.green}
          />
        </View>

        {questLoot.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Quest Loot</Text>
            {questLoot.map((it) => (
              <View key={it.id} style={styles.lootCard}>
                <View style={styles.lootHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.name}</Text>
                    <Text style={styles.lootQuest}>{it.questTitle}</Text>
                  </View>
                  {it.value > 0 && (
                    <Text style={styles.price}>{it.value} gp</Text>
                  )}
                </View>
                {it.description !== "" && (
                  <Text style={styles.lootDescription}>{it.description}</Text>
                )}
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Purchases</Text>
        {myPurchases.length === 0 ? (
          <Text style={styles.empty}>Nothing purchased yet.</Text>
        ) : (
          myPurchases.map((item) => {
            const rarityColor =
              RARITY_COLORS[item.rarity.toLowerCase()] ?? "#9ca3af";
            const expanded = expandedId === item.id;
            const sellValue = Math.floor(parsePriceValue(item.price) * 0.75);
            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  setExpandedId((cur) => (cur === item.id ? null : item.id))
                }
                style={[styles.purchaseCard, { borderLeftColor: rarityColor }]}
              >
                <View style={styles.purchaseHeader}>
                  {item.rarity !== "" && (
                    <View
                      style={[
                        styles.rarityChip,
                        { borderColor: `${rarityColor}55` },
                      ]}
                    >
                      <Text style={[styles.rarityChipText, { color: rarityColor }]}>
                        {item.rarity.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.itemName, { flex: 1 }]}>
                    {item.itemName}
                  </Text>
                  <Text style={styles.price}>{item.price}</Text>
                </View>
                <Text style={styles.purchaseDate}>
                  {new Date(item.purchasedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
                {expanded && (
                  <View style={styles.purchaseExpanded}>
                    <Text style={styles.description}>
                      {item.description !== ""
                        ? item.description
                        : "No description on file."}
                    </Text>
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => sell(item)}
                        disabled={busyId != null}
                        style={[styles.actionButton, { backgroundColor: colors.gold }]}
                      >
                        <Text style={styles.actionTextDark}>
                          Sell ({sellValue} gp)
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => dispose(item)}
                        disabled={busyId != null}
                        style={[styles.actionButton, { backgroundColor: "#7f1d1d" }]}
                      >
                        <Text style={styles.actionTextLight}>Dispose</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function PurseCard({
  label,
  value,
  accent,
  onPress,
}: {
  label: string;
  value: string;
  accent: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.purseCard, { borderLeftColor: accent }]}
    >
      <Text style={styles.purseLabel}>{label}</Text>
      <Text style={styles.purseValue} numberOfLines={1}>
        {value}
      </Text>
      {onPress && <Text style={styles.purseHint}>Edit →</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  namePrompt: {
    margin: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  namePromptText: { color: colors.textMuted, fontSize: 14 },
  nameButton: {
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  nameButtonText: { color: "#000", fontSize: 13, fontWeight: "600" },
  purseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  purseCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 10,
  },
  purseLabel: { color: colors.textFaint, fontSize: 11 },
  purseValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  purseHint: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  sectionTitle: {
    color: colors.purple,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },
  lootCard: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.purple,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  lootHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  lootQuest: { color: colors.textFaint, fontSize: 11 },
  lootDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  itemName: { color: colors.text, fontSize: 14, fontWeight: "600" },
  price: { color: colors.gold, fontSize: 12, fontWeight: "600" },
  empty: { color: colors.textFaint, fontSize: 13 },
  purchaseCard: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  purchaseHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rarityChip: {
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  rarityChipText: { fontSize: 9, fontWeight: "700" },
  purchaseDate: { color: colors.textFaint, fontSize: 10, marginTop: 4 },
  purchaseExpanded: { marginTop: 8, gap: 8 },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionButton: {
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  actionTextDark: { color: "#0a0a0a", fontSize: 12, fontWeight: "600" },
  actionTextLight: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
