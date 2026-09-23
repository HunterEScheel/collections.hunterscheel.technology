import { useEffect, useState } from "react";
import { TERRAIN_COLORS, TERRAIN_LABELS } from "../utils/colors";
import { QuestCard } from "./QuestCard";
import { TIER_LABELS, TIER_XP_RANGE, formatCr } from "../data/bestiary";
import type { GeneratedEncounter } from "../data/bestiary";
import { generateEncounter } from "../services/dnd5e";
import { setHexLandmarkName } from "../hooks/useFirebase";
import type { ChallengeTier, HexData, Quest } from "../types";

interface SidePanelProps {
  selectedHex: { col: number; row: number } | null;
  hexData: HexData | undefined;
  quests: Quest[];
  playerName: string | null;
  isAdmin: boolean;
  adminPin: string | null;
  onJoinQuest: (questId: string) => void;
  onLeaveQuest: (questId: string) => void;
  onSetQuestActive: (questId: string) => void;
  onEditQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  onAddQuest: () => void;
  onRunEncounter?: (encounter: GeneratedEncounter) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function SidePanel({
  selectedHex,
  hexData,
  quests,
  playerName,
  isAdmin,
  adminPin,
  onJoinQuest,
  onLeaveQuest,
  onSetQuestActive,
  onEditQuest,
  onDeleteQuest,
  onAddQuest,
  onRunEncounter,
  isMobile = false,
  isOpen = true,
  onClose,
}: SidePanelProps) {
  if (!isOpen) return null;
  const [encounter, setEncounter] = useState<GeneratedEncounter | null>(null);
  const [generating, setGenerating] = useState(false);
  const terrain = hexData?.terrain ?? "unknown";
  const challengeTier = hexData?.challengeTier ?? null;
  const landmark = hexData?.landmark ?? null;
  const landmarkName = hexData?.landmarkName ?? null;
  const canHaveEncounters = terrain !== "unknown" && landmark !== "allied_city";

  // Local draft of the landmark name so the input stays editable until blur.
  const [nameDraft, setNameDraft] = useState<string>(landmarkName ?? "");
  useEffect(() => {
    setNameDraft(landmarkName ?? "");
  }, [selectedHex?.col, selectedHex?.row, landmarkName]);

  function commitName() {
    if (!isAdmin || !adminPin || !selectedHex) return;
    const next = nameDraft.trim();
    const current = landmarkName ?? "";
    if (next === current) return;
    setHexLandmarkName(adminPin, selectedHex.col, selectedHex.row, next || null).catch(
      (err) => {
        console.error("setHexLandmarkName failed:", err);
        alert(`Admin write rejected: ${err.message}`);
      }
    );
  }

  const LANDMARK_LABELS: Record<string, string> = {
    village: "Village",
    allied_city: "Allied City",
    unallied_city: "Unallied City",
    dungeon: "Dungeon",
    ruins: "Ruins",
    tower: "Tower",
    major_threat: "Major Threat",
  };
  const [showCompletedHexQuests, setShowCompletedHexQuests] = useState(false);
  const allHexQuests = selectedHex
    ? quests.filter(
        (q) => q.hexCol === selectedHex.col && q.hexRow === selectedHex.row
      )
    : [];
  const completedHexQuestCount = allHexQuests.filter(
    (q) => q.status === "completed"
  ).length;
  const hexQuests = showCompletedHexQuests
    ? allHexQuests
    : allHexQuests.filter((q) => q.status !== "completed");

  return (
    <div
      style={{
        // Mobile: full-screen drawer overlay anchored right. Desktop: in-flow 320px column.
        position: isMobile ? "absolute" : "relative",
        top: isMobile ? 0 : undefined,
        right: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        zIndex: isMobile ? 150 : undefined,
        width: isMobile ? "min(360px, 100%)" : 320,
        height: "100%",
        background: "#12121f",
        borderLeft: "1px solid #2e2e4a",
        padding: 16,
        paddingTop: 48,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', sans-serif",
        boxShadow: isMobile ? "-4px 0 16px rgba(0,0,0,0.4)" : undefined,
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          title="Collapse panel"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            borderRadius: 6,
            background: "transparent",
            border: "1px solid #2e2e4a",
            color: "#9ca3af",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          &#10006;
        </button>
      )}
      {!selectedHex ? (
        <div
          style={{
            textAlign: "center",
            marginTop: 40,
            color: "#6b7280",
          }}
        >
          <p style={{ fontSize: 14 }}>Click a hex to view details</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Shift+drag or middle-click to pan
          </p>
          <p style={{ fontSize: 12 }}>Scroll to zoom</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#e8e8f0" }}>
              Hex ({selectedHex.col}, {selectedHex.row})
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: TERRAIN_COLORS[terrain],
                }}
              />
              <span style={{ fontSize: 14 }}>{TERRAIN_LABELS[terrain]}</span>
            </div>
            {landmark && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 13, color: "#a78bfa" }}>
                  Landmark: {LANDMARK_LABELS[landmark] ?? landmark}
                </div>
                {isAdmin ? (
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitName();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Name this landmark (e.g. Holdfast)"
                    maxLength={80}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      background: "#12121f",
                      border: "1px solid #2e2e4a",
                      borderRadius: 4,
                      padding: "5px 8px",
                      color: "#fde68a",
                      fontFamily: "'Cinzel', serif",
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  landmarkName && (
                    <div
                      style={{
                        marginTop: 2,
                        fontFamily: "'Cinzel', serif",
                        fontSize: 14,
                        color: "#fde68a",
                      }}
                    >
                      {landmarkName}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Challenge Tier — admin only. Players shouldn't see how
             dangerous a hex is before they head there. */}
          {canHaveEncounters && isAdmin && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#9ca3af" }}>
                Challenge Tier
              </h3>
              {challengeTier != null ? (
                <span style={{ fontSize: 13, color: "#d1d5db" }}>
                  {TIER_LABELS[challengeTier]}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Not assigned
                </span>
              )}

              {/* Random Encounter Generator */}
              {isAdmin && challengeTier != null && (
                <button
                  disabled={generating}
                  onClick={async () => {
                    setGenerating(true);
                    setEncounter(null);
                    try {
                      const result = await generateEncounter(
                        terrain,
                        challengeTier
                      );
                      setEncounter(result);
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  style={{
                    display: "block",
                    marginTop: 8,
                    width: "100%",
                    background: generating ? "#7a5320" : "#f97316",
                    color: "#000",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: generating ? "wait" : "pointer",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.5px",
                  }}
                >
                  {generating ? "Generating..." : "Random Encounter"}
                </button>
              )}

              {/* Encounter Result */}
              {encounter && challengeTier != null && (
                <EncounterResult
                  encounter={encounter}
                  tier={challengeTier}
                  onClose={() => setEncounter(null)}
                  onRun={onRunEncounter ? () => onRunEncounter(encounter) : undefined}
                />
              )}
            </div>
          )}

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>
                Quests ({allHexQuests.length})
              </h3>
              {isAdmin && (
                <button
                  onClick={onAddQuest}
                  style={{
                    background: "#4ade80",
                    color: "#000",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add Quest
                </button>
              )}
            </div>

            {hexQuests.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>
                {showCompletedHexQuests || completedHexQuestCount === 0
                  ? "No quests on this hex."
                  : "No active quests on this hex."}
              </p>
            ) : (
              hexQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  playerName={playerName}
                  isAdmin={isAdmin}
                  onJoin={onJoinQuest}
                  onLeave={onLeaveQuest}
                  onSetActive={onSetQuestActive}
                  onEdit={onEditQuest}
                  onDelete={onDeleteQuest}
                  compact
                />
              ))
            )}

            {completedHexQuestCount > 0 && (
              <button
                onClick={() => setShowCompletedHexQuests((v) => !v)}
                style={{
                  background: "transparent",
                  border: "1px solid #2e2e4a",
                  color: "#9ca3af",
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  marginTop: 8,
                  width: "100%",
                }}
              >
                {showCompletedHexQuests
                  ? `Hide completed quests (${completedHexQuestCount})`
                  : `Show completed quests (${completedHexQuestCount})`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EncounterResult({
  encounter,
  tier,
  onClose,
  onRun,
}: {
  encounter: GeneratedEncounter;
  tier: ChallengeTier;
  onClose: () => void;
  onRun?: () => void;
}) {
  const [minXP, maxXP] = TIER_XP_RANGE[tier];

  return (
    <div
      style={{
        marginTop: 10,
        background: "#1e1e36",
        borderRadius: 8,
        padding: 12,
        borderLeft: "4px solid #f97316",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div>
          <h4 style={{ margin: 0, color: "#f97316", fontSize: 15 }}>
            Random Encounter
          </h4>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {TIER_LABELS[tier]} &middot; {minXP.toLocaleString()}–
            {maxXP.toLocaleString()} XP
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {encounter.groups.map((group) => (
          <div
            key={group.creature.index}
            style={{ background: "#12121f", borderRadius: 4, padding: "6px 10px" }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
            >
              <span
                style={{ color: "#e8e8f0", fontWeight: 600, fontSize: 13 }}
              >
                {group.count}× {group.creature.name}
              </span>
              <span style={{ color: "#fbbf24", fontSize: 12, whiteSpace: "nowrap" }}>
                {(group.count * group.creature.combatPoints).toLocaleString()} XP
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              CR {formatCr(group.creature.challengeRating)} &middot; HP{" "}
              {group.creature.hitPoints} &middot; AC {group.creature.armorClass}{" "}
              &middot; {group.creature.combatPoints.toLocaleString()} XP each
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
        }}
      >
        <span style={{ color: "#9ca3af" }}>
          {encounter.totalCreatures} creatures (&times;{encounter.encounterMultiplier})
        </span>
        <span
          style={{
            color: encounter.withinBudget ? "#fbbf24" : "#ef4444",
            fontWeight: 600,
          }}
        >
          {encounter.adjustedXP.toLocaleString()} XP
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
        Raw: {encounter.totalCombatPoints.toLocaleString()} XP
      </div>
      {!encounter.withinBudget && (
        <p style={{ fontSize: 10, color: "#ef4444", margin: "4px 0 0" }}>
          Closest match — terrain pool could not fill the tier's XP range.
        </p>
      )}
      {onRun && (
        <button
          onClick={onRun}
          style={{
            display: "block",
            marginTop: 10,
            width: "100%",
            background: "#4ade80",
            color: "#000",
            border: "none",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Cinzel', serif",
            letterSpacing: "0.5px",
          }}
        >
          Run Encounter
        </button>
      )}
    </div>
  );
}
