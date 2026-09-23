import { useMemo } from "react";
import type { HexData } from "../types";
import { hexNeighbors } from "../utils/hexMath";

export interface GridSize {
  cells: Array<{ col: number; row: number }>;
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  totalCols: number;
  totalRows: number;
}

/**
 * Decide which hex cells to render and the bounding box that encloses them.
 *
 * Cells included:
 * - Every filled hex (terrain !== "unknown").
 * - The 6 hex neighbors of each filled hex, so the only "unknown" tiles
 *   that ever appear are the ones adjacent to a filled tile.
 *
 * Quests do NOT contribute to the rendered cells or bounds. A quest pin in
 * a hex that isn't adjacent to any filled tile floats in the void — its pin
 * is still drawn at its world position, but no tile is rendered under it
 * and the viewport doesn't widen to include it.
 *
 * When no filled hexes exist, falls back to a 5x5 starter grid so an admin
 * has somewhere to paint.
 */
export function useGridSize(hexes: Map<string, HexData>): GridSize {
  return useMemo(() => {
    const cellSet = new Map<string, { col: number; row: number }>();
    const addCell = (col: number, row: number) => {
      const key = `${col}_${row}`;
      if (!cellSet.has(key)) cellSet.set(key, { col, row });
    };

    for (const hex of hexes.values()) {
      // A hex is "filled for rendering" if it has terrain or a landmark.
      const isFilled = hex.terrain !== "unknown" || hex.landmark != null;
      if (!isFilled) continue;
      addCell(hex.col, hex.row);
      for (const n of hexNeighbors(hex.col, hex.row)) {
        addCell(n.col, n.row);
      }
    }

    if (cellSet.size === 0) {
      const cells: Array<{ col: number; row: number }> = [];
      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 5; r++) {
          cells.push({ col: c, row: r });
        }
      }
      return {
        cells,
        minCol: 0,
        maxCol: 4,
        minRow: 0,
        maxRow: 4,
        totalCols: 5,
        totalRows: 5,
      };
    }

    let minCol = Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;
    for (const c of cellSet.values()) {
      if (c.col < minCol) minCol = c.col;
      if (c.col > maxCol) maxCol = c.col;
      if (c.row < minRow) minRow = c.row;
      if (c.row > maxRow) maxRow = c.row;
    }

    return {
      cells: Array.from(cellSet.values()),
      minCol,
      maxCol,
      minRow,
      maxRow,
      totalCols: maxCol - minCol + 1,
      totalRows: maxRow - minRow + 1,
    };
  }, [hexes]);
}
