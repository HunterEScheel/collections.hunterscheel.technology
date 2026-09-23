import { NativeModules } from "react-native";
import type { OverlayMode } from "../store";

interface HexmapOverlayModule {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): void;
  startOverlay(): Promise<boolean>;
  stopOverlay(): void;
  setOverlayMode(mode: OverlayMode): void;
  setOverlayFocusable(focusable: boolean): void;
}

const native = NativeModules.HexmapOverlayModule as
  | HexmapOverlayModule
  | undefined;

export const Overlay: HexmapOverlayModule = native ?? {
  // Fallback keeps the JS surface usable in environments without the native
  // module (e.g. tests); overlay features simply do nothing.
  hasOverlayPermission: async () => false,
  requestOverlayPermission: () => {},
  startOverlay: async () => false,
  stopOverlay: () => {},
  setOverlayMode: () => {},
  setOverlayFocusable: () => {},
};
