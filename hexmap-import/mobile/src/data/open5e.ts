// Port of web src/services/dnd5e.ts searchCreatures() — Open5e v2 SRD search —
// plus getCreatureDetails() for the expanded initiative-row view.
import type { AttackInfo, CreatureDetails, CreatureSearchResult } from "../types";

const OPEN5E_BASE = "https://api.open5e.com/v2";

const FIELDS =
  "key,name,size,type,challenge_rating,experience_points,hit_points,armor_class,environments";
const DOCUMENT_FILTER = "&document__key=srd-2024";

interface Open5eV2Creature {
  key: string;
  name: string;
  size: { key: string; name: string };
  type: { key: string; name: string };
  challenge_rating: number;
  hit_points: number;
  armor_class: number;
}

const searchCache = new Map<string, CreatureSearchResult[]>();

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

// --- Creature details (attacks, vulnerabilities/resistances/immunities) ---

interface Open5eV2Attack {
  name: string;
  to_hit_mod: number | null;
  damage_die_count: number | null;
  damage_die_type: string | null; // "D6"
  damage_bonus: number | null;
  damage_type: { name: string } | null;
  extra_damage_type: { name: string } | null;
}

interface Open5eV2Action {
  name: string;
  desc: string;
  attacks: Open5eV2Attack[];
}

interface Open5eV2CreatureDetail {
  name: string;
  actions: Open5eV2Action[];
  resistances_and_immunities: {
    damage_vulnerabilities_display: string;
    damage_resistances_display: string;
    damage_immunities_display: string;
    condition_immunities_display: string;
  } | null;
}

function formatDamage(a: Open5eV2Attack): string | null {
  if (!a.damage_die_count || !a.damage_die_type) return null;
  const die = `${a.damage_die_count}${a.damage_die_type.toLowerCase()}`;
  const bonus = a.damage_bonus ? `+${a.damage_bonus}` : "";
  const type = a.damage_type?.name ?? a.extra_damage_type?.name ?? "";
  return `${die}${bonus}${type ? ` ${type}` : ""}`;
}

function toAttackInfo(action: Open5eV2Action): AttackInfo {
  const first = action.attacks?.[0];
  return {
    name: action.name,
    toHit: first?.to_hit_mod ?? null,
    damage: first ? formatDamage(first) : null,
    desc: action.desc,
  };
}

const detailsCache = new Map<string, CreatureDetails | null>();

/**
 * Fetch attack + defense details for a creature by its display name.
 * Numbered copies ("Mastiff 2") resolve to the base creature. Returns null
 * for homebrew/custom creatures with no SRD match.
 */
export async function getCreatureDetails(
  entryName: string
): Promise<CreatureDetails | null> {
  // Strip the numbered-copy suffix added when count > 1.
  const baseName = entryName.replace(/\s+\d+$/, "").trim();
  const cacheKey = baseName.toLowerCase();
  if (detailsCache.has(cacheKey)) return detailsCache.get(cacheKey)!;

  const url =
    `${OPEN5E_BASE}/creatures/?format=json&limit=5` +
    `&fields=name,actions,resistances_and_immunities${DOCUMENT_FILTER}` +
    `&name__iexact=${encodeURIComponent(baseName)}`;

  let details: CreatureDetails | null = null;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      results?: Open5eV2CreatureDetail[];
    };
    const match =
      data.results?.find(
        (c) => c.name.toLowerCase() === cacheKey
      ) ?? data.results?.[0];
    if (match) {
      const ri = match.resistances_and_immunities;
      details = {
        attacks: (match.actions ?? [])
          .filter((a) => a.attacks && a.attacks.length > 0)
          .map(toAttackInfo),
        vulnerabilities: ri?.damage_vulnerabilities_display ?? "",
        resistances: ri?.damage_resistances_display ?? "",
        immunities: ri?.damage_immunities_display ?? "",
        conditionImmunities: ri?.condition_immunities_display ?? "",
      };
    }
  } catch {
    return null; // network error — don't cache, retry next expand
  }
  detailsCache.set(cacheKey, details);
  return details;
}
