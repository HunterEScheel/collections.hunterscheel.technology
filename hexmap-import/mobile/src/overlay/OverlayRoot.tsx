// Root component of the floating overlay window (registered as
// "HexmapOverlay" and mounted by OverlayService).
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { startSync } from "../data/initiative";
import { Overlay } from "../native/Overlay";
import { useStore } from "../store";
import { Bubble } from "./Bubble";
import { CombatPanel } from "./CombatPanel";

export function OverlayRoot() {
  const overlayMode = useStore((s) => s.overlayMode);
  const setOverlayMode = useStore((s) => s.setOverlayMode);

  // Idempotent — the main app usually started it already, but the overlay
  // must also work when the service relaunches after process death.
  useEffect(() => {
    startSync();
  }, []);

  // Keep the native window size in step with the JS mode.
  useEffect(() => {
    Overlay.setOverlayMode(overlayMode);
    if (overlayMode === "bubble") Overlay.setOverlayFocusable(false);
  }, [overlayMode]);

  return (
    <View style={styles.root}>
      {overlayMode === "bubble" ? (
        <Bubble onExpand={() => setOverlayMode("panel")} />
      ) : (
        <CombatPanel onCollapse={() => setOverlayMode("bubble")} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
});
