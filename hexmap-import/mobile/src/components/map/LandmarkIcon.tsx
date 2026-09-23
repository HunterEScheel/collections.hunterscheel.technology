// Port of web LandmarkIcon — simple SVG line art per landmark type,
// centered on the hex center.
import { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import type { Landmark } from "../../types";
import { HEX_SIZE, hexToPixel } from "../../utils/hexMath";

interface LandmarkIconProps {
  col: number;
  row: number;
  landmark: Landmark;
  size?: number;
}

export function LandmarkIcon({
  col,
  row,
  landmark,
  size = HEX_SIZE * 0.5,
}: LandmarkIconProps) {
  const { x, y } = hexToPixel(col, row);
  const s = size;

  switch (landmark) {
    case "village":
      return (
        <G x={x} y={y}>
          <Rect x={-s * 0.5} y={-s * 0.1} width={s} height={s * 0.6} fill="#fde68a" />
          <Polygon
            points={`${-s * 0.65},${-s * 0.1} 0,${-s * 0.7} ${s * 0.65},${-s * 0.1}`}
            fill="#7c2d12"
          />
          <Rect x={-s * 0.12} y={s * 0.15} width={s * 0.24} height={s * 0.35} fill="#1a1a2e" />
        </G>
      );
    case "dungeon":
      return (
        <G x={x} y={y}>
          <Path
            d={`M ${-s * 0.55} ${s * 0.5} L ${-s * 0.55} 0 A ${s * 0.55} ${s * 0.55} 0 0 1 ${s * 0.55} 0 L ${s * 0.55} ${s * 0.5} Z`}
            fill="#6b7280"
          />
          <Path
            d={`M ${-s * 0.3} ${s * 0.5} L ${-s * 0.3} ${s * 0.05} A ${s * 0.3} ${s * 0.3} 0 0 1 ${s * 0.3} ${s * 0.05} L ${s * 0.3} ${s * 0.5} Z`}
            fill="#0a0a0a"
          />
          <Rect x={-s * 0.1} y={-s * 0.62} width={s * 0.2} height={s * 0.15} fill="#9ca3af" />
        </G>
      );
    case "ruins":
      return (
        <G x={x} y={y}>
          <Polygon
            points={`${-s * 0.5},${s * 0.5} ${-s * 0.5},${-s * 0.3} ${-s * 0.3},${-s * 0.45} ${-s * 0.25},${-s * 0.1} ${-s * 0.15},${s * 0.5}`}
            fill="#9ca3af"
          />
          <Polygon
            points={`${s * 0.1},${s * 0.5} ${s * 0.12},${-s * 0.15} ${s * 0.3},${-s * 0.28} ${s * 0.42},${s * 0.05} ${s * 0.45},${s * 0.5}`}
            fill="#9ca3af"
          />
        </G>
      );
    case "tower":
      return (
        <G x={x} y={y}>
          <Rect x={-s * 0.25} y={-s * 0.55} width={s * 0.5} height={s * 1.05} fill="#9ca3af" />
          <Rect x={-s * 0.35} y={-s * 0.7} width={s * 0.18} height={s * 0.18} fill="#9ca3af" />
          <Rect x={-s * 0.09} y={-s * 0.7} width={s * 0.18} height={s * 0.18} fill="#9ca3af" />
          <Rect x={s * 0.17} y={-s * 0.7} width={s * 0.18} height={s * 0.18} fill="#9ca3af" />
          <Rect x={-s * 0.07} y={-s * 0.3} width={s * 0.14} height={s * 0.2} fill="#1a1a2e" />
          <Rect x={-s * 0.1} y={s * 0.2} width={s * 0.2} height={s * 0.3} fill="#1a1a2e" />
        </G>
      );
    case "major_threat":
      return (
        <G x={x} y={y}>
          <Circle r={s * 0.7} fill="#7f1d1d" />
          <Circle cy={-s * 0.08} r={s * 0.42} fill="#f3f4f6" />
          <Rect x={-s * 0.3} y={s * 0.1} width={s * 0.6} height={s * 0.28} rx={s * 0.08} fill="#f3f4f6" />
          <Circle cx={-s * 0.16} cy={-s * 0.12} r={s * 0.11} fill="#0a0a0a" />
          <Circle cx={s * 0.16} cy={-s * 0.12} r={s * 0.11} fill="#0a0a0a" />
          <Polygon
            points={`0,${s * 0.02} ${-s * 0.06},${s * 0.14} ${s * 0.06},${s * 0.14}`}
            fill="#0a0a0a"
          />
          <Line x1={-s * 0.12} y1={s * 0.22} x2={-s * 0.12} y2={s * 0.36} stroke="#0a0a0a" strokeWidth={1} />
          <Line x1={0} y1={s * 0.22} x2={0} y2={s * 0.36} stroke="#0a0a0a" strokeWidth={1} />
          <Line x1={s * 0.12} y1={s * 0.22} x2={s * 0.12} y2={s * 0.36} stroke="#0a0a0a" strokeWidth={1} />
        </G>
      );
    case "allied_city":
    case "unallied_city": {
      const allied = landmark === "allied_city";
      const stone = allied ? "#fde68a" : "#4b5563";
      const banner = allied ? "#d4a017" : "#7f1d1d";
      const trim = allied ? "#92400e" : "#0a0a0a";
      return (
        <G x={x} y={y}>
          <Rect x={-s * 0.7} y={-s * 0.05} width={s * 1.4} height={s * 0.55} fill={stone} stroke={trim} strokeWidth={0.5} />
          <Rect x={-s * 0.7} y={-s * 0.4} width={s * 0.25} height={s * 0.9} fill={stone} stroke={trim} strokeWidth={0.5} />
          <Rect x={s * 0.45} y={-s * 0.4} width={s * 0.25} height={s * 0.9} fill={stone} stroke={trim} strokeWidth={0.5} />
          <Rect x={-s * 0.18} y={-s * 0.55} width={s * 0.36} height={s * 1.05} fill={stone} stroke={trim} strokeWidth={0.5} />
          <Polygon points={`0,${-s * 0.95} ${-s * 0.14},${-s * 0.55} ${s * 0.14},${-s * 0.55}`} fill={banner} />
          <Rect x={-s * 0.1} y={s * 0.15} width={s * 0.2} height={s * 0.35} fill={trim} />
        </G>
      );
    }
    default:
      return null;
  }
}
