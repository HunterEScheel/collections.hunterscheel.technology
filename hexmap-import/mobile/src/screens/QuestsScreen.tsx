// Port of web ActiveQuests: In Progress / Recruiting / Completed buckets,
// join flow (date picker for the first joiner), leave, set active, findings.
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DatePickerModal } from "../components/DatePickerModal";
import { QuestCard } from "../components/QuestCard";
import { QuestFindingsList } from "../components/QuestFindingsList";
import { ScreenHeader } from "../components/ScreenHeader";
import { joinQuest, leaveQuest, setQuestActive } from "../data/guild";
import { useStore } from "../store";
import { colors } from "../theme";
import type { Quest } from "../types";

interface QuestsScreenProps {
  onBack: () => void;
  onSetPlayerName: () => void;
}

export function QuestsScreen({ onBack, onSetPlayerName }: QuestsScreenProps) {
  const quests = useStore((s) => s.quests);
  const playerName = useStore((s) => s.playerName);
  const [showCompleted, setShowCompleted] = useState(false);
  const [dateQuestId, setDateQuestId] = useState<string | null>(null);

  const { inProgress, recruiting, completed } = useMemo(() => {
    const done: Quest[] = [];
    const active: Quest[] = [];
    const recruit: Quest[] = [];
    for (const q of quests) {
      if (q.status === "completed" || q.status === "paid_out") done.push(q);
      else if (q.status === "in_progress") active.push(q);
      else if (q.players.length > 0) recruit.push(q);
    }
    done.sort((a, b) =>
      (b.completedAt ?? b.scheduledDate ?? "").localeCompare(
        a.completedAt ?? a.scheduledDate ?? ""
      )
    );
    return { inProgress: active, recruiting: recruit, completed: done };
  }, [quests]);

  function handleJoin(questId: string) {
    if (!playerName) {
      onSetPlayerName();
      return;
    }
    const quest = quests.find((q) => q.id === questId);
    if (quest && quest.players.length === 0) {
      // First joiner picks the session date.
      setDateQuestId(questId);
    } else {
      joinQuest(questId, playerName).catch((err) =>
        Alert.alert("Join failed", String((err as Error).message))
      );
    }
  }

  function handleDateConfirm(iso: string) {
    if (dateQuestId && playerName) {
      joinQuest(dateQuestId, playerName, iso).catch((err) =>
        Alert.alert("Join failed", String((err as Error).message))
      );
    }
    setDateQuestId(null);
  }

  function handleLeave(questId: string) {
    if (!playerName) return;
    leaveQuest(questId, playerName).catch((err) =>
      Alert.alert("Leave failed", String((err as Error).message))
    );
  }

  function handleSetActive(questId: string) {
    if (!playerName) return;
    setQuestActive(questId, playerName).catch((err) =>
      Alert.alert("Failed", String((err as Error).message))
    );
  }

  function section(title: string, accent: string, list: Quest[]) {
    if (list.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: accent }]}>{title}</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{list.length}</Text>
          </View>
        </View>
        {list.map((q) => (
          <View key={q.id}>
            <Text style={styles.coordLine}>
              {q.endHexCol != null && q.endHexRow != null
                ? `(${q.hexCol}, ${q.hexRow}) → (${q.endHexCol}, ${q.endHexRow})`
                : `Hex (${q.hexCol}, ${q.hexRow})`}
            </Text>
            <QuestCard
              quest={q}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onSetActive={handleSetActive}
              expandedExtras={
                q.status === "completed" || q.status === "paid_out" ? (
                  <QuestFindingsList
                    quest={q}
                    onSetPlayerName={onSetPlayerName}
                  />
                ) : undefined
              }
            />
          </View>
        ))}
      </View>
    );
  }

  const nothingActive = inProgress.length === 0 && recruiting.length === 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Active Quests" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Quests that adventurers have signed up for or are underway.
        </Text>

        {section("In Progress", "#facc15", inProgress)}
        {section("Recruiting", "#60a5fa", recruiting)}

        {nothingActive && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No active quests yet.</Text>
            <Text style={styles.emptyText}>
              Visit the map and join a quest to see it here.
            </Text>
          </View>
        )}

        {completed.length > 0 && (
          <Pressable
            onPress={() => setShowCompleted((v) => !v)}
            style={styles.toggleCompleted}
          >
            <Text style={styles.toggleCompletedText}>
              {showCompleted ? "Hide" : "Show"} completed quests (
              {completed.length})
            </Text>
          </Pressable>
        )}
        {showCompleted && section("Completed", "#4ade80", completed)}
      </ScrollView>

      <DatePickerModal
        visible={dateQuestId != null}
        onConfirm={handleDateConfirm}
        onClose={() => setDateQuestId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { color: colors.textFaint, fontSize: 13, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  countPill: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 1,
    paddingHorizontal: 8,
  },
  countPillText: { color: colors.textFaint, fontSize: 12 },
  coordLine: { color: colors.textFaint, fontSize: 11, marginBottom: 2 },
  empty: { alignItems: "center", marginTop: 40, gap: 4 },
  emptyTitle: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
  emptyText: { color: colors.textFaint, fontSize: 13 },
  toggleCompleted: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  toggleCompletedText: { color: colors.textMuted, fontSize: 13 },
});
