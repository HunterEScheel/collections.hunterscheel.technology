// Supabase Edge Function: discord-quest-sync
//
// Takes a quest id, looks up the quest, and either:
//  - Posts a new Discord webhook message (first time the quest needs to appear
//    on Discord — typically the first party member joins), saving the returned
//    message id back to the row.
//  - PATCHes the existing webhook message with current state.
//  - Skips entirely if the quest has no players AND no existing message
//    (don't spam Discord for unjoined quests).
//
// Deploy via dashboard:
//   1. Edge Functions → Deploy a new function → Via Editor
//   2. Name: discord-quest-sync
//   3. Paste this file
//   4. Settings → toggle "Verify JWT" OFF
//
// Required secret:
//   DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/<id>/<token>
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno runtime.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_CORS = { ...CORS_HEADERS, "Content-Type": "application/json" };

const LEVEL_LABEL: Record<string, string> = {
  explore: "Explore",
  recurring: "Recurring",
  wolf: "Wolf",
  demon: "Demon",
  dragon: "Dragon",
  terrasque: "Terrasque",
  god: "God",
};

// QUEST_LEVEL_COLORS converted from hex (#xxxxxx) to decimal for Discord embeds.
const LEVEL_COLOR: Record<string, number> = {
  explore: 0x4ade80,
  recurring: 0x60a5fa,
  wolf: 0xfacc15,
  demon: 0xf97316,
  dragon: 0xef4444,
  terrasque: 0xa855f7,
  god: 0xfbbf24,
};

const COMPLETED_COLOR = 0x4b5563; // muted gray

const HEXMAP_URL = "https://scheels.quest/?tab=active-quests";

// Rewards are always gold pieces. Numeric strings get "X gp" formatting;
// legacy free-form entries pass through untouched.
function formatReward(reward: unknown): string {
  if (reward == null) return "—";
  const trimmed = String(reward).trim();
  if (trimmed === "") return "—";
  const stripped = trimmed.replace(/\s*gp\s*$/i, "").trim();
  const n = Number(stripped);
  if (Number.isFinite(n) && Number.isInteger(n) && n >= 0) {
    return `${n.toLocaleString()} gp`;
  }
  return trimmed;
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "Recruiting";
}

