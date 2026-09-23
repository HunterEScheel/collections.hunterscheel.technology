// Port of web useFirebase.ts player-facing data: hexes, quests, quest
// findings (realtime syncs into the store) and the player RPCs
// (join/leave/set-active quest, findings, save_character).
// The overlay does NOT start this sync — only the main app does.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { useStore } from "../store";
import type {
  Character,
  FoundItem,
  HexData,
  Quest,
  QuestFinding,
} from "../types";

function mapHex(row: Record<string, unknown>): HexData {
  return {
    col: row.col as number,
    row: row.row as number,
    terrain: (row.terrain as HexData["terrain"]) ?? "unknown",
    challengeTier: (row.challenge_tier as HexData["challengeTier"]) ?? null,
    landmark: (row.landmark as HexData["landmark"]) ?? null,
    landmarkName: (row.landmark_name as string) ?? null,
  };
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

const hexKey = (col: number, row: number) => `${col}_${row}`;

async function refetchHexes(): Promise<void> {
  const { data } = await supabase.from("hexes").select("*");
  if (data) {
    const map = new Map<string, HexData>();
    for (const row of data) {
      const h = mapHex(row);
      map.set(hexKey(h.col, h.row), h);
    }
    useStore.getState().setHexes(map);
  }
}

async function refetchQuests(): Promise<void> {
  const { data } = await supabase
    .from("quests")
    .select("*")
    .order("completed_at", { ascending: false, nullsFirst: false });
  if (data) useStore.getState().setQuests(data.map(mapQuest));
}

async function refetchFindings(): Promise<void> {
  const { data } = await supabase
    .from("quest_findings")
    .select("*")
    .order("created_at", { ascending: true });
  if (data) useStore.getState().setQuestFindings(data.map(mapQuestFinding));
}

let channels: RealtimeChannel[] = [];

function subscribeTable(
  channelName: string,
  table: string,
  onRefetch: () => Promise<void>
): RealtimeChannel {
  // The web app patches state per-event; on mobile a refetch-on-event is
  // simpler and these tables are small. Refetch also runs on (re)subscribe.
  return supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => {
        onRefetch();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onRefetch();
    });
}

export function startGuildSync(): void {
  if (channels.length > 0) return;
  channels = [
    subscribeTable("hexes-changes", "hexes", refetchHexes),
    subscribeTable("quests-changes", "quests", refetchQuests),
    subscribeTable("quest-findings-changes", "quest_findings", refetchFindings),
  ];
}

export function stopGuildSync(): void {
  for (const c of channels) supabase.removeChannel(c);
  channels = [];
}

// --- Discord fire-and-forget (same behavior as web) ---

function syncQuestToDiscord(questId: string): void {
  supabase.functions
    .invoke("discord-quest-sync", { body: { questId } })
    .then(({ error }) => {
      if (error) console.warn("discord-quest-sync failed:", error.message);
    })
    .catch((err) => console.warn("discord-quest-sync threw:", err));
}

function postFindingToDiscord(findingId: string): void {
  supabase.functions
    .invoke("discord-finding-post", { body: { findingId } })
    .then(({ error }) => {
      if (error) console.warn("discord-finding-post failed:", error.message);
    })
    .catch((err) => console.warn("discord-finding-post threw:", err));
}

// --- Player RPCs (same wire contract as web) ---

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

export async function createQuestFinding(
  questId: string,
  author: string,
  hexCol: number,
  hexRow: number,
  description: string
): Promise<void> {
  const { data, error } = await supabase.rpc("create_quest_finding", {
    p_quest_id: questId,
    p_author: author,
    p_hex_col: hexCol,
    p_hex_row: hexRow,
    p_description: description,
  });
  if (error) throw new Error(error.message);
  if (data) postFindingToDiscord(String(data));
}

export async function deleteQuestFinding(id: string): Promise<void> {
  const { error } = await supabase
    .from("quest_findings")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

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

export type { Character };
