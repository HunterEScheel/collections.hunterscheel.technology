import { useCallback, useEffect, useMemo, useState } from "react";
import {
  disposePurchase,
  fetchShopPurchases,
  sellPurchase,
} from "../services/shop";
import type { PurchasedItem } from "../services/shop";
import { PurchasedItemCard } from "./PurchasedItemCard";
import type { Character, Quest } from "../types";

interface MyItemsProps {
  playerName: string | null;
  character: Character | undefined;
  quests: Quest[];
  onSetPlayerName: () => void;
  onOpenCharacter: () => void;
}

export function MyItems({
  playerName,
  character,
  quests,
  onSetPlayerName,
  onOpenCharacter,
}: MyItemsProps) {
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const data = await fetchShopPurchases();
    setPurchases(data);
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const data = await fetchShopPurchases();
      if (alive) {
        setPurchases(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const handleSell = useCallback(
    async (item: PurchasedItem) => {
      if (!playerName || busyId) return;
      const credit = Math.floor(
        (parseInt((item.price ?? "").replace(/[^0-9]/g, ""), 10) || 0) * 0.75
      );
      if (
        !window.confirm(
          `Sell "${item.itemName}" for ${credit.toLocaleString()} gp?`
        )
      ) {
        return;
      }
      setBusyId(item.id);
      try {
        await sellPurchase(item.id, playerName);
        await reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Sell failed");
      } finally {
        setBusyId(null);
      }
    },
    [playerName, busyId, reload]
  );

  const handleDispose = useCallback(
    async (item: PurchasedItem) => {
      if (!playerName || busyId) return;
      if (!window.confirm(`Dispose of "${item.itemName}"? No gold is returned.`)) {
        return;
      }
      setBusyId(item.id);
      try {
        await disposePurchase(item.id, playerName);
        await reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Dispose failed");
      } finally {
        setBusyId(null);
      }
    },
    [playerName, busyId, reload]
  );

  const myPurchases = useMemo(
    () => (playerName ? purchases.filter((p) => p.buyer === playerName) : []),
    [purchases, playerName]
  );

  const totalSpent = useMemo(() => {
    let total = 0;
    for (const p of myPurchases) {
      const stripped = p.price.replace(/[^0-9]/g, "");
      const n = parseInt(stripped, 10);
      if (Number.isFinite(n)) total += n;
    }
    return total;
  }, [myPurchases]);

  // Found items assigned to this player, gathered across all quests. The
  // quests list is the single source of truth (see setQuestFoundItems).
  const foundItems = useMemo(() => {
    if (!playerName) return [];
    const out: { id: string; name: string; description: string; value: number; questTitle: string }[] = [];
    for (const q of quests) {
      for (const it of q.foundItems) {
        if (it.assignedTo === playerName) {
          out.push({
            id: it.id,
            name: it.name,
            description: it.description,
            value: it.value,
            questTitle: q.title,
          });
        }
      }
    }
    return out;
  }, [quests, playerName]);

  const gold = character?.gold ?? 0;

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
        My Items
      </h1>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 24 }}>
        Everything your character has bought from the guild shop.
      </p>

      {!playerName ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            borderRadius: 8,
          }}
        >
          <p style={{ color: "#9ca3af", marginBottom: 16 }}>
            Set a player name to see your inventory.
          </p>
          <button
            onClick={onSetPlayerName}
            style={{
              background: "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Set Player Name
          </button>
        </div>
      ) : (
        <>
          {/* Purse header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "stretch",
              gap: 12,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <PurseCard label="Character" value={playerName} accent="#a78bfa" />
            <PurseCard
              label="Gold on hand"
              value={`${gold.toLocaleString()} gp`}
              accent="#fbbf24"
              onClick={onOpenCharacter}
              hint="Edit"
            />
            <PurseCard
              label="Total spent"
              value={`${totalSpent.toLocaleString()} gp`}
              accent="#60a5fa"
            />
            <PurseCard
              label="Items purchased"
              value={String(myPurchases.length)}
              accent="#4ade80"
            />
          </div>

          {foundItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 18,
                  color: "#a78bfa",
                  margin: "0 0 12px",
                }}
              >
                Quest Loot
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {foundItems.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      background: "#1e1e36",
                      border: "1px solid #2e2e4a",
                      borderLeft: "3px solid #a78bfa",
                      borderRadius: 6,
                      padding: "10px 14px",
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
                          color: "#e8e8f0",
                          fontWeight: 600,
                          fontSize: 14,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {it.name}
                      </span>
                      <span style={{ color: "#6b7280", fontSize: 11 }}>
                        {it.questTitle}
                      </span>
                      {it.value > 0 && (
                        <span
                          style={{
                            color: "#fbbf24",
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {it.value.toLocaleString()} gp
                        </span>
                      )}
                    </div>
                    {it.description && (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          color: "#d1d5db",
                          fontSize: 13,
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {it.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#6b7280",
              }}
            >
              Loading purchases…
            </div>
          ) : myPurchases.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                background: "#1e1e36",
                border: "1px dashed #2e2e4a",
                borderRadius: 8,
                color: "#9ca3af",
              }}
            >
              You haven't bought anything yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {myPurchases.map((p) => (
                <PurchasedItemCard
                  key={p.id}
                  item={p}
                  onSell={() => handleSell(p)}
                  onDispose={() => handleDispose(p)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PurseCard({
  label,
  value,
  accent,
  onClick,
  hint,
}: {
  label: string;
  value: string;
  accent: string;
  onClick?: () => void;
  hint?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 140,
        background: "#1e1e36",
        border: "1px solid #2e2e4a",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        padding: "10px 14px",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = "#22223d";
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.background = "#1e1e36";
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        {hint && <span style={{ color: accent }}>{hint} →</span>}
      </div>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 18,
          fontWeight: 600,
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}

