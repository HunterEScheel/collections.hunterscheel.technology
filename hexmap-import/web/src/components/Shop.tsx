import { useState, useEffect, useCallback } from "react";
import {
  fetchEquipment,
  fetchShopInventory,
  fetchRestockRules,
  fetchRestockSettings,
  addRestockRule,
  updateRestockRule,
  deleteRestockRule,
  updateRestockSetting,
  executeRestock,
  searchMagicItems,
  purchaseItem,
  purchaseEquipment,
  updateShopItemPrice,
  rollDice,
  fetchShopPurchases,
} from "../services/shop";
import type {
  EquipmentItem,
  ShopItem,
  RestockRule,
  RestockSettings,
  PurchasedItem,
} from "../services/shop";
import { PurchasedItemCard } from "./PurchasedItemCard";

type ShopTab = "equipment" | "magic" | "purchased";

interface ShopProps {
  isAdmin: boolean;
  adminPin: string | null;
  playerName: string | null;
}

export function Shop({ isAdmin, adminPin, playerName }: ShopProps) {
  const [tab, setTab] = useState<ShopTab>("equipment");
  // Player-only view can't reach the "purchased" tab.
  if (tab === "purchased" && !isAdmin) {
    setTab("magic");
  }

  return (
    <div
      style={{
        maxWidth: 900,
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
          marginBottom: 16,
        }}
      >
        Shop
      </h1>

      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        <TabButton label="Equipment" active={tab === "equipment"} onClick={() => setTab("equipment")} />
        <TabButton label="Magic Items" active={tab === "magic"} onClick={() => setTab("magic")} />
        {isAdmin && (
          <TabButton
            label="Purchased Items"
            active={tab === "purchased"}
            onClick={() => setTab("purchased")}
          />
        )}
      </div>

      {tab === "equipment" ? (
        <EquipmentShop isAdmin={isAdmin} playerName={playerName} />
      ) : tab === "magic" ? (
        <MagicShop
          isAdmin={isAdmin}
          adminPin={adminPin}
          playerName={playerName}
        />
      ) : (
        <PurchasedShop />
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#1e1e36" : "transparent",
        border: "1px solid #2e2e4a",
        borderBottom: active ? "2px solid #4ade80" : "1px solid #2e2e4a",
        color: active ? "#e8e8f0" : "#6b7280",
        padding: "8px 20px",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: "'Cinzel', serif",
      }}
    >
      {label}
    </button>
  );
}

// --- Equipment Tab (static from API) ---

