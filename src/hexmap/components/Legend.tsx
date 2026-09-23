import { useState } from "react";
import {
  TERRAIN_COLORS,
  TERRAIN_LABELS,
  QUEST_LEVEL_COLORS,
  QUEST_LEVEL_LABELS,
} from "../utils/colors";
import { LandmarkIcon } from "./LandmarkIcon";
import { hexPointsString, HEX_SIZE } from "../utils/hexMath";
import type { TerrainType, QuestLevel, Landmark } from "../types";

const TERRAIN_TYPES: TerrainType[] = [
  "forest",
  "plains",
  "mountain",
  "swamp",
  "desert",
  "snow",
  "water",
  "unknown",
];

const QUEST_LEVELS: QuestLevel[] = [
  "explore",
  "recurring",
  "wolf",
  "demon",
  "dragon",
  "terrasque",
  "god",
];

const LANDMARKS: { key: Landmark; label: string }[] = [
  { key: "village", label: "Village" },
  { key: "allied_city", label: "Allied City" },
  { key: "unallied_city", label: "Unallied City" },
  { key: "dungeon", label: "Dungeon" },
  { key: "ruins", label: "Ruins" },
  { key: "tower", label: "Tower" },
  { key: "major_threat", label: "Major Threat" },
];

interface LegendProps {
  isMobile?: boolean;
  sidePanelOpen?: boolean;
}

export function Legend({ isMobile = false, sidePanelOpen = true }: LegendProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Legend lives in the map area. On desktop with the side panel open, scoot
  // left so it doesn't sit under the reopen tab. Otherwise hug the right edge.
  const rightOffset = !sidePanelOpen ? 44 : isMobile ? 16 : 16;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: rightOffset,
        zIndex: 100,
      }}
    >
      {isOpen ? (
        <div
          style={{
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            borderRadius: 8,
            padding: 12,
            minWidth: 180,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ color: "#e8e8f0", fontSize: 13, fontWeight: 600 }}>
              Legend
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          <div style={{ marginBottom: 10 }}>
            <span style={{ color: "#9ca3af", fontSize: 11, display: "block", marginBottom: 4 }}>
              Terrain
            </span>
            {TERRAIN_TYPES.map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: TERRAIN_COLORS[t],
                  }}
                />
                <span style={{ color: "#d1d5db", fontSize: 12 }}>
                  {TERRAIN_LABELS[t]}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <span style={{ color: "#9ca3af", fontSize: 11, display: "block", marginBottom: 4 }}>
              Landmark
            </span>
            {LANDMARKS.map(({ key, label }) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <svg
                  viewBox={`${-HEX_SIZE} ${-HEX_SIZE} ${HEX_SIZE * 2} ${HEX_SIZE * 2}`}
                  width={16}
                  height={16}
                  aria-hidden
                >
                  <polygon
                    points={hexPointsString(0, 0)}
                    fill="#2e2e4a"
                    opacity={0.4}
                  />
                  <LandmarkIcon col={0} row={0} landmark={key} />
                </svg>
                <span style={{ color: "#d1d5db", fontSize: 12 }}>{label}</span>
              </div>
            ))}
          </div>

          <div>
            <span style={{ color: "#9ca3af", fontSize: 11, display: "block", marginBottom: 4 }}>
              Quest Level
            </span>
            {QUEST_LEVELS.map((l) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: QUEST_LEVEL_COLORS[l],
                  }}
                />
                <span style={{ color: "#d1d5db", fontSize: 12 }}>
                  {QUEST_LEVEL_LABELS[l]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            borderRadius: 6,
            padding: "6px 12px",
            color: "#9ca3af",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Legend
        </button>
      )}
    </div>
  );
}
