import { useState, useEffect, useMemo } from "react";

const OPEN5E_BASE = "https://api.open5e.com/v2";

interface BountyRow {
    name: string;
    size: string;
    bounty: string;
    copperValue: number;
}

type SortKey = "name" | "size" | "bounty";

const SIZE_ORDER = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

// Bounty = 1/10 of XP, expressed in gp/sp/cp.
function formatBounty(xp: number): { text: string; copper: number } {
    // XP / 10 gives gold value; multiply by 100 to get copper
    const copper = Math.max(1, Math.round((xp / 10) * 100));
    let text: string;
    if (copper >= 100) {
        text = `${Math.round(copper / 100).toLocaleString("en-US")} gp`;
    } else if (copper >= 10) {
        const sp = Math.round(copper / 10);
        text = sp >= 10 ? "1 gp" : `${sp} sp`;
    } else {
        text = `${copper} cp`;
    }
    return { text, copper };
}

interface Open5eV2Creature {
    key: string;
    name: string;
    size: { key: string; name: string };
    type: { key: string; name: string };
    experience_points: number;
}

let bountyCache: BountyRow[] | null = null;

async function fetchAllBountyCreatures(): Promise<BountyRow[]> {
    if (bountyCache) return bountyCache;

    const monsters: Open5eV2Creature[] = [];
    let url: string | null = `${OPEN5E_BASE}/creatures/?format=json&limit=100` + `&document__key=srd-2024` + `&fields=key,name,size,type,experience_points`;

    while (url) {
        const res = await fetch(url);
        const data = (await res.json()) as {
            next: string | null;
            results: Open5eV2Creature[];
        };
        monsters.push(...data.results);
        url = data.next;
    }

    // Exclude undead (consolidated into quest-only)
    // Deduplicate by name (different source documents list the same creature)
    const seen = new Set<string>();
    const rows: BountyRow[] = [];
    for (const m of monsters) {
        if (m.type.key === "undead" || m.type.key === "humanoid") continue;
        if (seen.has(m.name)) continue;
        seen.add(m.name);
        const { text, copper } = formatBounty(m.experience_points);
        rows.push({ name: m.name, size: m.size.name, bounty: text, copperValue: copper });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));
    bountyCache = rows;
    return rows;
}

export function BountyBoard() {
    const [rows, setRows] = useState<BountyRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllBountyCreatures()
            .then(setRows)
            .catch((err) => console.error("Bounty fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div style={{ color: "#9ca3af", padding: 40, textAlign: "center" }}>Loading bounties...</div>;
    }

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
            <h1>Bounty Table</h1>
            <p>Standard bounty rates paid by the guild per creature kill. Proof of kill must be delivered to any guild writ-post for payment.</p>

            <h2>Proof Requirements</h2>
            <div className="markdown-body">
                <table>
                    <thead>
                        <tr>
                            <th>Creature Size</th>
                            <th>Required Proof</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <strong>Tiny / Small</strong>
                            </td>
                            <td>Full creature body</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Medium</strong>
                            </td>
                            <td>Head, or equivalent identifying remains if the creature has no head</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Large+</strong>
                            </td>
                            <td>Head, or equivalent identifying remains. Assessor may accept partial proof for transport reasons</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h3>Undead (Shadows, Specters, etc.)</h3>
            <p>
                Incorporeal creatures leave no body. The guild cannot verify a kill without proof, and it will not pay bounties on someone's word alone. A
                skeleton or zombie body proves nothing — anyone with the right spell can make one from a fresh corpse. An open bounty on undead is an open
                bounty on murder. If you encounter an incorporeal or undead creature:
            </p>
            <ol>
                <li>
                    <strong>Report it to the guild.</strong> Describe what you saw, where, and when.
                </li>
                <li>
                    <strong>The guild posts a quest</strong> to kill it, with a set reward.
                </li>
                <li>
                    <strong>The reporting party cannot take that quest.</strong> This prevents adventurers from fabricating sightings to collect their own
                    bounty.
                </li>
            </ol>

            <hr style={{ borderColor: "#2e2e4a", margin: "24px 0" }} />

            <h2>Bounty Rates</h2>
            <p>
                Every creature the guild pays a bounty on ({rows.length} in total). Search by name or sort any column; the bounty reflects the threat a creature
                poses. People are not listed — the guild bounties monsters, not persons, and will not pay for murder.
            </p>

            {rows.length > 0 && <BountyTable rows={rows} />}

            <hr style={{ borderColor: "#2e2e4a", margin: "24px 0" }} />

            <h2>Rules</h2>
            <ul>
                <li>
                    <strong>No double-dipping.</strong> A creature killed during a monthly patrol cannot also be claimed against a separate writ for the same
                    threat. Pick one payout.
                </li>
                <li>
                    <strong>Fraud.</strong> Claiming a bounty for a creature you didn't kill, or presenting fabricated proof, results in permanent ban from the
                    guild board. In a world where the next ghoul warren is one bad winter away, losing guild access is a serious consequence.
                </li>
                <li>
                    <strong>Unknowns.</strong> If you kill something you can't identify, bring the head (or full body if small enough). The assessor will
                    classify it, set a bounty, and add it to the table for future reference.
                </li>
            </ul>
        </div>
    );
}

function BountyTable({ rows }: { rows: BountyRow[] }) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("bounty");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = query ? rows.filter((r) => r.name.toLowerCase().includes(query)) : rows;

        return [...filtered].sort((a, b) => {
            let cmp: number;
            if (sortKey === "name") {
                cmp = a.name.localeCompare(b.name);
            } else if (sortKey === "size") {
                cmp = SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size);
            } else {
                cmp = a.copperValue - b.copperValue;
            }
            if (cmp === 0) cmp = a.name.localeCompare(b.name);
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [rows, search, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    }

    const arrow = (key: SortKey) => (key === sortKey ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "");

    return (
        <>
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search creatures..."
                style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#1e1e36",
                    border: "1px solid #2e2e4a",
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: "#e8e8f0",
                    fontSize: 14,
                    marginBottom: 8,
                }}
            />
            <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>
                {visible.length} of {rows.length} creatures
            </p>
            {visible.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 14 }}>No creatures match your search.</p>
            ) : (
                <div className="markdown-body">
                    <table>
                        <thead>
                            <tr>
                                {(
                                    [
                                        ["name", "Creature"],
                                        ["size", "Size"],
                                        ["bounty", "Bounty"],
                                    ] as [SortKey, string][]
                                ).map(([key, label]) => (
                                    <th
                                        key={key}
                                        onClick={() => toggleSort(key)}
                                        style={{
                                            cursor: "pointer",
                                            userSelect: "none",
                                            color: key === sortKey ? "#e8e8f0" : "#c084fc",
                                        }}
                                    >
                                        {label}
                                        {arrow(key)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((r) => (
                                <tr key={r.name}>
                                    <td>{r.name}</td>
                                    <td>{r.size}</td>
                                    <td>{r.bounty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
