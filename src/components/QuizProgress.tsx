"use client";

interface QuizProgressProps {
  current: number;
  total: number;
}

export default function QuizProgress({ current, total }: QuizProgressProps) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--steel-400)" }}>
          Question
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--gold-300)" }}>
          {current} <span style={{ color: "var(--steel-600)" }}>/</span> {total}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--steel-800)" }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, var(--energy-500), var(--gold-400))",
            boxShadow: "0 0 8px var(--energy-glow)",
          }}
        />
      </div>
    </div>
  );
}
