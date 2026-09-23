import { useMemo, useState } from "react";
import { QuestCard } from "./QuestCard";
import { QuestFindings } from "./QuestFindings";
import { generateNpcQuestReport } from "../hooks/useFirebase";
import type { HexData, Quest, QuestFinding } from "../types";

interface ActiveQuestsProps {
  quests: Quest[];
  hexes: Map<string, HexData>;
  findings: QuestFinding[];
  playerName: string | null;
  isAdmin: boolean;
  adminPin: string | null;
  onJoinQuest: (questId: string) => void;
  onLeaveQuest: (questId: string) => void;
  onEditQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  onSetQuestActive: (questId: string) => void;
  onPayOutQuest: (quest: Quest) => void;
  onManageFoundItems: (quest: Quest) => void;
  onSetPlayerName: () => void;
}

export function ActiveQuests({
  quests,
  hexes,
  findings,
  playerName,
  isAdmin,
  adminPin,
  onJoinQuest,
  onLeaveQuest,
  onEditQuest,
  onDeleteQuest,
  onSetQuestActive,
  onPayOutQuest,
  onManageFoundItems,
  onSetPlayerName,
}: ActiveQuestsProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [rivalRunning, setRivalRunning] = useState(false);
  const [rivalMessage, setRivalMessage] = useState<string | null>(null);
  const [rivalError, setRivalError] = useState<string | null>(null);

  async function runRivalParty() {
    if (!adminPin) return;
    setRivalRunning(true);
    setRivalMessage(null);
    setRivalError(null);
    try {
      const { message } = await generateNpcQuestReport(adminPin);
      setRivalMessage(message);
    } catch (err) {
      setRivalError(
        err instanceof Error ? err.message : "Failed to summon rivals"
      );
    } finally {
      setRivalRunning(false);
    }
  }
  const { inProgress, recruiting, completed } = useMemo(() => {
    const inProgress: Quest[] = [];
    const recruiting: Quest[] = [];
    const completed: Quest[] = [];

    for (const quest of quests) {
      if (quest.status === "completed" || quest.status === "paid_out") {
        completed.push(quest);
      } else if (quest.status === "in_progress") {
        inProgress.push(quest);
      } else if (quest.players.length > 0) {
        recruiting.push(quest);
      }
    }

    // Completed section: newest first by completed_at timestamp.
    // Falls back to scheduled_date for legacy rows if completedAt is
    // missing (backfill migration handles most, but be safe).
    completed.sort((a, b) => {
      const at = a.completedAt ?? a.scheduledDate ?? "";
      const bt = b.completedAt ?? b.scheduledDate ?? "";
      if (!at && !bt) return 0;
      if (!at) return 1;
      if (!bt) return -1;
      return bt.localeCompare(at);
    });

    return { inProgress, recruiting, completed };
  }, [quests]);


  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 24px",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 28,
          marginBottom: 8,
          color: "#e8e8f0",
        }}
      >
        Active Quests
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>
        Quests that adventurers have signed up for or are underway.
      </p>

      {isAdmin && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            background: "rgba(139, 106, 171, 0.08)",
            border: "1px dashed rgba(180, 130, 220, 0.4)",
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                color: "#c39ae0",
                fontSize: 11,
                fontFamily: "'Cinzel', serif",
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Rival Party
            </span>
            <span
              style={{
                color: rivalError ? "#ef4444" : "#9ca3af",
                fontSize: 12,
                fontStyle: rivalMessage || rivalError ? "italic" : "normal",
              }}
            >
              {rivalError ??
                rivalMessage ??
                "Have an unseen NPC party quietly close 1–2 unclaimed quests, filing findings you can read later."}
            </span>
          </div>
          <button
            disabled={rivalRunning}
            onClick={runRivalParty}
            style={{
              background: rivalRunning ? "#3730a3" : "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              cursor: rivalRunning ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {rivalRunning ? "Whispering…" : "Rival Party Report"}
          </button>
        </div>
      )}


      {inProgress.length === 0 && recruiting.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "#6b7280",
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 8 }}>No active quests yet.</p>
          <p style={{ fontSize: 13 }}>
            Visit the map and join a quest to see it here.
          </p>
        </div>
      )}

      {(inProgress.length > 0 || recruiting.length > 0 || showCompleted) && (
        <>
          <QuestSection
            title="In Progress"
            quests={inProgress}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoin={onJoinQuest}
            onLeave={onLeaveQuest}
            onEdit={onEditQuest}
            onDelete={onDeleteQuest}
            onSetActive={onSetQuestActive}
            onPayOut={onPayOutQuest}
            onManageFoundItems={onManageFoundItems}
            accentColor="#facc15"
          />
          <QuestSection
            title="Recruiting"
            quests={recruiting}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoin={onJoinQuest}
            onLeave={onLeaveQuest}
            onEdit={onEditQuest}
            onDelete={onDeleteQuest}
            onSetActive={onSetQuestActive}
            onPayOut={onPayOutQuest}
            onManageFoundItems={onManageFoundItems}
            accentColor="#60a5fa"
          />
        </>
      )}

      {completed.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              background: "transparent",
              border: "1px solid #2e2e4a",
              color: "#9ca3af",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              marginBottom: 16,
            }}
          >
            {showCompleted
              ? `Hide completed quests (${completed.length})`
              : `Show completed quests (${completed.length})`}
          </button>
        </div>
      )}

      {showCompleted && completed.length > 0 && (
        <>
          <QuestSection
            title="Completed"
            quests={completed}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoin={onJoinQuest}
            onLeave={onLeaveQuest}
            onEdit={onEditQuest}
            onDelete={onDeleteQuest}
            onSetActive={onSetQuestActive}
            onPayOut={onPayOutQuest}
            onManageFoundItems={onManageFoundItems}
            accentColor="#4ade80"
            renderExpandedExtras={(quest) => (
              <QuestFindings
                quest={quest}
                findings={findings.filter((f) => f.questId === quest.id)}
                hexes={hexes}
                allQuests={quests}
                playerName={playerName}
                isAdmin={isAdmin}
                adminPin={adminPin}
                onSetPlayerName={onSetPlayerName}
              />
            )}
          />
        </>
      )}
    </div>
  );
}

