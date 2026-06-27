"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { QuizAttempt, QuizQuestion } from "@/lib/quiz";
import { RANK_NAMES } from "@/lib/level";
import QuestionView from "@/components/QuestionView";

interface StoredResult {
  attempt: QuizAttempt;
  leveledUp: boolean;
  newLevel: number;
  questions: QuizQuestion[];
}

export default function QuizResultsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [result, setResult] = useState<StoredResult | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz_result_${quizId}`);
    if (!stored) {
      router.replace(`/dashboard/quiz`);
      return;
    }
    setResult(JSON.parse(stored));
  }, [quizId, router]);

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette">
        <div className="spinner-warrior" />
      </div>
    );
  }

  const { attempt, leveledUp, newLevel, questions } = result;
  const percentage = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const isPerfect = attempt.score === attempt.total;
  const minutes = Math.floor(attempt.time_taken_seconds / 60);
  const seconds = attempt.time_taken_seconds % 60;

  return (
    <div className="flex min-h-screen flex-col bg-vignette">
      <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          {/* Results Card */}
          <div className="text-center space-y-6 animate-fade-in-up">
            {/* Icon */}
            <p className="text-6xl">
              {isPerfect ? "🏆" : percentage >= 70 ? "⚔️" : percentage >= 50 ? "🛡️" : "📖"}
            </p>

            {/* Score */}
            <div>
              <p
                className="text-5xl font-black tabular-nums font-[family-name:var(--font-cinzel)]"
                style={{
                  background: isPerfect
                    ? "linear-gradient(180deg, var(--gold-100), var(--gold-400))"
                    : "linear-gradient(180deg, var(--energy-300), var(--energy-500))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: isPerfect ? "drop-shadow(0 0 12px var(--gold-glow))" : "none",
                }}
              >
                {attempt.score}/{attempt.total}
              </p>
              <p className="text-sm font-semibold mt-2" style={{ color: "var(--steel-400)" }}>
                {percentage}% correct
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6">
              <div className="hud-stat">
                <span className="hud-stat__value" style={{ color: "var(--gold-400)" }}>
                  +{attempt.xp_earned}
                </span>
                <span className="hud-stat__label">XP Earned</span>
              </div>
              <div className="hud-stat">
                <span className="hud-stat__value" style={{ color: "var(--energy-300)" }}>
                  {minutes}:{String(seconds).padStart(2, "0")}
                </span>
                <span className="hud-stat__label">Time</span>
              </div>
            </div>

            {/* Perfect bonus */}
            {isPerfect && (
              <div
                className="rounded-xl px-4 py-3 animate-gold-pulse"
                style={{
                  border: "1px solid var(--gold-600)",
                  background: "rgba(245, 183, 49, 0.08)",
                }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--gold-300)" }}>
                  🏆 Perfect Score! +20 Bonus XP
                </p>
              </div>
            )}

            {/* Level up */}
            {leveledUp && (
              <div
                className="rounded-xl px-4 py-4 animate-fade-in-up"
                style={{
                  border: "1px solid var(--gold-500)",
                  background: "linear-gradient(135deg, rgba(245,183,49,0.1), rgba(139,92,246,0.05))",
                }}
              >
                <p
                  className="text-lg font-bold font-[family-name:var(--font-cinzel)]"
                  style={{ color: "var(--gold-300)" }}
                >
                  ⬆️ Level Up!
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--gold-500)" }}>
                  You reached {RANK_NAMES[newLevel] || `Level ${newLevel}`}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href={`/dashboard/quiz/${quizId}`}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-center transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--energy-500), var(--energy-600))",
                  color: "white",
                  boxShadow: "0 0 12px var(--energy-glow)",
                }}
              >
                Retake
              </Link>
              <Link
                href="/dashboard/quiz"
                className="flex-1 py-3 rounded-xl text-sm font-bold text-center transition-all"
                style={{
                  color: "var(--steel-300)",
                  border: "1px solid var(--steel-700)",
                }}
              >
                All Quizzes
              </Link>
            </div>

            {/* Toggle review */}
            <button
              onClick={() => setShowReview(!showReview)}
              className="text-sm font-semibold transition-colors"
              style={{ color: "var(--energy-300)" }}
            >
              {showReview ? "Hide Review" : "📝 Review Answers"}
            </button>
          </div>

          {/* Answer Review */}
          {showReview && (
            <div className="mt-8 space-y-4 animate-fade-in-up">
              {questions.map((q, i) => {
                const userAnswer = attempt.answers[i] ?? -1;
                const isCorrect = userAnswer === q.correct_index;

                return (
                  <div
                    key={q.id}
                    className="rounded-xl p-5"
                    style={{
                      background: "var(--bg-card)",
                      border: `1px solid ${isCorrect ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}
                  >
                    <QuestionView
                      questionNumber={i + 1}
                      questionText={q.question_text}
                      options={q.options as string[]}
                      selectedIndex={userAnswer}
                      correctIndex={q.correct_index}
                      onSelect={() => {}}
                      disabled
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
