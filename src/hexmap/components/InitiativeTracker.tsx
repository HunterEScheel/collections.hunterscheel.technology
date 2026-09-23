import { useEffect, useState } from "react";
import {
  addInitiativeEntry,
  removeInitiativeEntry,
  clearInitiativeTracker,
  updateInitiativeHp,
} from "../hooks/useFirebase";
import { formatCr } from "../data/bestiary";
import { searchCreatures } from "../services/dnd5e";
import type { CreatureSearchResult } from "../services/dnd5e";
import type { Character, InitiativeEntry } from "../types";

interface InitiativeTrackerProps {
  entries: InitiativeEntry[];
  playerName: string | null;
  isAdmin: boolean;
  adminPin: string | null;
  characters: Map<string, Character>;
}

function hpStatus(hp: number, maxHp: number): { label: string; color: string } {
  const ratio = hp / maxHp;
  if (hp <= 0) return { label: "Dead", color: "#6b7280" };
  if (ratio > 0.75) return { label: "Fine", color: "#4ade80" };
  if (ratio > 0.4) return { label: "Okay", color: "#fbbf24" };
  return { label: "Ouch", color: "#ef4444" };
}

export function InitiativeTracker({
  entries,
  playerName,
  isAdmin,
  adminPin,
  characters,
}: InitiativeTrackerProps) {
  const [initiative, setInitiative] = useState("");
  const [adding, setAdding] = useState(false);

  // Admin "add creature" form
  const [manualMode, setManualMode] = useState(false);
  const [creatureName, setCreatureName] = useState("");
  const [creatureInit, setCreatureInit] = useState("");
  const [creatureHp, setCreatureHp] = useState("");
  const [creatureAc, setCreatureAc] = useState("");
  const [creatureCr, setCreatureCr] = useState("");
  const [creatureCount, setCreatureCount] = useState("1");
  const [addingCreature, setAddingCreature] = useState(false);

  // Open5e search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CreatureSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCreature, setSelectedCreature] =
    useState<CreatureSearchResult | null>(null);

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (manualMode || selectedCreature || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const results = await searchCreatures(q);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, manualMode, selectedCreature]);

  const alreadyJoined =
    playerName != null &&
    entries.some((e) => !e.isCreature && e.name === playerName);

  async function handleJoin() {
    const value = parseInt(initiative, 10);
    if (isNaN(value) || !playerName) return;
    setAdding(true);
    // Snapshot the player's character into the encounter so the GM has
    // current HP / AC to track and damage/heal against.
    const character = characters.get(playerName);
    const stats =
      character?.hitPoints != null
        ? {
            hp: character.hitPoints,
            ac: character.armorClass ?? undefined,
          }
        : undefined;
    await addInitiativeEntry(playerName, value, false, stats);
    setInitiative("");
    setAdding(false);
  }

  async function handleAddCreature() {
    const init = parseInt(creatureInit, 10);
    if (isNaN(init)) return;
    const count = Math.max(1, parseInt(creatureCount, 10) || 1);

    let name: string;
    let stats: { hp?: number; ac?: number; cr?: number } | undefined;

    if (selectedCreature) {
      name = selectedCreature.name;
      stats = {
        hp: selectedCreature.hitPoints,
        ac: selectedCreature.armorClass,
        cr: selectedCreature.challengeRating,
      };
    } else {
      name = creatureName.trim();
      if (!name) return;
      const hp =
        creatureHp.trim() === "" ? undefined : parseInt(creatureHp, 10);
      const ac =
        creatureAc.trim() === "" ? undefined : parseInt(creatureAc, 10);
      const cr =
        creatureCr.trim() === "" ? undefined : parseFloat(creatureCr);
      stats =
        hp !== undefined || ac !== undefined || cr !== undefined
          ? { hp, ac, cr }
          : undefined;
    }

    setAddingCreature(true);
    try {
      await Promise.all(
        Array.from({ length: count }, (_, i) => {
          const label = count > 1 ? `${name} ${i + 1}` : name;
          return addInitiativeEntry(label, init, true, stats);
        })
      );
      // Reset everything for the next add
      setCreatureName("");
      setCreatureInit("");
      setCreatureHp("");
      setCreatureAc("");
      setCreatureCr("");
      setCreatureCount("1");
      setSelectedCreature(null);
      setSearchQuery("");
      setSearchResults([]);
    } finally {
      setAddingCreature(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "32px 24px",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 28,
            margin: 0,
            color: "#e8e8f0",
          }}
        >
          Initiative Tracker
        </h1>
        {isAdmin && entries.length > 0 && (
          <button
            onClick={() => {
              if (!adminPin) return;
              clearInitiativeTracker(adminPin).catch((err) => {
                console.error("clearInitiativeTracker failed:", err);
                alert(`Admin write rejected: ${err.message}`);
              });
            }}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Player join form */}
      {playerName && !alreadyJoined && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, color: "#9ca3af", whiteSpace: "nowrap" }}>
            {playerName}
          </span>
          <input
            type="number"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Initiative roll"
            style={{
              width: 120,
              background: "#1e1e36",
              border: "1px solid #2e2e4a",
              borderRadius: 4,
              padding: "6px 10px",
              color: "#e8e8f0",
              fontSize: 14,
            }}
          />
          <button
            disabled={adding || initiative === ""}
            onClick={handleJoin}
            style={{
              background: adding ? "#166534" : "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: adding ? "wait" : "pointer",
            }}
          >
            Join
          </button>
        </div>
      )}

      {!playerName && (
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
          Join a quest first to set your player name, then you can add yourself
          to initiative.
        </p>
      )}

      {alreadyJoined && (
        <p style={{ color: "#4ade80", fontSize: 13, marginBottom: 24 }}>
          You're in the turn order.
        </p>
      )}

      {/* Admin add-creature form */}
      {isAdmin && (
        <div
          style={{
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            borderRadius: 6,
            padding: 12,
            marginBottom: 24,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              gap: 8,
            }}
          >
            <span
              style={{
                color: "#a78bfa",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Admin: Add Creature
            </span>
            <button
              type="button"
              onClick={() => {
                setManualMode((m) => !m);
                setSelectedCreature(null);
                setSearchQuery("");
                setSearchResults([]);
              }}
              style={{
                background: "transparent",
                color: "#9ca3af",
                border: "1px solid #2e2e4a",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {manualMode ? "Search SRD" : "Custom creature"}
            </button>
          </div>

          {!manualMode && !selectedCreature && (
            <div style={{ position: "relative" }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SRD creatures (e.g. mastiff, mountain lion)"
                style={creatureInputStyle}
                autoFocus
              />
              {searching && (
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 8,
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                >
                  searching...
                </span>
              )}
              {searchResults.length > 0 && (
                <div
                  style={{
                    marginTop: 4,
                    background: "#12121f",
                    border: "1px solid #2e2e4a",
                    borderRadius: 4,
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  {searchResults.map((c) => (
                    <button
                      key={c.index}
                      type="button"
                      onClick={() => {
                        setSelectedCreature(c);
                        setSearchResults([]);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid #1e1e36",
                        color: "#e8e8f0",
                        padding: "6px 10px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#1e1e36")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: "#9ca3af", marginLeft: 8, fontSize: 11 }}>
                        CR {formatCr(c.challengeRating)} &middot; {c.hitPoints} HP &middot; AC {c.armorClass}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p style={{ color: "#6b7280", fontSize: 12, margin: "6px 0 0" }}>
                  No matches in the SRD. Try "Custom creature" for homebrew.
                </p>
              )}
            </div>
          )}

          {!manualMode && selectedCreature && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#12121f",
                border: "1px solid #3730a3",
                borderRadius: 4,
                padding: "6px 10px",
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: "#e8e8f0", fontSize: 13 }}>
                  {selectedCreature.name}
                </span>
                <span style={{ color: "#9ca3af", marginLeft: 8, fontSize: 11 }}>
                  CR {formatCr(selectedCreature.challengeRating)} &middot;{" "}
                  {selectedCreature.hitPoints} HP &middot; AC {selectedCreature.armorClass}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCreature(null)}
                title="Clear selection"
                style={{
                  background: "transparent",
                  border: "1px solid #2e2e4a",
                  color: "#9ca3af",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {manualMode && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <input
                value={creatureName}
                onChange={(e) => setCreatureName(e.target.value)}
                placeholder="Name"
                style={creatureInputStyle}
              />
              <input
                type="number"
                value={creatureHp}
                onChange={(e) => setCreatureHp(e.target.value)}
                placeholder="HP"
                style={creatureInputStyle}
              />
              <input
                type="number"
                value={creatureAc}
                onChange={(e) => setCreatureAc(e.target.value)}
                placeholder="AC"
                style={creatureInputStyle}
              />
              <input
                type="number"
                step="0.125"
                value={creatureCr}
                onChange={(e) => setCreatureCr(e.target.value)}
                placeholder="CR"
                style={creatureInputStyle}
              />
            </div>
          )}

          {/* Init + count + Add */}
          {(selectedCreature || manualMode) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="number"
                value={creatureInit}
                onChange={(e) => setCreatureInit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCreature()}
                placeholder="Initiative roll"
                style={creatureInputStyle}
                autoFocus={selectedCreature != null}
              />
              <input
                type="number"
                min={1}
                value={creatureCount}
                onChange={(e) => setCreatureCount(e.target.value)}
                title="How many copies to add"
                placeholder="Count"
                style={creatureInputStyle}
              />
              <button
                disabled={
                  addingCreature ||
                  creatureInit.trim() === "" ||
                  (manualMode && !creatureName.trim())
                }
                onClick={handleAddCreature}
                style={{
                  background: addingCreature ? "#3730a3" : "#6366f1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor:
                    addingCreature ||
                    creatureInit.trim() === "" ||
                    (manualMode && !creatureName.trim())
                      ? "not-allowed"
                      : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {addingCreature ? "Adding..." : "Add"}
              </button>
            </div>
          )}

          <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>
            Count &gt; 1 adds numbered copies (e.g. "Mastiff 1", "Mastiff 2").
            {!manualMode &&
              " SRD search — switch to Custom creature for homebrew."}
          </p>
        </div>
      )}

      {/* Turn order */}
      {entries.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", marginTop: 40 }}>
          No encounter running. An admin can start one from the map.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {entries.map((entry, i) => (
            <InitiativeRow
              key={entry.id}
              entry={entry}
              position={i + 1}
              isAdmin={isAdmin}
              adminPin={adminPin}
              viewerName={playerName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InitiativeRow({
  entry,
  position,
  isAdmin,
  adminPin,
  viewerName,
}: {
  entry: InitiativeEntry;
  position: number;
  isAdmin: boolean;
  adminPin: string | null;
  viewerName: string | null;
}) {
  const [hpDelta, setHpDelta] = useState("");

  const hasHp = entry.hp != null && entry.maxHp != null;
  const status = hasHp ? hpStatus(entry.hp!, entry.maxHp!) : null;
  const dead = hasHp && entry.hp! <= 0;
  // The player viewing their own row sees their real HP. Other viewers
  // see the qualitative label. Admin always sees the real HP.
  const isOwnRow =
    !entry.isCreature && viewerName != null && entry.name === viewerName;
  const showActualHp = isAdmin || isOwnRow;

  async function applyDamage() {
    const delta = parseInt(hpDelta, 10);
    if (isNaN(delta) || !hasHp || !adminPin) return;
    const newHp = Math.max(0, entry.hp! - delta);
    await updateInitiativeHp(adminPin, entry.id, newHp);
    setHpDelta("");
  }

  async function applyHeal() {
    const delta = parseInt(hpDelta, 10);
    if (isNaN(delta) || !hasHp || !adminPin) return;
    const newHp = Math.min(entry.maxHp!, entry.hp! + delta);
    await updateInitiativeHp(adminPin, entry.id, newHp);
    setHpDelta("");
  }

  return (
    <div
      style={{
        background: entry.isCreature ? "#1e1e36" : "#1a2332",
        borderRadius: 6,
        padding: "10px 14px",
        borderLeft: `4px solid ${dead ? "#6b7280" : entry.isCreature ? "#f97316" : "#4ade80"}`,
        opacity: dead ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 28,
            textAlign: "center",
            fontSize: 12,
            color: "#6b7280",
            fontWeight: 700,
          }}
        >
          {position}
        </span>
        <span
          style={{
            width: 40,
            textAlign: "center",
            fontSize: 18,
            fontWeight: 700,
            color: "#fbbf24",
            fontFamily: "'Cinzel', serif",
          }}
        >
          {entry.initiative}
        </span>
        <div style={{ flex: 1 }}>
          <span style={{ color: "#e8e8f0", fontWeight: 600, fontSize: 14 }}>
            {entry.name}
          </span>
          {entry.isCreature && isAdmin && (
            <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 8 }}>
              CR {formatCr(entry.cr ?? 0)} &middot; AC {entry.ac}
            </span>
          )}
          {!entry.isCreature && isAdmin && entry.ac != null && (
            <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 8 }}>
              AC {entry.ac}
            </span>
          )}
        </div>

        {/* HP display */}
        {hasHp && (
          showActualHp ? (
            <span style={{ fontSize: 13, fontWeight: 600, color: status!.color, whiteSpace: "nowrap" }}>
              {entry.hp}/{entry.maxHp} HP
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: status!.color }}>
              {status!.label}
            </span>
          )
        )}

        {!entry.isCreature && (
          <span
            style={{
              fontSize: 11,
              color: "#4ade80",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            player
          </span>
        )}

        {isAdmin && (
          <button
            onClick={() => {
              if (!adminPin) return;
              removeInitiativeEntry(adminPin, entry.id).catch((err) => {
                console.error("removeInitiativeEntry failed:", err);
                alert(`Admin write rejected: ${err.message}`);
              });
            }}
            title="Remove"
            style={{
              background: "transparent",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Admin HP controls */}
      {isAdmin && hasHp && !dead && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 6,
            marginLeft: 80,
            alignItems: "center",
          }}
        >
          <input
            type="number"
            value={hpDelta}
            onChange={(e) => setHpDelta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyDamage();
            }}
            placeholder="Amount"
            style={{
              width: 70,
              background: "#12121f",
              border: "1px solid #2e2e4a",
              borderRadius: 4,
              padding: "3px 6px",
              color: "#e8e8f0",
              fontSize: 12,
            }}
          />
          <button
            onClick={applyDamage}
            disabled={hpDelta === ""}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Damage
          </button>
          <button
            onClick={applyHeal}
            disabled={hpDelta === ""}
            style={{
              background: "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Heal
          </button>
        </div>
      )}
    </div>
  );
}

const creatureInputStyle: React.CSSProperties = {
  width: "100%",
  background: "#12121f",
  border: "1px solid #2e2e4a",
  borderRadius: 4,
  padding: "5px 8px",
  color: "#e8e8f0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};
