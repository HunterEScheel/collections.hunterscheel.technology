import React from "react";
import Pdf from "./files/Hunter_Scheel_Resume.pdf";

const skills = [
  {
    level: "Advanced",
    items: "TypeScript / JavaScript · React, Redux & Sagas",
  },
  { level: "Advanced", items: "C# with .NET Core & .NET Framework" },
  { level: "Advanced", items: "SQL with Postgres & DB2" },
  {
    level: "Working Knowledge",
    items: "Java · jQuery · HTML · CSS · Python · BASH",
  },
];

const education = [
  {
    school: "Emerging Prairie Digital Academy",
    when: "Apr 2020 – Aug 2020",
    points: [
      "Practiced real-world skills including project communication and task prioritization.",
      "Built full-stack web applications on a modern PERN stack.",
    ],
  },
  {
    school: "North Dakota State University",
    when: "Aug 2017 – May 2018",
    points: [
      "Member of the Cybersecurity Student Association.",
      "Competed in the National Cyber League Fall 2018 & Spring 2019 team competitions.",
    ],
  },
];

const work = [
  {
    role: "Software Developer",
    org: "Scheels",
    when: "Nov 2020 – Present",
    points: [
      "Lead the internal development team (SIS) in modernizing web applications for stability and readability.",
      "Provide timely solutions when the team is blocked by development or workflow issues.",
      "Author, publish, and maintain reusable components, functions, and project templates on NPM to cut setup time for new applications.",
      "Lead code reviews focused on TypeScript and React best practices, giving specific, actionable feedback.",
    ],
  },
  {
    role: "Lifeguard",
    org: "Fargo Park District",
    when: "Jun 2016 – Aug 2020",
    points: [
      "Coordinated emergency personnel and provided continuous care until authorities arrived.",
      "Maintained proficiency in first-responder skills including First Aid and CPR.",
    ],
  },
];

export default function Resume() {
  return (
    <div>
      <div className="resume__actions">
        <a
          className="scroll-on"
          style={{ margin: 0 }}
          href={Pdf}
          target="_blank"
          rel="noreferrer"
        >
          View PDF
        </a>
      </div>

      <div className="vellum resume">
        <header className="resume__header">
          <h3>Hunter Scheel</h3>
          <div className="resume__contacts">
            Fargo, ND
            <br />
            <a href="mailto:hunter.scheel@outlook.com">
              hunter.scheel@outlook.com
            </a>
            <br />
            <a
              href="https://www.linkedin.com/in/hunter-e-scheel"
              target="_blank"
              rel="noreferrer"
            >
              linkedin.com/in/hunter-e-scheel
            </a>
          </div>
        </header>

        <div className="resume__block">
          <h4>Professional Summary</h4>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Ready to bring relevant knowledge and skills to any team. Well-versed
            in team-building techniques with excellent problem-solving and coding
            skills.
          </p>
        </div>

        <div className="resume__block">
          <h4>Skills</h4>
          <div className="skill-rows">
            {skills.map((s, i) => (
              <div key={i}>
                <strong>{s.level}</strong>
                <p>{s.items}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="resume__block">
          <h4>Work History</h4>
          {work.map((w) => (
            <div className="entry" key={w.role + w.org}>
              <div className="entry__top">
                <p className="entry__role">{w.role}</p>
                <span className="entry__when">{w.when}</span>
              </div>
              <div className="entry__org">{w.org}</div>
              <ul>
                {w.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="resume__block">
          <h4>Education</h4>
          {education.map((e) => (
            <div className="entry" key={e.school}>
              <div className="entry__top">
                <p className="entry__role">{e.school}</p>
                <span className="entry__when">{e.when}</span>
              </div>
              <ul>
                {e.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
