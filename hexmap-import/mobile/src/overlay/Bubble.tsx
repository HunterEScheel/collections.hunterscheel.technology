// Collapsed floating bubble: entry count + top-of-order name.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Overlay } from "../native/Overlay";
import { useStore } from "../store";
import { colors } from "../theme";

interface BubbleProps {
  onExpand: () => void;
}

export function Bubble({ onExpand }: BubbleProps) {
  const entries = useStore((s) => s.entries);
  const top = entries[0];

  return (
    <Pressable
      onPress={onExpand}
      onLongPress={() => Overlay.stopOverlay()}
      style={styles.bubble}
    >
      <Text style={styles.glyph}>⚔️</Text>
      {entries.length > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{entries.length}</Text>
        </View>
      )}
      {top && (
        <Text style={styles.topName} numberOfLines={1}>
          {top.name}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: { fontSize: 22 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  topName: {
    position: "absolute",
    bottom: 3,
    left: 4,
    right: 4,
    textAlign: "center",
    color: colors.gold,
    fontSize: 8,
    fontWeight: "700",
  },
});
