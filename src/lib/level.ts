const LEVEL_THRESHOLDS: { level: number; xp: number }[] = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 },
  { level: 5, xp: 900 },
  { level: 6, xp: 1500 },
];

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
