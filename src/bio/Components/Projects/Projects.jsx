import React from "react";

const featured = [
  {
    seal: "S",
    name: "scheels.quest",
    url: "https://scheels.quest",
    blurb:
      "A campaign management tool for the Dungeons & Dragons campaign I run with folks from work. It keeps the whole table in sync — characters, quests, sessions, and lore — so the story never slips between the cracks.",
    tags: ["D&D", "Campaign Tools", "Full-Stack"],
  },
  {
    seal: "Æ",
    name: "adaptiveedge.quest",
    url: "https://adaptiveedge.quest",
    blurb:
      "A character creator for my own from-scratch tabletop RPG system — a homebrew ruleset loosely drawn from the bones of D&D, GURPS, and Ars Magica. Build, balance, and bring characters to life under rules I designed myself.",
    tags: ["Original RPG", "Character Builder", "Systems Design"],
  },
];

const archives = [
  {
    name: "Scheels NPM Packages",
    url: "https://www.npmjs.com/~jaegerscheel",
    blurb:
      "Components, templates, and utility functions I publish and maintain for internal Scheels applications — from dropdowns to new-project scaffolding to value-guarding helpers.",
  },
  {
    name: "Practice Manager",
    url: "https://github.com/hunterEdward98/Practice-Manager",
    blurb:
      "My capstone solo project at EDA: a tool for swim teams to track times and progress, with role-based access for owners, coaches, and swimmers.",
  },
  {
    name: "60-Word Race",
    url: "https://github.com/hunterEdward98/60-word-race",
    blurb:
      "My first major React app — a competitive typing game built to sharpen my own speed against a 60-word gauntlet and a ticking clock.",
  },
  {
    name: "GileadMD",
    url: null,
    blurb:
      "A hospital records system for clinics and small hospitals in Zimbabwe — a passion project built with my colleague Clever Mukori. (Private repository.)",
  },
];

const Projects = () => {
  return (
    <div>
      <div className="featured">
        {featured.map((p) => (
          <article key={p.name} className="tome">
            <div className="tome__seal" aria-hidden="true">
              {p.seal}
            </div>
            <h3 className="tome__name">{p.name}</h3>
            <div className="tome__url">{p.url.replace("https://", "")}</div>
            <p className="tome__body">{p.blurb}</p>
            <div className="tome__tags">
              {p.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <a
              className="tome__enter"
              href={p.url}
              target="_blank"
              rel="noreferrer"
            >
              Enter →
            </a>
          </article>
        ))}
      </div>

      <h3 className="archives__title">The Archives</h3>
      <p className="archives__note">
        Older bindings and earlier conjurings. Most of my recent work lives in
        private Scheels repositories; the links below lead to public records.
      </p>
      <div className="archive-grid">
        {archives.map((a) => (
          <div key={a.name} className="relic">
            <h4>{a.name}</h4>
            <p>
              {a.blurb}
              {a.url && (
                <>
                  {" "}
                  <a href={a.url} target="_blank" rel="noreferrer">
                    View →
                  </a>
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      <a
        className="scroll-on"
        href="https://github.com/hunterEdward98"
        target="_blank"
        rel="noreferrer"
      >
        See more on GitHub
      </a>
    </div>
  );
};

export default Projects;
