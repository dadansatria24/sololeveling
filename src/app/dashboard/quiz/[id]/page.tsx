"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchQuizWithQuestions, submitAttempt, type Quiz, type QuizQuestion } from "@/lib/quiz";
import QuestionView from "@/components/QuestionView";
import QuizTimer from "@/components/QuizTimer";
import QuizProgress from "@/components/QuizProgress";

type Phase = "ready" | "playing" | "submitting";

export default function QuizPlayPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [phase, setPhase] = useState<Phase>("ready");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [timerKey, setTimerKey] = useState(0); // reset timer per question

  const submittingRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const { quiz: q, questions: qs, error } = await fetchQuizWithQuestions(quizId);
      if (error || !q) {
        router.replace("/dashboard/quiz");
        return;
      }

      setQuiz(q);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setLoading(false);
    };
    init();
  }, [router, quizId]);

  const handleSubmit = useCallback(async () => {
    if (!userId || !quiz || submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const finalAnswers = answers.map((a) => (a === null ? -1 : a));

    const { attempt, leveledUp, newLevel } = await submitAttempt(userId, quizId, finalAnswers, timeTaken);

    if (attempt) {
      // Store results in sessionStorage for results page
      sessionStorage.setItem(`quiz_result_${quizId}`, JSON.stringify({
        attempt,
        leveledUp,
        newLevel,
        questions,
      }));
      router.push(`/dashboard/quiz/${quizId}/results`);
    }
  }, [userId, quiz, answers, startTime, quizId, questions, router]);

  const handleSelectAnswer = useCallback((optionIndex: number) => {
    if (phase !== "playing") return;

    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = optionIndex;
      return copy;
    });

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setTimerKey((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    }, 500);
  }, [phase, currentIndex, questions.length, handleSubmit]);

  const handleTimeout = useCallback(() => {
    if (phase !== "playing") return;

    // Skip question (answer stays null)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTimerKey((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }, [phase, currentIndex, questions.length, handleSubmit]);

  const startQuiz = () => {
    setPhase("playing");
    setStartTime(Date.now());
    setTimerKey(0);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette">
        <div className="spinner-warrior" />
      </div>
    );
  }

  if (!quiz) return null;

  // ---- READY SCREEN ----
  if (phase === "ready") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-vignette px-4">
        <div className="text-center max-w-md space-y-6 animate-fade-in-up">
          <p className="text-5xl">⚔️</p>
          <h1
            className="text-2xl font-bold font-[family-name:var(--font-cinzel)]"
            style={{ color: "var(--gold-300)" }}
          >
            {quiz.title}
          </h1>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--energy-300)" }}>{questions.length}</p>
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--steel-500)" }}>Questions</p>
            </div>
            <div style={{ width: 1, height: 32, background: "var(--steel-700)" }} />
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--gold-400)" }}>{quiz.time_per_question}s</p>
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--steel-500)" }}>Per Question</p>
            </div>
          </div>
          <button
            onClick={startQuiz}
            className="w-full py-4 rounded-xl text-base font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
              color: "var(--bg-deep)",
              boxShadow: "0 0 20px var(--gold-glow)",
            }}
          >
            Start Quiz
          </button>
          <Link
            href="/dashboard/quiz"
            className="block text-sm font-semibold transition-colors"
            style={{ color: "var(--steel-500)" }}
          >
            ← Back to Quizzes
          </Link>
        </div>
      </div>
    );
  }

  // ---- SUBMITTING ----
  if (phase === "submitting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette">
        <div className="text-center space-y-4">
          <div className="spinner-warrior mx-auto" />
          <p className="text-sm" style={{ color: "var(--steel-400)" }}>Calculating results...</p>
        </div>
      </div>
    );
  }

  // ---- PLAYING ----
  const currentQ = questions[currentIndex];

  return (
    <div className="flex min-h-screen flex-col bg-vignette">
      {/* Top bar */}
      <header
        className="border-b px-4 sm:px-6 py-3"
        style={{ borderColor: "var(--steel-800)", background: "rgba(6, 6, 12, 0.8)", backdropFilter: "blur(12px)" }}
      >
        <QuizProgress current={currentIndex + 1} total={questions.length} />
      </header>

      {/* Quiz content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Timer */}
          <div className="flex justify-center">
            <QuizTimer
              key={timerKey}
              seconds={quiz.time_per_question}
              onTimeout={handleTimeout}
            />
          </div>

          {/* Question */}
          <div className="animate-fade-in-up" key={currentIndex}>
            <QuestionView
              questionNumber={currentIndex + 1}
              questionText={currentQ.question_text}
              options={currentQ.options as string[]}
              selectedIndex={answers[currentIndex]}
              onSelect={handleSelectAnswer}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
