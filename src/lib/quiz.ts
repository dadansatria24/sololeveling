import { supabase } from "@/lib/supabase";
import { calculateLevel } from "@/lib/level";

// ============================================
// Types
// ============================================

export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string;
  time_per_question: number;
  created_at: string;
  question_count?: number;
  best_score?: number | null;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  xp_earned: number;
  time_taken_seconds: number;
  answers: number[];
  completed_at: string;
}

export interface ParsedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// ============================================
// XP Calculation
// ============================================

const XP_PER_CORRECT = 5;
const PERFECT_BONUS = 20;

export function calculateQuizXP(score: number, total: number): number {
  const base = score * XP_PER_CORRECT;
  const bonus = score === total && total > 0 ? PERFECT_BONUS : 0;
  return base + bonus;
}

// ============================================
// Create Quiz with Questions
// ============================================

export async function createQuiz(
  userId: string,
  title: string,
  timePerQuestion: number,
  questions: ParsedQuestion[]
): Promise<{ quizId: string | null; error: string | null }> {
  // 1. Create quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      user_id: userId,
      title,
      time_per_question: timePerQuestion,
    })
    .select("id")
    .single();

  if (quizError || !quiz) {
    return { quizId: null, error: quizError?.message || "Failed to create quiz" };
  }

  // 2. Insert questions
  const questionRows = questions.map((q, i) => ({
    quiz_id: quiz.id,
    question_text: q.question,
    options: q.options,
    correct_index: q.correctIndex,
    sort_order: i + 1,
  }));

  const { error: qError } = await supabase
    .from("quiz_questions")
    .insert(questionRows);

  if (qError) {
    // Cleanup quiz if questions fail
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    return { quizId: null, error: qError.message };
  }

  return { quizId: quiz.id, error: null };
}

// ============================================
// Fetch Quizzes
// ============================================

export async function fetchUserQuizzes(userId: string): Promise<{
  quizzes: Quiz[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { quizzes: [], error: error.message };

  // Get question counts and best scores
  const quizzes: Quiz[] = [];
  for (const quiz of data) {
    const { count } = await supabase
      .from("quiz_questions")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id);

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("score")
      .eq("quiz_id", quiz.id)
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .limit(1);

    quizzes.push({
      ...quiz,
      question_count: count ?? 0,
      best_score: attempts && attempts.length > 0 ? attempts[0].score : null,
    });
  }

  return { quizzes, error: null };
}

// ============================================
// Fetch Quiz with Questions
// ============================================

export async function fetchQuizWithQuestions(quizId: string): Promise<{
  quiz: Quiz | null;
  questions: QuizQuestion[];
  error: string | null;
}> {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) {
    return { quiz: null, questions: [], error: quizError?.message || "Quiz not found" };
  }

  const { data: questions, error: qError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });

  if (qError) {
    return { quiz, questions: [], error: qError.message };
  }

  return { quiz, questions: questions as QuizQuestion[], error: null };
}

// ============================================
// Submit Attempt
// ============================================

export async function submitAttempt(
  userId: string,
  quizId: string,
  answers: number[],
  timeTaken: number
): Promise<{
  attempt: QuizAttempt | null;
  leveledUp: boolean;
  newLevel: number;
  error: string | null;
}> {
  // 1. Fetch questions to score
  const { questions, error: fetchError } = await fetchQuizWithQuestions(quizId);
  if (fetchError || questions.length === 0) {
    return { attempt: null, leveledUp: false, newLevel: 0, error: fetchError || "No questions" };
  }

  // 2. Calculate score
  let score = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correct_index) {
      score++;
    }
  }

  const total = questions.length;
  const xpEarned = calculateQuizXP(score, total);

  // 3. Save attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      quiz_id: quizId,
      score,
      total,
      xp_earned: xpEarned,
      time_taken_seconds: timeTaken,
      answers,
    })
    .select()
    .single();

  if (attemptError) {
    return { attempt: null, leveledUp: false, newLevel: 0, error: attemptError.message };
  }

  // 4. Update profile XP
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("id", userId)
    .single();

  if (profile) {
    const newXP = profile.xp + xpEarned;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > profile.level;

    await supabase
      .from("profiles")
      .update({ xp: newXP, level: newLevel })
      .eq("id", userId);

    return { attempt: attempt as QuizAttempt, leveledUp, newLevel, error: null };
  }

  return { attempt: attempt as QuizAttempt, leveledUp: false, newLevel: 0, error: null };
}

// ============================================
// Fetch Attempts
// ============================================

export async function fetchQuizAttempts(
  userId: string,
  quizId: string
): Promise<QuizAttempt[]> {
  const { data } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .order("completed_at", { ascending: false });

  return (data as QuizAttempt[]) || [];
}

// ============================================
// Delete Quiz
// ============================================

export async function deleteQuiz(quizId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  return { error: error?.message || null };
}
