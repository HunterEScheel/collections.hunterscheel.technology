// Supabase Edge Function: generate-quests
//
// Takes a completed quest's id, the findings players reported during it,
// and the current world state (filled hexes, all quests). Asks xAI's
// Grok for 0-4 plausible follow-up quest suggestions anchored on the
// reported findings.
//
// Deploy via dashboard: paste this whole file as the function body,
// name the function "generate-quests", click Deploy.
//
// Required secrets:
//   XAI_APIKEY = xai-...
//   ADMIN_PIN  = <your admin pin>  (client sends this in the body)
//
// Optional secret:
//   XAI_MODEL = grok-3-mini (default if unset)

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — runs in Deno, not browser TS build.

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

const QUEST_LEVELS = [
  "explore",
  "recurring",
  "wolf",
  "demon",
  "dragon",
  "terrasque",
  "god",
];

const SYSTEM_PROMPT = `You are the world-spinner for a Dungeons & Dragons hexcrawl campaign.
The party of adventurers operates from a fortified town and explores a hex map. After completing a quest, the party logs "findings" — locations where they observed something interesting.

Your job: given a focal completed quest, the findings the players logged on it, and the current world state, propose 0-4 plausible follow-up quests.

Rules:
- Anchor each suggestion on one of the focal quest's findings. The finding's (col, row) is the strongest signal for where the new quest should start.
- A new quest's hexCol/hexRow should match a finding from the focal quest whenever possible.
- If the new quest naturally has a destination different from its start, set endHexCol/endHexRow to another finding from the same quest (preferred) or another filled hex.
- If no destination makes sense, leave endHexCol and endHexRow null — single-hex quests are valid.
- Fall back to a filled hex on the map only if the focal quest has no usable findings.
- "level" must be one of: ${QUEST_LEVELS.join(", ")}.
  - explore: simple investigation/scouting
  - recurring: ongoing/repeatable jobs
  - wolf: low-tier combat
  - demon: mid-tier combat
  - dragon: high-tier combat
  - terrasque: apocalyptic
  - god: cosmic / endgame
- Do not duplicate quests that already exist in the quest log.
- Keep titles short (max 6 words). Descriptions 1-3 sentences.
- "reward" must be a plain non-negative INTEGER representing gold pieces (gp). No units, no items, no strings — just the number as a JSON string (e.g. "500"). Scale by tier: explore ~50-200, recurring ~100-300, wolf ~200-600, demon ~800-2000, dragon ~3000-8000, terrasque ~15000-40000, god ~75000+.
- If the findings don't suggest anything actionable, return an empty list.

Respond with ONLY a JSON object of the form:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "reward": "<integer gold amount as a string>",
      "level": "explore" | "recurring" | "wolf" | "demon" | "dragon" | "terrasque" | "god",
      "hexCol": <int>,
      "hexRow": <int>,
      "endHexCol": <int> | null,
      "endHexRow": <int> | null,
      "rationale": "Why this follows from the findings (one sentence)."
    }
  ]
}`;

function buildUserPrompt(body) {
  const focal = (body.quests || []).find((q) => q.id === body.questId);
  if (!focal) {
    return `Focal quest id ${body.questId} not found in quests list.`;
  }

  const findingLines = (body.findings || [])
    .map(
      (f, i) =>
        `  [${i + 1}] (${f.hexCol}, ${f.hexRow}) by ${f.author} — ${f.description || "(no description)"}`
    )
    .join("\n");

  const hexLines = (body.hexes || [])
    .map((h) => {
      const tier = h.challengeTier != null ? ` T${h.challengeTier}` : "";
      const lm = h.landmark ? ` [${h.landmark}]` : "";
      return `  (${h.col}, ${h.row}) ${h.terrain}${tier}${lm}`;
    })
    .join("\n");

  const questLines = (body.quests || [])
    .filter((q) => q.status !== "completed")
    .map((q) => {
      const route =
        q.endHexCol != null && q.endHexRow != null
          ? ` -> (${q.endHexCol}, ${q.endHexRow})`
          : "";
      return `  [${q.level}] ${q.title} @ (${q.hexCol}, ${q.hexRow})${route} (${q.status})`;
    })
    .join("\n");

  const focalRoute =
    focal.endHexCol != null && focal.endHexRow != null
      ? ` -> (${focal.endHexCol}, ${focal.endHexRow})`
      : "";

  return `FOCAL COMPLETED QUEST
[${focal.level}] ${focal.title} @ (${focal.hexCol}, ${focal.hexRow})${focalRoute}
${focal.description || "(no description)"}

Findings logged by the party on this quest:
${findingLines || "  (none)"}

------------------
WORLD STATE

Filled hexes:
${hexLines || "  (none)"}

Other active quests:
${questLines || "  (none)"}

Based on the FOCAL COMPLETED QUEST and its findings, propose follow-up quests.`;
}

