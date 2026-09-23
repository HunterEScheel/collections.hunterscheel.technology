// Port of web CharacterModal — name/HP/AC/gold with server-side rename
// cascade via save_character. Caller must persist the new name locally.
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { saveCharacter } from "../data/guild";
import { useStore } from "../store";
import { colors } from "../theme";

interface CharacterModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (newName: string) => void;
}

export function CharacterModal({
  visible,
  onClose,
  onSaved,
}: CharacterModalProps) {
  const playerName = useStore((s) => s.playerName);
  const characters = useStore((s) => s.characters);
  const character = playerName ? characters.get(playerName) : undefined;

  const [name, setName] = useState(playerName ?? "");
  const [hp, setHp] = useState(
    character?.hitPoints != null ? String(character.hitPoints) : ""
  );
  const [ac, setAc] = useState(
    character?.armorClass != null ? String(character.armorClass) : ""
  );
  const [gold, setGold] = useState(String(character?.gold ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Re-seed fields each time the modal opens for a (possibly new) character.
  if (visible && seededFor !== (playerName ?? "")) {
    setSeededFor(playerName ?? "");
    setName(playerName ?? "");
    setHp(character?.hitPoints != null ? String(character.hitPoints) : "");
    setAc(character?.armorClass != null ? String(character.armorClass) : "");
    setGold(String(character?.gold ?? 0));
    setError(null);
  }
  if (!visible && seededFor !== null) setSeededFor(null);

  const canSave = name.trim() !== "" && !saving;

  async function save() {
    if (!canSave) return;
    const hpVal = hp.trim() === "" ? null : parseInt(hp, 10);
    if (hpVal !== null && !isFinite(hpVal)) {
      setError("HP must be a number");
      return;
    }
    const acVal = ac.trim() === "" ? null : parseInt(ac, 10);
    if (acVal !== null && !isFinite(acVal)) {
      setError("AC must be a number");
      return;
    }
    const goldVal = gold.trim() === "" ? 0 : parseInt(gold, 10);
    if (!isFinite(goldVal) || goldVal < 0) {
      setError("Gold must be a non-negative number");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveCharacter(playerName, name.trim(), hpVal, acVal, goldVal);
      onSaved(name.trim());
      onClose();
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Your Character</Text>
            <Text style={styles.subtitle}>
              Renaming updates every quest, finding, and initiative row
              attached to your old name.
            </Text>

            <Text style={styles.label}>CHARACTER NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={60}
              placeholder="e.g. Thalia Ironvale"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Text style={styles.label}>HIT POINTS</Text>
            <TextInput
              value={hp}
              onChangeText={setHp}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Text style={styles.label}>ARMOR CLASS</Text>
            <TextInput
              value={ac}
              onChangeText={setAc}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Text style={styles.label}>GOLD (GP)</Text>
            <TextInput
              value={gold}
              onChangeText={setGold}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.gold }]}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.buttons}>
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={!canSave}
                style={[styles.save, !canSave && styles.saveDisabled]}
              >
                <Text
                  style={[styles.saveText, !canSave && styles.saveTextDisabled]}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 340,
    maxHeight: "85%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
  },
  title: { color: colors.text, fontWeight: "700", fontSize: 17 },
  subtitle: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.red, fontSize: 12, marginTop: 8 },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancel: { paddingVertical: 6, paddingHorizontal: 12 },
  cancelText: { color: colors.textMuted, fontSize: 13 },
  save: {
    backgroundColor: colors.green,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  saveDisabled: { backgroundColor: colors.border },
  saveText: { color: "#000", fontSize: 13, fontWeight: "600" },
  saveTextDisabled: { color: colors.textFaint },
});
