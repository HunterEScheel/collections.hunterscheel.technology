import type { ChallengeTier, TerrainType } from "../types";
import type { Creature, GeneratedEncounter } from "../data/bestiary";
import { composeEncounter, crToTier, TIER_MAX_CR } from "../data/bestiary";

const OPEN5E_BASE = "https://api.open5e.com/v2";

// Map hex terrain types to Open5e v2 environment keys.
// A creature matches if any of its environments keys are in this list.
const TERRAIN_ENV_KEYS: Partial<Record<TerrainType, string[]>> = {
  forest: ["forest"],
  plains: ["grassland"],
  mountain: ["mountain", "hills"],
  swamp: ["swamp"],
  desert: ["desert"],
  snow: ["arctic"],
  water: ["ocean", "lake", "coast"],
};

interface Open5eV2Creature {
  key: string;
  name: string;
  size: { key: string; name: string };
  type: { key: string; name: string };
  challenge_rating: number;
  experience_points: number;
  hit_points: number;
  armor_class: number;
  environments: { key: string; name: string }[];
}

const FIELDS =
  "key,name,size,type,challenge_rating,experience_points,hit_points,armor_class,environments";

// Only include official SRD content.
const DOCUMENT_FILTER = "&document__key=srd-2024";

// Cache creature pools by maxCR to avoid repeated API calls.
// Environment filtering is done client-side after fetch.
const crCache = new Map<number, Open5eV2Creature[]>();

async function fetchCreaturesByCR(
  maxCR: number
): Promise<Open5eV2Creature[]> {
  if (crCache.has(maxCR)) return crCache.get(maxCR)!;

  const crFilter =
    maxCR < Infinity
      ? `&challenge_rating__lte=${maxCR}&challenge_rating__gt=0`
      : "&challenge_rating__gt=0";

  const creatures: Open5eV2Creature[] = [];
  let url: string | null =
    `${OPEN5E_BASE}/creatures/?format=json&limit=100&fields=${FIELDS}${DOCUMENT_FILTER}${crFilter}`;

  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as {
      next: string | null;
      results: Open5eV2Creature[];
    };
    creatures.push(...data.results);
    url = data.next;
  }

  crCache.set(maxCR, creatures);
  return creatures;
}

// A creature matches a terrain if it lists a matching environment,
// or if it has no environment data at all (wildcard).
function matchesTerrain(
  creature: Open5eV2Creature,
  envKeys: string[]
): boolean {
  if (creature.environments.length === 0) return true;
  return creature.environments.some((e) => envKeys.includes(e.key));
}

function toCreature(m: Open5eV2Creature): Creature {
  return {
    index: m.key,
    name: m.name,
    size: m.size.name,
    type: m.type.name,
    challengeRating: m.challenge_rating,
    xp: m.experience_points,
    hitPoints: m.hit_points,
    armorClass: m.armor_class,
    combatPoints: m.experience_points,
    tier: crToTier(m.challenge_rating),
  };
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

const searchCache = new Map<string, CreatureSearchResult[]>();

/**
 * Free-text search across the Open5e v2 SRD 2024 creature index. Returns up
 * to ~20 deduped matches with the stats we care about for the initiative
 * tracker. Returns [] for queries shorter than 2 chars.
 */
export async function searchCreatures(
  query: string
): Promise<CreatureSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const cacheKey = q.toLowerCase();
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  const url =
    `${OPEN5E_BASE}/creatures/?format=json&limit=20` +
    `&fields=${FIELDS}${DOCUMENT_FILTER}` +
    `&name__icontains=${encodeURIComponent(q)}`;

  const res = await fetch(url);
  const data = (await res.json()) as { results?: Open5eV2Creature[] };

  const seen = new Set<string>();
  const out: CreatureSearchResult[] = [];
  for (const m of data.results ?? []) {
    if (seen.has(m.name)) continue;
    seen.add(m.name);
    out.push({
      index: m.key,
      name: m.name,
      size: m.size?.name ?? "",
      type: m.type?.name ?? "",
      challengeRating: m.challenge_rating,
      hitPoints: m.hit_points,
      armorClass: m.armor_class,
    });
  }
  searchCache.set(cacheKey, out);
  return out;
}

// Builds a random encounter by fetching creatures from Open5e v2 within the
// tier's CR cap, then filtering client-side to those with a matching environment.
export async function generateEncounter(
  terrain: TerrainType,
  tier: ChallengeTier
): Promise<GeneratedEncounter | null> {
  const envKeys = TERRAIN_ENV_KEYS[terrain];
  if (!envKeys || envKeys.length === 0) return null;

  const maxCR = TIER_MAX_CR[tier];
  const allCreatures = await fetchCreaturesByCR(maxCR);

  // Include creatures that match the terrain or have no environment data (wildcard).
  // Deduplicate by name (different source documents can list the same creature).
  const seen = new Set<string>();
  const pool: Creature[] = [];
  for (const m of allCreatures) {
    if (m.experience_points <= 0) continue;
    if (!matchesTerrain(m, envKeys)) continue;
    if (seen.has(m.name)) continue;
    seen.add(m.name);
    pool.push(toCreature(m));
  }

  if (pool.length === 0) return null;
  return composeEncounter(pool, tier);
}
