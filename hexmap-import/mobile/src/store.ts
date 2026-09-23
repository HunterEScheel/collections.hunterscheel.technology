import { create } from "zustand";
import type {
  Character,
  HexData,
  InitiativeEntry,
  Quest,
  QuestFinding,
} from "./types";

export type OverlayMode = "bubble" | "panel";
export type ConnectionState = "connecting" | "connected" | "disconnected";

interface AppState {
  entries: InitiativeEntry[];
  characters: Map<string, Character>;
  hexes: Map<string, HexData>;
  quests: Quest[];
  questFindings: QuestFinding[];
  playerName: string | null;
  /** GM PIN, held in memory only (mirrors web AdminPinModal behavior). */
  adminPin: string | null;
  overlayMode: OverlayMode;
  connectionState: ConnectionState;
  setEntries: (entries: InitiativeEntry[]) => void;
  setCharacters: (characters: Map<string, Character>) => void;
  setHexes: (hexes: Map<string, HexData>) => void;
  setQuests: (quests: Quest[]) => void;
  setQuestFindings: (findings: QuestFinding[]) => void;
  setPlayerName: (name: string | null) => void;
  setAdminPin: (pin: string | null) => void;
  setOverlayMode: (mode: OverlayMode) => void;
  setConnectionState: (state: ConnectionState) => void;
}

// Module-level store: the main activity and the overlay surface run in the
// same JS runtime, so both see the same state and Supabase subscription.
export const useStore = create<AppState>((set) => ({
  entries: [],
  characters: new Map(),
  hexes: new Map(),
  quests: [],
  questFindings: [],
  playerName: null,
  adminPin: null,
  overlayMode: "bubble",
  connectionState: "connecting",
  setEntries: (entries) => set({ entries }),
  setCharacters: (characters) => set({ characters }),
  setHexes: (hexes) => set({ hexes }),
  setQuests: (quests) => set({ quests }),
  setQuestFindings: (questFindings) => set({ questFindings }),
  setPlayerName: (playerName) => set({ playerName }),
  setAdminPin: (adminPin) => set({ adminPin }),
  setOverlayMode: (overlayMode) => set({ overlayMode }),
  setConnectionState: (connectionState) => set({ connectionState }),
}));

export const isAdmin = (s: { adminPin: string | null }) => s.adminPin != null;
