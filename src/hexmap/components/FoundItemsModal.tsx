import { useState } from "react";
import type { FoundItem, Quest } from "../types";

interface FoundItemsModalProps {
  quest: Quest;
  onSave: (items: FoundItem[]) => void;
  onCancel: () => void;
  busy?: boolean;
}

const UNASSIGNED = "";

/**
 * Admin-only editor for a quest's found-items loot list. Items can be added,
 * edited, removed, and assigned to a party member (or left unassigned).
 * Assigned items surface in that player's "My Items".
 */
export function FoundItemsModal({
  quest,
  onSave,
  onCancel,
  busy = false,
}: FoundItemsModalProps) {
  const [items, setItems] = useState<FoundItem[]>(() =>
    quest.foundItems.map((it) => ({ ...it }))
  );

  const updateItem = (id: string, patch: Partial<FoundItem>) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        value: 0,
        assignedTo: null,
      },
    ]);

  const cleaned = items
    .map((it) => ({ ...it, name: it.name.trim() }))
    .filter((it) => it.name !== "");

  const inputStyle = {
    width: "100%",
    padding: "7px 9px",
    borderRadius: 6,
    border: "1px solid #3e3e5a",
    background: "#12121f",
    color: "#e8e8f0",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    color: "#6b7280",
    fontSize: 10,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: 3,
    display: "block",
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
          width: 480,
          maxWidth: "94vw",
          border: "1px solid #2e2e4a",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 4px", color: "#e8e8f0", fontSize: 18 }}>
          Found Items
        </h3>
        <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 16px" }}>
          {quest.title}
        </p>

        {items.length === 0 && (
          <p
            style={{
              color: "#6b7280",
              fontSize: 13,
              fontStyle: "italic",
              margin: "0 0 12px",
            }}
          >
            No items yet. Add loot the party discovered on this quest.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                border: "1px solid #2e2e4a",
                borderRadius: 8,
                padding: 12,
                background: "#181830",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Name</label>
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder="Item name"
                    style={inputStyle}
                  />
                </div>
                <div style={{ width: 110 }}>
                  <label style={labelStyle}>Value (gp)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={it.value || ""}
                    onChange={(e) =>
                      updateItem(it.id, {
                        value: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })
                    }
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={it.description}
                  onChange={(e) =>
                    updateItem(it.id, { description: e.target.value })
                  }
                  placeholder="What is it? Any effects?"
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Assigned to</label>
                  <select
                    value={it.assignedTo ?? UNASSIGNED}
                    onChange={(e) =>
                      updateItem(it.id, {
                        assignedTo: e.target.value === UNASSIGNED ? null : e.target.value,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value={UNASSIGNED}>— Unassigned —</option>
                    {quest.players.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {/* Preserve an assignee who has since left the party */}
                    {it.assignedTo &&
                      !quest.players.includes(it.assignedTo) && (
                        <option value={it.assignedTo}>
                          {it.assignedTo} (not in party)
                        </option>
                      )}
                  </select>
                </div>
                <button
                  onClick={() => removeItem(it.id)}
                  style={{
                    background: "#7f1d1d",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          style={{
            marginTop: 12,
            background: "transparent",
            color: "#a78bfa",
            border: "1px dashed #4c3a6a",
            borderRadius: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          + Add Item
        </button>

        {quest.players.length === 0 && (
          <p style={{ color: "#f59e0b", fontSize: 11, margin: "12px 0 0" }}>
            This quest has no party members yet — items can be added now and
            assigned once players join.
          </p>
        )}

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
            onClick={() => onSave(cleaned)}
            disabled={busy}
            style={{
              background: busy ? "#2d2d4a" : "#a78bfa",
              color: busy ? "#6b7280" : "#000",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Saving…" : "Save Items"}
          </button>
        </div>
      </div>
    </div>
  );
}
