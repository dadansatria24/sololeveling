import { supabase } from "@/lib/supabase";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");
  const diff = d2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const STREAK_BONUS: Record<number, number> = {
  3: 50,
  7: 150,
};

export async function updateStreak(userId: string): Promise<{
  streak: number;
  bonusXP: number;
  streakChanged: boolean;
}> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("streak, last_active_date")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { streak: 0, bonusXP: 0, streakChanged: false };
  }

  const todayStr = getLocalDate();
  const prevStreak = profile.streak;
  let newStreak = prevStreak;
  let bonusXP = 0;

  if (!profile.last_active_date) {
    newStreak = 1;
  } else if (profile.last_active_date === todayStr) {
    return { streak: newStreak, bonusXP: 0, streakChanged: false };
  } else if (daysBetween(profile.last_active_date, todayStr) === 1) {
    newStreak = prevStreak + 1;
  } else {
    newStreak = 1;
  }

  bonusXP = STREAK_BONUS[newStreak] ?? 0;

  await supabase
    .from("profiles")
    .update({ streak: newStreak, last_active_date: todayStr })
    .eq("id", userId);

  return { streak: newStreak, bonusXP, streakChanged: newStreak !== prevStreak };
}
