"use client";

interface ProgressBarProps {
  current: number;
  max: number;
  percent: number;
  label?: string;
}

export default function ProgressBar({ current, max, percent, label }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">{label}</span>
          <span className="text-sm text-zinc-500">
            {current} / {max}
          </span>
        </div>
      )}
      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
