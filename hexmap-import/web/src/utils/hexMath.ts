export const HEX_SIZE = 30;

/**
 * Convert offset coordinates (col, row) to the pixel center of a flat-top hex.
 */
export function hexToPixel(
  col: number,
  row: number
): { x: number; y: number } {
  const x = col * 1.5 * HEX_SIZE;
  const y =
    row * Math.sqrt(3) * HEX_SIZE +
    (Math.abs(col) % 2 === 1 ? (Math.sqrt(3) / 2) * HEX_SIZE : 0);
  return { x, y };
}

/**
 * Return the 6 corner points of a flat-top hex given its pixel center and size.
 * Corners are ordered starting from the right (0 degrees) going counter-clockwise.
 */
export function hexCorners(
  centerX: number,
  centerY: number,
  size: number
): Array<{ x: number; y: number }> {
  const corners: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: centerX + size * Math.cos(angleRad),
      y: centerY + size * Math.sin(angleRad),
    });
  }
  return corners;
}

/**
 * Return the 6 neighbor coordinates for a flat-top hex using offset coordinates.
 * Even columns and odd columns have different neighbor offsets.
 */
export function hexNeighbors(col: number, row: number): Array<{ col: number; row: number }> {
  const isOdd = Math.abs(col) % 2 === 1;
  if (isOdd) {
    return [
      { col: col + 1, row: row },
      { col: col + 1, row: row + 1 },
      { col: col, row: row + 1 },
      { col: col - 1, row: row + 1 },
      { col: col - 1, row: row },
      { col: col, row: row - 1 },
    ];
  }
  return [
    { col: col + 1, row: row - 1 },
    { col: col + 1, row: row },
    { col: col, row: row + 1 },
    { col: col - 1, row: row },
    { col: col - 1, row: row - 1 },
    { col: col, row: row - 1 },
  ];
}

/**
 * Return an SVG-ready "points" attribute string for the hex at offset (col, row).
 */
export function hexPointsString(col: number, row: number): string {
  const { x, y } = hexToPixel(col, row);
  const corners = hexCorners(x, y, HEX_SIZE);
  return corners.map((c) => `${c.x},${c.y}`).join(" ");
}
