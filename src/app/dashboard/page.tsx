"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { completeQuest, fetchTodayQuests, type ActivityType } from "@/lib/addXP";
import { xpProgress } from "@/lib/level";
import SkillTree from "@/components/SkillTree";

interface Profile {
  xp: number;
  level: number;
  streak: number;
  last_active_date: string | null;
}

const QUESTS: {
  label: string;
  activity: ActivityType;
  xp: number;
  icon: string;
}[] = [
  { label: "Comic", activity: "comic", xp: 20, icon: "📖" },
  { label: "Reading", activity: "reading", xp: 30, icon: "📚" },
  { label: "Listening", activity: "listening", xp: 25, icon: "🎧" },
];

const RANK_NAMES: Record<number, string> = {
  1: "Recruit",
  2: "Knight-Errant",
  3: "Adept",
  4: "Expert",
  5: "Master",
  6: "Musou",
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<ActivityType, boolean>>({
    comic: false,
    reading: false,
    listening: false,
  });
  const [processing, setProcessing] = useState<ActivityType | null>(null);
  const [xpMessage, setXpMessage] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [newLevelValue, setNewLevelValue] = useState(0);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("xp, level, streak, last_active_date")
          .eq("id", user.id)
          .single();

        if (fetchError) {
          setError(`Fetch error: ${fetchError.message}`);
          setLoading(false);
          return;
        }

        setProfile(data);

        const questData = await fetchTodayQuests(user.id);
        setCompleted({
          comic: questData.comic,
          reading: questData.reading,
          listening: questData.listening,
        });

        setLoading(false);
      } catch (e) {
        setError(`Unexpected: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
      if (streakTimer.current) clearTimeout(streakTimer.current);
      if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
    };
  }, []);

  const fetchProfile = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("xp, level, streak, last_active_date")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const handleComplete = async (quest: (typeof QUESTS)[number]) => {
    if (!userId || completed[quest.activity] || processing) return;

    setProcessing(quest.activity);
    setXpMessage(null);
    setLevelUp(false);
    setStreakMessage(null);

    const result = await completeQuest(userId, quest.activity);

    if (result.error) {
      setXpMessage(result.error);
    } else {
      setCompleted((prev) => ({ ...prev, [quest.activity]: true }));
      setXpMessage(`+${result.data!.gained} XP`);

      if (result.data!.leveledUp) {
        setNewLevelValue(result.data!.level);
        setLevelUp(true);
        if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
        levelUpTimer.current = setTimeout(() => setLevelUp(false), 3500);
      }

      if (result.data!.streakChanged) {
        const s = result.data!.streak;
        if (s === 3) setStreakMessage("🔥 3 Day Streak! +50 Bonus XP!");
        else if (s === 7) setStreakMessage("🔥 7 Day Streak! +150 Bonus XP!");
        else setStreakMessage(`🔥 ${s} Day Streak!`);

        if (streakTimer.current) clearTimeout(streakTimer.current);
        streakTimer.current = setTimeout(() => setStreakMessage(null), 4000);
      }

      await fetchProfile();
    }

    setProcessing(null);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => {
      setXpMessage(null);
    }, 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette">
        <div className="text-center space-y-4">
          <div className="spinner-warrior mx-auto" />
          <p className="text-sm" style={{ color: "var(--steel-500)" }}>Loading quest data...</p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vignette px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-sm" style={{ color: "var(--blood-400)" }}>{error}</p>
          <p className="text-xs" style={{ color: "var(--steel-500)" }}>Check env vars and RLS settings.</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const progress = xpProgress(profile.xp);
  const allDone = completed.comic && completed.reading && completed.listening;
  const rankName = RANK_NAMES[profile.level] || `Rank ${profile.level}`;

  return (
    <div className="flex min-h-screen flex-col bg-vignette">
      {/* Level Up Overlay */}
      {levelUp && (
        <div className="level-up-overlay" onClick={() => setLevelUp(false)}>
          <div className="level-up-overlay__ring" />
          <p className="level-up-overlay__text font-[family-name:var(--font-cinzel)]">
            Level Up!
          </p>
          <p className="level-up-overlay__subtitle">
            You reached {RANK_NAMES[newLevelValue] || `Level ${newLevelValue}`}
          </p>
        </div>
      )}

      {/* XP Toast */}
      {xpMessage && !levelUp && (
        <div className="xp-toast">{xpMessage}</div>
      )}

      {/* Streak Toast */}
      {streakMessage && !levelUp && !xpMessage && (
        <div className="xp-toast streak-toast">{streakMessage}</div>
      )}

      {/* Header / HUD Bar */}
      <header className="flex items-center justify-between border-b px-4 sm:px-6 py-3" style={{ borderColor: "var(--steel-800)", background: "rgba(6, 6, 12, 0.8)", backdropFilter: "blur(12px)" }}>
        <h1
          className="text-lg font-bold tracking-wider font-[family-name:var(--font-cinzel)]"
          style={{ color: "var(--gold-300)" }}
        >
          Solo Leveling
        </h1>

        <div className="flex items-center gap-4">
          {/* Streak HUD */}
          <div className="hud-stat">
            <span className="hud-stat__value" style={{ color: "var(--blood-400)" }}>
              {profile.streak}
            </span>
            <span className="hud-stat__label">Streak</span>
          </div>

          {/* Rank HUD */}
          <div className="hud-stat">
            <span className="hud-stat__value" style={{ color: "var(--gold-400)" }}>
              {rankName}
            </span>
            <span className="hud-stat__label">Rank</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            style={{ color: "var(--steel-400)", border: "1px solid var(--steel-800)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--blood-400)";
              e.currentTarget.style.borderColor = "var(--blood-500)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--steel-400)";
              e.currentTarget.style.borderColor = "var(--steel-800)";
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* All Done Banner */}
        {allDone && (
          <div
            className="mb-8 px-6 py-3 rounded-xl text-center animate-fade-in-up"
            style={{
              border: "1px solid var(--gold-700)",
              background: "linear-gradient(135deg, rgba(245,183,49,0.08), rgba(212,153,26,0.03))",
            }}
          >
            <p
              className="text-sm font-bold tracking-wider uppercase font-[family-name:var(--font-cinzel)]"
              style={{ color: "var(--gold-400)" }}
            >
              ⚔️ All Quests Complete ⚔️
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--gold-600)" }}>
              Return tomorrow for new challenges, warrior.
            </p>
          </div>
        )}

        {/* Skill Tree */}
        <SkillTree
          level={profile.level}
          totalXP={profile.xp}
          progress={progress}
          quests={QUESTS}
          completed={completed}
          processing={processing}
          onComplete={handleComplete}
        />

        {/* Daily Quests Label */}
        <p
          className="mt-10 text-xs font-semibold tracking-widest uppercase"
          style={{ color: "var(--steel-600)" }}
        >
          Daily Quest Tree
        </p>
      </main>
    </div>
  );
}
