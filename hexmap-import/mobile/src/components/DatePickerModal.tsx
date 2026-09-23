// Schedule picker for the first quest joiner: day list + hour, emits UTC ISO.
// (Web uses <input type="date"> + hour select, default hour 19.)
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme";

interface DatePickerModalProps {
  visible: boolean;
  onConfirm: (iso: string) => void;
  onClose: () => void;
}

const DAY_COUNT = 30;
const DEFAULT_HOUR = 19;

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function DatePickerModal({
  visible,
  onConfirm,
  onClose,
}: DatePickerModalProps) {
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState(DEFAULT_HOUR);

  const days = Array.from({ length: DAY_COUNT }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  function confirm() {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    onConfirm(d.toISOString());
    setDayOffset(0);
    setHour(DEFAULT_HOUR);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Schedule the session</Text>

          <Text style={styles.label}>DAY</Text>
          <ScrollView style={styles.dayList} nestedScrollEnabled>
            {days.map((d, i) => (
              <Pressable
                key={i}
                onPress={() => setDayOffset(i)}
                style={[styles.dayRow, i === dayOffset && styles.daySelected]}
              >
                <Text
                  style={[
                    styles.dayText,
                    i === dayOffset && styles.dayTextSelected,
                  ]}
                >
                  {i === 0
                    ? "Today"
                    : i === 1
                    ? "Tomorrow"
                    : d.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>TIME</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hourRow}>
              {Array.from({ length: 24 }, (_, h) => (
                <Pressable
                  key={h}
                  onPress={() => setHour(h)}
                  style={[styles.hourChip, h === hour && styles.hourSelected]}
                >
                  <Text
                    style={[
                      styles.hourText,
                      h === hour && styles.hourTextSelected,
                    ]}
                  >
                    {hourLabel(h)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} style={styles.confirm}>
              <Text style={styles.confirmText}>Schedule & Join</Text>
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
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 320,
    maxHeight: "80%",
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
    marginBottom: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  dayList: {
    maxHeight: 200,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  dayRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  daySelected: { backgroundColor: colors.indigoDark },
  dayText: { color: colors.textMuted, fontSize: 14 },
  dayTextSelected: { color: colors.text, fontWeight: "700" },
  hourRow: { flexDirection: "row", gap: 6 },
  hourChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  hourSelected: { backgroundColor: colors.indigoDark, borderColor: colors.indigo },
  hourText: { color: colors.textMuted, fontSize: 12 },
  hourTextSelected: { color: colors.text, fontWeight: "700" },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancel: { paddingVertical: 6, paddingHorizontal: 12 },
  cancelText: { color: colors.textMuted, fontSize: 13 },
  confirm: {
    backgroundColor: colors.green,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  confirmText: { color: "#000", fontSize: 13, fontWeight: "600" },
});
