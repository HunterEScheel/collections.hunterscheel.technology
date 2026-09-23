import { useState } from "react";
import {
  createQuestFinding,
  deleteQuestFinding,
  generateQuestsFromQuest,
  createQuest,
} from "../hooks/useFirebase";
import { QUEST_LEVEL_LABELS, QUEST_LEVEL_COLORS } from "../utils/colors";
import { formatReward } from "../utils/reward";
import type {
  HexData,
  Quest,
  QuestFinding,
  QuestSuggestion,
} from "../types";

interface QuestFindingsProps {
  quest: Quest;
  findings: QuestFinding[];
  hexes: Map<string, HexData>;
  allQuests: Quest[];
  playerName: string | null;
  isAdmin: boolean;
  adminPin: string | null;
  onSetPlayerName: () => void;
}

// Wax-seal pin colors. Each player gets a stable signature color hashed
// from their name so all their dispatches share the same wax.
const PIN_COLORS = [
  "#8b1a1a", // crimson
  "#1a3a8b", // lapis
  "#5b1a8b", // mulberry
  "#1a5b3a", // forest
  "#c9a35b", // aged gold
  "#5b3a1a", // umber
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** -1.8 .. +1.8 degrees, stable per finding id. */
function rotationFromId(id: string): number {
  const h = hashString(id);
  return ((h % 1000) / 1000) * 3.6 - 1.8;
}

function pinColorForAuthor(name: string): string {
  return PIN_COLORS[hashString(name) % PIN_COLORS.length];
}

/**
 * Findings panel for a single completed quest.
 *
 * Visual register: a cartographer's field journal — each finding is a torn
 * scrap of parchment pinned to a wood board with a wax seal in the
 * player's signature color. The AI-suggestions panel shifts into an arcane
 * register (purple aura, mystical typography) to contrast with the
 * mundane reports.
 */
export function QuestFindings({
  quest,
  findings,
  hexes,
  allQuests,
  playerName,
  isAdmin,
  adminPin,
  onSetPlayerName,
}: QuestFindingsProps) {
  const isPartyMember =
    playerName != null && quest.players.includes(playerName);
  // Admins can file on behalf of any party member — but only if there IS
  // a party to attribute it to (the RPC rejects authors not on the party).
  const canAdd = isPartyMember || (isAdmin && quest.players.length > 0);

  const [hexCol, setHexCol] = useState("");
  const [hexRow, setHexRow] = useState("");
  const [description, setDescription] = useState("");
  // Admin "file as" author — defaults to first party member, or the admin's
  // own name if they happen to be on the party.
  const defaultAdminAuthor =
    playerName && quest.players.includes(playerName)
      ? playerName
      : (quest.players[0] ?? "");
  const [adminAuthor, setAdminAuthor] = useState(defaultAdminAuthor);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<QuestSuggestion[] | null>(null);

  async function handleAdd() {
    if (!description.trim()) return;
    const col = Number(hexCol);
    const row = Number(hexRow);
    if (!Number.isFinite(col) || !Number.isFinite(row)) {
      setError("Coordinates must be numbers.");
      return;
    }

    // Admins file as any party member (picked from the dropdown).
    // Players file as themselves.
    let author: string;
    if (isAdmin) {
      author = adminAuthor;
      if (!author) {
        setError("Choose which party member is filing this dispatch.");
        return;
      }
    } else {
      if (!playerName) {
        onSetPlayerName();
        return;
      }
      author = playerName;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createQuestFinding(quest.id, author, col, row, description);
      setHexCol("");
      setHexRow("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The seal would not hold.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate() {
    if (!adminPin) {
      setGenError("Admin PIN missing — log in again.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    setSuggestions(null);
    try {
      const result = await generateQuestsFromQuest(
        adminPin,
        quest.id,
        hexes,
        allQuests,
        findings
      );
      setSuggestions(result);
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : "The Loremaster did not answer."
      );
    } finally {
      setGenerating(false);
    }
  }

  const countLabel = `${findings.length} ${findings.length === 1 ? "entry" : "entries"}`;

  return (
    <div className="qfinding-board">
      <div className="qfinding-header">
        <div className="qfinding-title-row">
          <svg className="qfinding-quill" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.3 2.7c-.4-.4-1-.4-1.4 0L8 14.6c-.5.5-.9 1.2-1 1.9l-.5 3.5c-.1.4.3.8.7.7l3.5-.5c.7-.1 1.4-.4 1.9-1L24.3 7.1c.4-.4.4-1 0-1.4l-3-3zM4 22h11v-2H4v2zm-2-4h7v-2H2v2z" />
          </svg>
          <h4 className="qfinding-title">Field Reports</h4>
          <span className="qfinding-count">{countLabel}</span>
        </div>
        {isAdmin && findings.length > 0 && (
          <button
            disabled={generating}
            onClick={handleGenerate}
            className="qfinding-loremaster"
            title="Send the findings to the Loremaster for new quest threads"
          >
            {generating ? "Consulting…" : "Consult the Loremaster"}
          </button>
        )}
      </div>

      {findings.length === 0 ? (
        <p className="qfinding-empty">
          No dispatches yet. The page awaits the first report from the field.
        </p>
      ) : (
        <ul className="qfinding-grid">
          {findings.map((f) => {
            const canDelete = isAdmin || f.author === playerName;
            return (
              <li
                key={f.id}
                className="qfinding-scrap"
                style={
                  {
                    "--qf-rotation": `${rotationFromId(f.id)}deg`,
                    "--qf-pin": pinColorForAuthor(f.author),
                  } as React.CSSProperties
                }
              >
                <div className="qfinding-stamp">
                  ({f.hexCol}, {f.hexRow})
                </div>
                <p className="qfinding-text">{f.description}</p>
                <div className="qfinding-sig">
                  <span className="qfinding-author">— {f.author}</span>
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (confirm("Strike this dispatch from the board?")) {
                          deleteQuestFinding(f.id);
                        }
                      }}
                      className="qfinding-strike"
                      title="Strike this dispatch"
                      aria-label="Strike this dispatch"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!canAdd ? (
        playerName == null ? (
          <div className="qfinding-noname">
            <p>A scribe needs their name before the seal can be set.</p>
            <button onClick={onSetPlayerName}>Sign Your Name</button>
          </div>
        ) : (
          <div className="qfinding-noname">
            <p>
              Only those who walked the path may file dispatches. Join the
              quest first.
            </p>
          </div>
        )
      ) : (
        <div className="qfinding-dispatch">
          <div className="qfinding-dispatch-header">New Dispatch</div>
          {isAdmin && quest.players.length > 0 && (
            <div className="qfinding-author-row">
              <label
                className="qfinding-author-label"
                htmlFor={`qf-file-as-${quest.id}`}
              >
                File as
              </label>
              <select
                id={`qf-file-as-${quest.id}`}
                value={adminAuthor}
                onChange={(e) => setAdminAuthor(e.target.value)}
                className="qfinding-author-select"
                aria-label="File dispatch as"
              >
                {quest.players.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="qfinding-coords-row">
            <span>Hex&nbsp;(</span>
            <input
              type="number"
              value={hexCol}
              onChange={(e) => setHexCol(e.target.value)}
              placeholder="col"
              className="qfinding-coord"
              aria-label="Hex column"
            />
            <span>,</span>
            <input
              type="number"
              value={hexRow}
              onChange={(e) => setHexRow(e.target.value)}
              placeholder="row"
              className="qfinding-coord"
              aria-label="Hex row"
            />
            <span>)</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd();
            }}
            placeholder="What did you find here? Whom did you meet? What burns to be remembered?"
            className="qfinding-desc"
            rows={3}
            maxLength={500}
            aria-label="Dispatch description"
          />
          <div className="qfinding-actions">
            <span className="qfinding-hint">⌘/Ctrl + Enter to seal</span>
            <button
              disabled={submitting || !description.trim()}
              onClick={handleAdd}
              className="qfinding-seal-btn"
            >
              {submitting ? "Sealing…" : "Affix the Seal"}
            </button>
          </div>
          {error && <p className="qfinding-error">{error}</p>}
        </div>
      )}

      {(suggestions || genError || generating) && (
        <SuggestionsPanel
          suggestions={suggestions}
          error={genError}
          loading={generating}
          adminPin={adminPin}
          onDismiss={() => {
            setSuggestions(null);
            setGenError(null);
          }}
        />
      )}
    </div>
  );
}

function SuggestionsPanel({
  suggestions,
  error,
  loading,
  adminPin,
  onDismiss,
}: {
  suggestions: QuestSuggestion[] | null;
  error: string | null;
  loading: boolean;
  adminPin: string | null;
  onDismiss: () => void;
}) {
  const [creating, setCreating] = useState<number | null>(null);
  const [created, setCreated] = useState<Set<number>>(new Set());

  async function handleCreate(i: number, s: QuestSuggestion) {
    if (!adminPin) {
      alert("Admin PIN missing — log in again.");
      return;
    }
    setCreating(i);
    try {
      await createQuest(adminPin, {
        title: s.title,
        description: s.description,
        reward: s.reward,
        level: s.level,
        status: "available",
        hexCol: s.hexCol,
        hexRow: s.hexRow,
        endHexCol: s.endHexCol,
        endHexRow: s.endHexRow,
        players: [],
        scheduledDate: null,
        completedAt: null,
        foundItems: [],
      });
      setCreated((prev) => new Set(prev).add(i));
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="qf-loremaster-panel">
      <div className="qf-loremaster-head">
        <h5 className="qf-loremaster-title">Whispers from the Loremaster</h5>
        <button onClick={onDismiss} className="qf-loremaster-dismiss">
          Silence
        </button>
      </div>

      {loading && (
        <p className="qf-loremaster-loading">
          The Loremaster turns her gaze to the findings…
        </p>
      )}

      {error && <p className="qf-loremaster-error">{error}</p>}

      {!loading && suggestions && suggestions.length === 0 && (
        <p className="qf-loremaster-empty">
          The currents are quiet. No new threads surface from these dispatches.
        </p>
      )}

      {!loading && suggestions && suggestions.length > 0 && (
        <div className="qf-loremaster-list">
          {suggestions.map((s, i) => (
            <div key={i} className="qf-loremaster-vellum">
              <div className="qf-vellum-head">
                <span
                  className="qf-vellum-level"
                  style={{ background: QUEST_LEVEL_COLORS[s.level] }}
                >
                  {QUEST_LEVEL_LABELS[s.level]}
                </span>
                <span className="qf-vellum-title">{s.title}</span>
                <span className="qf-vellum-coords">
                  ({s.hexCol}, {s.hexRow})
                  {s.endHexCol != null && s.endHexRow != null
                    ? ` → (${s.endHexCol}, ${s.endHexRow})`
                    : ""}
                </span>
              </div>
              <p className="qf-vellum-desc">{s.description}</p>
              {s.reward && (
                <p className="qf-vellum-reward">Reward: {formatReward(s.reward)}</p>
              )}
              {s.rationale && (
                <p className="qf-vellum-rationale">{s.rationale}</p>
              )}
              <div className="qf-vellum-actions">
                <button
                  disabled={creating === i || created.has(i)}
                  onClick={() => handleCreate(i, s)}
                  className="qf-vellum-inscribe"
                >
                  {created.has(i)
                    ? "Inscribed"
                    : creating === i
                      ? "Inscribing…"
                      : "Inscribe in the Log"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
