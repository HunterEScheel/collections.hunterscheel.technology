// Mirror of web AdminPinModal: verify server-side, hold PIN in memory only.
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { verifyPin } from "../data/initiative";
import { useStore } from "../store";
import { colors } from "../theme";

interface PinModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PinModal({ visible, onClose }: PinModalProps) {
  const setAdminPin = useStore((s) => s.setAdminPin);
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!pin.trim()) return;
    setChecking(true);
    setError(null);
    const ok = await verifyPin(pin.trim());
    setChecking(false);
    if (ok) {
      setAdminPin(pin.trim());
      setPin("");
      onClose();
    } else {
      setError("Wrong PIN");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>GM Mode</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="Admin PIN"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            keyboardType="number-pad"
            style={styles.input}
            autoFocus
            onSubmitEditing={submit}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={checking || !pin.trim()}
              style={styles.submit}
            >
              {checking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Unlock</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 280,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
  },
  title: {
    color: colors.purple,
    fontWeight: "700",
    fontSize: 15,
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
  error: { color: colors.red, fontSize: 12, marginTop: 6 },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  cancel: { paddingVertical: 6, paddingHorizontal: 12 },
  cancelText: { color: colors.textMuted, fontSize: 13 },
  submit: {
    backgroundColor: colors.indigo,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  submitText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
