"use client";

import ProgressBar from "./ProgressBar";

interface XPDisplayProps {
  level: number;
  totalXP: number;
  progress: { current: number; needed: number; percent: number };
}

export default function XPDisplay({ level, totalXP, progress }: XPDisplayProps) {
  return (
    <>
      <div className="text-center">
        <p className="text-sm text-zinc-500 uppercase tracking-widest">Hunter Rank</p>
        <p className="mt-1 text-6xl font-black text-purple-400 tabular-nums">{level}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6 space-y-3">
        <ProgressBar
          label="XP"
          current={progress.current}
          max={progress.needed}
          percent={progress.percent}
        />
        <p className="text-center text-xs text-zinc-500">
          {totalXP} total XP earned
        </p>
      </div>
    </>
  );
}
