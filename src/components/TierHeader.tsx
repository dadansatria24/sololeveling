"use client";

const TIER_NAMES: Record<number, string> = {
  1: "Foundation",
  2: "Elementary",
  3: "Pre-Intermediate",
  4: "Intermediate",
  5: "Upper-Intermediate",
  6: "IELTS Preparation",
};

interface TierHeaderProps {
  tier: number;
}

export default function TierHeader({ tier }: TierHeaderProps) {
  const name = TIER_NAMES[tier] || `Tier ${tier}`;

  return (
    <div className="flex items-center gap-3 my-4 px-2">
      {/* Tier badge */}
      <span
        className="flex items-center justify-center shrink-0 rounded-lg font-[family-name:var(--font-cinzel)]"
        style={{
          width: 32,
          height: 32,
          fontSize: 14,
          fontWeight: 900,
          background: "linear-gradient(135deg, var(--gold-600), var(--gold-400))",
          color: "var(--bg-deep)",
          boxShadow: "0 0 8px var(--gold-glow)",
        }}
      >
        {tier}
      </span>

      {/* Tier name */}
      <span
        className="text-sm font-bold tracking-wider uppercase font-[family-name:var(--font-cinzel)]"
        style={{ color: "var(--gold-300)" }}
      >
        {name}
      </span>

      {/* Decorative line */}
      <div
        className="flex-1 h-px"
        style={{
          background: "linear-gradient(90deg, var(--gold-700), transparent)",
        }}
      />
    </div>
  );
}
