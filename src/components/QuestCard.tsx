"use client";

interface QuestCardProps {
  label: string;
  xp: number;
  icon: string;
  completed: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function QuestCard({
  label,
  xp,
  icon,
  completed,
  loading,
  onClick,
}: QuestCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={completed || loading}
      className={`flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-200 ${
        completed
          ? "border-green-700/50 bg-green-900/20 opacity-60"
          : "border-zinc-700 bg-zinc-800/50 hover:border-purple-500 hover:bg-zinc-800 active:scale-[0.98]"
      } disabled:cursor-not-allowed`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-700/50 text-xl">
        {icon}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${completed ? "text-green-400" : "text-zinc-200"}`}>
          {label}
        </p>
        <p className="text-xs text-zinc-500">
          {completed ? "Completed today" : `+${xp} XP`}
        </p>
      </div>

      <span
        className={`text-xs font-semibold shrink-0 ${
          completed ? "text-green-400" : "text-purple-400"
        }`}
      >
        {completed ? "Done" : `+${xp}`}
      </span>
    </button>
  );
}
