import { TERRAIN_COLORS } from "../utils/colors";

/**
 * Adjust a hex color's lightness by a percentage. Positive = lighter,
 * negative = darker. Used to derive motif shades from each terrain's base color.
 */
function shade(hex: string, percent: number): string {
  const n = hex.replace("#", "");
  const full =
    n.length === 3
      ? n
          .split("")
          .map((c) => c + c)
          .join("")
      : n;
  let r = parseInt(full.slice(0, 2), 16);
  let g = parseInt(full.slice(2, 4), 16);
  let b = parseInt(full.slice(4, 6), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p) + r;
  g = Math.round((t - g) * p) + g;
  b = Math.round((t - b) * p) + b;
  const to2 = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

const C = TERRAIN_COLORS;

/**
 * One illustrative tiling <pattern> per TerrainType, drawn in userSpaceOnUse
 * so textures tile seamlessly across adjacent hexes of the same terrain.
 * Each pattern id is `terrain-<type>`, referenced by HexTile via fill="url(#...)".
 */
export function TerrainPatterns() {
  return (
    <defs>
      {/* FOREST — clustered pine trees */}
      <pattern
        id="terrain-forest"
        patternUnits="userSpaceOnUse"
        width={24}
        height={24}
      >
        <rect width={24} height={24} fill={C.forest} />
        {[
          { x: 6, y: 8 },
          { x: 17, y: 16 },
          { x: 12, y: 20 },
          { x: 0, y: 20 },
        ].map((t, i) => (
          <g key={i}>
            <polygon
              points={`${t.x},${t.y - 6} ${t.x - 3.2},${t.y} ${t.x + 3.2},${t.y}`}
              fill={shade(C.forest, -22)}
            />
            <polygon
              points={`${t.x},${t.y - 8.5} ${t.x - 2.6},${t.y - 3.5} ${t.x + 2.6},${t.y - 3.5}`}
              fill={shade(C.forest, 12)}
            />
            <rect
              x={t.x - 0.7}
              y={t.y}
              width={1.4}
              height={2}
              fill={shade(C.forest, -40)}
            />
          </g>
        ))}
      </pattern>

      {/* PLAINS — small grass tufts */}
      <pattern
        id="terrain-plains"
        patternUnits="userSpaceOnUse"
        width={11}
        height={11}
      >
        <rect width={11} height={11} fill={C.plains} />
        {[
          { x: 3, y: 5 },
          { x: 8, y: 9 },
        ].map((t, i) => (
          <g key={i} stroke={shade(C.plains, -26)} strokeWidth={0.55} fill="none">
            <path d={`M${t.x} ${t.y} q -0.8 -1.6 -1.4 -2.5`} />
            <path d={`M${t.x} ${t.y} q 0 -1.9 0 -2.8`} />
            <path d={`M${t.x} ${t.y} q 0.8 -1.6 1.4 -2.5`} />
          </g>
        ))}
      </pattern>

      {/* MOUNTAIN — overlapping shaded peaks */}
      <pattern
        id="terrain-mountain"
        patternUnits="userSpaceOnUse"
        width={26}
        height={22}
      >
        <rect width={26} height={22} fill={C.mountain} />
        {[
          { x: 7, y: 18, w: 9, h: 12 },
          { x: 19, y: 20, w: 8, h: 11 },
          { x: 14, y: 12, w: 7, h: 9 },
        ].map((m, i) => (
          <g key={i}>
            {/* peak body */}
            <polygon
              points={`${m.x},${m.y - m.h} ${m.x - m.w},${m.y} ${m.x + m.w},${m.y}`}
              fill={shade(C.mountain, -20)}
            />
            {/* sunlit face */}
            <polygon
              points={`${m.x},${m.y - m.h} ${m.x},${m.y} ${m.x + m.w},${m.y}`}
              fill={shade(C.mountain, 14)}
            />
            {/* snow cap */}
            <polygon
              points={`${m.x},${m.y - m.h} ${m.x - m.w * 0.35},${m.y - m.h * 0.55} ${m.x + m.w * 0.35},${m.y - m.h * 0.55}`}
              fill={shade(C.mountain, 55)}
            />
          </g>
        ))}
      </pattern>

      {/* SWAMP — reeds + murky ripples */}
      <pattern
        id="terrain-swamp"
        patternUnits="userSpaceOnUse"
        width={22}
        height={22}
      >
        <rect width={22} height={22} fill={C.swamp} />
        {/* ripples */}
        {[5, 13].map((y, i) => (
          <path
            key={`r${i}`}
            d={`M0 ${y} q 5 -2 11 0 q 6 2 11 0`}
            stroke={shade(C.swamp, -22)}
            strokeWidth={0.8}
            fill="none"
          />
        ))}
        {/* reeds */}
        {[
          { x: 4, y: 20 },
          { x: 16, y: 18 },
        ].map((t, i) => (
          <g key={`reed${i}`} stroke={shade(C.swamp, 18)} strokeWidth={1} fill="none">
            <path d={`M${t.x} ${t.y} q -1 -6 -2 -9`} />
            <path d={`M${t.x + 2} ${t.y} q 1 -6 2 -8`} />
          </g>
        ))}
      </pattern>

      {/* DESERT — dune ridges + stipple */}
      <pattern
        id="terrain-desert"
        patternUnits="userSpaceOnUse"
        width={26}
        height={20}
      >
        <rect width={26} height={20} fill={C.desert} />
        {[3, 11, 19].map((y, i) => (
          <path
            key={i}
            d={`M0 ${y} q 6.5 -3.5 13 0 q 6.5 3.5 13 0`}
            stroke={shade(C.desert, -18)}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {[
          { x: 6, y: 7 },
          { x: 20, y: 15 },
          { x: 14, y: 4 },
        ].map((d, i) => (
          <circle key={`s${i}`} cx={d.x} cy={d.y} r={0.7} fill={shade(C.desert, -28)} />
        ))}
      </pattern>

      {/* SNOW — pale field w/ drift speckle */}
      <pattern
        id="terrain-snow"
        patternUnits="userSpaceOnUse"
        width={22}
        height={22}
      >
        <rect width={22} height={22} fill={C.snow} />
        {[6, 15].map((y, i) => (
          <path
            key={i}
            d={`M0 ${y} q 5.5 -2 11 0 q 5.5 2 11 0`}
            stroke={shade(C.snow, -12)}
            strokeWidth={0.8}
            fill="none"
          />
        ))}
        {[
          { x: 5, y: 4 },
          { x: 17, y: 10 },
          { x: 10, y: 18 },
          { x: 19, y: 19 },
        ].map((s, i) => (
          <circle key={`sp${i}`} cx={s.x} cy={s.y} r={0.9} fill={shade(C.snow, -18)} />
        ))}
      </pattern>

      {/* WATER — repeating wave crests */}
      <pattern
        id="terrain-water"
        patternUnits="userSpaceOnUse"
        width={22}
        height={14}
      >
        <rect width={22} height={14} fill={C.water} />
        {[3, 9].map((y, i) => (
          <path
            key={i}
            d={`M0 ${y} q 5.5 -3 11 0 q 5.5 3 11 0`}
            stroke={shade(C.water, i === 0 ? 28 : -18)}
            strokeWidth={1}
            fill="none"
          />
        ))}
      </pattern>

      {/* UNKNOWN — near-flat fog with faint noise */}
      <pattern
        id="terrain-unknown"
        patternUnits="userSpaceOnUse"
        width={16}
        height={16}
      >
        <rect width={16} height={16} fill={C.unknown} />
        {[
          { x: 4, y: 5 },
          { x: 12, y: 11 },
        ].map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={0.8} fill={shade(C.unknown, 12)} />
        ))}
      </pattern>
    </defs>
  );
}
