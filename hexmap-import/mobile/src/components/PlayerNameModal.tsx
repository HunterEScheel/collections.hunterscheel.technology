// Port of web PlayerNameModal — emits the trimmed name; caller persists it.
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../theme";

interface PlayerNameModalProps {
  visible: boolean;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export function PlayerNameModal({
  visible,
  onConfirm,
  onClose,
}: PlayerNameModalProps) {
  const [name, setName] = useState("");
  const canConfirm = name.trim() !== "";

  function confirm() {
    if (!canConfirm) return;
    onConfirm(name.trim());
    setName("");
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Who goes there?</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your adventurer name"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
            onSubmitEditing={confirm}
          />
          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              disabled={!canConfirm}
              style={[styles.confirm, !canConfirm && styles.confirmDisabled]}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
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
    width: 320,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
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
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  cancel: { paddingVertical: 6, paddingHorizontal: 12 },
  cancelText: { color: colors.textMuted, fontSize: 13 },
  confirm: {
    backgroundColor: colors.green,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  confirmDisabled: { backgroundColor: colors.border },
  confirmText: { color: "#000", fontSize: 13, fontWeight: "600" },
});
