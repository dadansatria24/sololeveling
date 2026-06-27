"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchUserQuizzes, deleteQuiz, shareQuiz, type Quiz } from "@/lib/quiz";
import QuizCard from "@/components/QuizCard";

export default function QuizHubPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const { quizzes: data } = await fetchUserQuizzes(user.id);
      setQuizzes(data);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleDelete = async (quizId: string) => {
    if (!confirm("Delete this quiz?")) return;
    await deleteQuiz(quizId);
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
  };

  const handleTogglePublic = async (quiz: Quiz) => {
    const nextState = !quiz.is_public;
    const { error } = await shareQuiz(quiz.id, nextState);
    if (error) {
      alert(`Failed to update status: ${error}`);
      return;
    }
    setQuizzes((prev) =>
      prev.map((q) => (q.id === quiz.id ? { ...q, is_public: nextState } : q))
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette">
        <div className="spinner-warrior" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-vignette">
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-4 sm:px-6 py-3"
        style={{
          borderColor: "var(--steel-800)",
          background: "rgba(6, 6, 12, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--steel-400)", border: "1px solid var(--steel-800)" }}
          >
            ← Back
          </Link>
          <h1
            className="text-lg font-bold tracking-wider font-[family-name:var(--font-cinzel)]"
            style={{ color: "var(--gold-300)" }}
          >
            Quiz Arena
          </h1>
        </div>

        <Link
          href="/dashboard/quiz/create"
          className="text-sm font-bold px-4 py-2 rounded-xl transition-all"
          style={{
            background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
            color: "var(--bg-deep)",
            boxShadow: "0 0 12px var(--gold-glow)",
          }}
        >
          + Create Quiz
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        {quizzes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-lg font-semibold" style={{ color: "var(--steel-400)" }}>
              No quizzes yet
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--steel-600)" }}>
              Create your first quiz by pasting questions or a topic — AI will do the rest!
            </p>
            <Link
              href="/dashboard/quiz/create"
              className="inline-block mt-6 text-sm font-bold px-6 py-3 rounded-xl transition-all"
              style={{
                background: "linear-gradient(135deg, var(--energy-500), var(--energy-600))",
                color: "white",
                boxShadow: "0 0 12px var(--energy-glow)",
              }}
            >
              Create Quiz with AI
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onClick={() => router.push(`/dashboard/quiz/${quiz.id}`)}
                onDelete={() => handleDelete(quiz.id)}
                onTogglePublic={() => handleTogglePublic(quiz)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
