// Port of web utils/hexMath.ts — flat-top hexes, offset coordinates.
export const HEX_SIZE = 30;

const SQRT3 = Math.sqrt(3);

export function hexToPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: col * 1.5 * HEX_SIZE,
    y:
      row * SQRT3 * HEX_SIZE +
      (Math.abs(col) % 2 === 1 ? (SQRT3 / 2) * HEX_SIZE : 0),
  };
}

export function hexCorners(
  cx: number,
  cy: number,
  size: number
): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    corners.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return corners;
}

export function hexPointsString(col: number, row: number): string {
  const { x, y } = hexToPixel(col, row);
  return hexCorners(x, y, HEX_SIZE)
    .map((c) => `${c.x},${c.y}`)
    .join(" ");
}

export function hexNeighbors(
  col: number,
  row: number
): { col: number; row: number }[] {
  const odd = Math.abs(col) % 2 === 1;
  const deltas = odd
    ? [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
      ]
    : [
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
      ];
  return deltas.map(([dc, dr]) => ({ col: col + dc, row: row + dr }));
}
