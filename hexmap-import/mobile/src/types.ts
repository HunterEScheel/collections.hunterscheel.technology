// Mirrors web/src/types/index.ts and web/src/services/{dnd5e,shop}.ts —
// keep in sync manually.

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

export type QuestStatus = "available" | "in_progress" | "completed" | "paid_out";

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

export interface FoundItem {
  id: string;
  name: string;
  description: string;
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

export interface QuestFinding {
  id: string;
  questId: string;
  author: string;
  hexCol: number;
  hexRow: number;
  description: string;
  createdAt: string;
}

export interface ShopItem {
  id: string;
  itemIndex: string;
  itemName: string;
  rarity: string;
  description: string;
  quantity: number;
  price: string;
}

export interface PurchasedItem {
  id: string;
  itemIndex: string;
  itemName: string;
  rarity: string;
  price: string;
  description: string;
  buyer: string | null;
  purchasedAt: string;
}

export interface EquipmentItem {
  index: string;
  name: string;
  category: string;
  cost: string;
  weight: string;
  damage?: string;
  armorClass?: string;
  stealth?: string;
  strength?: string;
  properties?: string[];
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
  /** GM-entered stats for custom creatures (details jsonb column). */
  details: CreatureDetails | null;
}

export interface Character {
  playerName: string;
  hitPoints: number | null;
  armorClass: number | null;
  gold: number;
}

export interface AttackInfo {
  name: string;
  /** e.g. "+3" — null when the action has no attack roll. */
  toHit: number | null;
  /** e.g. "1d6+1 Piercing" — null when not parseable. */
  damage: string | null;
  desc: string;
}

export interface CreatureDetails {
  attacks: AttackInfo[];
  vulnerabilities: string;
  resistances: string;
  immunities: string;
  conditionImmunities: string;
}

export interface CreatureSearchResult {
  index: string;
  name: string;
  size: string;
  type: string;
  challengeRating: number;
  hitPoints: number;
  armorClass: number;
}
