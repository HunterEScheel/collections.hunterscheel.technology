import type { TerrainType, QuestLevel } from "../types";

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

export const QUEST_LEVEL_COLORS: Record<QuestLevel, string> = {
  explore: "#4ade80",
  recurring: "#60a5fa",
  wolf: "#facc15",
  demon: "#f97316",
  dragon: "#ef4444",
  terrasque: "#a855f7",
  god: "#fbbf24",
};

export const QUEST_LEVEL_LABELS: Record<QuestLevel, string> = {
  explore: "Explore",
  recurring: "Recurring",
  wolf: "Wolf",
  demon: "Demon",
  dragon: "Dragon",
  terrasque: "Terrasque",
  god: "God",
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