function buildEmbed(quest: any) {
  const isCompleted = quest.status === "completed";
  const color = isCompleted
    ? COMPLETED_COLOR
    : LEVEL_COLOR[quest.level] ?? 0x9ca3af;

  const players: string[] = Array.isArray(quest.players) ? quest.players : [];
  const partyValue =
    players.length === 0
      ? "_(nobody yet)_"
      : players.map((p) => `• ${p}`).join("\n");

  const loc =
    quest.end_hex_col != null && quest.end_hex_row != null
      ? `(${quest.hex_col}, ${quest.hex_row}) → (${quest.end_hex_col}, ${quest.end_hex_row})`
      : `(${quest.hex_col}, ${quest.hex_row})`;

  // Build description: existing quest description (if any), then a
  // clickable link to the Active Quests board.
  const descParts: string[] = [];
  if (quest.description && String(quest.description).trim() !== "") {
    descParts.push(String(quest.description));
  }
  descParts.push(`🔗 [Open Active Quests Board](${HEXMAP_URL})`);
  const description = descParts.join("\n\n");

  const fields = [
    {
      name: "Difficulty",
      value: LEVEL_LABEL[quest.level] ?? quest.level,
      inline: true,
    },
    {
      name: "Status",
      value: statusLabel(quest.status),
      inline: true,
    },
    {
      name: "Location",
      value: loc,
      inline: true,
    },
    {
      name: "Reward",
      value: formatReward(quest.reward),
      inline: false,
    },
    {
      name: `Party (${players.length})`,
      value: partyValue,
      inline: false,
    },
  ];

  if (quest.scheduled_date) {
    // Discord renders <t:UNIX:F> in each viewer's local timezone — e.g.
    // "Saturday, January 18, 2025 7:00 PM" plus a "in 3 days" tooltip.
    const ms = Date.parse(String(quest.scheduled_date));
    if (Number.isFinite(ms)) {
      const unix = Math.floor(ms / 1000);
      fields.push({
        name: "Scheduled",
        value: `<t:${unix}:F> (<t:${unix}:R>)`,
        inline: false,
      });
    } else {
      fields.push({
        name: "Scheduled",
        value: String(quest.scheduled_date),
        inline: true,
      });
    }
  }

  return {
    title: isCompleted ? `~~${quest.title}~~` : quest.title,
    url: HEXMAP_URL,
    description,
    color,
    fields,
    footer: { text: `Quest ${quest.id.slice(0, 8)}` },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: JSON_CORS,
    });
  }

  try {
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "DISCORD_WEBHOOK_URL secret not set" }),
        { status: 500, headers: JSON_CORS }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase env vars missing" }),
        { status: 500, headers: JSON_CORS }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: JSON_CORS,
      });
    }

    const questId = String(body?.questId ?? "");
    if (!questId) {
      return new Response(JSON.stringify({ error: "questId required" }), {
        status: 400,
        headers: JSON_CORS,
      });
    }

    const supa = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: quest, error: fetchErr } = await supa
      .from("quests")
      .select("*")
      .eq("id", questId)
      .maybeSingle();

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: `fetch failed: ${fetchErr.message}` }),
        { status: 500, headers: JSON_CORS }
      );
    }
    if (!quest) {
      // Quest is gone (probably deleted) — nothing to sync.
      return new Response(JSON.stringify({ ok: true, skipped: "no-quest" }), {
        headers: JSON_CORS,
      });
    }

    const hasMessage =
      typeof quest.discord_message_id === "string" &&
      quest.discord_message_id.length > 0;
    const players = Array.isArray(quest.players) ? quest.players : [];

    // Don't post for unjoined quests — only sync if there's already a message
    // OR the party is non-empty.
    if (!hasMessage && players.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no-party" }), {
        headers: JSON_CORS,
      });
    }

    // If every player has left, retire the Discord post entirely so the
    // channel doesn't accumulate empty-party messages.
    if (hasMessage && players.length === 0) {
      const delRes = await fetch(
        `${webhookUrl}/messages/${encodeURIComponent(
          quest.discord_message_id
        )}`,
        { method: "DELETE" }
      );
      // 204 = deleted, 404 = already gone. Both fine. Anything else: log and
      // still clear our pointer so we don't get stuck.
      if (!delRes.ok && delRes.status !== 404) {
        const text = await delRes.text();
        console.warn(`Discord DELETE ${delRes.status}: ${text}`);
      }
      const { error: clearErr } = await supa
        .from("quests")
        .update({ discord_message_id: null })
        .eq("id", questId);
      if (clearErr) {
        return new Response(
          JSON.stringify({
            error: `Cleared Discord post but failed to update row: ${clearErr.message}`,
          }),
          { status: 500, headers: JSON_CORS }
        );
      }
      return new Response(
        JSON.stringify({ ok: true, deleted: true }),
        { headers: JSON_CORS }
      );
    }

    const embed = buildEmbed(quest);

    if (hasMessage) {
      // PATCH the existing webhook message.
      const patchUrl = `${webhookUrl}/messages/${encodeURIComponent(
        quest.discord_message_id
      )}`;
      const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [embed],
          allowed_mentions: { parse: [] },
        }),
      });
      if (!patchRes.ok) {
        const text = await patchRes.text();
        // If Discord says the message is gone (404), clear our pointer so
        // the next sync re-posts.
        if (patchRes.status === 404) {
          await supa
            .from("quests")
            .update({ discord_message_id: null })
            .eq("id", questId);
          return new Response(
            JSON.stringify({
              ok: true,
              reposted_needed: true,
              cleared: true,
            }),
            { headers: JSON_CORS }
          );
        }
        return new Response(
          JSON.stringify({ error: `Discord PATCH ${patchRes.status}: ${text}` }),
          { status: 502, headers: JSON_CORS }
        );
      }
      return new Response(JSON.stringify({ ok: true, updated: true }), {
        headers: JSON_CORS,
      });
    }

    // First-time post — must include ?wait=true so Discord returns the
    // message body (including id).
    const postUrl = `${webhookUrl}?wait=true`;
    const postRes = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Hexmap",
        embeds: [embed],
        allowed_mentions: { parse: [] },
      }),
    });
    if (!postRes.ok) {
      const text = await postRes.text();
      return new Response(
        JSON.stringify({ error: `Discord POST ${postRes.status}: ${text}` }),
        { status: 502, headers: JSON_CORS }
      );
    }
    const created = await postRes.json();
    const messageId = String(created?.id ?? "");
    if (!messageId) {
      return new Response(
        JSON.stringify({ error: "Discord response missing message id" }),
        { status: 502, headers: JSON_CORS }
      );
    }

    const { error: saveErr } = await supa
      .from("quests")
      .update({ discord_message_id: messageId })
      .eq("id", questId);
    if (saveErr) {
      return new Response(
        JSON.stringify({
          error: `Saved Discord post but failed to record id: ${saveErr.message}`,
        }),
        { status: 500, headers: JSON_CORS }
      );
    }

    return new Response(JSON.stringify({ ok: true, posted: true, messageId }), {
      headers: JSON_CORS,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_CORS }
    );
  }
});
