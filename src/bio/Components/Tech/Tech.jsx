import React, { useState } from "react";

const yearsSince = (iso) => {
  const start = new Date(iso);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) years--;
  return years;
};

const groups = [
  {
    title: "Proficient In",
    glyphs: [
      { icon: "react-original", label: "React" },
      { icon: "typescript-plain", label: "TypeScript" },
      { icon: "javascript-plain", label: "JavaScript" },
      { icon: "csharp-plain", label: "C#" },
      { icon: "dot-net-plain", label: ".NET" },
      { icon: "postgresql-plain", label: "PostgreSQL" },
      { icon: "html5-plain", label: "HTML5" },
      { icon: "css3-plain", label: "CSS3" },
    ],
  },
  {
    title: "Workflow",
    glyphs: [
      { icon: "git-plain", label: "Git" },
      { icon: "jira-plain", label: "Jira" },
      { icon: "bitbucket-original", label: "Bitbucket" },
      { icon: "confluence-original", label: "Confluence" },
      { icon: "trello-plain", label: "Trello" },
    ],
  },
  {
    title: "Tools & Engines",
    glyphs: [
      { icon: "vscode-plain", label: "VS Code" },
      { icon: "visualstudio-plain", label: "Visual Studio" },
      { icon: "unrealengine-original", label: "Unreal" },
      { icon: "unity-original", label: "Unity" },
    ],
  },
  {
    title: "Familiar With",
    glyphs: [
      { icon: "java-plain", label: "Java" },
      { icon: "python-plain", label: "Python" },
      { icon: "jquery-plain", label: "jQuery" },
      { icon: "express-original", label: "Express" },
      { icon: "redux-original", label: "Redux" },
    ],
  },
];

const Tech = () => {
  const [open, setOpen] = useState(0);
  const years = yearsSince("2020-11-06");

  return (
    <div>
      <p className="tech__lead">
        These arts come from <b>{years}+ years</b> as a software developer at
        Scheels — where I lead the internal team (SIS) in modernizing our
        front-end process — and from my time at Emerging Digital Academy before
        that.
      </p>

      <div className="grimoire">
        {groups.map((g, i) => {
          const isOpen = open === i;
          return (
            <div
              key={g.title}
              className={`tome-entry${isOpen ? " open" : ""}`}
            >
              <button
                className="tome-entry__btn"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
              >
                <span>{g.title}</span>
                <span className="tome-entry__chev">▶</span>
              </button>
              <div className="tome-entry__panel">
                <div className="tome-entry__inner">
                  <div className="glyphs">
                    {g.glyphs.map((gl) => (
                      <span key={gl.label} className="glyph">
                        <i className={`devicon-${gl.icon}`} aria-hidden="true" />
                        {gl.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Tech;
