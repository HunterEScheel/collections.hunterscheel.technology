import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type {
  ChallengeTier,
  Character,
  FoundItem,
  HexData,
  Quest,
  TerrainType,
  InitiativeEntry,
  QuestFinding,
  QuestSuggestion,
  Landmark,
} from "../types/index";

export function useHexData(): Map<string, HexData> {
  const [hexes, setHexes] = useState<Map<string, HexData>>(new Map());

  useEffect(() => {
    // Initial fetch
    supabase
      .from("hexes")
      .select("*")
      .then(({ data }) => {
        if (data) {
          const map = new Map<string, HexData>();
          for (const row of data) {
            map.set(`${row.col}_${row.row}`, {
              col: row.col,
              row: row.row,
              terrain: row.terrain as TerrainType,
              challengeTier: (row.challenge_tier as ChallengeTier) ?? null,
              landmark: (row.landmark as Landmark) ?? null,
              landmarkName: (row.landmark_name as string) ?? null,
            });
          }
          setHexes(map);
        }
      });

    // Real-time subscription
    const channel = supabase
      .channel("hexes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hexes" },
        (payload) => {
          setHexes((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const old = payload.old as { col: number; row: number };
              next.delete(`${old.col}_${old.row}`);
            } else {
              const row = payload.new as {
                col: number;
                row: number;
                terrain: string;
                challenge_tier: number | null;
                landmark: string | null;
                landmark_name: string | null;
              };
              next.set(`${row.col}_${row.row}`, {
                col: row.col,
                row: row.row,
                terrain: row.terrain as TerrainType,
                challengeTier: (row.challenge_tier as ChallengeTier) ?? null,
                landmark: (row.landmark as Landmark) ?? null,
                landmarkName: (row.landmark_name as string) ?? null,
              });
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return hexes;
}

export function useQuests(): Quest[] {
  const [quests, setQuests] = useState<Quest[]>([]);

  useEffect(() => {
    // Initial fetch — order by completed_at DESC so the newest completions
    // arrive first. Non-completed quests (completed_at is null) sort to
    // the end and are re-grouped client-side by status.
    supabase
      .from("quests")
      .select("*")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (data) {
          setQuests(data.map(mapQuest));
        }
      });

    // Real-time subscription
    const channel = supabase
      .channel("quests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quests" },
        (payload) => {
          setQuests((prev) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              return prev.filter((q) => q.id !== old.id);
            }
            if (payload.eventType === "INSERT") {
              return [...prev, mapQuest(payload.new)];
            }
            // UPDATE
            return prev.map((q) =>
              q.id === (payload.new as { id: string }).id
                ? mapQuest(payload.new)
                : q
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return quests;
}

function mapQuest(row: Record<string, unknown>): Quest {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    reward: (row.reward as string) ?? "",
    level: row.level as Quest["level"],
    status: row.status as Quest["status"],
    hexCol: row.hex_col as number,
    hexRow: row.hex_row as number,
    endHexCol: (row.end_hex_col as number) ?? null,
    endHexRow: (row.end_hex_row as number) ?? null,
    players: (row.players as string[]) ?? [],
    scheduledDate: (row.scheduled_date as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    foundItems: Array.isArray(row.found_items)
      ? (row.found_items as FoundItem[])
      : [],
  };
}

/**
 * All hex writes go through the `admin-action` Edge Function. The browser
 * has no direct write access to the hexes table — RLS enforces that.
 */
/**
 * Fire-and-forget Discord sync for a quest. Errors are logged but never
 * thrown — the Discord side is best-effort, the local DB write is the
 * source of truth.
 */
function syncQuestToDiscord(questId: string): void {
  supabase.functions
    .invoke("discord-quest-sync", { body: { questId } })
    .then(({ error }) => {
      if (error) {
        console.warn("discord-quest-sync failed:", error.message);
      }
    })
    .catch((err) => {
      console.warn("discord-quest-sync threw:", err);
    });
}

/**
 * Fire-and-forget Discord post to the "mission reports" channel.
 * The function reads the canonical finding + quest from the DB, so
 * the caller passes only the new finding's id — no arbitrary content
 * can be smuggled through this path.
 */
function postFindingToDiscord(findingId: string): void {
  supabase.functions
    .invoke("discord-finding-post", { body: { findingId } })
    .then(({ error }) => {
      if (error) {
        console.warn("discord-finding-post failed:", error.message);
      }
    })
    .catch((err) => {
      console.warn("discord-finding-post threw:", err);
    });
}

export async function callAdminAction(
  pin: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("admin-action", {
    body: { pin, action, payload },
  });
  if (error) {
    throw new Error(`admin-action failed: ${error.message}`);
  }
  if (!data || (data as { ok?: boolean }).ok !== true) {
    const msg = (data as { error?: string })?.error || "unknown error";
    throw new Error(msg);
  }
  return data as Record<string, unknown>;
}

export async function setHexTerrain(
  pin: string,
  col: number,
  row: number,
  terrain: TerrainType
): Promise<void> {
  await callAdminAction(pin, "set_hex_terrain", { col, row, terrain });
}

export async function setHexChallengeTier(
  pin: string,
  col: number,
  row: number,
  tier: ChallengeTier | null
): Promise<void> {
  await callAdminAction(pin, "set_hex_challenge_tier", { col, row, tier });
}

export async function setHexLandmark(
  pin: string,
  col: number,
  row: number,
  landmark: Landmark | null
): Promise<void> {
  await callAdminAction(pin, "set_hex_landmark", { col, row, landmark });
}

export async function setHexLandmarkName(
  pin: string,
  col: number,
  row: number,
  name: string | null
): Promise<void> {
  await callAdminAction(pin, "set_hex_landmark_name", { col, row, name });
}

export async function createQuest(
  pin: string,
  quest: Omit<Quest, "id">
): Promise<void> {
  await callAdminAction(pin, "create_quest", { ...quest });
  // No id to sync yet — Discord post happens on the first join.
}

export async function updateQuest(
  pin: string,
  id: string,
  updates: Partial<Quest>
): Promise<void> {
  await callAdminAction(pin, "update_quest", { id, ...updates });
  syncQuestToDiscord(id);
}

export async function deleteQuest(pin: string, id: string): Promise<void> {
  // delete_quest action handles the Discord message deletion server-side.
  await callAdminAction(pin, "delete_quest", { id });
}

/**
 * Admin-only. Replaces a quest's entire found-items loot list. The list is
 * the single source of truth: assigned items surface in the assignee's
 * "My Items" (derived from the live quests), so reassigning never desyncs.
 */
export async function setQuestFoundItems(
  pin: string,
  questId: string,
  items: FoundItem[]
): Promise<void> {
  await callAdminAction(pin, "set_quest_found_items", { id: questId, items });
  syncQuestToDiscord(questId);
}

export interface PayoutResult {
  /** Total gp paid out across the party (reward × multiplier + beast bonus). */
  total: number;
  /** Even per-player share (before uneven-split remainder). */
  perPlayer: number;
  /** Players who received gold, with their exact share. */
  paid: { player: string; amount: number }[];
  /** Party members with no character row — gold could not be credited. */
  skipped: { player: string; amount: number }[];
}

/**
 * Admin-only. Pays out a quest: multiplies its gp reward by `multiplier`,
 * adds the flat `beastBonus`, splits the sum evenly among the party, credits
 * each player's character gold, and flips the quest to "paid_out". All
 * computation happens server-side in the admin-action Edge Function.
 */
export async function payOutQuest(
  pin: string,
  questId: string,
  multiplier: number,
  beastBonus: number
): Promise<PayoutResult> {
  const data = await callAdminAction(pin, "pay_out_quest", {
    id: questId,
    multiplier,
    beastBonus,
  });
  return {
    total: Number(data.total) || 0,
    perPlayer: Number(data.perPlayer) || 0,
    paid: (data.paid as PayoutResult["paid"]) ?? [],
    skipped: (data.skipped as PayoutResult["skipped"]) ?? [],
  };
}

export async function joinQuest(
  questId: string,
  playerName: string,
  scheduledDate?: string
): Promise<void> {
  const { error } = await supabase.rpc("join_quest", {
    p_quest_id: questId,
    p_player_name: playerName,
    p_scheduled_date: scheduledDate ?? null,
  });
  if (error) throw new Error(`join_quest failed: ${error.message}`);
  syncQuestToDiscord(questId);
}

export async function leaveQuest(
  questId: string,
  playerName: string
): Promise<void> {
  const { error } = await supabase.rpc("leave_quest", {
    p_quest_id: questId,
    p_player_name: playerName,
  });
  if (error) throw new Error(`leave_quest failed: ${error.message}`);
  syncQuestToDiscord(questId);
}

export async function setQuestActive(
  questId: string,
  playerName: string
): Promise<void> {
  const { error } = await supabase.rpc("set_quest_active", {
    p_quest_id: questId,
    p_player_name: playerName,
  });
  if (error) throw new Error(`set_quest_active failed: ${error.message}`);
  syncQuestToDiscord(questId);
}

export interface NpcReportSummary {
  questId: string;
  questTitle: string;
  party: string[];
  findingCount: number;
}

/**
 * Admin-only. Asks the AI to roleplay a rival NPC party that quietly
 * completed 1-2 currently-available (unclaimed) quests. Marks them
 * completed and populates their findings.
 */
export async function generateNpcQuestReport(
  pin: string
): Promise<{ applied: NpcReportSummary[]; message: string }> {
  const { data, error } = await supabase.functions.invoke("npc-quest-report", {
    body: { pin },
  });
  if (error) throw new Error(`Edge function error: ${error.message}`);
  if (!data || (data as { ok?: boolean }).ok !== true) {
    throw new Error(
      (data as { error?: string })?.error || "unknown NPC report error"
    );
  }
  const d = data as {
    applied?: NpcReportSummary[];
    message?: string;
  };
  return {
    applied: d.applied ?? [],
    message: d.message ?? "",
  };
}

// --- Initiative Tracker ---

function mapInitiativeEntry(row: Record<string, unknown>): InitiativeEntry {
  return {
    id: row.id as string,
    name: row.name as string,
    initiative: row.initiative as number,
    isCreature: row.is_creature as boolean,
    hp: (row.hp as number) ?? null,
    maxHp: (row.max_hp as number) ?? null,
    ac: (row.ac as number) ?? null,
    cr: (row.cr as number) ?? null,
  };
}

export function useInitiative(): InitiativeEntry[] {
  const [entries, setEntries] = useState<InitiativeEntry[]>([]);

  useEffect(() => {
    supabase
      .from("initiative_tracker")
      .select("*")
      .order("initiative", { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data.map(mapInitiativeEntry));
      });

    const channel = supabase
      .channel("initiative-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "initiative_tracker" },
        (payload) => {
          setEntries((prev) => {
            let next: InitiativeEntry[];
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              next = prev.filter((e) => e.id !== old.id);
            } else if (payload.eventType === "INSERT") {
              next = [...prev, mapInitiativeEntry(payload.new)];
            } else {
              next = prev.map((e) =>
                e.id === (payload.new as { id: string }).id
                  ? mapInitiativeEntry(payload.new)
                  : e
              );
            }
            return next.sort((a, b) => b.initiative - a.initiative);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return entries;
}

export async function addInitiativeEntry(
  name: string,
  initiative: number,
  isCreature: boolean,
  stats?: { hp?: number; ac?: number; cr?: number }
): Promise<void> {
  await supabase.from("initiative_tracker").insert({
    name,
    initiative,
    is_creature: isCreature,
    hp: stats?.hp ?? null,
    max_hp: stats?.hp ?? null,
    ac: stats?.ac ?? null,
    cr: stats?.cr ?? null,
  });
}

export async function removeInitiativeEntry(
  pin: string,
  id: string
): Promise<void> {
  await callAdminAction(pin, "remove_initiative_entry", { id });
}

export async function updateInitiativeHp(
  pin: string,
  id: string,
  hp: number
): Promise<void> {
  await callAdminAction(pin, "update_initiative_hp", { id, hp });
}

export async function clearInitiativeTracker(pin: string): Promise<void> {
  await callAdminAction(pin, "clear_initiative", {});
}

// --- Characters ---

function mapCharacter(row: Record<string, unknown>): Character {
  return {
    playerName: row.player_name as string,
    hitPoints: (row.hit_points as number) ?? null,
    armorClass: (row.armor_class as number) ?? null,
    gold: (row.gold as number) ?? 0,
  };
}

/** Live map of all characters keyed by player name. */
export function useCharacters(): Map<string, Character> {
  const [characters, setCharacters] = useState<Map<string, Character>>(
    new Map()
  );

  useEffect(() => {
    supabase
      .from("characters")
      .select("*")
      .then(({ data }) => {
        if (data) {
          const map = new Map<string, Character>();
          for (const row of data) {
            const c = mapCharacter(row);
            map.set(c.playerName, c);
          }
          setCharacters(map);
        }
      });

    const channel = supabase
      .channel("characters-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "characters" },
        (payload) => {
          setCharacters((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const old = payload.old as { player_name: string };
              next.delete(old.player_name);
            } else {
              const c = mapCharacter(payload.new);
              next.set(c.playerName, c);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return characters;
}

/**
 * Save the player's character. If `oldName` is different from `newName`,
 * cascades the rename across quests/findings/initiative.
 */
export async function saveCharacter(
  oldName: string | null,
  newName: string,
  hitPoints: number | null,
  armorClass: number | null,
  gold: number
): Promise<void> {
  const { error } = await supabase.rpc("save_character", {
    p_old_name: oldName,
    p_new_name: newName.trim(),
    p_hp: hitPoints,
    p_ac: armorClass,
    p_gold: gold,
  });
  if (error) throw new Error(`save_character failed: ${error.message}`);
}

// --- Quest findings ---

function mapQuestFinding(row: Record<string, unknown>): QuestFinding {
  return {
    id: row.id as string,
    questId: row.quest_id as string,
    author: row.author as string,
    hexCol: row.hex_col as number,
    hexRow: row.hex_row as number,
    description: (row.description as string) ?? "",
    createdAt: row.created_at as string,
  };
}

export function useQuestFindings(): QuestFinding[] {
  const [findings, setFindings] = useState<QuestFinding[]>([]);

  useEffect(() => {
    supabase
      .from("quest_findings")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setFindings(data.map(mapQuestFinding));
      });

    const channel = supabase
      .channel("quest-findings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quest_findings" },
        (payload) => {
          setFindings((prev) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              return prev.filter((f) => f.id !== old.id);
            }
            if (payload.eventType === "INSERT") {
              return [...prev, mapQuestFinding(payload.new)];
            }
            // UPDATE
            return prev.map((f) =>
              f.id === (payload.new as { id: string }).id
                ? mapQuestFinding(payload.new)
                : f
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return findings;
}

export async function createQuestFinding(
  questId: string,
  author: string,
  hexCol: number,
  hexRow: number,
  description: string
): Promise<void> {
  // Route through the RPC so the server can enforce that the author is
  // actually on the quest's party (and clamp string lengths). Admins post
  // as a party member from the UI dropdown, so this path serves everyone.
  const { data, error } = await supabase.rpc("create_quest_finding", {
    p_quest_id: questId,
    p_author: author,
    p_hex_col: hexCol,
    p_hex_row: hexRow,
    p_description: description,
  });
  if (error) throw new Error(error.message);
  if (data) {
    postFindingToDiscord(String(data));
  }
}

export async function deleteQuestFinding(id: string): Promise<void> {
  await supabase.from("quest_findings").delete().eq("id", id);
}

/**
 * Generate quest suggestions from a completed quest's findings.
 * Sends the quest, its findings, and the world state to the
 * `generate-quests` Edge Function which calls OpenAI server-side.
 */
export async function generateQuestsFromQuest(
  pin: string,
  questId: string,
  hexes: Map<string, HexData>,
  quests: Quest[],
  findings: QuestFinding[]
): Promise<QuestSuggestion[]> {
  const filledHexes = Array.from(hexes.values()).filter(
    (h) => h.terrain !== "unknown"
  );

  const { data, error } = await supabase.functions.invoke("generate-quests", {
    body: {
      pin,
      questId,
      hexes: filledHexes.map((h) => ({
        col: h.col,
        row: h.row,
        terrain: h.terrain,
        challengeTier: h.challengeTier,
        landmark: h.landmark,
      })),
      quests: quests.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        level: q.level,
        status: q.status,
        hexCol: q.hexCol,
        hexRow: q.hexRow,
        endHexCol: q.endHexCol,
        endHexRow: q.endHexRow,
      })),
      findings: findings.map((f) => ({
        author: f.author,
        hexCol: f.hexCol,
        hexRow: f.hexRow,
        description: f.description,
        createdAt: f.createdAt,
      })),
    },
  });

  if (error) {
    throw new Error(`Edge function error: ${error.message}`);
  }
  const suggestions = (data as { suggestions?: QuestSuggestion[] })?.suggestions;
  if (!Array.isArray(suggestions)) {
    throw new Error("Edge function returned no suggestions array");
  }
  return suggestions;
}