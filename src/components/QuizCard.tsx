"use client";

import type { Quiz } from "@/lib/quiz";

interface QuizCardProps {
  quiz: Quiz;
  onClick: () => void;
  onDelete: () => void;
}

export default function QuizCard({ quiz, onClick, onDelete }: QuizCardProps) {
  const questionCount = quiz.question_count ?? 0;
  const hasBest = quiz.best_score !== null && quiz.best_score !== undefined;
  const date = new Date(quiz.created_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 cursor-pointer group"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--steel-800)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--energy-400)";
        e.currentTarget.style.boxShadow = "0 0 16px var(--energy-glow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--steel-800)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-bold truncate"
            style={{ color: "var(--foreground)" }}
          >
            {quiz.title}
          </h3>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold" style={{ color: "var(--steel-500)" }}>
              {questionCount} questions
            </span>
            <span style={{ color: "var(--steel-700)" }}>•</span>
            <span className="text-xs" style={{ color: "var(--steel-500)" }}>
              {quiz.time_per_question}s/question
            </span>
            <span style={{ color: "var(--steel-700)" }}>•</span>
            <span className="text-xs" style={{ color: "var(--steel-500)" }}>
              {date}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Best score badge */}
          {hasBest && (
            <div
              className="text-center px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(245, 183, 49, 0.1)",
                border: "1px solid var(--gold-700)",
              }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--gold-400)" }}>
                {quiz.best_score}/{questionCount}
              </p>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--gold-600)" }}>
                Best
              </p>
            </div>
          )}

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg"
            style={{ color: "var(--steel-600)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blood-400)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--steel-600)")}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
