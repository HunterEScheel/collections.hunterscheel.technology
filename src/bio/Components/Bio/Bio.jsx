import React from "react";

const Bio = () => {
  return (
    <div className="vellum bio__grid">
      <div className="passage">
        <h3 className="passage__head">Early Influence</h3>
        <p className="dropcap">
          Born in Fargo, ND, I had an unmistakable pull toward computers for as
          long as I can remember. Since middle school I've been picking apart how
          coding languages work — starting, as so many do, with HTML. In high
          school an introduction-to-Java course sealed it: programming would be
          my craft.
        </p>
      </div>

      <div className="passage">
        <h3 className="passage__head">Recent Years</h3>
        <p className="dropcap">
          In college I joined the Cybersecurity Student Association, sharpening
          my skills in collaborative competitions like the National Cyber League.
          After two years at NDSU I decided the traditional route wasn't for me
          and enrolled at Emerging Digital Academy. Since 2020 I've spent more
          than five years as a software developer at Scheels, leading the
          internal team in modernizing our front-end practice — and in my own
          time I design and build complete tabletop RPG systems from the ground
          up.
        </p>
      </div>
    </div>
  );
};

export default Bio;
