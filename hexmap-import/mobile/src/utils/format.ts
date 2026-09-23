// Ports of web utils/reward.ts formatReward and QuestCard formatScheduled.

export function formatReward(reward: string): string {
  const trimmed = reward.trim();
  const stripped = trimmed.replace(/\s*gp$/i, "");
  if (/^\d+$/.test(stripped)) {
    return `${parseInt(stripped, 10).toLocaleString()} gp`;
  }
  return reward;
}

export function formatScheduled(iso: string, verbose: boolean): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: verbose ? "long" : "short",
    month: verbose ? "long" : "short",
    day: "numeric",
    ...(verbose ? { year: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
  });
}

export const QUEST_LEVEL_COLORS: Record<string, string> = {
  explore: "#4ade80",
  recurring: "#60a5fa",
  wolf: "#facc15",
  demon: "#f97316",
  dragon: "#ef4444",
  terrasque: "#a855f7",
  god: "#fbbf24",
};

export const QUEST_LEVEL_LABELS: Record<string, string> = {
  explore: "Explore",
  recurring: "Recurring",
  wolf: "Wolf",
  demon: "Demon",
  dragon: "Dragon",
  terrasque: "Terrasque",
  god: "God",
};

export const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  in_progress: "In Progress",
  completed: "Completed",
  paid_out: "Paid Out",
};

export const STATUS_COLORS: Record<string, string> = {
  available: "#60a5fa",
  in_progress: "#facc15",
  completed: "#4ade80",
  paid_out: "#fbbf24",
};
