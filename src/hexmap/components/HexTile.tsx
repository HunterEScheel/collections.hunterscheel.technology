import { hexPointsString } from "../utils/hexMath";
import type { TerrainType } from "../types";

interface HexTileProps {
  col: number;
  row: number;
  terrain: TerrainType;
  onClick: (col: number, row: number) => void;
}

export function HexTile({ col, row, terrain, onClick }: HexTileProps) {
  const points = hexPointsString(col, row);

  return (
    <polygon
      points={points}
      fill={`url(#terrain-${terrain})`}
      stroke="#1a1a2e"
      strokeWidth={1}
      className="hex-hover"
      onClick={() => onClick(col, row)}
      style={{ cursor: "pointer" }}
    />
  );
}
