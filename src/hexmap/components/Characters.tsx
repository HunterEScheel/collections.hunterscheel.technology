export function Characters() {
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
                Characters
            </h1>

            <Section title="Character Creation">
                <ul>
                    <li>
                        All characters start at <strong>level 1</strong>.
                    </li>
                    <li>
                        <strong>Ability scores:</strong> roll <strong>4d6 drop lowest</strong> three times — those are 3 of your stats. The other 3 stats are
                        each derived by the mirror formula <strong>22 &minus; roll</strong>, pairing with one of your rolled values so each pair averages 11.
                        You then <strong>assign the 6 numbers to STR, DEX, CON, INT, WIS, CHA in whatever order you choose</strong>.
                    </li>
                    <li>
                        Use <strong>standard equipment</strong> from your class and background, plus <strong>10 gold</strong> starting money.
                    </li>
                    <li>
                        <strong>Official content only</strong> for all mechanical choices — races, classes, subclasses, spells, feats, and items must come from
                        published D&amp;D 5e sourcebooks (PHB, XGtE, TCoE, etc.).
                    </li>
                    <li>
                        You are free to <strong>reflavor</strong> anything you like. Rename spells, reskin your weapon's appearance, give your race a custom
                        origin story — as long as the <strong>mechanics stay unchanged</strong>, the flavor is yours.
                    </li>
                    <li>
                        <strong>Flavor caveat — no gunpowder.</strong> The setting is pre-gunpowder, so firearms, cannons, and the like don't exist in-world.
                        If you'd otherwise pick up a Musket or Pistol from a sourcebook, reflavor it as a crossbow, sling, blowgun, or other thrown/drawn weapon
                        of equivalent stats.
                    </li>
                </ul>
            </Section>

            <Section title="Leveling Up">
                <p>
                    This campaign uses <strong>standard 5e XP thresholds</strong> for leveling. XP is earned from completing quests and encounters.
                </p>
            </Section>

            <Section title="Downtime">
                <p>
                    Between sessions, your character can spend each day doing <strong>one</strong> of the following:
                </p>
                <ul>
                    <li>
                        <strong>Train</strong> — work toward proficiency in a tool or language. It takes <strong>60 days</strong> to gain proficiency. Each day
                        you train with a professional counts for 2 days. Training with a professional costs <strong>1 gp per day</strong>. Self-taught training
                        is possible if materials are available, but takes twice as long. Downtime days do not need to be consecutive.
                    </li>
                    <li>
                        <strong>Shop</strong> — cost depends on what you buy. A list will be available after the first session.
                    </li>
                </ul>
            </Section>

            <Section title="Death and Replacements">
                <ul>
                    <li>
                        The Holdfast can cast <strong>Revivify</strong> on a body that is still in condition to be revived.
                    </li>
                    <li>
                        Replacement PCs start at <strong>level 1</strong> by default. This may change later.
                    </li>
                    <li>
                        <strong>Entering play:</strong> your new character walked into the Holdfast looking for work. It's a refugee town. Nobody asks
                        questions.
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