function EquipmentShop({
  isAdmin,
  playerName,
}: {
  isAdmin: boolean;
  playerName: string | null;
}) {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetchEquipment().then(setItems).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading equipment..." />;

  const filtered = filter
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(filter.toLowerCase()) ||
          i.category.toLowerCase().includes(filter.toLowerCase())
      )
    : items;

  return (
    <>
      <input
        type="text"
        placeholder="Search equipment..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={searchStyle}
      />
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Name", "Category", "Cost", "Damage / AC", "Weight", "Notes"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
              {playerName && <th style={thStyle}></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const notes = [
                ...(item.properties ?? []),
                ...(item.stealth ? [item.stealth] : []),
                ...(item.strength ? [item.strength] : []),
              ].join(", ") || "—";
              return (
                <tr key={item.index}>
                  <td style={{ ...tdStyle, color: "#e8e8f0", fontWeight: 600 }}>{item.name}</td>
                  <td style={tdStyle}>{item.category}</td>
                  <td style={{ ...tdStyle, color: "#fbbf24" }}>
                  {isAdmin ? (
                    <input
                      value={item.cost}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((i) => (i.index === item.index ? { ...i, cost: val } : i))
                        );
                      }}
                      style={{
                        width: 70,
                        padding: "1px 4px",
                        background: "transparent",
                        border: "1px solid transparent",
                        borderRadius: 3,
                        color: "#fbbf24",
                        fontSize: 13,
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2e2e4a"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
                    />
                  ) : (
                    item.cost
                  )}
                </td>
                  <td style={tdStyle}>{item.damage ?? item.armorClass ?? "—"}</td>
                  <td style={tdStyle}>{item.weight}</td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{notes}</td>
                  {playerName && (
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        disabled={buying === item.index}
                        onClick={async () => {
                          setBuying(item.index);
                          try {
                            await purchaseEquipment(playerName, item);
                          } catch (err) {
                            alert(
                              err instanceof Error
                                ? err.message
                                : "Purchase failed"
                            );
                          } finally {
                            setBuying(null);
                          }
                        }}
                        style={{
                          background:
                            buying === item.index ? "#166534" : "#4ade80",
                          color: "#0a0a0a",
                          border: "none",
                          borderRadius: 4,
                          padding: "4px 12px",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          cursor:
                            buying === item.index ? "wait" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title={`Buy for ${item.cost || "unknown price"}`}
                      >
                        {buying === item.index ? "Buying…" : "Buy"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --- Magic Items Tab (Supabase inventory) ---

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  "very rare": "#a855f7",
  legendary: "#fbbf24",
};

function MagicShop({
  isAdmin,
  adminPin,
  playerName,
}: {
  isAdmin: boolean;
  adminPin: string | null;
  playerName: string | null;
}) {
  const [inventory, setInventory] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [restocking, setRestocking] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    const items = await fetchShopInventory();
    setInventory(items);
    setLoading(false);
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const handleRestock = async () => {
    if (!adminPin) return;
    setRestocking(true);
    await executeRestock(adminPin);
    await loadInventory();
    setRestocking(false);
  };

  if (loading) return <Loading text="Loading shop inventory..." />;

  // Group by rarity
  const grouped: Record<string, ShopItem[]> = {};
  for (const item of inventory) {
    const r = item.rarity.toLowerCase();
    if (!grouped[r]) grouped[r] = [];
    grouped[r].push(item);
  }

  const rarityOrder = ["common", "uncommon", "rare", "very rare", "legendary"];

  return (
    <>
      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={handleRestock}
            disabled={restocking}
            style={{
              background: restocking ? "#7a5320" : "#f97316",
              color: "#000",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: restocking ? "wait" : "pointer",
            }}
          >
            {restocking ? "Restocking..." : "Restock Shop"}
          </button>
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            style={{
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {showAdmin ? "Hide Settings" : "Restock Settings"}
          </button>
        </div>
      )}

      {showAdmin && isAdmin && (
        <RestockAdmin onSettingsChanged={loadInventory} adminPin={adminPin} />
      )}

      {inventory.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <p>The shop is empty.</p>
          {isAdmin && <p style={{ fontSize: 13 }}>Click "Restock Shop" to fill the inventory.</p>}
        </div>
      ) : (
        rarityOrder.map((rarity) => {
          const items = grouped[rarity];
          if (!items || items.length === 0) return null;
          return (
            <div key={rarity} style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 16,
                  color: RARITY_COLORS[rarity] ?? "#9ca3af",
                  marginBottom: 8,
                  textTransform: "capitalize",
                }}
              >
                {rarity}{" "}
                <span style={{ color: "#6b7280", fontSize: 12, fontFamily: "'Segoe UI', sans-serif" }}>
                  ({items.length})
                </span>
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((item) => (
                  <div key={item.id}>
                    <div style={{ display: "flex", alignItems: "stretch" }}>
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: expanded === item.id ? "#1e1e36" : "transparent",
                        border: "none",
                        borderBottom: "1px solid #1e1e36",
                        color: "#e8e8f0",
                        padding: "8px 12px",
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ flex: 1 }}>{item.itemName}</span>
                      {isAdmin ? (
                        <input
                          value={item.price}
                          placeholder="Price"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInventory((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, price: val } : i))
                            );
                          }}
                          onBlur={() => {
                            if (!adminPin) return;
                            updateShopItemPrice(adminPin, item.id, item.price).catch(
                              (err) => console.error("updateShopItemPrice:", err)
                            );
                          }}
                          style={{
                            width: 70,
                            padding: "1px 4px",
                            background: "transparent",
                            border: "1px solid transparent",
                            borderRadius: 3,
                            color: "#fbbf24",
                            fontSize: 11,
                            textAlign: "right",
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "#2e2e4a"; }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: "#fbbf24", whiteSpace: "nowrap" }}>
                          {item.price || "Ask DM"}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
                        &times;{item.quantity}
                      </span>
                    </button>
                    {playerName && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Optimistic update
                          if (item.quantity <= 1) {
                            setInventory((prev) => prev.filter((i) => i.id !== item.id));
                          } else {
                            setInventory((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
                              )
                            );
                          }
                          try {
                            await purchaseItem(item.id, playerName);
                          } catch (err) {
                            console.error("Purchase failed:", err);
                            await loadInventory(); // revert on error
                            alert(
                              err instanceof Error
                                ? err.message
                                : "Purchase failed"
                            );
                          }
                        }}
                        style={{
                          background: "#4ade80",
                          color: "#0a0a0a",
                          border: "none",
                          borderRadius: 4,
                          padding: "4px 12px",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          cursor: "pointer",
                          marginLeft: 4,
                          flexShrink: 0,
                        }}
                        title={`Buy for ${item.price || "unknown price"}`}
                      >
                        Buy
                      </button>
                    )}
                    </div>
                    {expanded === item.id && (
                      <div
                        style={{
                          background: "#1e1e36",
                          padding: "8px 12px 12px",
                          fontSize: 13,
                          color: "#9ca3af",
                          lineHeight: 1.6,
                          borderBottom: "1px solid #2e2e4a",
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

// --- Admin: Restock Settings ---

function RestockAdmin({
  onSettingsChanged,
  adminPin,
}: {
  onSettingsChanged: () => void;
  adminPin: string | null;
}) {
  const [settings, setSettings] = useState<RestockSettings[]>([]);
  const [rules, setRules] = useState<RestockRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Add rule form
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ index: string; name: string; rarity: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([fetchRestockSettings(), fetchRestockRules()]);
    setSettings(s);
    setRules(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchMagicItems(searchQuery);
    setSearchResults(results.map((r) => ({ index: r.index, name: r.name, rarity: r.rarity })));
    setSearching(false);
  };

  const handleAddRule = async (item: { index: string; name: string; rarity: string }) => {
    if (!adminPin) return;
    await addRestockRule(adminPin, item.index, item.name, item.rarity, "1d4");
    setSearchResults([]);
    setSearchQuery("");
    await load();
    onSettingsChanged();
  };

  if (loading) return <Loading text="Loading settings..." />;

  return (
    <div
      style={{
        background: "#1e1e36",
        border: "1px solid #2e2e4a",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#e8e8f0" }}>
        Rarity Stock Counts
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {settings.map((s) => (
          <div key={s.rarity} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                color: RARITY_COLORS[s.rarity.toLowerCase()] ?? "#9ca3af",
                fontWeight: 600,
                textTransform: "capitalize",
                minWidth: 70,
              }}
            >
              {s.rarity}:
            </span>
            <input
              type="number"
              value={s.count}
              min={0}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 0;
                setSettings((prev) =>
                  prev.map((p) => (p.rarity === s.rarity ? { ...p, count: val } : p))
                );
                if (!adminPin) return;
                updateRestockSetting(adminPin, s.rarity, val);
              }}
              style={{
                width: 60,
                padding: "4px 8px",
                background: "#12121f",
                border: "1px solid #2e2e4a",
                borderRadius: 4,
                color: "#e8e8f0",
                fontSize: 13,
              }}
            />
          </div>
        ))}
      </div>

      <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#e8e8f0" }}>
        Specific Item Rules
      </h3>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>
        These items always restock with a dice roll quantity, on top of the random stock.
      </p>

      {rules.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: "1px solid #12121f",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: rule.enabled ? "#e8e8f0" : "#6b7280",
                }}
              >
                {rule.itemName}
              </span>
              <select
                value={rule.rarity}
                onChange={(e) => {
                  const val = e.target.value;
                  setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, rarity: val } : r))
                  );
                  if (!adminPin) return;
                  updateRestockRule(adminPin, rule.id, { rarity: val });
                }}
                style={{
                  width: 90,
                  padding: "2px 4px",
                  background: "#12121f",
                  border: "1px solid #2e2e4a",
                  borderRadius: 4,
                  color: RARITY_COLORS[rule.rarity.toLowerCase()] ?? "#9ca3af",
                  fontSize: 11,
                }}
              >
                {["Common", "Uncommon", "Rare", "Very Rare", "Legendary"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                value={rule.price}
                placeholder="Price"
                onChange={(e) => {
                  const val = e.target.value;
                  setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, price: val } : r))
                  );
                  if (!adminPin) return;
                  updateRestockRule(adminPin, rule.id, { price: val });
                }}
                style={{
                  width: 70,
                  padding: "2px 6px",
                  background: "#12121f",
                  border: "1px solid #2e2e4a",
                  borderRadius: 4,
                  color: "#fbbf24",
                  fontSize: 12,
                }}
              />
              <input
                value={rule.dice}
                onChange={(e) => {
                  const val = e.target.value;
                  setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, dice: val } : r))
                  );
                  if (!adminPin) return;
                  updateRestockRule(adminPin, rule.id, { dice: val });
                }}
                style={{
                  width: 50,
                  padding: "2px 6px",
                  background: "#12121f",
                  border: "1px solid #2e2e4a",
                  borderRadius: 4,
                  color: "#fbbf24",
                  fontSize: 12,
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: 11, color: "#6b7280", minWidth: 24 }}>
                ({rollDice(rule.dice)})
              </span>
              <button
                onClick={() => {
                  if (!adminPin) return;
                  updateRestockRule(adminPin, rule.id, { enabled: !rule.enabled });
                }}
                style={{
                  background: rule.enabled ? "#4ade80" : "#2e2e4a",
                  color: rule.enabled ? "#000" : "#6b7280",
                  border: "none",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {rule.enabled ? "ON" : "OFF"}
              </button>
              <button
                onClick={async () => {
                  if (!adminPin) return;
                  await deleteRestockRule(adminPin, rule.id);
                  await load();
                }}
                style={{
                  background: "#7f1d1d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                Del
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search to add new rule */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search magic items to add..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          style={{
            flex: 1,
            padding: "6px 10px",
            background: "#12121f",
            border: "1px solid #2e2e4a",
            borderRadius: 4,
            color: "#e8e8f0",
            fontSize: 13,
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          style={{
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>

      {searchResults.length > 0 && (
        <div
          style={{
            marginTop: 8,
            background: "#12121f",
            borderRadius: 4,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {searchResults.map((item) => (
            <button
              key={item.index}
              onClick={() => handleAddRule(item)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #1e1e36",
                color: "#e8e8f0",
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <span>{item.name}</span>
              <span style={{ color: RARITY_COLORS[item.rarity.toLowerCase()] ?? "#6b7280", fontSize: 11 }}>
                {item.rarity}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>{text}</div>;
}

// --- Purchased items log (admin only) ---

function PurchasedShop() {
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Polling isn't necessary — purchases table is realtime-published, but
    // for simplicity we just refetch on tab mount. Refresh button below
    // gives admins a manual retry.
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <Loading text="Loading purchase log..." />;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
          {purchases.length === 0
            ? "No purchases yet."
            : `${purchases.length} purchase${purchases.length === 1 ? "" : "s"} logged.`}
        </p>
        <button
          onClick={async () => {
            setLoading(true);
            const data = await fetchShopPurchases();
            setPurchases(data);
            setLoading(false);
          }}
          style={{
            background: "transparent",
            color: "#9ca3af",
            border: "1px solid #2e2e4a",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {purchases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {purchases.map((p) => (
            <PurchasedItemCard key={p.id} item={p} showBuyer />
          ))}
        </div>
      )}
    </>
  );
}

const searchStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 4,
  border: "1px solid #2e2e4a",
  background: "#12121f",
  color: "#e8e8f0",
  fontSize: 14,
  marginBottom: 16,
  boxSizing: "border-box",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #2e2e4a",
  color: "#9ca3af",
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #1e1e36",
  color: "#d1d5db",
};
