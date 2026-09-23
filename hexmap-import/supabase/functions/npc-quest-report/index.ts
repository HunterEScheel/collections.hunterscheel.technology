// Supabase Edge Function: npc-quest-report
//
// Admin-only. Fetches currently-available quests that have no signed-up
// players, asks Grok to pick 1-2 of them and roleplay an NPC party that
// completed them off-screen, then writes the result back to the DB:
//   - quest.status → 'completed'
//   - quest.players → the invented NPC names
//   - a batch of quest_findings attributed to the NPC party
//
// Deploy via dashboard:
//   1. Edge Functions → Deploy a new function → Via Editor
//   2. Name: npc-quest-report
//   3. Paste this file
//   4. Settings → toggle "Verify JWT" OFF
//
// Required secrets (already set for other functions):
//   XAI_APIKEY, ADMIN_PIN
// Optional:
//   XAI_MODEL (default: grok-3-mini)

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

const SYSTEM_PROMPT = `You are the world-spinner for a Dungeons & Dragons hexcrawl campaign. The players run one adventuring party, but the world is not empty — other parties, mercenary bands, and lone opportunists exist too. Occasionally a rival NPC party quietly completes one of the guild's posted quests before the players get to it. This gives the world texture and often plants hooks for new adventures.

Your job: given a list of currently-available quests (nobody signed up yet) and the map state, pick 1 or 2 (usually 1) and roleplay a small NPC party that completed each one off-screen.

HARD RULE — you may ONLY pick from quests with level "recurring" or "explore". NPC parties handle the guild's small standing work (patrols, deliveries, scouting). Anything more dangerous is beyond their remit and stays for the players. Every quest in the list below is already filtered to be one of these two levels.

For each chosen quest, produce:
- An NPC party of 2-4 adventurers. Evocative fantasy names with a hint of personality (e.g. "Sable Ash the Wandering", "Grivvin Ironfoot", "Kess of the Reeds"). Do not reuse names that already appear in the players' quest party lists.
- 2-4 findings — locations they visited and what they saw there. Attribute each finding to one party member.
  - Each finding must include (hexCol, hexRow) coordinates. Prefer coordinates at or near the quest's start/end. If the quest spans a route, spread findings along it.
  - Descriptions: 1-2 sentences, D&D field-report tone. Focus on things that could HOOK the players' interest — clues, oddities, unresolved mysteries, half-glimpsed threats, "we didn't have time to investigate further."
  - Do NOT describe the party heroically clearing the quest. This is a report, not a saga.

Respond with ONLY this JSON:
{
  "reports": [
    {
      "questId": "<uuid of chosen quest>",
      "party": ["Name 1", "Name 2", "..."],
      "findings": [
        {
          "hexCol": <int>,
          "hexRow": <int>,
          "description": "...",
          "author": "<must exactly match one of the party names above>"
        }
      ]
    }
  ]
}`;

