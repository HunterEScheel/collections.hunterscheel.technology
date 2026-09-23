// Expanded combat view — used both inside the floating overlay window and
// embedded as a normal screen section in the main app.
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addInitiativeEntry,
  clearInitiativeTracker,
} from "../data/initiative";
import { useStore } from "../store";
import { colors } from "../theme";
import { AddCreature } from "./AddCreature";
import { EntryRow } from "./EntryRow";
import { focusableProps } from "./focusable";

interface CombatPanelProps {
  /** True when rendered inside the main app instead of the overlay window. */
  embedded?: boolean;
  onCollapse?: () => void;
}

export function CombatPanel({ embedded, onCollapse }: CombatPanelProps) {
  const entries = useStore((s) => s.entries);
  const playerName = useStore((s) => s.playerName);
  const adminPin = useStore((s) => s.adminPin);
  const characters = useStore((s) => s.characters);
  const connectionState = useStore((s) => s.connectionState);
  const isAdmin = adminPin != null;

  const [initiative, setInitiative] = useState("");
  const [adding, setAdding] = useState(false);
  // One expanded row at a time (GM detail view).
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const alreadyJoined =
    playerName != null &&
    entries.some((e) => !e.isCreature && e.name === playerName);

  async function handleJoin() {
    const value = parseInt(initiative, 10);
    if (isNaN(value) || !playerName) return;
    setAdding(true);
    // Snapshot the character's HP/AC into the encounter, same as web.
    const character = characters.get(playerName);
    const stats =
      character?.hitPoints != null
        ? { hp: character.hitPoints, ac: character.armorClass ?? undefined }
        : undefined;
    try {
      await addInitiativeEntry(playerName, value, false, stats);
      setInitiative("");
    } catch (err) {
      Alert.alert("Join failed", String((err as Error).message));
    } finally {
      setAdding(false);
    }
  }

  function clearAll() {
    if (!adminPin) return;
    Alert.alert("Clear all?", "Remove every entry from the tracker.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () =>
          clearInitiativeTracker(adminPin).catch((err) =>
            Alert.alert("Admin write rejected", String((err as Error).message))
          ),
      },
    ]);
  }

  const connectionColor =
    connectionState === "connected"
      ? colors.green
      : connectionState === "connecting"
      ? colors.gold
      : colors.red;

  return (
    <View style={[styles.panel, !embedded && styles.overlayPanel]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: connectionColor }]} />
        <Text style={styles.title}>Initiative</Text>
        {isAdmin && entries.length > 0 && (
          <Pressable onPress={clearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </Pressable>
        )}
        {!embedded && (
          <Pressable onPress={onCollapse} hitSlop={10} style={styles.collapse}>
            <Text style={styles.collapseText}>—</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {playerName && !alreadyJoined && (
          <View style={styles.joinRow}>
            <Text style={styles.joinName} numberOfLines={1}>
              {playerName}
            </Text>
            <TextInput
              value={initiative}
              onChangeText={setInitiative}
              placeholder="Initiative roll"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              style={styles.joinInput}
              {...focusableProps}
            />
            <Pressable
              onPress={handleJoin}
              disabled={adding || initiative === ""}
              style={[
                styles.joinButton,
                { backgroundColor: adding ? colors.greenDark : colors.green },
              ]}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </Pressable>
          </View>
        )}
        {!playerName && (
          <Text style={styles.note}>
            Set your player name in the app to join initiative.
          </Text>
        )}
        {alreadyJoined && (
          <Text style={[styles.note, { color: colors.green }]}>
            You're in the turn order.
          </Text>
        )}

        {isAdmin && <AddCreature />}

        {entries.length === 0 ? (
          <Text style={styles.empty}>
            No encounter running. An admin can start one from the map.
          </Text>
        ) : (
          entries.map((entry, i) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              position={i + 1}
              expanded={expandedId === entry.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === entry.id ? null : entry.id))
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: colors.bg },
  overlayPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, color: colors.text, fontWeight: "700", fontSize: 15 },
  clearButton: {
    backgroundColor: colors.redDark,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clearButtonText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  collapse: { paddingHorizontal: 6 },
  collapseText: { color: colors.textMuted, fontSize: 16, fontWeight: "700" },
  scroll: { flex: 1, padding: 10 },
  joinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  joinName: { color: colors.textMuted, fontSize: 13, maxWidth: 110 },
  joinInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: 14,
  },
  joinButton: {
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  joinButtonText: { color: "#000", fontSize: 13, fontWeight: "600" },
  note: { color: colors.textFaint, fontSize: 12, marginBottom: 12 },
  empty: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: "center",
    marginTop: 32,
  },
});
