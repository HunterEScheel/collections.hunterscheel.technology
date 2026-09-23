import React from "react";
import headshot from "../../Hunter3.opt.jpg";
import Bio from "../Bio/Bio";
import Projects from "../Projects/Projects";
import Tech from "../Tech/Tech";
import Resume from "../Resume/Resume";

const NAV = [
  { id: "chronicle", label: "Chronicle" },
  { id: "works", label: "Works" },
  { id: "arts", label: "Arts" },
  { id: "codex", label: "Codex" },
  { id: "summon", label: "Summon" },
];

const Diamond = () => (
  <div className="filigree" aria-hidden="true">
    <span>◆</span>
  </div>
);

export default function App() {
  return (
    <div className="codex">
      <nav className="ribbon">
        <a href="#top" className="ribbon__mark">
          Hunter Scheel
        </a>
        <div className="ribbon__links">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`}>
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      <header id="top" className="hero leaf">
        <p className="hero__sigil reveal d1">// codex of a software developer</p>
        <img
          src={headshot}
          alt="Hunter Scheel"
          className="hero__portrait reveal d2"
        />
        <h1 className="hero__name reveal d3">
          Hunter <span>Scheel</span>
        </h1>
        <p className="hero__tagline reveal d4">
          Software developer by trade, world-builder by candlelight — I craft
          web applications by day and forge entire tabletop systems by night.
        </p>
        <div className="hero__roles reveal d5">
          <span>React &amp; .NET</span>
          <span>Systems Design</span>
          <span>Game Maker</span>
        </div>
      </header>

      <main className="leaf">
        <section id="chronicle" className="section">
          <span className="section__eyebrow">Liber Primus</span>
          <h2 className="section__title">The Chronicle</h2>
          <Diamond />
          <Bio />
        </section>

        <section id="works" className="section">
          <span className="section__eyebrow">Liber Secundus</span>
          <h2 className="section__title">Works &amp; Wonders</h2>
          <Diamond />
          <Projects />
        </section>

        <section id="arts" className="section">
          <span className="section__eyebrow">Liber Tertius</span>
          <h2 className="section__title">The Arcane Arts</h2>
          <Diamond />
          <Tech />
        </section>

        <section id="codex" className="section">
          <span className="section__eyebrow">Liber Quartus</span>
          <h2 className="section__title">The Full Codex</h2>
          <Diamond />
          <Resume />
        </section>
      </main>

      <footer id="summon" className="contact leaf">
        <span className="section__eyebrow">Colophon</span>
        <h2 className="section__title">Summon the Author</h2>
        <Diamond />
        <p className="hero__tagline">
          Whether you seek a developer for your guild or a fellow traveler for
          the table — send word.
        </p>
        <div className="contact__links">
          <a href="mailto:hunter.scheel@outlook.com">Email</a>
          <a
            href="https://www.linkedin.com/in/hunter-e-scheel"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/hunterEdward98"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/~jaegerscheel"
            target="_blank"
            rel="noreferrer"
          >
            NPM
          </a>
          <a href="https://scheels.quest" target="_blank" rel="noreferrer">
            scheels.quest
          </a>
          <a href="https://adaptiveedge.quest" target="_blank" rel="noreferrer">
            adaptiveedge.quest
          </a>
        </div>
        <p className="colophon">
          Inscribed in Fargo, ND · Built with React &amp; Vite · MMXXVI
        </p>
      </footer>
    </div>
  );
}
