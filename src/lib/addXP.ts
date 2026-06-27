import { supabase } from "@/lib/supabase";
import { calculateLevel } from "@/lib/level";
import { updateStreak } from "@/lib/streak";

export type ActivityType = "comic" | "reading" | "listening";

const QUEST_XP: Record<ActivityType, number> = {
  comic: 20,
  reading: 30,
  listening: 25,
};

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function completeQuest(userId: string, activity: ActivityType) {
  const today = getLocalDate();

  const { data: existing, error: fetchError } = await supabase
    .from("daily_quests")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    return { error: "Could not check quest status" };
  }

  const column = `${activity}_done` as const;

  if (existing && existing[column]) {
    return { error: "Quest already completed today" };
  }

  if (existing) {
    const { error } = await supabase
      .from("daily_quests")
      .update({ [column]: true })
      .eq("id", existing.id);

    if (error) {
      return { error: "Could not update quest status" };
    }
  } else {
    const { error } = await supabase.from("daily_quests").insert({
      user_id: userId,
      date: today,
      comic_done: activity === "comic",
      reading_done: activity === "reading",
      listening_done: activity === "listening",
    });

    if (error) {
      return { error: "Could not create quest record" };
    }
  }

  const questXP = QUEST_XP[activity];

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { error: "Could not fetch profile" };
  }

  const { streak, bonusXP, streakChanged } = await updateStreak(userId);
  const totalGained = questXP + bonusXP;
  const newTotalXP = profile.xp + totalGained;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > profile.level;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp: newTotalXP, level: newLevel })
    .eq("id", userId);

  if (updateError) {
    return { error: "Could not update XP" };
  }

  if (bonusXP > 0) {
    await supabase.from("xp_logs").insert({
      user_id: userId,
      activity_type: "streak_bonus",
      xp: bonusXP,
    });
  }

  const { error: logError } = await supabase.from("xp_logs").insert({
    user_id: userId,
    activity_type: activity,
    xp: questXP,
  });

  if (logError) {
    return { error: "Could not log XP" };
  }

  return {
    error: null,
    data: {
      xp: newTotalXP,
      level: newLevel,
      gained: totalGained,
      streak,
      bonusXP,
      leveledUp,
      streakChanged,
    },
  };
}

export async function fetchTodayQuests(userId: string) {
  const today = getLocalDate();

  const { data, error } = await supabase
    .from("daily_quests")
    .select("comic_done, reading_done, listening_done")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (error || !data) {
    return { comic: false, reading: false, listening: false };
  }

  return {
    comic: data.comic_done,
    reading: data.reading_done,
    listening: data.listening_done,
  };
}
