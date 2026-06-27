"use client";

interface QuestionViewProps {
  questionNumber: number;
  questionText: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex?: number | null; // show in review mode
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export default function QuestionView({
  questionNumber,
  questionText,
  options,
  selectedIndex,
  correctIndex = null,
  onSelect,
  disabled = false,
}: QuestionViewProps) {
  const isReview = correctIndex !== null;

  return (
    <div className="space-y-5">
      {/* Question */}
      <div>
        <span
          className="text-xs font-bold tracking-wider uppercase"
          style={{ color: "var(--gold-500)" }}
        >
          Q{questionNumber}
        </span>
        <p
          className="mt-2 text-lg font-semibold leading-relaxed"
          style={{ color: "var(--foreground)" }}
        >
          {questionText}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = correctIndex === i;
          const isWrong = isReview && isSelected && !isCorrect;

          let borderColor = "var(--steel-700)";
          let bgColor = "var(--bg-card)";
          let textColor = "var(--steel-300)";
          let shadow = "none";

          if (isReview) {
            if (isCorrect) {
              borderColor = "#22c55e";
              bgColor = "rgba(34, 197, 94, 0.1)";
              textColor = "#4ade80";
              shadow = "0 0 8px rgba(34, 197, 94, 0.2)";
            } else if (isWrong) {
              borderColor = "var(--blood-500)";
              bgColor = "rgba(239, 68, 68, 0.1)";
              textColor = "var(--blood-400)";
              shadow = "0 0 8px var(--blood-glow)";
            }
          } else if (isSelected) {
            borderColor = "var(--energy-400)";
            bgColor = "rgba(139, 92, 246, 0.12)";
            textColor = "var(--energy-300)";
            shadow = "0 0 10px var(--energy-glow)";
          }

          const label = String.fromCharCode(65 + i); // A, B, C, D

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              disabled={disabled || isReview}
              className="w-full flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all duration-200"
              style={{
                border: `2px solid ${borderColor}`,
                background: bgColor,
                boxShadow: shadow,
                cursor: disabled || isReview ? "default" : "pointer",
                opacity: disabled && !isReview ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isReview && !isSelected) {
                  e.currentTarget.style.borderColor = "var(--energy-400)";
                  e.currentTarget.style.background = "rgba(139, 92, 246, 0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isReview && !isSelected) {
                  e.currentTarget.style.borderColor = "var(--steel-700)";
                  e.currentTarget.style.background = "var(--bg-card)";
                }
              }}
            >
              {/* Label badge */}
              <span
                className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg text-xs font-bold"
                style={{
                  background: isSelected || isCorrect ? borderColor : "var(--steel-800)",
                  color: isSelected || isCorrect ? "var(--bg-deep)" : "var(--steel-400)",
                  transition: "all 0.2s ease",
                }}
              >
                {label}
              </span>

              {/* Option text */}
              <span className="text-sm font-medium" style={{ color: textColor, transition: "color 0.2s ease" }}>
                {option}
              </span>

              {/* Review indicators */}
              {isReview && isCorrect && (
                <span className="ml-auto text-sm" style={{ color: "#4ade80" }}>✓</span>
              )}
              {isReview && isWrong && (
                <span className="ml-auto text-sm" style={{ color: "var(--blood-400)" }}>✗</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
