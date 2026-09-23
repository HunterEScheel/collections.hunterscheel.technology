export function World() {
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
                    marginBottom: 8,
                    color: "#e8e8f0",
                }}
            >
                Age of Ash
            </h1>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
                The era leading up to King Malrik Vaeltheran's unification. Surviving the night is the highest form of
                statecraft. Malrik hopes to change that, and he's paying you to help.
            </p>

            <Section title="Overview">
                <p>
                    What mortals call a "nation" rarely means more than one to three towns bound by an oath of mutual
                    defense. Civilization has retreated. The roads that may have once existed between settlements are now
                    the territory of monsters. Most "kings" rule a single market square and a militia of fifty.
                </p>
            </Section>

            <Section title="Common Patterns">
                <ul>
                    <li>
                        <strong>Triad structure:</strong> Most proto-nations are 1–3 towns within a few days' travel,
                        bound by oaths of mutual aid. Larger associations can't be defended; smaller ones can't survive a
                        determined raid.
                    </li>
                    <li>
                        <strong>Wall-first economy:</strong> Stone, timber, and ironwork are diverted to fortifications.
                        Architecture is utilitarian. Beauty is reserved for the inner sanctums of temples and longhouses.
                    </li>
                    <li>
                        <strong>Hereditary watchmen:</strong> Many proto-nations pass defense duty down family lines. The
                        militia is the nobility.
                    </li>
                    <li>
                        <strong>Hostage exchange:</strong> Common between allied proto-nations to enforce loyalty.
                        Children of leaders are fostered with neighbors.
                    </li>
                </ul>
            </Section>

            <Section title="Why Society Hasn't United">
                <ul>
                    <li>
                        <strong>Religion:</strong> Most proto-nations worship local hearth-gods or their own pantheon.
                        Merging meant subordinating your god to theirs.
                    </li>
                    <li>
                        <strong>Distance defended:</strong> A larger territory needs more soldiers patrolling more roads.
                        The math rarely works. Two allied towns can hold a pass; three allied towns lose their flanks.
                    </li>
                    <li>
                        <strong>Monster truces:</strong> Several proto-regions have a truce with a nearby beast-tyrant
                        — a wyvern queen, a lich, a wood-thing. Merging would provoke the truce-holder's wrath.
                    </li>
                </ul>
            </Section>

            <Section title="Active Gods">
                <p>
                    The full list is not known. Worship is local — each proto-nation has its own hearth-gods and
                    unrationalized regional spirits.
                </p>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{ marginBottom: 28 }}>
            <h2
                style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 20,
                    color: "#c084fc",
                    marginBottom: 10,
                    borderBottom: "1px solid #2e2e4a",
                    paddingBottom: 6,
                }}
            >
                {title}
            </h2>
            {children}
        </section>
    );
}