function QuestSection({
  title,
  quests,
  playerName,
  isAdmin,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onSetActive,
  onPayOut,
  onManageFoundItems,
  accentColor,
  renderExpandedExtras,
}: {
  title: string;
  quests: Quest[];
  playerName: string | null;
  isAdmin: boolean;
  onJoin: (questId: string) => void;
  onLeave: (questId: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onSetActive: (questId: string) => void;
  onPayOut: (quest: Quest) => void;
  onManageFoundItems: (quest: Quest) => void;
  accentColor: string;
  renderExpandedExtras?: (quest: Quest) => React.ReactNode;
}) {
  if (quests.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 18,
            margin: 0,
            color: accentColor,
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontSize: 12,
            color: "#6b7280",
            background: "#1e1e36",
            padding: "2px 10px",
            borderRadius: 10,
          }}
        >
          {quests.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {quests.map((quest) => (
          <div key={quest.id}>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                marginBottom: 4,
                paddingLeft: 16,
              }}
            >
              {quest.endHexCol != null && quest.endHexRow != null
                ? `(${quest.hexCol}, ${quest.hexRow}) → (${quest.endHexCol}, ${quest.endHexRow})`
                : `Hex (${quest.hexCol}, ${quest.hexRow})`}
            </div>
            <QuestCard
              quest={quest}
              playerName={playerName}
              isAdmin={isAdmin}
              onJoin={onJoin}
              onLeave={onLeave}
              onEdit={onEdit}
              onDelete={onDelete}
              onSetActive={onSetActive}
              onPayOut={onPayOut}
              onManageFoundItems={onManageFoundItems}
              expandedExtras={
                renderExpandedExtras ? renderExpandedExtras(quest) : undefined
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
