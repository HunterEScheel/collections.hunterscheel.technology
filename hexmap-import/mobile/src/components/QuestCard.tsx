// Port of web QuestCard — expandable card with player actions
// (Join / Set Active / Leave). Admin actions intentionally omitted.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useStore } from "../store";
import { colors } from "../theme";
import type { Quest } from "../types";
import {
  formatReward,
  formatScheduled,
  QUEST_LEVEL_COLORS,
  QUEST_LEVEL_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from "../utils/format";

interface QuestCardProps {
  quest: Quest;
  compact?: boolean;
  onJoin: (questId: string) => void;
  onLeave: (questId: string) => void;
  onSetActive: (questId: string) => void;
  /** Extra content shown when expanded (e.g. findings under completed). */
  expandedExtras?: React.ReactNode;
}

export function QuestCard({
  quest,
  compact,
  onJoin,
  onLeave,
  onSetActive,
  expandedExtras,
}: QuestCardProps) {
  const playerName = useStore((s) => s.playerName);
  const [expanded, setExpanded] = useState(false);

  const levelColor = QUEST_LEVEL_COLORS[quest.level] ?? colors.green;
  const hasJoined = playerName ? quest.players.includes(playerName) : false;
  const isClosed =
    quest.status === "completed" || quest.status === "paid_out";
  const canJoin = !hasJoined && !isClosed;
  const canSetActive =
    hasJoined && quest.status !== "in_progress" && !isClosed;
  const showBrief = !compact || expanded;

  return (
    <Pressable
      onPress={() => setExpanded((e) => !e)}
      style={[styles.card, { borderLeftColor: levelColor }]}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {quest.title}
        </Text>
        <View style={[styles.levelPill, { backgroundColor: levelColor }]}>
          <Text style={styles.levelPillText}>
            {QUEST_LEVEL_LABELS[quest.level] ?? quest.level}
          </Text>
        </View>
        <Text style={[styles.chevron, expanded && styles.chevronOpen]}>▾</Text>
      </View>

      {showBrief && (
        <>
          {quest.description !== "" && (
            <Text style={styles.description}>{quest.description}</Text>
          )}
          {quest.reward !== "" && (
            <Text style={styles.reward}>
              Reward: {formatReward(quest.reward)}
            </Text>
          )}
        </>
      )}

      <View style={styles.metaRow}>
        <Text
          style={[
            styles.status,
            { color: STATUS_COLORS[quest.status] ?? colors.textMuted },
          ]}
        >
          {STATUS_LABELS[quest.status] ?? quest.status}
        </Text>
        {quest.players.length > 0 && (
          <Text style={styles.metaItem}>
            · 👥 {quest.players.length} adventurer
            {quest.players.length === 1 ? "" : "s"}
          </Text>
        )}
        {quest.scheduledDate && (
          <Text style={styles.metaItem}>
            · 🕐 {formatScheduled(quest.scheduledDate, false)}
          </Text>
        )}
      </View>

      {expanded && (
        <View style={styles.expanded}>
          {quest.scheduledDate && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>SCHEDULED</Text>
              <Text style={styles.fieldScheduled}>
                {formatScheduled(quest.scheduledDate, true)}
              </Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>PARTY</Text>
            <Text style={styles.fieldValue}>
              {quest.players.length > 0 ? quest.players.join(", ") : "—"}
            </Text>
          </View>
          {quest.foundItems.length > 0 && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>FOUND</Text>
              <View style={{ flex: 1 }}>
                {quest.foundItems.map((it) => (
                  <Text key={it.id} style={styles.fieldValue}>
                    {it.name}
                    {it.value > 0 && (
                      <Text style={{ color: colors.gold }}> ({it.value} gp)</Text>
                    )}
                    <Text style={{ color: colors.textFaint }}>
                      {" "}
                      → {it.assignedTo ?? "unassigned"}
                    </Text>
                  </Text>
                ))}
              </View>
            </View>
          )}
          {expandedExtras}
        </View>
      )}

      {(!compact || expanded) && !isClosed && (
        <View style={styles.actions}>
          {canJoin && (
            <Pressable
              onPress={() => onJoin(quest.id)}
              style={[styles.button, { backgroundColor: colors.green }]}
            >
              <Text style={styles.buttonTextDark}>Join</Text>
            </Pressable>
          )}
          {canSetActive && (
            <Pressable
              onPress={() => onSetActive(quest.id)}
              style={[styles.button, { backgroundColor: "#facc15" }]}
            >
              <Text style={styles.buttonTextDark}>Set Active</Text>
            </Pressable>
          )}
          {hasJoined && (
            <Pressable
              onPress={() => onLeave(quest.id)}
              style={[styles.button, { backgroundColor: colors.red }]}
            >
              <Text style={styles.buttonTextLight}>Leave</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderLeftWidth: 4,
    borderRadius: 6,
    padding: 14,
    marginBottom: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: colors.text, fontWeight: "700", fontSize: 15 },
  levelPill: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  levelPillText: { color: "#000", fontSize: 10, fontWeight: "700" },
  chevron: { color: colors.textFaint, fontSize: 14 },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  description: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  reward: { color: colors.gold, fontSize: 12, marginTop: 4 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
    alignItems: "center",
  },
  status: { fontSize: 11, fontWeight: "600" },
  metaItem: { color: colors.textFaint, fontSize: 11 },
  expanded: { marginTop: 10, gap: 6 },
  fieldRow: { flexDirection: "row", gap: 8 },
  fieldLabel: {
    width: 76,
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    paddingTop: 2,
  },
  fieldValue: { flex: 1, color: colors.text, fontSize: 13 },
  fieldScheduled: { flex: 1, color: "#93c5fd", fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  button: {
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  buttonTextDark: { color: "#0a0a0a", fontSize: 12, fontWeight: "600" },
  buttonTextLight: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
