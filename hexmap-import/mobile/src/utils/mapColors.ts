// Port of web utils/colors.ts (player-relevant parts).
import type { Landmark, TerrainType } from "../types";

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  forest: "#2d5a1e",
  plains: "#7ec850",
  mountain: "#8a8a8a",
  swamp: "#4a6741",
  desert: "#d4a46a",
  snow: "#e8e8f0",
  water: "#3a7bd5",
  unknown: "#555555",
};

export const TERRAIN_LABELS: Record<TerrainType, string> = {
  forest: "Forest",
  plains: "Plains",
  mountain: "Mountain",
  swamp: "Swamp",
  desert: "Desert",
  snow: "Snow",
  water: "Water",
  unknown: "Unknown",
};

export const LANDMARK_LABELS: Record<Landmark, string> = {
  village: "Village",
  allied_city: "Allied City",
  unallied_city: "Unallied City",
  dungeon: "Dungeon",
  ruins: "Ruins",
  tower: "Tower",
  major_threat: "Major Threat",
};
