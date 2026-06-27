"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isGuided, setIsGuided] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      // Check if already completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "mentor") {
        router.replace("/dashboard/mentor");
        return;
      }

      if (profile?.display_name) {
        router.replace("/dashboard");
        return;
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !displayName.trim() || isGuided === null) {
      setError("Please complete all choices.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Update profile display_name and is_guided choice
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          is_guided: isGuided,
        })
        .eq("id", userId);

      if (profileError) {
        setError(profileError.message);
        setSubmitting(false);
        return;
      }

      // 2. If guided by mentor, clear the default tree so the mentor creates it from scratch
      if (isGuided) {
        const { error: treeError } = await supabase
          .from("skill_nodes")
          .delete()
          .eq("user_id", userId);

        if (treeError) {
          setError("Failed to clear default tree: " + treeError.message);
          setSubmitting(false);
          return;
        }
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="spinner-warrior mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-vignette px-4">
      <div
        className="w-full max-w-md rounded-2xl p-6 sm:p-8 animate-fade-in-up"
        style={{
          background: "linear-gradient(135deg, var(--bg-card), var(--bg-surface))",
          border: "1px solid var(--steel-800)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-bold tracking-wider font-[family-name:var(--font-cinzel)]"
            style={{ color: "var(--gold-300)" }}
          >
            Adventurer Setup
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--steel-500)" }}>
            Complete your register profile to begin the journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display Name */}
          <div>
            <label
              htmlFor="display-name"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--steel-400)" }}
            >
              Adventurer Name
            </label>
            <input
              id="display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sung Jin-Woo"
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

          {/* Path Preference */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--steel-400)" }}>
              Choose your path
            </label>
            <div className="grid grid-cols-1 gap-3">
              {/* Solo Adventurer */}
              <button
                type="button"
                onClick={() => setIsGuided(false)}
                className="flex flex-col items-start p-4 rounded-xl border text-left transition-all"
                style={{
                  borderColor: isGuided === false ? "var(--energy-400)" : "var(--steel-800)",
                  background: isGuided === false ? "rgba(139, 92, 246, 0.1)" : "var(--bg-card)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚔️</span>
                  <span className="font-bold text-sm" style={{ color: isGuided === false ? "var(--energy-300)" : "var(--foreground)" }}>
                    Solo Adventurer
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--steel-500)" }}>
                  Start with a default 24-node English path. Full control over editing and grinding your tree immediately.
                </p>
              </button>

              {/* Guided by Mentor */}
              <button
                type="button"
                onClick={() => setIsGuided(true)}
                className="flex flex-col items-start p-4 rounded-xl border text-left transition-all"
                style={{
                  borderColor: isGuided === true ? "var(--gold-400)" : "var(--steel-800)",
                  background: isGuided === true ? "rgba(245, 183, 49, 0.08)" : "var(--bg-card)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐲</span>
                  <span className="font-bold text-sm" style={{ color: isGuided === true ? "var(--gold-300)" : "var(--foreground)" }}>
                    Guided by Mentor
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--steel-500)" }}>
                  Your tree will be empty. The mentor (`mentor2435@gmail.com`) designs and customizes your path, locking/unlocking your progress.
                </p>
              </button>
            </div>
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{
                border: "1px solid var(--blood-500)",
                background: "rgba(239, 68, 68, 0.08)",
                color: "var(--blood-400)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !displayName.trim() || isGuided === null}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
              color: "var(--bg-deep)",
              boxShadow: "0 0 16px var(--gold-glow)",
            }}
          >
            {submitting ? "Entering Gates..." : "Start Adventure"}
          </button>
        </form>
      </div>
    </div>
  );
}
