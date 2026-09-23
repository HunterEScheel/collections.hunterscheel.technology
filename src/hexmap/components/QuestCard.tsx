import { useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";
import { QUEST_LEVEL_COLORS, QUEST_LEVEL_LABELS } from "../utils/colors";
import { formatReward } from "../utils/reward";
import type { Quest } from "../types";

interface QuestCardProps {
  quest: Quest;
  playerName: string | null;
  isAdmin: boolean;
  onJoin: (questId: string) => void;
  onLeave: (questId: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onSetActive: (questId: string) => void;
  /**
   * Admin-only. Opens the payout dialog for this quest. When omitted (e.g.
   * in the SidePanel), the Pay Out button is hidden.
   */
  onPayOut?: (quest: Quest) => void;
  /**
   * Admin-only. Opens the found-items editor for this quest. When omitted,
   * the Found Items button is hidden.
   */
  onManageFoundItems?: (quest: Quest) => void;
  /**
   * Optional content rendered inside the expanded section, below the party
   * list. ActiveQuests uses this to inject the QuestFindings panel for
   * completed quests.
   */
  expandedExtras?: React.ReactNode;
  /** Force-open the card on first render (e.g. for completed quests). */
  defaultExpanded?: boolean;
  /**
   * When true, only title / difficulty / status are visible until expanded.
   * Description, reward, adventurer count, party, schedule, and action
   * buttons all move into the expanded section. Used by the SidePanel.
   */
  compact?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  in_progress: "In Progress",
  completed: "Completed",
  paid_out: "Paid Out",
};

function formatScheduled(iso: string, verbose: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: verbose ? "long" : "short",
    month: verbose ? "long" : "short",
    day: "numeric",
    year: verbose ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * QuestCard — an "ambient dossier". The whole card is the click target
 * for expanding details. A chevron in the top-right corner signals the
 * interaction; hovering lifts the card with a soft glow tinted by the
 * quest's difficulty level. Details animate open with a smooth CSS grid
 * height transition (no JS animation library required).
 */
export function QuestCard({
  quest,
  playerName,
  isAdmin,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onSetActive,
  onPayOut,
  onManageFoundItems,
  expandedExtras,
  defaultExpanded = false,
  compact = false,
}: QuestCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const levelColor = QUEST_LEVEL_COLORS[quest.level];
  const hasJoined = playerName ? quest.players.includes(playerName) : false;
  // A closed quest (completed or paid out) is done — join/leave/set-active
  // are all hidden. Paid-out quests render exactly like completed ones.
  const isClosed =
    quest.status === "completed" || quest.status === "paid_out";
  const canJoin = !hasJoined && !isClosed;
  // Party members can start the session; hidden once it's already active
  // or closed.
  const canSetActive =
    hasJoined && quest.status !== "in_progress" && !isClosed;
  // Compact-collapsed hides everything except title/level/status.
  const showBrief = !compact || expanded;

  const toggle = useCallback(
    () => setExpanded((v) => !v),
    []
  );

  const onCardKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // Only react when the card itself is focused — not when Enter/Space
      // is pressed inside an inner button.
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  // Any click inside the actions row shouldn't toggle the card.
  const stopBubbling = useCallback(
    (e: MouseEvent) => e.stopPropagation(),
    []
  );

  const schedShort = quest.scheduledDate
    ? formatScheduled(quest.scheduledDate, false)
    : null;
  const schedLong = quest.scheduledDate
    ? formatScheduled(quest.scheduledDate, true)
    : null;

  const actions = (
    <div
      className="qc-actions"
      onClick={stopBubbling}
      onKeyDown={stopBubbling as unknown as (e: KeyboardEvent) => void}
    >
      {canJoin && (
        <button
          className="qc-btn qc-btn--join"
          onClick={() => onJoin(quest.id)}
        >
          Join
        </button>
      )}
      {canSetActive && (
        <button
          className="qc-btn qc-btn--active"
          onClick={() => onSetActive(quest.id)}
          title="Mark this quest as the session being played now"
        >
          Set Active
        </button>
      )}
      {hasJoined && !isClosed && (
        <button
          className="qc-btn qc-btn--leave"
          onClick={() => onLeave(quest.id)}
        >
          Leave
        </button>
      )}
      {isAdmin && (
        <>
          {onManageFoundItems && (
            <button
              className="qc-btn qc-btn--items"
              onClick={() => onManageFoundItems(quest)}
              title="Attach found items and assign them to players"
            >
              Found Items
            </button>
          )}
          {onPayOut && quest.status !== "paid_out" && (
            <button
              className="qc-btn qc-btn--payout"
              onClick={() => onPayOut(quest)}
              title="Pay out gold to the party"
            >
              Pay Out
            </button>
          )}
          <button
            className="qc-btn qc-btn--edit"
            onClick={() => onEdit(quest)}
          >
            Edit
          </button>
          <button
            className="qc-btn qc-btn--delete"
            onClick={() => onDelete(quest.id)}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );

  return (
    <div
      className={`quest-card${expanded ? " quest-card--expanded" : ""}`}
      style={{ ["--level-color" as any]: levelColor }}
      role="button"
      aria-expanded={expanded}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={onCardKeyDown}
    >
      <header className="qc-head">
        <div className="qc-title-row">
          <h4 className="qc-title">{quest.title}</h4>
          <span className="qc-level">{QUEST_LEVEL_LABELS[quest.level]}</span>
        </div>
        <span
          className="qc-chevron"
          aria-hidden="true"
          title={expanded ? "Collapse" : "Expand"}
        >
          <svg viewBox="0 0 12 12">
            <path d="M2.5 4.5 L6 8 L9.5 4.5" />
          </svg>
        </span>
      </header>

      {showBrief && (
        <>
          <p className="qc-desc">{quest.description}</p>
          {quest.reward && (
            <p className="qc-reward">Reward: {formatReward(quest.reward)}</p>
          )}
        </>
      )}

      <div className="qc-meta">
        <span
          className={`qc-status qc-status--${quest.status}`}
        >
          {STATUS_LABELS[quest.status]}
        </span>

        {quest.players.length > 0 && (
          <span className="qc-peek-item">
            <PeekIcon type="party" />
            {quest.players.length} adventurer
            {quest.players.length === 1 ? "" : "s"}
          </span>
        )}
        {schedShort && (
          <span className="qc-peek-item">
            <PeekIcon type="clock" />
            {schedShort}
          </span>
        )}
      </div>

      {/* Expanded section — animates open via CSS grid 0fr → 1fr.
         Clicks inside the expanded body must not bubble up to the card's
         toggle handler, or focusing a text input would collapse the
         card. To collapse from here, use the chevron or click the header. */}
      <div className="qc-extras" data-open={expanded}>
        <div
          className="qc-extras-inner"
          onClick={stopBubbling}
          onKeyDown={stopBubbling as unknown as (e: KeyboardEvent) => void}
        >
          {schedLong && (
            <div className="qc-field">
              <span className="qc-field-label">Scheduled</span>
              <span className="qc-field-value qc-field-value--sched">
                {schedLong}
              </span>
            </div>
          )}

          <div className="qc-field">
            <span className="qc-field-label">Party</span>
            <span className="qc-field-value">
              {quest.players.length > 0 ? quest.players.join(", ") : "—"}
            </span>
          </div>

          {quest.foundItems.length > 0 && (
            <div className="qc-field" style={{ alignItems: "flex-start" }}>
              <span className="qc-field-label">Found</span>
              <span className="qc-field-value">
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {quest.foundItems.map((it) => (
                    <span
                      key={it.id}
                      style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                    >
                      <span style={{ color: "#e8e8f0" }}>{it.name}</span>
                      {it.value > 0 && (
                        <span style={{ color: "#fbbf24" }}>
                          ({it.value.toLocaleString()} gp)
                        </span>
                      )}
                      <span style={{ color: "#6b7280" }}>
                        {it.assignedTo ? `→ ${it.assignedTo}` : "→ unassigned"}
                      </span>
                    </span>
                  ))}
                </span>
              </span>
            </div>
          )}

          {expandedExtras}

          {/* In compact mode (SidePanel), actions live inside the expand.
             In full mode (ActiveQuests), actions live below the expand
             and stay visible when collapsed — see below. */}
          {compact && actions}
        </div>
      </div>

      {!compact && actions}
    </div>
  );
}

function PeekIcon({ type }: { type: "party" | "clock" }) {
  if (type === "party") {
    return (
      <svg
        className="qc-peek-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="6" cy="6" r="2.4" />
        <path d="M2 13c.5-2.5 2-3.6 4-3.6s3.5 1.1 4 3.6" />
        <circle cx="11" cy="5.2" r="1.8" />
        <path d="M10 9.5c1.8-.1 3.5.8 4 3" />
      </svg>
    );
  }
  return (
    <svg
      className="qc-peek-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5 v3.5 l2.5 1.5" />
    </svg>
  );
}
