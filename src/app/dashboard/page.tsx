"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { completeQuest, fetchTodayQuests, type ActivityType } from "@/lib/addXP";
import { xpProgress } from "@/lib/level";
import XPDisplay from "@/components/XPDisplay";
import QuestCard from "@/components/QuestCard";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

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
  { label: "Complete Comic", activity: "comic", xp: 20, icon: "📖" },
  { label: "Complete Reading", activity: "reading", xp: 30, icon: "📚" },
  { label: "Complete Listening", activity: "listening", xp: 25, icon: "🎧" },
];

export default function DashboardPage() {
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
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const init = async () => {
      await supabase
        .from("profiles")
        .upsert({ id: DEMO_USER_ID, xp: 0, level: 1, streak: 0 }, { onConflict: "id" });

      const { data } = await supabase
        .from("profiles")
        .select("xp, level, streak, last_active_date")
        .eq("id", DEMO_USER_ID)
        .single();

      setProfile(data);

      const questData = await fetchTodayQuests(DEMO_USER_ID);
      setCompleted({
        comic: questData.comic,
        reading: questData.reading,
        listening: questData.listening,
      });

      setLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
      if (streakTimer.current) clearTimeout(streakTimer.current);
    };
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("xp, level, streak, last_active_date")
      .eq("id", DEMO_USER_ID)
      .single();
    setProfile(data);
  };

  const handleComplete = async (quest: (typeof QUESTS)[number]) => {
    if (completed[quest.activity] || processing) return;

    setProcessing(quest.activity);
    setXpMessage(null);
    setLevelUp(false);
    setStreakMessage(null);

    const result = await completeQuest(DEMO_USER_ID, quest.activity);

    if (result.error) {
      setXpMessage(result.error);
    } else {
      setCompleted((prev) => ({ ...prev, [quest.activity]: true }));
      setXpMessage(`+${result.data!.gained} XP earned!`);

      if (result.data!.leveledUp) setLevelUp(true);

      if (result.data!.streakChanged) {
        const s = result.data!.streak;
        if (s === 3) setStreakMessage("3 day streak! +50 bonus XP!");
        else if (s === 7) setStreakMessage("7 day streak! +150 bonus XP!");
        else setStreakMessage(`${s} day streak!`);

        if (streakTimer.current) clearTimeout(streakTimer.current);
        streakTimer.current = setTimeout(() => setStreakMessage(null), 4000);
      }

      await fetchProfile();
    }

    setProcessing(null);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => {
      setXpMessage(null);
      setLevelUp(false);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const progress = xpProgress(profile.xp);
  const allDone = completed.comic && completed.reading && completed.listening;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0f]">
      <header className="flex items-center justify-center border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white">Solo Leveling</h1>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 sm:px-6 py-8 sm:py-10">
        <div className="w-full max-w-lg space-y-6 sm:space-y-8">
          <XPDisplay level={profile.level} totalXP={profile.xp} progress={progress} />

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6 text-center">
              <p className="text-3xl font-bold text-orange-400">{profile.streak}</p>
              <p className="mt-1 text-xs text-zinc-500">Day Streak</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6 text-center">
              <p className="text-3xl font-bold text-purple-400">{profile.level}</p>
              <p className="mt-1 text-xs text-zinc-500">Level</p>
            </div>
          </div>

          {levelUp && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-4 text-center animate-pulse">
              <p className="text-lg font-bold text-purple-400">Level Up!</p>
              <p className="text-sm text-purple-300/70 mt-1">You reached Level {profile.level}</p>
            </div>
          )}

          {streakMessage && !levelUp && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-center">
              <p className="text-sm font-medium text-orange-400">{streakMessage}</p>
            </div>
          )}

          {xpMessage && !levelUp && !streakMessage && (
            <div className="rounded-xl bg-purple-500/10 px-4 py-3 text-center text-sm font-medium text-purple-400">
              {xpMessage}
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Daily Quests</h2>
              {allDone && (
                <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                  All Complete
                </span>
              )}
            </div>
            <div className="space-y-3">
              {QUESTS.map((quest) => (
                <QuestCard
                  key={quest.activity}
                  label={quest.label}
                  xp={quest.xp}
                  icon={quest.icon}
                  completed={completed[quest.activity]}
                  loading={processing === quest.activity}
                  onClick={() => handleComplete(quest)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
