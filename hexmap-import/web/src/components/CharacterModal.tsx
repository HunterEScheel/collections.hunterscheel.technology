import { useState } from "react";
import { saveCharacter } from "../hooks/useFirebase";
import type { Character } from "../types";

interface CharacterModalProps {
  /** Current player name, or null if not yet set. */
  currentName: string | null;
  /** Current character record (HP/AC), or undefined if not yet saved. */
  character: Character | undefined;
  onClose: () => void;
  /** Called with the new name when save succeeds (so App can update localStorage). */
  onSaved: (newName: string) => void;
}

export function CharacterModal({
  currentName,
  character,
  onClose,
  onSaved,
}: CharacterModalProps) {
  const [name, setName] = useState(currentName ?? "");
  const [hp, setHp] = useState<string>(
    character?.hitPoints != null ? String(character.hitPoints) : ""
  );
  const [ac, setAc] = useState<string>(
    character?.armorClass != null ? String(character.armorClass) : ""
  );
  const [gold, setGold] = useState<string>(
    character?.gold != null ? String(character.gold) : "0"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const newName = name.trim();
      const hpNum = hp.trim() === "" ? null : parseInt(hp, 10);
      const acNum = ac.trim() === "" ? null : parseInt(ac, 10);
      const goldNum = gold.trim() === "" ? 0 : parseInt(gold, 10);
      if (hpNum != null && !Number.isFinite(hpNum)) {
        throw new Error("HP must be a number");
      }
      if (acNum != null && !Number.isFinite(acNum)) {
        throw new Error("AC must be a number");
      }
      if (!Number.isFinite(goldNum) || goldNum < 0) {
        throw new Error("Gold must be a non-negative number");
      }
      await saveCharacter(currentName, newName, hpNum, acNum, goldNum);
      onSaved(newName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
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
          Your Character
        </h3>
        <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 16 }}>
          Renaming updates every quest, finding, and initiative row attached to
          your old name.
        </p>

        <label style={labelStyle}>Character name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Thalia Ironvale"
          autoFocus
          maxLength={60}
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Hit Points</label>
            <input
              type="number"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              placeholder="HP"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Armor Class</label>
            <input
              type="number"
              value={ac}
              onChange={(e) => setAc(e.target.value)}
              placeholder="AC"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Gold (gp)</label>
          <input
            type="number"
            min={0}
            value={gold}
            onChange={(e) => setGold(e.target.value)}
            placeholder="0"
            style={{ ...inputStyle, color: "#fbbf24" }}
          />
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: 12, marginTop: 10 }}>
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 18,
          }}
        >
          <button onClick={onClose} style={cancelBtn}>
            Cancel
          </button>
          <button
            disabled={!canSave || saving}
            onClick={handleSave}
            style={{
              ...saveBtn,
              background: canSave && !saving ? "#4ade80" : "#2e2e4a",
              color: canSave && !saving ? "#000" : "#6b7280",
              cursor: canSave && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#9ca3af",
  fontSize: 11,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 4,
  border: "1px solid #2e2e4a",
  background: "#12121f",
  color: "#e8e8f0",
  fontSize: 14,
  boxSizing: "border-box",
};

const cancelBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2e2e4a",
  color: "#9ca3af",
  borderRadius: 4,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};

const saveBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 4,
  padding: "6px 16px",
  fontSize: 13,
  fontWeight: 600,
};
