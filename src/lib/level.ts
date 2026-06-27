// ============================================
// Level System — 12 levels for grinding
// ============================================

const LEVEL_THRESHOLDS: { level: number; xp: number }[] = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 300 },
  { level: 4, xp: 600 },
  { level: 5, xp: 1000 },
  { level: 6, xp: 1600 },
  { level: 7, xp: 2400 },
  { level: 8, xp: 3500 },
  { level: 9, xp: 5000 },
  { level: 10, xp: 7000 },
  { level: 11, xp: 10000 },
  { level: 12, xp: 15000 },
];

export const RANK_NAMES: Record<number, string> = {
  1: "Recruit",
  2: "Knight-Errant",
  3: "Adept",
  4: "Warrior",
  5: "Expert",
  6: "Master",
  7: "Grandmaster",
  8: "Warlord",
  9: "Conqueror",
  10: "Legend",
  11: "Musou",
  12: "Dynasty",
};

export function calculateLevel(xp: number): number {
  let level = 1;
  for (const entry of LEVEL_THRESHOLDS) {
    if (xp >= entry.xp) {
      level = entry.level;
    } else {
      break;
    }
  }
  return level;
}

export function xpForNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const next = LEVEL_THRESHOLDS.find((e) => e.level === currentLevel + 1);
  return next ? next.xp : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xp;
}

export function xpProgress(xp: number): { current: number; needed: number; percent: number } {
  const currentLevel = calculateLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS.find((e) => e.level === currentLevel)!.xp;
  const nextEntry = LEVEL_THRESHOLDS.find((e) => e.level === currentLevel + 1);

  if (!nextEntry) {
    return { current: 0, needed: 0, percent: 100 };
  }

  const current = xp - currentThreshold;
  const needed = nextEntry.xp - currentThreshold;
  const percent = Math.min((current / needed) * 100, 100);

  return { current, needed, percent };
}
