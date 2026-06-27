"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { copyTreeFromUser } from "@/lib/skillTree";
import { copyQuiz, type Quiz } from "@/lib/quiz";

interface PublicTree {
  user_id: string;
  creator_name: string;
  node_count: number;
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"trees" | "quizzes">("trees");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [publicTrees, setPublicTrees] = useState<PublicTree[]>([]);
  const [publicQuizzes, setPublicQuizzes] = useState<(Quiz & { creator_name: string })[]>([]);

  // Action status
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(user.id);
      await loadData();
    };

    init();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch public skill trees (grouped by creator)
      const { data: nodesData } = await supabase
        .from("skill_nodes")
        .select(`
          user_id,
          profiles!inner (
            display_name
          )
        `)
        .eq("is_public", true);

      if (nodesData) {
        // Group by user_id
        const groups: Record<string, { name: string; count: number }> = {};
        for (const item of nodesData) {
          const uId = item.user_id;
          const name = (item.profiles as any)?.display_name || "Unknown Adventurer";
          if (!groups[uId]) {
            groups[uId] = { name, count: 0 };
          }
          groups[uId].count++;
        }

        const treeList: PublicTree[] = Object.entries(groups).map(([user_id, meta]) => ({
          user_id,
          creator_name: meta.name,
          node_count: meta.count,
        }));
        setPublicTrees(treeList);
      }

      // 2. Fetch public quizzes
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select(`
          *,
          profiles!inner (
            display_name
          )
        `)
        .eq("is_public", true);

      if (quizzesData) {
        const quizList = quizzesData.map((q) => ({
          ...q,
          creator_name: (q.profiles as any)?.display_name || "Unknown",
        })) as (Quiz & { creator_name: string })[];
        setPublicQuizzes(quizList);
      }
    } catch (err) {
      console.error("Failed to load library data", err);
    }
    setLoading(false);
  };

  const handleCopyTree = async (creatorId: string) => {
    if (!currentUserId) return;
    if (!confirm("Are you sure you want to copy this skill tree? This will overwrite your current skill tree!")) return;

    setActioningId(creatorId);
    setMessage(null);

    const { error } = await copyTreeFromUser(creatorId, currentUserId);

    if (error) {
      setMessage({ text: `Failed to copy tree: ${error}`, type: "error" });
    } else {
      setMessage({ text: "Skill tree copied successfully! Go to Dashboard to view it.", type: "success" });
    }
    setActioningId(null);
  };

  const handleCopyQuiz = async (quizId: string) => {
    if (!currentUserId) return;

    setActioningId(quizId);
    setMessage(null);

    const { error } = await copyQuiz(quizId, currentUserId);

    if (error) {
      setMessage({ text: `Failed to copy quiz: ${error}`, type: "error" });
    } else {
      setMessage({ text: "Quiz copied successfully! Check your Quiz Arena.", type: "success" });
    }
    setActioningId(null);
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
            Public Library
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab("trees")}
            className="px-3 py-1.5 rounded-lg font-bold transition-all"
            style={{
              background: activeTab === "trees" ? "var(--energy-500)" : "transparent",
              color: activeTab === "trees" ? "white" : "var(--steel-400)",
            }}
          >
            Skill Trees
          </button>
          <button
            onClick={() => setActiveTab("quizzes")}
            className="px-3 py-1.5 rounded-lg font-bold transition-all"
            style={{
              background: activeTab === "quizzes" ? "var(--energy-500)" : "transparent",
              color: activeTab === "quizzes" ? "white" : "var(--steel-400)",
            }}
          >
            Quizzes
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Banner notification */}
        {message && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm font-semibold transition-all animate-fade-in-up"
            style={{
              border: `1px solid ${message.type === "success" ? "var(--gold-500)" : "var(--blood-500)"}`,
              background: message.type === "success" ? "rgba(245, 183, 49, 0.08)" : "rgba(239, 68, 68, 0.08)",
              color: message.type === "success" ? "var(--gold-300)" : "var(--blood-400)",
            }}
          >
            {message.type === "success" ? "🏆 " : "⚠️ "}
            {message.text}
          </div>
        )}

        {/* LIST OF TREES */}
        {activeTab === "trees" && (
          <div className="space-y-4">
            {publicTrees.length === 0 ? (
              <p className="text-center py-10" style={{ color: "var(--steel-500)" }}>
                No public skill trees templates yet.
              </p>
            ) : (
              publicTrees.map((tree) => (
                <div
                  key={tree.user_id}
                  className="flex items-center justify-between rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--steel-800)" }}
                >
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {tree.creator_name}&apos;s Skill Tree
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--steel-500)" }}>
                      Contains {tree.node_count} custom skill nodes
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyTree(tree.user_id)}
                    disabled={actioningId !== null}
                    className="text-xs font-bold px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                      color: "var(--bg-deep)",
                      boxShadow: "0 0 8px var(--gold-glow)",
                    }}
                  >
                    {actioningId === tree.user_id ? "Copying..." : "Copy Tree"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* LIST OF QUIZZES */}
        {activeTab === "quizzes" && (
          <div className="space-y-4">
            {publicQuizzes.length === 0 ? (
              <p className="text-center py-10" style={{ color: "var(--steel-500)" }}>
                No public quizzes yet.
              </p>
            ) : (
              publicQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--steel-800)" }}
                >
                  <div>
                    <h3 className="text-base font-bold text-white">{quiz.title}</h3>
                    <p className="text-xs mt-1" style={{ color: "var(--steel-500)" }}>
                      Created by {quiz.creator_name} &middot; {quiz.time_per_question}s/question
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyQuiz(quiz.id)}
                    disabled={actioningId !== null}
                    className="text-xs font-bold px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      background: "linear-gradient(135deg, var(--energy-500), var(--energy-600))",
                      color: "white",
                      boxShadow: "0 0 8px var(--energy-glow)",
                    }}
                  >
                    {actioningId === quiz.id ? "Copying..." : "Copy Quiz"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
