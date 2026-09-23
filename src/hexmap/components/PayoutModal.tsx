import { useMemo, useState } from "react";
import { formatReward } from "../utils/reward";
import type { Quest } from "../types";

interface PayoutModalProps {
  quest: Quest;
  /** Player names that currently have a character row (can receive gold). */
  charactersWithGold: Set<string>;
  onConfirm: (multiplier: number, beastBonus: number) => void;
  onCancel: () => void;
  /** True while the payout request is in flight. */
  busy?: boolean;
}

const MULTIPLIERS: { value: number; label: string }[] = [
  { value: 5, label: "5×" },
  { value: 4, label: "4×" },
  { value: 3, label: "3×" },
  { value: 2, label: "2×" },
  { value: 1, label: "1×" },
  { value: 0.5, label: "½×" },
  { value: 0.25, label: "¼×" },
];

/** Parse the quest's gp reward string into a number (0 if non-numeric). */
function parseReward(reward: string): number {
  const n = Number(String(reward ?? "").replace(/\s*gp\s*$/i, "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function PayoutModal({
  quest,
  charactersWithGold,
  onConfirm,
  onCancel,
  busy = false,
}: PayoutModalProps) {
  const [multiplier, setMultiplier] = useState(1);
  const [beastBonusRaw, setBeastBonusRaw] = useState("");

  const baseReward = parseReward(quest.reward);
  const beastBonus = Math.max(0, Math.floor(Number(beastBonusRaw) || 0));
  const players = quest.players;

  // Preview mirrors the server formula: (reward × multiplier) + beast bonus,
  // split evenly with any remainder going to the first players.
  const preview = useMemo(() => {
    const total = Math.round(baseReward * multiplier) + beastBonus;
    const n = players.length;
    if (n === 0) return { total, shares: [] as { name: string; amount: number }[] };
    const per = Math.floor(total / n);
    const remainder = total - per * n;
    return {
      total,
      shares: players.map((name, i) => ({
        name,
        amount: per + (i < remainder ? 1 : 0),
      })),
    };
  }, [baseReward, multiplier, beastBonus, players]);

  const hasParty = players.length > 0;
  const missing = players.filter((p) => !charactersWithGold.has(p));

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #3e3e5a",
    background: "#12121f",
    color: "#e8e8f0",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e1e36",
          borderRadius: 12,
          padding: 24,
          width: 420,
          border: "1px solid #2e2e4a",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 4px", color: "#e8e8f0", fontSize: 18 }}>
          Pay Out Quest
        </h3>
        <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 16px" }}>
          {quest.title}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                color: "#9ca3af",
                fontSize: 12,
                marginBottom: 6,
                display: "block",
              }}
            >
              Base reward:{" "}
              <span style={{ color: "#fbbf24" }}>
                {baseReward > 0 ? formatReward(quest.reward) : "0 gp"}
              </span>
            </label>
            <label
              style={{
                color: "#9ca3af",
                fontSize: 12,
                marginBottom: 6,
                display: "block",
              }}
            >
              Multiplier
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MULTIPLIERS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMultiplier(m.value)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 12,
                    border:
                      multiplier === m.value
                        ? "2px solid #fbbf24"
                        : "2px solid #3e3e5a",
                    background: multiplier === m.value ? "#fbbf24" : "transparent",
                    color: multiplier === m.value ? "#000" : "#9ca3af",
                    fontSize: 13,
                    fontWeight: multiplier === m.value ? 700 : 400,
                    cursor: "pointer",
                    minWidth: 44,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                color: "#9ca3af",
                fontSize: 12,
                marginBottom: 4,
                display: "block",
              }}
            >
              Beast bounty (gp) — bonus for beasts slain
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={beastBonusRaw}
              onChange={(e) => setBeastBonusRaw(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>

          {/* Payout preview */}
          <div
            style={{
              background: "#12121f",
              border: "1px solid #2e2e4a",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#e8e8f0",
                marginBottom: 8,
              }}
            >
              <span>
                Total pot:{" "}
                <span style={{ color: "#6b7280", fontSize: 11 }}>
                  ({baseReward.toLocaleString()} × {multiplier}
                  {beastBonus > 0 ? ` + ${beastBonus.toLocaleString()}` : ""})
                </span>
              </span>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                {preview.total.toLocaleString()} gp
              </span>
            </div>
            {hasParty ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {preview.shares.map((s) => {
                  const isMissing = !charactersWithGold.has(s.name);
                  return (
                    <div
                      key={s.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: isMissing ? "#ef4444" : "#d1d5db",
                      }}
                    >
                      <span>
                        {s.name}
                        {isMissing ? " (no character)" : ""}
                      </span>
                      <span>{s.amount.toLocaleString()} gp</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>
                This quest has no party members to pay.
              </p>
            )}
          </div>

          {missing.length > 0 && hasParty && (
            <p style={{ color: "#f59e0b", fontSize: 11, margin: 0 }}>
              {missing.length} player{missing.length === 1 ? "" : "s"} without a
              character won't be credited (gold can't be stored). Their share is
              skipped.
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 20,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid #3e3e5a",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(multiplier, beastBonus)}
            disabled={busy || !hasParty}
            style={{
              background: !busy && hasParty ? "#fbbf24" : "#2d2d4a",
              color: !busy && hasParty ? "#000" : "#6b7280",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "wait" : hasParty ? "pointer" : "default",
            }}
          >
            {busy
              ? "Paying…"
              : `Pay ${preview.total.toLocaleString()} gp`}
          </button>
        </div>
      </div>
    </div>
  );
}
