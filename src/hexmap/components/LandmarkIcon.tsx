import { hexToPixel, HEX_SIZE } from "../utils/hexMath";
import type { Landmark } from "../types";

interface LandmarkIconProps {
  col: number;
  row: number;
  landmark: Landmark;
  /** Optional override; defaults to HEX_SIZE * 0.5 (icon half-width). */
  size?: number;
}

/**
 * Draws a simple line-art icon for a hex landmark, centered on the hex.
 * Rendered between the hex fill and the quest-pin layer so pins always
 * stack on top.
 */
export function LandmarkIcon({
  col,
  row,
  landmark,
  size = HEX_SIZE * 0.5,
}: LandmarkIconProps) {
  const { x: cx, y: cy } = hexToPixel(col, row);
  const s = size;

  switch (landmark) {
    case "village":
      // A small thatched house: brown roof, cream walls, dark door.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          <path
            d={`M ${-s * 0.85},${-s * 0.05} L 0,${-s * 0.75} L ${s * 0.85},${-s * 0.05} Z`}
            fill="#7c2d12"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <rect
            x={-s * 0.65}
            y={-s * 0.05}
            width={s * 1.3}
            height={s * 0.7}
            fill="#fde68a"
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          <rect
            x={-s * 0.15}
            y={s * 0.25}
            width={s * 0.3}
            height={s * 0.4}
            fill="#1a1a2e"
          />
        </g>
      );

    case "dungeon":
      // A stone archway with a black interior.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          <path
            d={`M ${-s * 0.7},${s * 0.65}
                L ${-s * 0.7},${-s * 0.15}
                A ${s * 0.7},${s * 0.7} 0 0,1 ${s * 0.7},${-s * 0.15}
                L ${s * 0.7},${s * 0.65} Z`}
            fill="#6b7280"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path
            d={`M ${-s * 0.4},${s * 0.65}
                L ${-s * 0.4},${0}
                A ${s * 0.4},${s * 0.4} 0 0,1 ${s * 0.4},${0}
                L ${s * 0.4},${s * 0.65} Z`}
            fill="#0a0a0a"
          />
          {/* Keystone */}
          <rect
            x={-s * 0.08}
            y={-s * 0.5}
            width={s * 0.16}
            height={s * 0.18}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={0.5}
          />
        </g>
      );

    case "ruins":
      // Two broken stone columns of differing heights with jagged tops.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          <path
            d={`M ${-s * 0.7},${s * 0.65}
                L ${-s * 0.7},${-s * 0.45}
                L ${-s * 0.55},${-s * 0.25}
                L ${-s * 0.4},${-s * 0.6}
                L ${-s * 0.25},${-s * 0.3}
                L ${-s * 0.15},${-s * 0.5}
                L ${-s * 0.15},${s * 0.65} Z`}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path
            d={`M ${s * 0.15},${s * 0.65}
                L ${s * 0.15},${-s * 0.1}
                L ${s * 0.3},${-s * 0.3}
                L ${s * 0.45},${0}
                L ${s * 0.6},${-s * 0.25}
                L ${s * 0.7},${-s * 0.05}
                L ${s * 0.7},${s * 0.65} Z`}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </g>
      );

    case "tower":
      // Tall narrow tower with battlements on top, single window, door.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          {/* Body */}
          <rect
            x={-s * 0.4}
            y={-s * 0.55}
            width={s * 0.8}
            height={s * 1.2}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          {/* Battlements */}
          <path
            d={`M ${-s * 0.5},${-s * 0.55}
                L ${-s * 0.5},${-s * 0.8}
                L ${-s * 0.28},${-s * 0.8}
                L ${-s * 0.28},${-s * 0.65}
                L ${-s * 0.1},${-s * 0.65}
                L ${-s * 0.1},${-s * 0.8}
                L ${s * 0.1},${-s * 0.8}
                L ${s * 0.1},${-s * 0.65}
                L ${s * 0.28},${-s * 0.65}
                L ${s * 0.28},${-s * 0.8}
                L ${s * 0.5},${-s * 0.8}
                L ${s * 0.5},${-s * 0.55} Z`}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="miter"
          />
          {/* Window */}
          <rect
            x={-s * 0.09}
            y={-s * 0.3}
            width={s * 0.18}
            height={s * 0.22}
            fill="#1a1a2e"
          />
          {/* Door */}
          <rect
            x={-s * 0.13}
            y={s * 0.25}
            width={s * 0.26}
            height={s * 0.4}
            fill="#1a1a2e"
          />
        </g>
      );

    case "allied_city":
    case "unallied_city": {
      // Walled city: stone walls + two square towers, banner on the keep.
      // Allied = gold banner on cream stone; unallied = crimson banner on dark stone.
      const allied = landmark === "allied_city";
      const stoneFill = allied ? "#fde68a" : "#4b5563";
      const stoneStroke = "#1a1a2e";
      const bannerFill = allied ? "#d4a017" : "#7f1d1d";
      const trimFill = allied ? "#92400e" : "#0a0a0a";
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          {/* Main wall body */}
          <rect
            x={-s * 0.8}
            y={-s * 0.25}
            width={s * 1.6}
            height={s * 0.85}
            fill={stoneFill}
            stroke={stoneStroke}
            strokeWidth={1}
          />
          {/* Left tower */}
          <rect
            x={-s * 0.85}
            y={-s * 0.55}
            width={s * 0.35}
            height={s * 1.15}
            fill={stoneFill}
            stroke={stoneStroke}
            strokeWidth={1}
          />
          {/* Right tower */}
          <rect
            x={s * 0.5}
            y={-s * 0.55}
            width={s * 0.35}
            height={s * 1.15}
            fill={stoneFill}
            stroke={stoneStroke}
            strokeWidth={1}
          />
          {/* Central keep (taller than walls) */}
          <rect
            x={-s * 0.2}
            y={-s * 0.7}
            width={s * 0.4}
            height={s * 0.5}
            fill={stoneFill}
            stroke={stoneStroke}
            strokeWidth={1}
          />
          {/* Battlements: 3 merlons across the front wall */}
          <path
            d={`M ${-s * 0.5},${-s * 0.25}
                L ${-s * 0.5},${-s * 0.4}
                L ${-s * 0.3},${-s * 0.4}
                L ${-s * 0.3},${-s * 0.28}
                L ${-s * 0.1},${-s * 0.28}
                L ${-s * 0.1},${-s * 0.4}
                L ${s * 0.1},${-s * 0.4}
                L ${s * 0.1},${-s * 0.28}
                L ${s * 0.3},${-s * 0.28}
                L ${s * 0.3},${-s * 0.4}
                L ${s * 0.5},${-s * 0.4}
                L ${s * 0.5},${-s * 0.25} Z`}
            fill={stoneFill}
            stroke={stoneStroke}
            strokeWidth={1}
          />
          {/* Banner pole + flag on the central keep */}
          <line
            x1={0}
            y1={-s * 0.7}
            x2={0}
            y2={-s * 1.05}
            stroke={trimFill}
            strokeWidth={1}
          />
          <path
            d={`M 0,${-s * 1.05} L ${s * 0.3},${-s * 0.95} L 0,${-s * 0.85} Z`}
            fill={bannerFill}
            stroke={stoneStroke}
            strokeWidth={0.5}
          />
          {/* Gate */}
          <path
            d={`M ${-s * 0.1},${s * 0.6}
                L ${-s * 0.1},${s * 0.3}
                A ${s * 0.1},${s * 0.1} 0 0,1 ${s * 0.1},${s * 0.3}
                L ${s * 0.1},${s * 0.6} Z`}
            fill={trimFill}
          />
        </g>
      );
    }

    case "major_threat":
      // Skull on a dark red disc — universal "here be dragons".
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          {/* Threat halo */}
          <circle
            cx={0}
            cy={0}
            r={s * 0.95}
            fill="#7f1d1d"
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          {/* Cranium */}
          <path
            d={`M ${-s * 0.55},${-s * 0.1}
                Q ${-s * 0.55},${-s * 0.7} 0,${-s * 0.7}
                Q ${s * 0.55},${-s * 0.7} ${s * 0.55},${-s * 0.1}
                Q ${s * 0.55},${s * 0.2} ${s * 0.3},${s * 0.25}
                L ${s * 0.3},${s * 0.45}
                L ${-s * 0.3},${s * 0.45}
                L ${-s * 0.3},${s * 0.25}
                Q ${-s * 0.55},${s * 0.2} ${-s * 0.55},${-s * 0.1} Z`}
            fill="#f3f4f6"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          {/* Left eye socket */}
          <ellipse
            cx={-s * 0.22}
            cy={-s * 0.2}
            rx={s * 0.17}
            ry={s * 0.18}
            fill="#0a0a0a"
          />
          {/* Right eye socket */}
          <ellipse
            cx={s * 0.22}
            cy={-s * 0.2}
            rx={s * 0.17}
            ry={s * 0.18}
            fill="#0a0a0a"
          />
          {/* Nose */}
          <path
            d={`M 0,${-s * 0.02} L ${-s * 0.07},${s * 0.15} L ${s * 0.07},${s * 0.15} Z`}
            fill="#0a0a0a"
          />
          {/* Teeth */}
          <line
            x1={-s * 0.18}
            y1={s * 0.27}
            x2={-s * 0.18}
            y2={s * 0.45}
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={s * 0.27}
            x2={0}
            y2={s * 0.45}
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          <line
            x1={s * 0.18}
            y1={s * 0.27}
            x2={s * 0.18}
            y2={s * 0.45}
            stroke="#1a1a2e"
            strokeWidth={1}
          />
        </g>
      );

    default:
      return null;
  }
}
