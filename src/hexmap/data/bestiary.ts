import type { ChallengeTier } from "../types";

export const TIER_LABELS: Record<ChallengeTier, string> = {
  0: "Tier 0 (Cleared Path)",
  1: "Tier 1 (Lvl 1-5)",
  2: "Tier 2 (Lvl 6-10)",
  3: "Tier 3 (Lvl 11-15)",
  4: "Tier 4 (Lvl 16-20)",
};

// A monster reduced to the stats the hexmap cares about.
export interface Creature {
  index: string;
  name: string;
  size: string;
  type: string;
  challengeRating: number;
  xp: number;
  hitPoints: number;
  armorClass: number;
  combatPoints: number;
  tier: ChallengeTier;
}

export interface EncounterGroup {
  creature: Creature;
  count: number;
}

export interface GeneratedEncounter {
  groups: EncounterGroup[];
  totalCreatures: number;
  /** Raw XP sum before encounter multiplier. */
  totalCombatPoints: number;
  /** Multiplier based on creature count (1, 1.5, 2, 2.5, 3, or 4). */
  encounterMultiplier: number;
  /** Adjusted XP (raw × multiplier) — used for difficulty budgeting. */
  adjustedXP: number;
  /** True when adjusted XP falls inside the tier's XP range. */
  withinBudget: boolean;
}

// Total combat-point (XP) range a random encounter should fall within, per tier.
export const TIER_XP_RANGE: Record<ChallengeTier, [number, number]> = {
  0: [0, 450],
  1: [225, 5000],
  2: [3500, 13000],
  3: [9000, 30000],
  4: [25000, 200000],
};

// An encounter holds 2-10 creatures across 1-3 distinct types. The number of
// types is weighted: 50% one type, 40% two types, 10% three types.
const MIN_CREATURES = 2;
const MAX_CREATURES = 10;
const MAX_TYPES = 3;
const COMPOSE_ATTEMPTS = 400;
const TYPE_COUNT_WEIGHTS: { types: number; weight: number }[] = [
  { types: 1, weight: 0.5 },
  { types: 2, weight: 0.4 },
  { types: 3, weight: 0.1 },
];

// Challenge rating display: fractional CRs render as fractions (0.25 -> "1/4").
export function formatCr(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

// Max CR a creature can have and still belong to a given tier.
// Tier 4 has no cap (Infinity).
export const TIER_MAX_CR: Record<ChallengeTier, number> = {
  0: 1,
  1: 5,
  2: 10,
  3: 15,
  4: Infinity,
};

export function crToTier(cr: number): ChallengeTier {
  if (cr <= TIER_MAX_CR[0]) return 0;
  if (cr <= TIER_MAX_CR[1]) return 1;
  if (cr <= TIER_MAX_CR[2]) return 2;
  if (cr <= TIER_MAX_CR[3]) return 3;
  return 4;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sampleDistinct(pool: Creature[], n: number): Creature[] {
  const copy = [...pool];
  const out: Creature[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

// Weighted random number of creature types, capped at the pool size.
function pickTypeCount(maxTypes: number): number {
  const roll = Math.random();
  let cumulative = 0;
  for (const { types, weight } of TYPE_COUNT_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return Math.min(types, maxTypes);
  }
  return Math.min(MAX_TYPES, maxTypes);
}

// 5e encounter multiplier based on number of creatures.
export function encounterMultiplier(creatureCount: number): number {
  if (creatureCount <= 1) return 1;
  if (creatureCount <= 2) return 1.5;
  if (creatureCount <= 6) return 2;
  if (creatureCount <= 10) return 2.5;
  if (creatureCount <= 14) return 3;
  return 4;
}

function summarize(
  groups: EncounterGroup[],
  minXP: number,
  maxXP: number
): GeneratedEncounter {
  const totalCreatures = groups.reduce((sum, g) => sum + g.count, 0);
  const totalCombatPoints = groups.reduce(
    (sum, g) => sum + g.count * g.creature.combatPoints,
    0
  );
  const multiplier = encounterMultiplier(totalCreatures);
  const adjustedXP = Math.floor(totalCombatPoints * multiplier);
  return {
    groups,
    totalCreatures,
    totalCombatPoints,
    encounterMultiplier: multiplier,
    adjustedXP,
    withinBudget: adjustedXP >= minXP && adjustedXP <= maxXP,
  };
}

// Builds an encounter from the candidate pool: 1-3 creature types, at least 2
// creatures total, with combined combat points landing inside the tier's XP
// range. Tries many random combinations and keeps the closest fit.
export function composeEncounter(
  pool: Creature[],
  tier: ChallengeTier
): GeneratedEncounter | null {
  if (pool.length === 0) return null;
  const [minXP, maxXP] = TIER_XP_RANGE[tier];
  const typeCount = pickTypeCount(Math.min(MAX_TYPES, pool.length));

  let best: GeneratedEncounter | null = null;
  let bestDistance = Infinity;

  for (let attempt = 0; attempt < COMPOSE_ATTEMPTS; attempt++) {
    const creatures = sampleDistinct(pool, typeCount);
    const counts = creatures.map(() => 1);
    let total = counts.length;

    for (let extras = randInt(0, MAX_CREATURES - total); extras > 0; extras--) {
      counts[Math.floor(Math.random() * counts.length)]++;
      total++;
    }
    while (total < MIN_CREATURES) {
      counts[0]++;
      total++;
    }

    const groups: EncounterGroup[] = creatures.map((creature, i) => ({
      creature,
      count: counts[i],
    }));
    const encounter = summarize(groups, minXP, maxXP);
    if (encounter.withinBudget) return encounter;

    const distance =
      encounter.adjustedXP < minXP
        ? minXP - encounter.adjustedXP
        : encounter.adjustedXP - maxXP;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = encounter;
    }
  }
  return best;
}
