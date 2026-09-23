// Supabase Edge Function: admin-action
//
// Server-side admin authentication and write gate. The browser never holds
// write access to the hexes table directly; instead it sends an admin PIN
// here, this function verifies it against the ADMIN_PIN secret, and on
// success performs the write using the service-role key (which bypasses
// RLS).
//
// Deploy via dashboard:
//   1. Edge Functions → Deploy a new function → Via Editor
//   2. Name: admin-action
//   3. Paste this whole file, click Deploy
//   4. Settings/Details tab → turn OFF "Verify JWT"
//
// Required secret (set once at the project level):
//   ADMIN_PIN = <your chosen PIN>
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
// into every Edge Function — no need to set them.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno runtime, not browser TS build.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_CORS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

const VALID_TERRAINS = [
  "forest",
  "plains",
  "mountain",
  "swamp",
  "desert",
  "snow",
  "water",
  "unknown",
];

const VALID_LANDMARKS = [
  "dungeon",
  "village",
  "ruins",
  "tower",
  "major_threat",
  "allied_city",
  "unallied_city",
];

const VALID_QUEST_LEVELS = [
  "explore",
  "recurring",
  "wolf",
  "demon",
  "dragon",
  "terrasque",
  "god",
];
const VALID_QUEST_STATUSES = [
  "available",
  "in_progress",
  "completed",
  "paid_out",
];

// Payout multipliers an admin may apply to a quest's gp reward.
const ALLOWED_PAYOUT_MULTIPLIERS = [5, 4, 3, 2, 1, 0.5, 0.25];

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_CORS });
}

// Normalize a quest's found-items loot list: clamp lengths, coerce the gp
// value to a non-negative integer, and drop unnamed entries. Items keep any
// client-supplied id (or get a fresh one) and an optional assignee name.
function sanitizeFoundItems(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .slice(0, 100)
    .map((it) => {
      const value = Number(it?.value);
      return {
        id: String(it?.id ?? crypto.randomUUID()),
        name: String(it?.name ?? "").trim().slice(0, 120),
        description: String(it?.description ?? "").slice(0, 1000),
        value: Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0,
        assignedTo:
          it?.assignedTo == null || it.assignedTo === ""
            ? null
            : String(it.assignedTo).slice(0, 80),
      };
    })
    .filter((it) => it.name !== "");
}

