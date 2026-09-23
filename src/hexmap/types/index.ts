export type TerrainType =
  | "forest"
  | "plains"
  | "mountain"
  | "swamp"
  | "desert"
  | "snow"
  | "water"
  | "unknown";

export type QuestLevel =
  | "explore"
  | "recurring"
  | "wolf"
  | "demon"
  | "dragon"
  | "terrasque"
  | "god";

export type QuestStatus =
  | "available"
  | "in_progress"
  | "completed"
  | "paid_out";

export type ChallengeTier = 0 | 1 | 2 | 3 | 4;

export type Landmark =
  | "dungeon"
  | "village"
  | "ruins"
  | "tower"
  | "major_threat"
  | "allied_city"
  | "unallied_city";

export interface HexData {
  col: number;
  row: number;
  terrain: TerrainType;
  challengeTier: ChallengeTier | null;
  landmark: Landmark | null;
  landmarkName: string | null;
}

export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  isCreature: boolean;
  hp: number | null;
  maxHp: number | null;
  ac: number | null;
  cr: number | null;
}

/**
 * A custom item an admin attaches to a quest as loot. Each item may be
 * assigned to a party member (assignedTo = player name) or left unassigned
 * (null). Assigned items surface in that player's "My Items" inventory.
 */
export interface FoundItem {
  id: string;
  name: string;
  description: string;
  /** Gold-piece value of the item. */
  value: number;
  assignedTo: string | null;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: string;
  level: QuestLevel;
  status: QuestStatus;
  hexCol: number;
  hexRow: number;
  endHexCol: number | null;
  endHexRow: number | null;
  players: string[];
  scheduledDate: string | null;
  completedAt: string | null;
  foundItems: FoundItem[];
}

export interface Character {
  playerName: string;
  hitPoints: number | null;
  armorClass: number | null;
  gold: number;
}

export interface QuestFinding {
  id: string;
  questId: string;
  author: string;
  hexCol: number;
  hexRow: number;
  description: string;
  createdAt: string;
}

/**
 * AI-generated quest suggestion derived from a player report.
 * Lightweight version of Quest — admin reviews/edits before persisting.
 */
export interface QuestSuggestion {
  title: string;
  description: string;
  reward: string;
  level: QuestLevel;
  hexCol: number;
  hexRow: number;
  endHexCol: number | null;
  endHexRow: number | null;
  rationale: string;
}
