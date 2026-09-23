// Homepage: big buttons into each section, plus identity + GM controls.
// "Initiative" doesn't open a screen — it launches the floating overlay.
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Overlay } from "../native/Overlay";
import { useStore } from "../store";
import { colors } from "../theme";
import type { Screen } from "../navigation";

interface HomePageProps {
  onNavigate: (screen: Screen) => void;
  onOpenCharacter: () => void;
  onEnterGm: () => void;
}

interface MenuButton {
  label: string;
  icon: string;
  screen?: Screen;
  action?: "character" | "initiative";
  badge?: number;
}

export function HomePage({
  onNavigate,
  onOpenCharacter,
  onEnterGm,
}: HomePageProps) {
  const playerName = useStore((s) => s.playerName);
  const adminPin = useStore((s) => s.adminPin);
  const setAdminPin = useStore((s) => s.setAdminPin);
  const quests = useStore((s) => s.quests);
  const isAdmin = adminPin != null;
  const [overlayOn, setOverlayOn] = useState(false);

  // Sessions underway that you're not part of (web questBadge logic).
  const questBadge = quests.filter(
    (q) =>
      q.status === "in_progress" &&
      (!playerName || !q.players.includes(playerName))
  ).length;

  useEffect(() => {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }
  }, []);

  // Re-check overlay permission when returning from Android settings.
  const startOverlay = useCallback(async () => {
    const started = await Overlay.startOverlay();
    if (started) {
      setOverlayOn(true);
    } else {
      Alert.alert(
        "Overlay permission needed",
        'Enable "Display over other apps" for Hexmap Companion, then try again.',
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open settings", onPress: () => Overlay.requestOverlayPermission() },
        ]
      );
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", () => {});
    return () => sub.remove();
  }, []);

  const buttons: MenuButton[] = [
    { label: "Map", icon: "🗺️", screen: "map" },
    { label: "Active Quests", icon: "📜", screen: "quests", badge: questBadge },
    { label: "Bounty Board", icon: "🎯", screen: "bounty" },
    { label: "Shop", icon: "🛒", screen: "shop" },
    { label: "My Items", icon: "🎒", screen: "items" },
    { label: "Character", icon: "👤", action: "character" },
    {
      label: overlayOn ? "Stop Initiative Overlay" : "Initiative",
      icon: "⚔️",
      action: "initiative",
    },
  ];

  function handlePress(b: MenuButton) {
    if (b.screen) {
      onNavigate(b.screen);
    } else if (b.action === "character") {
      onOpenCharacter();
    } else if (b.action === "initiative") {
      if (overlayOn) {
        Overlay.stopOverlay();
        setOverlayOn(false);
      } else {
        startOverlay();
      }
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Hexmap Companion</Text>
      <Text style={styles.subheading}>
        {playerName ? `Welcome, ${playerName}` : "No adventurer name set"}
      </Text>

      <View style={styles.grid}>
        {buttons.map((b) => (
          <Pressable
            key={b.label}
            onPress={() => handlePress(b)}
            style={[
              styles.menuButton,
              b.action === "initiative" && overlayOn && styles.menuButtonActive,
            ]}
          >
            <Text style={styles.menuIcon}>{b.icon}</Text>
            <Text style={styles.menuLabel}>{b.label}</Text>
            {b.badge != null && b.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {b.badge > 9 ? "9+" : b.badge}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => (isAdmin ? setAdminPin(null) : onEnterGm())}
        style={styles.gmButton}
      >
        <Text style={styles.gmButtonText}>
          {isAdmin ? "🔓 GM mode ON — tap to exit" : "🔒 GM mode"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  heading: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  subheading: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  grid: { gap: 12 },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  menuButtonActive: { borderColor: colors.red },
  menuIcon: { fontSize: 24 },
  menuLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  gmButton: {
    marginTop: 28,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  gmButtonText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