const ok = (extra = {}) => jsonResponse(200, { ok: true, ...extra });
const badRequest = (msg) => jsonResponse(400, { error: msg });
const unauthorized = () => jsonResponse(401, { error: "Invalid admin PIN" });
const serverError = (msg) => jsonResponse(500, { error: msg });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const adminPin = Deno.env.get("ADMIN_PIN");
  if (!adminPin) return serverError("ADMIN_PIN secret not set");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return serverError("Supabase env vars missing");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const submittedPin = String(body?.pin ?? "");
  if (submittedPin !== adminPin) return unauthorized();

  const action = String(body?.action ?? "");
  const payload = (body?.payload ?? {}) as Record<string, any>;

  const supa = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    switch (action) {
      case "verify_pin":
        // Just confirm the PIN — useful for the login modal.
        return ok();

      case "set_hex_terrain": {
        const col = Number(payload.col);
        const row = Number(payload.row);
        const terrain = String(payload.terrain ?? "");
        if (!Number.isFinite(col) || !Number.isFinite(row)) {
          return badRequest("col/row must be numbers");
        }
        if (!VALID_TERRAINS.includes(terrain)) {
          return badRequest("invalid terrain");
        }
        if (terrain === "unknown") {
          // Paint-unknown = delete the row entirely (clears tier too).
          const { error } = await supa
            .from("hexes")
            .delete()
            .eq("col", col)
            .eq("row", row);
          if (error) return serverError(error.message);
        } else {
          const { error } = await supa.from("hexes").upsert(
            { col, row, terrain },
            { onConflict: "col,row" }
          );
          if (error) return serverError(error.message);
        }
        return ok();
      }

      case "set_hex_challenge_tier": {
        const col = Number(payload.col);
        const row = Number(payload.row);
        const tierRaw = payload.tier;
        const tier =
          tierRaw == null || tierRaw === "" ? null : Number(tierRaw);
        if (!Number.isFinite(col) || !Number.isFinite(row)) {
          return badRequest("col/row must be numbers");
        }
        if (tier != null && (!Number.isFinite(tier) || tier < 0 || tier > 4)) {
          return badRequest("invalid tier (must be 0-4 or null)");
        }
        const { error } = await supa.from("hexes").upsert(
          { col, row, challenge_tier: tier },
          { onConflict: "col,row" }
        );
        if (error) return serverError(error.message);
        return ok();
      }

      case "set_hex_landmark": {
        const col = Number(payload.col);
        const row = Number(payload.row);
        const landmarkRaw = payload.landmark;
        const landmark =
          landmarkRaw == null || landmarkRaw === ""
            ? null
            : String(landmarkRaw);
        if (!Number.isFinite(col) || !Number.isFinite(row)) {
          return badRequest("col/row must be numbers");
        }
        if (landmark != null && !VALID_LANDMARKS.includes(landmark)) {
          return badRequest("invalid landmark");
        }
        if (landmark == null) {
          // Clearing the landmark — if the row would be empty afterwards
          // (no terrain, no tier), delete it entirely so the grid shrinks.
          const { data: existing } = await supa
            .from("hexes")
            .select("terrain, challenge_tier")
            .eq("col", col)
            .eq("row", row)
            .maybeSingle();
          const willBeEmpty =
            !existing ||
            ((existing.terrain == null || existing.terrain === "unknown") &&
              existing.challenge_tier == null);
          if (willBeEmpty) {
            const { error } = await supa
              .from("hexes")
              .delete()
              .eq("col", col)
              .eq("row", row);
            if (error) return serverError(error.message);
            return ok();
          }
        }
        const { error } = await supa.from("hexes").upsert(
          { col, row, landmark },
          { onConflict: "col,row" }
        );
        if (error) return serverError(error.message);
        return ok();
      }

      case "set_hex_landmark_name": {
        const col = Number(payload.col);
        const row = Number(payload.row);
        const nameRaw = payload.name;
        const name =
          nameRaw == null || (typeof nameRaw === "string" && nameRaw.trim() === "")
            ? null
            : String(nameRaw).trim().slice(0, 80);
        if (!Number.isFinite(col) || !Number.isFinite(row)) {
          return badRequest("col/row must be numbers");
        }
        const { error } = await supa.from("hexes").upsert(
          { col, row, landmark_name: name },
          { onConflict: "col,row" }
        );
        if (error) return serverError(error.message);
        return ok();
      }

      // -------- Quests --------
      case "create_quest": {
        const q = payload;
        if (typeof q.title !== "string" || !q.title.trim()) {
          return badRequest("title required");
        }
        if (!VALID_QUEST_LEVELS.includes(q.level)) {
          return badRequest("invalid level");
        }
        const insert = {
          title: String(q.title).trim(),
          description: String(q.description ?? ""),
          reward: String(q.reward ?? ""),
          level: q.level,
          status: VALID_QUEST_STATUSES.includes(q.status) ? q.status : "available",
          hex_col: Number(q.hexCol),
          hex_row: Number(q.hexRow),
          end_hex_col:
            q.endHexCol != null && Number.isFinite(Number(q.endHexCol))
              ? Number(q.endHexCol)
              : null,
          end_hex_row:
            q.endHexRow != null && Number.isFinite(Number(q.endHexRow))
              ? Number(q.endHexRow)
              : null,
          players: Array.isArray(q.players) ? q.players : [],
          scheduled_date: q.scheduledDate ?? null,
          found_items: sanitizeFoundItems(q.foundItems),
        };
        const { error } = await supa.from("quests").insert(insert);
        if (error) return serverError(error.message);
        return ok();
      }

      case "update_quest": {
        const id = String(payload.id ?? "");
        if (!id) return badRequest("quest id required");
        const updates: Record<string, unknown> = {};
        if (payload.title !== undefined) updates.title = String(payload.title);
        if (payload.description !== undefined)
          updates.description = String(payload.description);
        if (payload.reward !== undefined) updates.reward = String(payload.reward);
        if (payload.level !== undefined) {
          if (!VALID_QUEST_LEVELS.includes(payload.level)) {
            return badRequest("invalid level");
          }
          updates.level = payload.level;
        }
        if (payload.status !== undefined) {
          if (!VALID_QUEST_STATUSES.includes(payload.status)) {
            return badRequest("invalid status");
          }
          updates.status = payload.status;
          // Stamp completed_at when a quest moves into completed; clear it
          // if it ever moves back out.
          if (payload.status === "completed") {
            updates.completed_at = new Date().toISOString();
          } else {
            updates.completed_at = null;
          }
        }
        if (payload.hexCol !== undefined) updates.hex_col = Number(payload.hexCol);
        if (payload.hexRow !== undefined) updates.hex_row = Number(payload.hexRow);
        if (payload.endHexCol !== undefined)
          updates.end_hex_col =
            payload.endHexCol == null ? null : Number(payload.endHexCol);
        if (payload.endHexRow !== undefined)
          updates.end_hex_row =
            payload.endHexRow == null ? null : Number(payload.endHexRow);
        if (payload.players !== undefined)
          updates.players = Array.isArray(payload.players) ? payload.players : [];
        if (payload.scheduledDate !== undefined)
          updates.scheduled_date = payload.scheduledDate ?? null;

        const { error } = await supa.from("quests").update(updates).eq("id", id);
        if (error) return serverError(error.message);
        return ok();
      }

      case "delete_quest": {
        const id = String(payload.id ?? "");
        if (!id) return badRequest("quest id required");

        // Best-effort: if there's a Discord message for this quest, delete
        // it before removing the row (we lose the id after the delete).
        const { data: existing } = await supa
          .from("quests")
          .select("discord_message_id")
          .eq("id", id)
          .maybeSingle();
        const messageId =
          existing && typeof existing.discord_message_id === "string"
            ? existing.discord_message_id
            : null;
        const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
        if (messageId && webhookUrl) {
          try {
            await fetch(
              `${webhookUrl}/messages/${encodeURIComponent(messageId)}`,
              { method: "DELETE" }
            );
          } catch {
            // Don't block the quest delete on Discord failures.
          }
        }

        const { error } = await supa.from("quests").delete().eq("id", id);
        if (error) return serverError(error.message);
        return ok();
      }

      case "pay_out_quest": {
        const id = String(payload.id ?? "");
        if (!id) return badRequest("quest id required");

        const multiplier = Number(payload.multiplier);
        if (!ALLOWED_PAYOUT_MULTIPLIERS.includes(multiplier)) {
          return badRequest("invalid payout multiplier");
        }
        const beastBonus =
          payload.beastBonus == null ? 0 : Number(payload.beastBonus);
        if (!Number.isFinite(beastBonus) || beastBonus < 0) {
          return badRequest("beastBonus must be a number >= 0");
        }

        const { data: quest, error: qErr } = await supa
          .from("quests")
          .select("id, reward, players, status")
          .eq("id", id)
          .maybeSingle();
        if (qErr) return serverError(qErr.message);
        if (!quest) return badRequest("quest not found");
        if (quest.status === "paid_out") {
          return badRequest("quest already paid out");
        }

        const players = Array.isArray(quest.players)
          ? quest.players.map((p: unknown) => String(p))
          : [];
        if (players.length === 0) {
          return badRequest("quest has no party to pay");
        }

        // Reward is a gp number string; non-numeric legacy values pay a
        // 0 base (the beast bonus can still apply).
        const rewardNum = Number(
          String(quest.reward ?? "")
            .replace(/\s*gp\s*$/i, "")
            .trim()
        );
        const baseReward =
          Number.isFinite(rewardNum) && rewardNum > 0 ? rewardNum : 0;

        // (reward × multiplier) + beast bonus, split evenly. Any leftover
        // gp from an uneven split goes to the first players in the party.
        const total = Math.round(baseReward * multiplier) + Math.round(beastBonus);
        const n = players.length;
        const perPlayer = Math.floor(total / n);
        const remainder = total - perPlayer * n;
        const shares = players.map((_, i) => perPlayer + (i < remainder ? 1 : 0));

        // Only players with a character row can hold gold; others are
        // reported back as skipped so the admin knows to create them.
        const { data: chars, error: cErr } = await supa
          .from("characters")
          .select("player_name, gold")
          .in("player_name", players);
        if (cErr) return serverError(cErr.message);
        const goldByName = new Map(
          (chars ?? []).map((c: { player_name: string; gold: number }) => [
            c.player_name,
            Number(c.gold) || 0,
          ])
        );

        const paid: { player: string; amount: number }[] = [];
        const skipped: { player: string; amount: number }[] = [];
        for (let i = 0; i < players.length; i++) {
          const name = players[i];
          const share = shares[i];
          if (!goldByName.has(name)) {
            skipped.push({ player: name, amount: share });
            continue;
          }
          const newGold = (goldByName.get(name) as number) + share;
          const { error: uErr } = await supa
            .from("characters")
            .update({ gold: newGold })
            .eq("player_name", name);
          if (uErr) return serverError(uErr.message);
          paid.push({ player: name, amount: share });
        }

        const { error: sErr } = await supa
          .from("quests")
          .update({ status: "paid_out" })
          .eq("id", id);
        if (sErr) return serverError(sErr.message);

        return ok({ total, perPlayer, paid, skipped });
      }

      case "set_quest_found_items": {
        const id = String(payload.id ?? "");
        if (!id) return badRequest("quest id required");
        const items = sanitizeFoundItems(payload.items);
        const { error } = await supa
          .from("quests")
          .update({ found_items: items })
          .eq("id", id);
        if (error) return serverError(error.message);
        return ok({ items });
      }

      // -------- Initiative tracker --------
      case "remove_initiative_entry": {
        const id = String(payload.id ?? "");
        if (!id) return badRequest("entry id required");
        const { error } = await supa
          .from("initiative_tracker")
          .delete()
          .eq("id", id);
        if (error) return serverError(error.message);
        return ok();
      }

      case "update_initiative_hp": {
        const id = String(payload.id ?? "");
        const hp = Number(payload.hp);
        if (!id) return badRequest("entry id required");
        if (!Number.isFinite(hp)) return badRequest("hp must be a number");
        const { error } = await supa
          .from("initiative_tracker")
          .update({ hp })
          .eq("id", id);
        if (error) return serverError(error.message);
        return ok();
      }

      case "clear_initiative": {
        const { error } = await supa
          .from("initiative_tracker")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) return serverError(error.message);
        return ok();
      }

      // -------- Shop inventory --------
      case "shop_insert_items": {
        const items = Array.isArray(payload.items) ? payload.items : [];
        if (items.length === 0) return ok();
        const { error } = await supa.from("shop_inventory").insert(items);
        if (error) return serverError(error.message);
        return ok();
      }

      case "shop_update_quantity": {
        const id = String(payload.id ?? "");
        const quantity = Number(payload.quantity);
        if (!id) return badRequest("id required");
        if (!Number.isFinite(quantity) || quantity < 0) {
          return badRequest("quantity must be >= 0");
        }
        if (quantity === 0) {
          const { error } = await supa
            .from("shop_inventory")
            .delete()
            .eq("id", id);
          if (error) return serverError(error.message);
        } else {
          const { error } = await supa
            .from("shop_inventory")
            .update({ quantity })
            .eq("id", id);
          if (error) return serverError(error.message);
        }
        return ok();
      }

      case "shop_update_price": {
        const id = String(payload.id ?? "");
        const price = String(payload.price ?? "");
        if (!id) return badRequest("id required");
        const { error } = await supa
          .from("shop_inventory")
          .update({ price })
          .eq("id", id);
        if (error) return serverError(error.message);
        return ok();
      }

      // -------- Shop restock rules --------
      case "restock_rule_upsert": {
        const r = payload;
        const { error } = await supa.from("shop_restock_rules").upsert(
          {
            item_index: String(r.itemIndex ?? ""),
            item_name: String(r.itemName ?? ""),
            rarity: String(r.rarity ?? "common"),
            dice: String(r.dice ?? "1d4"),
            price: String(r.price ?? ""),
            enabled: r.enabled !== false,
          },
          { onConflict: "item_index" }
        );
        if (error) return serverError(error.message);
        return ok();
      }

      case "restock_rule_update": {
        const id = String(payload.id ?? "");
        if (!id) return badRequest("rule id required");
        const updates: Record<string, unknown> = {};
        if (payload.dice !== undefined) updates.dice = String(payload.dice);
        if (payload.price !== undefined) updates.price = String(payload.price);
        if (payload.rarity !== undefined) updates.rarity = String(payload.rarity);
        if (payload.enabled !== undefined) updates.enabled = !!payload.enabled;
        const { error } = await supa
          .from("shop_restock_rules")
          .update(updates)
          .eq("id", id);
        if (error) return serverError(error.message);
        return ok();
      }

      case "restock_rule_delete": {
        const id = String(payload.id ?? "");
        if (!id) return badRequest("rule id required");
        const { error } = await supa
          .from("shop_restock_rules")
          .delete()
          .eq("id", id);
        if (error) return serverError(error.message);
        return ok();
      }

      // -------- Shop restock settings --------
      case "restock_setting_update": {
        const rarity = String(payload.rarity ?? "");
        const count = Number(payload.count);
        if (!rarity) return badRequest("rarity required");
        if (!Number.isFinite(count) || count < 0) {
          return badRequest("count must be >= 0");
        }
        const { error } = await supa
          .from("shop_restock_settings")
          .update({ count })
          .eq("rarity", rarity);
        if (error) return serverError(error.message);
        return ok();
      }

      default:
        return badRequest(`unknown action: ${action}`);
    }
  } catch (err) {
    return serverError(err instanceof Error ? err.message : String(err));
  }
});