function isValidLevel(v) {
  return typeof v === "string" && QUEST_LEVELS.indexOf(v) !== -1;
}

function sanitizeSuggestions(raw, fallbackHex) {
  if (!raw || !Array.isArray(raw.suggestions)) return [];
  const out = [];
  for (const s of raw.suggestions) {
    if (!s || typeof s !== "object") continue;
    const title = String(s.title ?? "").trim();
    const description = String(s.description ?? "").trim();
    if (!title || !description) continue;
    const level = isValidLevel(s.level) ? s.level : "explore";
    const hexCol = Number.isFinite(s.hexCol)
      ? Math.trunc(s.hexCol)
      : (fallbackHex?.col ?? 0);
    const hexRow = Number.isFinite(s.hexRow)
      ? Math.trunc(s.hexRow)
      : (fallbackHex?.row ?? 0);
    const endHexCol =
      s.endHexCol != null && Number.isFinite(s.endHexCol)
        ? Math.trunc(s.endHexCol)
        : null;
    const endHexRow =
      s.endHexRow != null && Number.isFinite(s.endHexRow)
        ? Math.trunc(s.endHexRow)
        : null;
    const hasRoute = endHexCol != null && endHexRow != null;
    out.push({
      title,
      description,
      // Coerce to an integer gold amount. Strip any "gp"/"gold" the model
      // slipped in; if we can't parse a non-negative integer, blank it.
      reward: (() => {
        const raw = String(s.reward ?? "")
          .trim()
          .replace(/\s*(gp|gold|g)\s*$/i, "")
          .replace(/,/g, "")
          .trim();
        const n = Number(raw);
        if (Number.isFinite(n) && Number.isInteger(n) && n >= 0) {
          return String(n);
        }
        return "";
      })(),
      level,
      hexCol,
      hexRow,
      endHexCol: hasRoute ? endHexCol : null,
      endHexRow: hasRoute ? endHexRow : null,
      rationale: String(s.rationale ?? "").trim(),
    });
  }
  return out.slice(0, 4);
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
    const apiKey = Deno.env.get("XAI_APIKEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "XAI_APIKEY secret not set" }),
        { status: 500, headers: JSON_CORS }
      );
    }
    const adminPin = Deno.env.get("ADMIN_PIN");
    if (!adminPin) {
      return new Response(
        JSON.stringify({ error: "ADMIN_PIN secret not set" }),
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

    // Lock behind admin PIN so anonymous bots can't drain OpenAI credits.
    const submittedPin = String(body?.pin ?? "");
    if (submittedPin !== adminPin) {
      return new Response(
        JSON.stringify({ error: "Invalid admin PIN" }),
        { status: 401, headers: JSON_CORS }
      );
    }

    if (!body || !body.questId || !Array.isArray(body.quests)) {
      return new Response(
        JSON.stringify({
          error: "Body must include questId and quests[]",
        }),
        { status: 400, headers: JSON_CORS }
      );
    }

    const userPrompt = buildUserPrompt(body);
    const fallbackHex =
      (body.findings && body.findings[0]) || (body.hexes && body.hexes[0]) ||
      null;
    const fallbackForSanitize = fallbackHex
      ? { col: fallbackHex.hexCol ?? fallbackHex.col, row: fallbackHex.hexRow ?? fallbackHex.row }
      : null;

    // xAI is OpenAI-compatible for chat completions.
    const aiRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0.7,
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

    const suggestions = sanitizeSuggestions(parsed, fallbackForSanitize);

    return new Response(JSON.stringify({ suggestions }), {
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