function buildUserPrompt(quests: any[], hexes: any[]): string {
  const questLines = quests
    .map(
      (q) =>
        `  ID ${q.id} — [${q.level}] "${q.title}" @ (${q.hex_col}, ${q.hex_row})${
          q.end_hex_col != null && q.end_hex_row != null
            ? ` → (${q.end_hex_col}, ${q.end_hex_row})`
            : ""
        }\n     ${q.description ?? ""}`
    )
    .join("\n\n");

  const hexLines = hexes
    .map((h) => {
      const tier = h.challenge_tier != null ? ` T${h.challenge_tier}` : "";
      const lm = h.landmark ? ` [${h.landmark}]` : "";
      return `  (${h.col}, ${h.row}) ${h.terrain}${tier}${lm}`;
    })
    .join("\n");

  return `AVAILABLE QUESTS (nobody signed up yet):
${questLines || "  (none)"}

WORLD STATE (filled hexes):
${hexLines || "  (none)"}

Pick 1 or 2 of the available quests and generate an NPC-party completion report for each.`;
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
    const adminPin = Deno.env.get("ADMIN_PIN");
    const apiKey = Deno.env.get("XAI_APIKEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!adminPin) {
      return new Response(
        JSON.stringify({ error: "ADMIN_PIN secret not set" }),
        { status: 500, headers: JSON_CORS }
      );
    }
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "XAI_APIKEY secret not set" }),
        { status: 500, headers: JSON_CORS }
      );
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase env vars missing" }),
        { status: 500, headers: JSON_CORS }
      );
    }
    const model = Deno.env.get("XAI_MODEL") || "grok-3-mini";

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: JSON_CORS,
      });
    }

    const submittedPin = String(body?.pin ?? "");
    if (submittedPin !== adminPin) {
      return new Response(JSON.stringify({ error: "Invalid admin PIN" }), {
        status: 401,
        headers: JSON_CORS,
      });
    }

    const supa = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Pull candidate quests — available, no players.
    const { data: quests, error: qErr } = await supa
      .from("quests")
      .select("*")
      .eq("status", "available");
    if (qErr) {
      return new Response(
        JSON.stringify({ error: `fetch quests failed: ${qErr.message}` }),
        { status: 500, headers: JSON_CORS }
      );
    }
    const unclaimed = (quests ?? []).filter(
      (q) => !Array.isArray(q.players) || q.players.length === 0
    );

    // Hard rule: NPC parties only take recurring or explore work.
    // Anything above their pay grade stays for the players.
    const ALLOWED_LEVELS = new Set(["recurring", "explore"]);
    const candidateQuests = unclaimed.filter((q) =>
      ALLOWED_LEVELS.has(q.level)
    );
    if (candidateQuests.length === 0) {
      const hadHigherOnly = unclaimed.length > 0;
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: "no-candidate-quests",
          message: hadHigherOnly
            ? "No recurring or explore quests on offer — the rival parties won't touch anything more dangerous."
            : "No unclaimed quests for the rival parties to consider.",
        }),
        { headers: JSON_CORS }
      );
    }

    const { data: hexes } = await supa.from("hexes").select("*");
    const filledHexes = (hexes ?? []).filter((h) => h.terrain !== "unknown");

    const userPrompt = buildUserPrompt(candidateQuests, filledHexes);

    const aiRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0.85,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({ error: `xAI ${aiRes.status}: ${errText}` }),
        { status: 502, headers: JSON_CORS }
      );
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "xAI returned no content" }),
        { status: 502, headers: JSON_CORS }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({
          error: "xAI returned malformed JSON",
          raw: content,
        }),
        { status: 502, headers: JSON_CORS }
      );
    }

    const rawReports = Array.isArray(parsed?.reports) ? parsed.reports : [];
    const candidateIds = new Set(candidateQuests.map((q) => q.id));

    // Sanitize + apply. Cap at 2 reports.
    const applied: any[] = [];
    for (const r of rawReports.slice(0, 2)) {
      if (!r || typeof r !== "object") continue;
      const questId = String(r.questId ?? "");
      if (!candidateIds.has(questId)) continue;

      const partyRaw = Array.isArray(r.party) ? r.party : [];
      const party = partyRaw
        .map((n) => String(n ?? "").trim().slice(0, 80))
        .filter((n) => n.length > 0)
        .slice(0, 4);
      if (party.length < 2) continue;
      const partySet = new Set(party);

      const rawFindings = Array.isArray(r.findings) ? r.findings : [];
      const findings: any[] = [];
      for (const f of rawFindings.slice(0, 4)) {
        if (!f || typeof f !== "object") continue;
        const hexCol = Number(f.hexCol);
        const hexRow = Number(f.hexRow);
        if (!Number.isFinite(hexCol) || !Number.isFinite(hexRow)) continue;
        const description = String(f.description ?? "").trim().slice(0, 500);
        if (!description) continue;
        // Author must be in the party; fall back to party[0] if not.
        let author = String(f.author ?? "").trim();
        if (!partySet.has(author)) author = party[0];
        findings.push({
          quest_id: questId,
          author,
          hex_col: Math.trunc(hexCol),
          hex_row: Math.trunc(hexRow),
          description,
        });
      }
      if (findings.length === 0) continue;

      // Mark the quest completed with the NPC party.
      const { error: updErr } = await supa
        .from("quests")
        .update({
          status: "completed",
          players: party,
          completed_at: new Date().toISOString(),
        })
        .eq("id", questId)
        .eq("status", "available"); // double-check nothing changed under us
      if (updErr) continue;

      const { error: insErr } = await supa
        .from("quest_findings")
        .insert(findings);
      if (insErr) {
        // Roll back the quest status if findings failed to insert.
        await supa
          .from("quests")
          .update({
            status: "available",
            players: [],
            completed_at: null,
          })
          .eq("id", questId);
        continue;
      }

      applied.push({
        questId,
        questTitle: candidateQuests.find((q) => q.id === questId)?.title ?? "",
        party,
        findingCount: findings.length,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        applied,
        message:
          applied.length === 0
            ? "The rival parties passed on every quest this time."
            : `${applied.length} quest${applied.length === 1 ? "" : "s"} closed off-screen.`,
      }),
      { headers: JSON_CORS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_CORS }
    );
  }
});
