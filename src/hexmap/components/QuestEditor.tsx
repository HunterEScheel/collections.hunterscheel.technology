import { useState } from "react";
import { QUEST_LEVEL_LABELS, QUEST_LEVEL_COLORS } from "../utils/colors";
import type { Quest, QuestLevel, QuestStatus } from "../types";

const QUEST_LEVELS: QuestLevel[] = [
  "explore",
  "recurring",
  "wolf",
  "demon",
  "dragon",
  "terrasque",
  "god",
];

const QUEST_STATUSES: QuestStatus[] = ["available", "in_progress", "completed"];

const STATUS_LABELS: Record<QuestStatus, string> = {
  available: "Available",
  in_progress: "In Progress",
  completed: "Completed",
  paid_out: "Paid Out",
};

interface QuestEditorProps {
  quest?: Quest;
  hexCol: number;
  hexRow: number;
  onSave: (quest: Omit<Quest, "id">) => void;
  onCancel: () => void;
}

export function QuestEditor({
  quest,
  hexCol,
  hexRow,
  onSave,
  onCancel,
}: QuestEditorProps) {
  const [title, setTitle] = useState(quest?.title ?? "");
  const [description, setDescription] = useState(quest?.description ?? "");
  const [reward, setReward] = useState(quest?.reward ?? "");
  const [level, setLevel] = useState<QuestLevel>(quest?.level ?? "explore");
  const [status, setStatus] = useState<QuestStatus>(
    quest?.status ?? "available"
  );
  const [endCol, setEndCol] = useState(
    quest?.endHexCol != null ? String(quest.endHexCol) : ""
  );
  const [endRow, setEndRow] = useState(
    quest?.endHexRow != null ? String(quest.endHexRow) : ""
  );

  const handleSave = () => {
    if (!title.trim()) return;
    const hasEnd = endCol.trim() !== "" && endRow.trim() !== "";
    onSave({
      title: title.trim(),
      description: description.trim(),
      reward: reward.trim(),
      level,
      status,
      hexCol,
      hexRow,
      endHexCol: hasEnd ? Number(endCol) : null,
      endHexRow: hasEnd ? Number(endRow) : null,
      players: quest?.players ?? [],
      scheduledDate: quest?.scheduledDate ?? null,
      completedAt: quest?.completedAt ?? null,
      foundItems: quest?.foundItems ?? [],
    });
  };

  const selectStyle = {
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

  const inputStyle = {
    ...selectStyle,
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
          width: 400,
          border: "1px solid #2e2e4a",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            margin: "0 0 4px",
            color: "#e8e8f0",
            fontSize: 18,
          }}
        >
          {quest ? "Edit Quest" : "New Quest"}
        </h3>
        <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 16px" }}>
          Hex ({hexCol}, {hexRow})
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}
            >
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quest title"
              autoFocus
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quest description..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div>
            <label
              style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}
            >
              Reward (gp)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="Gold pieces"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}
            >
              Level
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUEST_LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 12,
                    border:
                      level === l
                        ? `2px solid ${QUEST_LEVEL_COLORS[l]}`
                        : "2px solid #3e3e5a",
                    background:
                      level === l ? QUEST_LEVEL_COLORS[l] : "transparent",
                    color: level === l ? "#000" : "#9ca3af",
                    fontSize: 12,
                    fontWeight: level === l ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {QUEST_LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}
            >
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as QuestStatus)}
              style={selectStyle}
            >
              {QUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" }}
            >
              End Hex (optional)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                value={endCol}
                onChange={(e) => setEndCol(e.target.value)}
                placeholder="Col"
                style={{ ...inputStyle, width: "50%" }}
              />
              <input
                type="number"
                value={endRow}
                onChange={(e) => setEndRow(e.target.value)}
                placeholder="Row"
                style={{ ...inputStyle, width: "50%" }}
              />
            </div>
          </div>
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
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid #3e3e5a",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{
              background: title.trim() ? "#4ade80" : "#2d2d4a",
              color: title.trim() ? "#000" : "#6b7280",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: title.trim() ? "pointer" : "default",
            }}
          >
            {quest ? "Save Changes" : "Create Quest"}
          </button>
        </div>
      </div>
    </div>
  );
}
