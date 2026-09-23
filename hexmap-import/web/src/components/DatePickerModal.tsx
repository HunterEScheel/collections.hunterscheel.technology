import { useState } from "react";

interface DatePickerModalProps {
  /** Called with an ISO 8601 datetime string (UTC). */
  onConfirm: (isoDateTime: string) => void;
  onCancel: () => void;
}

// Sensible default — 7 PM local time, a typical D&D session start.
const DEFAULT_HOUR = 19;

// 24h dropdown with 12h labels.
function hourLabel(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

export function DatePickerModal({ onConfirm, onCancel }: DatePickerModalProps) {
  const [date, setDate] = useState("");
  const [hour, setHour] = useState<number>(DEFAULT_HOUR);

  const canConfirm = date !== "";

  function handleConfirm() {
    if (!canConfirm) return;
    // Construct a local-time Date, then emit as ISO UTC.
    const local = new Date(
      `${date}T${String(hour).padStart(2, "0")}:00:00`
    );
    onConfirm(local.toISOString());
  }

  return (
    <div
      onClick={onCancel}
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
          borderRadius: 8,
          padding: 24,
          width: 340,
          border: "1px solid #2e2e4a",
        }}
      >
        <h3
          style={{
            margin: "0 0 8px",
            color: "#e8e8f0",
            fontFamily: "'Cinzel', serif",
            fontSize: 18,
          }}
        >
          Schedule Quest
        </h3>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>
          When would you like to play this quest? Pick a date and an hour.
        </p>

        <label
          style={{
            display: "block",
            color: "#9ca3af",
            fontSize: 11,
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Date
        </label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 4,
            border: "1px solid #2e2e4a",
            background: "#12121f",
            color: "#e8e8f0",
            fontSize: 14,
            marginBottom: 14,
            boxSizing: "border-box",
          }}
        />

        <label
          style={{
            display: "block",
            color: "#9ca3af",
            fontSize: 11,
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Start hour ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </label>
        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 4,
            border: "1px solid #2e2e4a",
            background: "#12121f",
            color: "#e8e8f0",
            fontSize: 14,
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid #2e2e4a",
              color: "#9ca3af",
              borderRadius: 4,
              padding: "6px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            disabled={!canConfirm}
            onClick={handleConfirm}
            style={{
              background: canConfirm ? "#4ade80" : "#2e2e4a",
              color: canConfirm ? "#000" : "#6b7280",
              border: "none",
              borderRadius: 4,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
