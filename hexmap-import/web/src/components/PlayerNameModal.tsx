import { useState } from "react";

interface PlayerNameModalProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function PlayerNameModal({ onConfirm, onCancel }: PlayerNameModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
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
          width: 340,
          border: "1px solid #2e2e4a",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            color: "#e8e8f0",
            fontSize: 18,
          }}
        >
          Enter Your Name
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Enter your adventurer name"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #3e3e5a",
            background: "#12121f",
            color: "#e8e8f0",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}
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
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{
              background: name.trim() ? "#4ade80" : "#2d2d4a",
              color: name.trim() ? "#000" : "#6b7280",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: name.trim() ? "pointer" : "default",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
