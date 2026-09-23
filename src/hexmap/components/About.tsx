export function About() {
    return (
        <div
            style={{
                maxWidth: 800,
                margin: "0 auto",
                padding: "32px 24px",
                color: "#e8e8f0",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                lineHeight: 1.7,
            }}
        >
            <h1
                style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 28,
                    marginBottom: 24,
                    color: "#e8e8f0",
                }}
            >
                About This System
            </h1>

            <Section title="What is a West Marches Campaign?">
                <h3>In short, a "one-shot engine"</h3>
                <ComparisonTable />
            </Section>

            <Section title="What is a Hex Crawl?">
                <p>
                    A hex crawl is an exploration-focused style of play where the game world is mapped on a <strong>hexagonal grid</strong>. Each hex represents
                    a region of terrain
                </p>
                <ul>
                    <li>
                        <strong>Fog of war.</strong> Players start with a mostly blank map. As they explore, hexes are revealed and filled in with terrain.
                        Unknown territory is dangerous and exciting.
                    </li>
                    <li>
                        <strong>Random encounters.</strong> Each terrain type and danger tier has its own encounter table. Travel is never routine — anything
                        from a pack of wolves to a wandering dragon might cross your path.
                    </li>
                    <li>
                        <strong>Resource management.</strong> Supplies, rations, and rest matter. Pushing deeper into the wilderness means committing resources
                        and accepting risk. Knowing when to turn back is a real strategic decision.
                    </li>
                    <li>
                        <strong>Player cartography.</strong> Part of the fun is building the map as you go. Sharing knowledge is how the players build
                        collective understanding of the world.
                    </li>
                    <li>
                        <strong>Meaningful choices.</strong> Every hex you enter is a choice. Go east toward the mountains where rumors say a dragon lairs? Or
                        south through the safer plains to reach the abandoned city? The map itself becomes a decision-making tool.
                    </li>
                </ul>
            </Section>

            <Section title="Why Combine Them?">
                <p>
                    West Marches and hex crawls are a natural pairing. The player-driven scheduling of West Marches means different groups can explore different
                    parts of the map independently. One party might push north into the frozen wastes while another investigates ruins to the east.
                </p>
                <p>
                    This app serves as the shared map and quest board for our campaign. Admins set up the terrain and place quests with start and end points.
                    Players browse available quests, sign up for the ones that interest them, and coordinate a date to play. The map updates in real time as the
                    world is explored and quests are completed.
                </p>
            </Section>

            <Section title="Homebrew Rules">
                <p>
                    Beyond 5.5e standard, these are the only mechanical changes:
                </p>

                <h3 style={{ fontSize: 16, color: "#e8e8f0", marginTop: 20, marginBottom: 8 }}>
                    Natural 20s and 1s
                </h3>
                <ul>
                    <li>
                        <strong>Nat 20 on a check:</strong> +5 to the total (instead of auto-success).
                    </li>
                    <li>
                        <strong>Nat 1 on a check:</strong> &minus;5 to the total (instead of auto-fail).
                    </li>
                    <li>
                        <strong>Nat 20 on a saving throw:</strong> negates all effects.
                    </li>
                    <li>
                        <strong>Nat 1 on a saving throw:</strong> doubles all effects.
                    </li>
                </ul>

                <h3 style={{ fontSize: 16, color: "#e8e8f0", marginTop: 20, marginBottom: 8 }}>
                    Combat
                </h3>
                <ul>
                    <li>
                        <strong>Critical hits:</strong> any attack that beats AC by 10 or more is a critical hit.
                    </li>
                </ul>

                <h3 style={{ fontSize: 16, color: "#e8e8f0", marginTop: 20, marginBottom: 8 }}>
                    Simplified Tracking
                </h3>
                <ul>
                    <li>
                        <strong>Spell components:</strong> only tracking components for spells with a stated material cost.
                    </li>
                    <li>
                        <strong>Encumbrance:</strong> no need to strictly track until someone pushes the limits.
                    </li>
                </ul>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 32 }}>
            <h2
                style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 20,
                    color: "#4ade80",
                    marginBottom: 12,
                }}
            >
                {title}
            </h2>
            {children}
        </div>
    );
}

function ComparisonTable() {
    const rows = [
        ["Schedule", "Players organize sessions as needed", "Fixed weekly/biweekly game night"],
        ["Party", "Different players each session", "Same group every session"],
        ["Story", "Emergent from exploration", "DM-driven narrative arc"],
        ["World", "Shared by all players", "Experienced by one group"],
        ["Sessions", "Self-contained (start and end in town)", "Continuing from last cliffhanger"],
        ["Player count", "Large pool (10-30+)", "Small fixed group (3-6)"],
        ["Direction", "Players choose where to go", "DM guides the plot forward"],
    ];

    return (
        <div style={{ overflowX: "auto" }}>
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                }}
            >
                <thead>
                    <tr>
                        {["", "West Marches", "Traditional Campaign"].map((h) => (
                            <th
                                key={h}
                                style={{
                                    textAlign: "left",
                                    padding: "8px 12px",
                                    borderBottom: "2px solid #2e2e4a",
                                    color: "#9ca3af",
                                    fontWeight: 600,
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                }}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([aspect, wm, trad]) => (
                        <tr key={aspect}>
                            <td
                                style={{
                                    padding: "8px 12px",
                                    borderBottom: "1px solid #1e1e36",
                                    color: "#e8e8f0",
                                    fontWeight: 600,
                                }}
                            >
                                {aspect}
                            </td>
                            <td
                                style={{
                                    padding: "8px 12px",
                                    borderBottom: "1px solid #1e1e36",
                                    color: "#d1d5db",
                                }}
                            >
                                {wm}
                            </td>
                            <td
                                style={{
                                    padding: "8px 12px",
                                    borderBottom: "1px solid #1e1e36",
                                    color: "#6b7280",
                                }}
                            >
                                {trad}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
