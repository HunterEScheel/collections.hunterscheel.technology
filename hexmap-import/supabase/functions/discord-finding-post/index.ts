// Supabase Edge Function: discord-finding-post
//
// One-shot post to the "mission reports" Discord channel after a player
// submits a finding. To prevent arbitrary content posting, the caller
// passes only a finding id — the function reads the canonical finding +
// quest from the DB via the service-role key and formats the message.
//
// Deploy via dashboard:
//   1. Edge Functions → Deploy a new function → Via Editor
//   2. Name: discord-finding-post
//   3. Paste this file
//   4. Settings → toggle "Verify JWT" OFF
//
// Required secret:
//   MISSION_REPORTS_WEBHOOK_URL = https://discord.com/api/webhooks/<id>/<token>
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

const LEVEL_COLOR: Record<string, number> = {
  explore: 0x4ade80,
  recurring: 0x60a5fa,
  wolf: 0xfacc15,
  demon: 0xf97316,
  dragon: 0xef4444,
  terrasque: 0xa855f7,
  god: 0xfbbf24,
};

const HEXMAP_URL = "https://scheels.quest/?tab=active-quests";

// Hard caps so bots can't craft monster messages even via legit-looking DB rows.
const MAX_DESCRIPTION = 500;
const MAX_AUTHOR = 80;
const MAX_TITLE = 120;

function clamp(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
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
    const webhookUrl = Deno.env.get("MISSION_REPORTS_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "MISSION_REPORTS_WEBHOOK_URL secret not set" }),
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

    const findingId = String(body?.findingId ?? "");
    if (!findingId) {
      return new Response(
        JSON.stringify({ error: "findingId required" }),
        { status: 400, headers: JSON_CORS }
      );
    }

    const supa = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: finding, error: fErr } = await supa
      .from("quest_findings")
      .select("*")
      .eq("id", findingId)
      .maybeSingle();
    if (fErr) {
      return new Response(
        JSON.stringify({ error: `fetch finding failed: ${fErr.message}` }),
        { status: 500, headers: JSON_CORS }
      );
    }
    if (!finding) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no-finding" }),
        { headers: JSON_CORS }
      );
    }

    const { data: quest, error: qErr } = await supa
      .from("quests")
      .select("title, level")
      .eq("id", finding.quest_id)
      .maybeSingle();
    if (qErr) {
      return new Response(
        JSON.stringify({ error: `fetch quest failed: ${qErr.message}` }),
        { status: 500, headers: JSON_CORS }
      );
    }
    if (!quest) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no-quest" }),
        { headers: JSON_CORS }
      );
    }

    const author = clamp(String(finding.author ?? "Unknown"), MAX_AUTHOR);
    const description = clamp(
      String(finding.description ?? "").trim() || "_(no description)_",
      MAX_DESCRIPTION
    );
    const questTitle = clamp(String(quest.title ?? "Unknown Quest"), MAX_TITLE);
    const questLevel = String(quest.level ?? "explore");
    const hexCol = Number(finding.hex_col);
    const hexRow = Number(finding.hex_row);

    const color = LEVEL_COLOR[questLevel] ?? 0x9ca3af;
    const levelLabel = LEVEL_LABEL[questLevel] ?? questLevel;

    const embed = {
      title: "🗒️ Mission Report",
      url: HEXMAP_URL,
      description: `**${author}** reports from \`(${hexCol}, ${hexRow})\`:\n\n${description}`,
      color,
      fields: [
        { name: "Quest", value: questTitle, inline: true },
        { name: "Difficulty", value: levelLabel, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    const postRes = await fetch(webhookUrl, {
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

    return new Response(JSON.stringify({ ok: true }), { headers: JSON_CORS });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_CORS }
    );
  }
});
