"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createQuiz, type ParsedQuestion } from "@/lib/quiz";
import QuestionView from "@/components/QuestionView";

export default function QuizCreatePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [timePerQ, setTimePerQ] = useState(30);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "preview">("input");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
    };
    check();
  }, [router]);

  const handleParse = async () => {
    if (rawText.trim().length < 10) {
      setError("Please enter at least 10 characters of content");
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const res = await fetch("/api/quiz/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse questions");
        setParsing(false);
        return;
      }

      setQuestions(data.questions);
      if (!title.trim()) {
        setTitle(`Quiz — ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`);
      }
      setStep("preview");
    } catch {
      setError("Network error. Check your connection.");
    }

    setParsing(false);
  };

  const handleSave = async () => {
    if (!userId || questions.length === 0) return;

    setSaving(true);
    const { quizId, error: saveError } = await createQuiz(userId, title || "Untitled Quiz", timePerQ, questions);

    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }

    router.push(`/dashboard/quiz/${quizId}`);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

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
            href="/dashboard/quiz"
            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--steel-400)", border: "1px solid var(--steel-800)" }}
          >
            ← Back
          </Link>
          <h1
            className="text-lg font-bold tracking-wider font-[family-name:var(--font-cinzel)]"
            style={{ color: "var(--gold-300)" }}
          >
            Create Quiz
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        {/* STEP 1: Input */}
        {step === "input" && (
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--steel-400)" }}>
                Quiz Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. English Grammar Chapter 3"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: "var(--steel-900)",
                  border: "1px solid var(--steel-700)",
                  color: "var(--foreground)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--energy-400)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--steel-700)")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--steel-400)" }}>
                Paste Questions, Answers, or Any Text
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"Paste your questions & answers here...\n\nExamples:\n• Copy-pasted exam questions\n• A paragraph to generate questions from\n• A topic like 'English Tenses'\n• Numbered Q&A from a textbook"}
                rows={12}
                className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
                style={{
                  background: "var(--steel-900)",
                  border: "1px solid var(--steel-700)",
                  color: "var(--foreground)",
                  lineHeight: 1.6,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--energy-400)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--steel-700)")}
              />
              <p className="text-xs mt-2" style={{ color: "var(--steel-600)" }}>
                AI will automatically parse this into multiple-choice questions
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--steel-400)" }}>
                Time per Question (seconds)
              </label>
              <div className="flex items-center gap-3">
                {[15, 30, 45, 60, 90].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimePerQ(t)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: timePerQ === t ? "var(--energy-500)" : "var(--steel-800)",
                      color: timePerQ === t ? "white" : "var(--steel-400)",
                      border: timePerQ === t ? "1px solid var(--energy-300)" : "1px solid var(--steel-700)",
                      boxShadow: timePerQ === t ? "0 0 8px var(--energy-glow)" : "none",
                    }}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid var(--blood-500)", background: "rgba(239,68,68,0.08)", color: "var(--blood-400)" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleParse}
              disabled={parsing || rawText.trim().length < 10}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, var(--energy-500), var(--energy-600))",
                color: "white",
                boxShadow: "0 0 16px var(--energy-glow)",
              }}
            >
              {parsing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner-warrior" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  AI is generating questions...
                </span>
              ) : (
                "🤖 Generate Quiz with AI"
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === "preview" && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  {title || "Untitled Quiz"}
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--steel-500)" }}>
                  {questions.length} questions · {timePerQ}s per question
                </p>
              </div>
              <button
                onClick={() => setStep("input")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "var(--steel-400)", border: "1px solid var(--steel-700)" }}
              >
                ← Edit Input
              </button>
            </div>

            {/* Questions preview */}
            <div className="space-y-6">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--steel-800)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <QuestionView
                      questionNumber={i + 1}
                      questionText={q.question}
                      options={q.options}
                      selectedIndex={q.correctIndex}
                      correctIndex={q.correctIndex}
                      onSelect={() => {}}
                      disabled
                    />
                    <button
                      onClick={() => removeQuestion(i)}
                      className="shrink-0 ml-3 text-xs px-2 py-1 rounded"
                      style={{ color: "var(--blood-400)" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid var(--blood-500)", background: "rgba(239,68,68,0.08)", color: "var(--blood-400)" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || questions.length === 0}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                color: "var(--bg-deep)",
                boxShadow: "0 0 16px var(--gold-glow)",
              }}
            >
              {saving ? "Saving..." : `⚔️ Save Quiz (${questions.length} questions)`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
