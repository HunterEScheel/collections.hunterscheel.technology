// Port of web QuestFindings — field reports under a completed quest.
// Simplified visuals (parchment cards without the wax-seal theatrics).
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createQuestFinding, deleteQuestFinding } from "../data/guild";
import { useStore } from "../store";
import { colors } from "../theme";
import type { Quest } from "../types";
import { focusableProps } from "../overlay/focusable";

const PIN_COLORS = [
  "#8b1a1a",
  "#1a3a8b",
  "#5b1a8b",
  "#1a5b3a",
  "#c9a35b",
  "#5b3a1a",
];

function authorColor(author: string): string {
  let h = 0;
  for (let i = 0; i < author.length; i++) {
    h = (h << 5) - h + author.charCodeAt(i);
    h |= 0;
  }
  return PIN_COLORS[Math.abs(h) % PIN_COLORS.length];
}

interface QuestFindingsListProps {
  quest: Quest;
  onSetPlayerName: () => void;
}

export function QuestFindingsList({
  quest,
  onSetPlayerName,
}: QuestFindingsListProps) {
  const playerName = useStore((s) => s.playerName);
  const adminPin = useStore((s) => s.adminPin);
  const allFindings = useStore((s) => s.questFindings);
  const isAdmin = adminPin != null;
  const findings = allFindings.filter((f) => f.questId === quest.id);

  const [hexCol, setHexCol] = useState("");
  const [hexRow, setHexRow] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPartyMember =
    playerName != null && quest.players.includes(playerName);
  const canAdd = isPartyMember || (isAdmin && quest.players.length > 0);

  async function submit() {
    const desc = description.trim();
    if (desc === "" || !playerName) return;
    const col = Number(hexCol);
    const row = Number(hexRow);
    if (!isFinite(col) || !isFinite(row)) {
      setError("Coordinates must be numbers.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createQuestFinding(quest.id, playerName, col, row, desc);
      setHexCol("");
      setHexRow("");
      setDescription("");
    } catch (err) {
      setError((err as Error).message || "The seal would not hold.");
    } finally {
      setSubmitting(false);
    }
  }

  function removeFinding(id: string, author: string) {
    const canDelete = isAdmin || author === playerName;
    if (!canDelete) return;
    Alert.alert("Strike this dispatch from the board?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Strike",
        style: "destructive",
        onPress: () =>
          deleteQuestFinding(id).catch((err) =>
            Alert.alert("Failed", String((err as Error).message))
          ),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        FIELD REPORTS ({findings.length} entr{findings.length === 1 ? "y" : "ies"})
      </Text>

      {findings.map((f) => (
        <View key={f.id} style={styles.scrap}>
          <View style={styles.scrapHeader}>
            <Text style={styles.coords}>
              ({f.hexCol}, {f.hexRow})
            </Text>
            {(isAdmin || f.author === playerName) && (
              <Pressable
                onPress={() => removeFinding(f.id, f.author)}
                hitSlop={8}
              >
                <Text style={styles.strike}>✕</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.scrapText}>{f.description}</Text>
          <Text style={[styles.signature, { color: authorColor(f.author) }]}>
            — {f.author}
          </Text>
        </View>
      ))}

      {canAdd ? (
        <View style={styles.form}>
          <View style={styles.coordRow}>
            <TextInput
              value={hexCol}
              onChangeText={setHexCol}
              placeholder="Col"
              placeholderTextColor={colors.textFaint}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { flex: 1 }]}
              {...focusableProps}
            />
            <TextInput
              value={hexRow}
              onChangeText={setHexRow}
              placeholder="Row"
              placeholderTextColor={colors.textFaint}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { flex: 1 }]}
              {...focusableProps}
            />
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What did you find?"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={500}
            style={[styles.input, styles.textarea]}
            {...focusableProps}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            onPress={submit}
            disabled={submitting || description.trim() === ""}
            style={[
              styles.sealButton,
              (submitting || description.trim() === "") &&
                styles.sealButtonDisabled,
            ]}
          >
            <Text style={styles.sealButtonText}>
              {submitting ? "Sealing…" : "Affix the Seal"}
            </Text>
          </Pressable>
        </View>
      ) : playerName == null ? (
        <View style={styles.noteRow}>
          <Text style={styles.note}>
            A scribe needs their name before the seal can be set.
          </Text>
          <Pressable onPress={onSetPlayerName} style={styles.signButton}>
            <Text style={styles.signButtonText}>Sign Your Name</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.note}>
          Only those who walked the path may file dispatches. Join the quest
          first.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, gap: 8 },
  heading: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  scrap: {
    backgroundColor: "#f3e0b8",
    borderRadius: 4,
    padding: 10,
  },
  scrapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coords: {
    color: "#8b1a1a",
    fontSize: 11,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#8b1a1a",
    borderRadius: 2,
    paddingHorizontal: 4,
  },
  strike: { color: "#2e1f12", fontSize: 13 },
  scrapText: {
    color: "#2e1f12",
    fontSize: 14,
    marginTop: 6,
    fontStyle: "italic",
  },
  signature: { fontSize: 12, fontWeight: "700", marginTop: 6, textAlign: "right" },
  form: { gap: 6 },
  coordRow: { flexDirection: "row", gap: 6 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: colors.text,
    fontSize: 13,
  },
  textarea: { minHeight: 60, textAlignVertical: "top" },
  error: { color: colors.red, fontSize: 12 },
  sealButton: {
    alignSelf: "flex-start",
    backgroundColor: "#8b1a1a",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  sealButtonDisabled: { opacity: 0.5 },
  sealButtonText: { color: "#f3e0b8", fontSize: 12, fontWeight: "700" },
  noteRow: { gap: 6 },
  note: { color: colors.textFaint, fontSize: 12, fontStyle: "italic" },
  signButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.green,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  signButtonText: { color: "#000", fontSize: 12, fontWeight: "600" },
});
