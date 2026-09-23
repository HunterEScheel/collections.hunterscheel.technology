// Port of web InitiativeTracker.tsx hpStatus() — keep labels/colors in sync.
export function hpStatus(
  hp: number,
  maxHp: number
): { label: string; color: string } {
  const ratio = hp / maxHp;
  if (hp <= 0) return { label: "Dead", color: "#6b7280" };
  if (ratio > 0.75) return { label: "Fine", color: "#4ade80" };
  if (ratio > 0.4) return { label: "Okay", color: "#fbbf24" };
  return { label: "Ouch", color: "#ef4444" };
}

// Port of web src/data/bestiary.ts formatCr().
export function formatCr(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}
