import { useState } from "react";
import type { PurchasedItem } from "../services/shop";

interface PurchasedItemCardProps {
  item: PurchasedItem;
  /** Show the buyer's name inline (used on the admin Purchased Items tab). */
  showBuyer?: boolean;
  /** Owner-only. Sell the item back for 75% of its value. */
  onSell?: () => void;
  /** Owner-only. Dispose of the item (no gold back). */
  onDispose?: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  "very rare": "#a855f7",
  legendary: "#fbbf24",
};

/** Parse the numeric gp value from a price string ("1,200 gp" -> 1200). */
export function parsePriceValue(price: string): number {
  const digits = (price ?? "").replace(/[^0-9]/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function PurchasedItemCard({
  item,
  showBuyer = false,
  onSell,
  onDispose,
}: PurchasedItemCardProps) {
  const [open, setOpen] = useState(false);
  const rarityColor = RARITY_COLORS[item.rarity.toLowerCase()] ?? "#9ca3af";
  const sellValue = Math.floor(parsePriceValue(item.price) * 0.75);
  const showActions = Boolean(onSell || onDispose);
  const when = new Date(item.purchasedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      onClick={() => setOpen((v) => !v)}
      role="button"
      aria-expanded={open}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      style={{
        background: "#1e1e36",
        border: "1px solid #2e2e4a",
        borderLeft: `3px solid ${rarityColor}`,
        borderRadius: 6,
        padding: "10px 14px",
        cursor: "pointer",
        outline: "none",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#22223d";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#1e1e36";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: rarityColor,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            padding: "2px 8px",
            border: `1px solid ${rarityColor}55`,
            borderRadius: 3,
            whiteSpace: "nowrap",
          }}
        >
          {item.rarity}
        </span>
        <span
          style={{
            color: "#e8e8f0",
            fontWeight: 600,
            fontSize: 14,
            flex: 1,
            minWidth: 0,
          }}
        >
          {item.itemName}
        </span>
        {showBuyer && (
          <span
            style={{
              color: item.buyer ? "#a78bfa" : "#6b7280",
              fontSize: 12,
              fontStyle: item.buyer ? "normal" : "italic",
              whiteSpace: "nowrap",
            }}
          >
            {item.buyer ?? "anonymous"}
          </span>
        )}
        <span
          style={{
            color: "#fbbf24",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {item.price || "—"}
        </span>
        <span
          style={{
            color: "#6b7280",
            fontSize: 11,
            whiteSpace: "nowrap",
          }}
        >
          {when}
        </span>
        <span
          aria-hidden
          style={{
            width: 20,
            height: 20,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: rarityColor,
            transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5 L6 8 L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div
            style={{
              paddingTop: 10,
              marginTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              color: "#d1d5db",
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            {item.description ? (
              item.description
            ) : (
              <span style={{ color: "#6b7280", fontStyle: "italic" }}>
                No description on file.
              </span>
            )}

            {showActions && (
              <div
                style={{ display: "flex", gap: 8, marginTop: 12 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {onSell && (
                  <button
                    onClick={onSell}
                    title="Sell back for 75% of value"
                    style={{
                      background: "#fbbf24",
                      color: "#0a0a0a",
                      border: "none",
                      borderRadius: 4,
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Sell ({sellValue.toLocaleString()} gp)
                  </button>
                )}
                {onDispose && (
                  <button
                    onClick={onDispose}
                    title="Discard this item (no gold back)"
                    style={{
                      background: "#7f1d1d",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Dispose
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
