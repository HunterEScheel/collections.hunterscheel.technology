/**
 * Quest rewards are always denominated in gold pieces (gp). The reward
 * field stores just the numeric string (e.g. "300"). This helper formats
 * it for display. If the stored value isn't a plain integer (legacy free-
 * form entries from before the constraint), it's shown verbatim so no
 * data gets silently mangled.
 */
export function formatReward(reward: string | null | undefined): string {
  if (!reward) return "";
  const trimmed = String(reward).trim();
  if (trimmed === "") return "";
  // Accept optional "gp" suffix and strip it if present.
  const stripped = trimmed.replace(/\s*gp\s*$/i, "").trim();
  const n = Number(stripped);
  if (Number.isFinite(n) && Number.isInteger(n) && n >= 0) {
    return `${n.toLocaleString()} gp`;
  }
  return trimmed;
}
