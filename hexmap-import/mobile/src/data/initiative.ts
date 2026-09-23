// Port of web src/hooks/useFirebase.ts initiative + characters sections,
// adapted from React hooks to a store-driven sync service so the overlay
// (a second RN surface in the same runtime) shares one subscription.
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { useStore } from "../store";
import type { Character, CreatureDetails, InitiativeEntry } from "../types";

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
    details: (row.details as CreatureDetails) ?? null,
  };
}

function mapCharacter(row: Record<string, unknown>): Character {
  return {
    playerName: row.player_name as string,
    hitPoints: (row.hit_points as number) ?? null,
    armorClass: (row.armor_class as number) ?? null,
    gold: (row.gold as number) ?? 0,
  };
}

async function refetchInitiative(): Promise<void> {
  const { data } = await supabase
    .from("initiative_tracker")
    .select("*")
    .order("initiative", { ascending: false });
  if (data) useStore.getState().setEntries(data.map(mapInitiativeEntry));
}

async function refetchCharacters(): Promise<void> {
  const { data } = await supabase.from("characters").select("*");
  if (data) {
    const map = new Map<string, Character>();
    for (const row of data) {
      const c = mapCharacter(row);
      map.set(c.playerName, c);
    }
    useStore.getState().setCharacters(map);
  }
}

let initiativeChannel: RealtimeChannel | null = null;
let charactersChannel: RealtimeChannel | null = null;
let reconcileTimer: ReturnType<typeof setInterval> | null = null;
let teardownListeners: (() => void) | null = null;

function subscribeInitiative(): void {
  if (initiativeChannel) supabase.removeChannel(initiativeChannel);
  initiativeChannel = supabase
    .channel("initiative-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "initiative_tracker" },
      (payload) => {
        const { entries, setEntries } = useStore.getState();
        let next: InitiativeEntry[];
        if (payload.eventType === "DELETE") {
          const old = payload.old as { id: string };
          next = entries.filter((e) => e.id !== old.id);
        } else if (payload.eventType === "INSERT") {
          next = [...entries, mapInitiativeEntry(payload.new)];
        } else {
          next = entries.map((e) =>
            e.id === (payload.new as { id: string }).id
              ? mapInitiativeEntry(payload.new)
              : e
          );
        }
        setEntries([...next].sort((a, b) => b.initiative - a.initiative));
      }
    )
    .subscribe((status) => {
      const { setConnectionState } = useStore.getState();
      if (status === "SUBSCRIBED") {
        setConnectionState("connected");
        // Reconcile anything missed while the socket was down.
        refetchInitiative();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnectionState("disconnected");
      }
    });
}

function subscribeCharacters(): void {
  if (charactersChannel) supabase.removeChannel(charactersChannel);
  charactersChannel = supabase
    .channel("characters-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "characters" },
      (payload) => {
        const { characters, setCharacters } = useStore.getState();
        const next = new Map(characters);
        if (payload.eventType === "DELETE") {
          const old = payload.old as { player_name: string };
          next.delete(old.player_name);
        } else {
          const c = mapCharacter(payload.new);
          next.set(c.playerName, c);
        }
        setCharacters(next);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") refetchCharacters();
    });
}

function resubscribeIfDead(): void {
  if (initiativeChannel?.state !== "joined") {
    useStore.getState().setConnectionState("connecting");
    subscribeInitiative();
  }
  if (charactersChannel?.state !== "joined") {
    subscribeCharacters();
  }
}

/**
 * Start (or no-op if already started) the shared realtime sync. Called from
 * both the main app and the overlay surface — idempotent.
 */
export function startSync(): void {
  if (initiativeChannel) return;
  subscribeInitiative();
  subscribeCharacters();

  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") resubscribeIfDead();
  });
  const netInfoUnsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) resubscribeIfDead();
  });
  // Belt-and-braces: the table is tiny, a periodic reconcile is cheap and
  // covers events missed during Doze/websocket gaps.
  reconcileTimer = setInterval(() => {
    if (initiativeChannel?.state === "joined") refetchInitiative();
    else resubscribeIfDead();
  }, 60_000);

  teardownListeners = () => {
    appStateSub.remove();
    netInfoUnsub();
  };
}

export function stopSync(): void {
  if (initiativeChannel) supabase.removeChannel(initiativeChannel);
  if (charactersChannel) supabase.removeChannel(charactersChannel);
  initiativeChannel = null;
  charactersChannel = null;
  if (reconcileTimer) clearInterval(reconcileTimer);
  reconcileTimer = null;
  teardownListeners?.();
  teardownListeners = null;
}

// --- Writes (same wire contract as web) ---

export async function addInitiativeEntry(
  name: string,
  initiative: number,
  isCreature: boolean,
  stats?: { hp?: number; ac?: number; cr?: number },
  details?: CreatureDetails | null
): Promise<void> {
  const { error } = await supabase.from("initiative_tracker").insert({
    name,
    initiative,
    is_creature: isCreature,
    hp: stats?.hp ?? null,
    max_hp: stats?.hp ?? null,
    ac: stats?.ac ?? null,
    cr: stats?.cr ?? null,
    details: details ?? null,
  });
  if (error) throw new Error(error.message);
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

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    await callAdminAction(pin, "verify_pin", {});
    return true;
  } catch {
    return false;
  }
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
