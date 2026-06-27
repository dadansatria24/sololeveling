"use client";

const RANK_NAMES: Record<number, string> = {
  1: "Recruit",
  2: "Knight-Errant",
  3: "Adept",
  4: "Expert",
  5: "Master",
  6: "Musou",
};

interface RankBadgeProps {
  level: number;
  totalXP: number;
  progress: { current: number; needed: number; percent: number };
}

export default function RankBadge({ level, totalXP, progress }: RankBadgeProps) {
  const rankName = RANK_NAMES[level] || `Rank ${level}`;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (progress.percent / 100) * circumference;

  return (
    <div className="rank-badge">
      {/* Circular Progress Ring */}
      <div className="rank-badge__ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--energy-400)" />
              <stop offset="50%" stopColor="var(--gold-400)" />
              <stop offset="100%" stopColor="var(--energy-300)" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            className="rank-badge__progress-track"
            cx="60"
            cy="60"
            r={radius}
          />
          {/* Fill */}
          <circle
            className="rank-badge__progress-fill"
            cx="60"
            cy="60"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </svg>

        {/* Level Number (centered) */}
        <div className="rank-badge__level">
          <span className="rank-badge__level-number">{level}</span>
        </div>
      </div>

      {/* Rank Title */}
      <h2 className="rank-badge__rank-title font-[family-name:var(--font-cinzel)]">
        {rankName}
      </h2>

      {/* XP Text */}
      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--steel-500)",
          letterSpacing: 1,
        }}
      >
        {progress.current} / {progress.needed} XP &middot; {totalXP} total
      </p>
    </div>
  );
}
