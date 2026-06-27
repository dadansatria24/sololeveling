-- ============================================
-- Solo Leveling v3 — Full Schema (Reference)
-- ============================================

-- 1. profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  display_name TEXT,
  is_guided BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user'
);

-- 2. skill_nodes table (per-user skill tree)
CREATE TABLE skill_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES skill_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT NOT NULL DEFAULT '📖',
  xp_reward INTEGER NOT NULL DEFAULT 10,
  tier INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  times_completed INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  is_unlocked BOOLEAN DEFAULT true,
  copied_from_id UUID REFERENCES skill_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_nodes_user_id ON skill_nodes(user_id);
CREATE INDEX idx_skill_nodes_parent_id ON skill_nodes(parent_id);

-- 3. node_completions table (grind log)
CREATE TABLE node_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  xp_earned INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_node_completions_user_id ON node_completions(user_id);
CREATE INDEX idx_node_completions_node_id ON node_completions(node_id);

-- 4. quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Quiz',
  description TEXT DEFAULT '',
  time_per_question INTEGER NOT NULL DEFAULT 30,
  is_public BOOLEAN DEFAULT false,
  copied_from_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);

-- 5. quiz_questions table
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- 6. quiz_attempts table
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users and mentors can view profiles"
  ON profiles FOR SELECT USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Users and mentors can update profiles"
  ON profiles FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- skill_nodes
CREATE POLICY "Select skill nodes"
  ON skill_nodes FOR SELECT USING (auth.uid() = user_id OR is_public = true OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Insert skill nodes"
  ON skill_nodes FOR INSERT WITH CHECK (auth.uid() = user_id OR ((SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor' AND (SELECT is_guided FROM profiles WHERE id = skill_nodes.user_id) = true));
CREATE POLICY "Update skill nodes"
  ON skill_nodes FOR UPDATE USING (auth.uid() = user_id OR ((SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor' AND (SELECT is_guided FROM profiles WHERE id = skill_nodes.user_id) = true));
CREATE POLICY "Delete skill nodes"
  ON skill_nodes FOR DELETE USING (auth.uid() = user_id OR ((SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor' AND (SELECT is_guided FROM profiles WHERE id = skill_nodes.user_id) = true));

-- node_completions
CREATE POLICY "Users can view own completions"
  ON node_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions"
  ON node_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- quizzes
CREATE POLICY "Select quizzes"
  ON quizzes FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own quizzes"
  ON quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes"
  ON quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes"
  ON quizzes FOR DELETE USING (auth.uid() = user_id);

-- quiz_questions
CREATE POLICY "Select quiz questions"
  ON quiz_questions FOR SELECT USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND (quizzes.user_id = auth.uid() OR quizzes.is_public = true)));
CREATE POLICY "Users can insert questions to own quizzes"
  ON quiz_questions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can delete questions from own quizzes"
  ON quiz_questions FOR DELETE USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

-- quiz_attempts
CREATE POLICY "Users can view own attempts"
  ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts"
  ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Functions & Triggers
-- ============================================

CREATE OR REPLACE FUNCTION seed_default_tree(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.skill_nodes (user_id, title, description, icon, xp_reward, tier, sort_order) VALUES
    (p_user_id, 'Read Comics', 'Read English comics or manga with English translation', '📖', 10, 1, 1),
    (p_user_id, 'Watch Cartoons', 'Watch cartoons or anime with English subtitles', '🎬', 10, 1, 2),
    (p_user_id, 'Listen to Songs', 'Listen to English songs and read the lyrics', '🎵', 10, 1, 3),
    (p_user_id, 'Learn Basic Words', 'Study and memorize 10 new basic vocabulary words', '📝', 10, 1, 4),
    (p_user_id, 'Read Simple Stories', 'Read simple English short stories or graded readers', '📕', 15, 2, 1),
    (p_user_id, 'Watch YouTube', 'Watch English YouTube videos (vlogs, tutorials)', '📺', 15, 2, 2),
    (p_user_id, 'Basic Conversation', 'Practice basic English conversation', '💬', 15, 2, 3),
    (p_user_id, 'Grammar Basics', 'Study basic grammar rules', '📐', 15, 2, 4),
    (p_user_id, 'Read Articles', 'Read short English articles or blog posts', '📰', 20, 3, 1),
    (p_user_id, 'Simple Podcasts', 'Listen to beginner-friendly English podcasts', '🎧', 20, 3, 2),
    (p_user_id, 'Write Paragraphs', 'Write short paragraphs in English', '✍️', 20, 3, 3),
    (p_user_id, 'Speak with Partner', 'Practice speaking English with a partner', '🗣️', 20, 3, 4),
    (p_user_id, 'Read News', 'Read English news articles (BBC, CNN, etc.)', '📰', 30, 4, 1),
    (p_user_id, 'Intermediate Podcasts', 'Listen to intermediate podcasts or TED Talks', '🎧', 30, 4, 2),
    (p_user_id, 'Write Essays', 'Write English essays (300+ words)', '📝', 30, 4, 3),
    (p_user_id, 'Give Presentations', 'Practice giving presentations in English', '🎤', 30, 4, 4),
    (p_user_id, 'Academic Articles', 'Read academic or research articles in English', '📚', 40, 5, 1),
    (p_user_id, 'Listen to Lectures', 'Watch university lectures in English', '🎓', 40, 5, 2),
    (p_user_id, 'Academic Writing', 'Write formal academic essays', '✍️', 40, 5, 3),
    (p_user_id, 'Debate Practice', 'Practice debate on complex topics', '🗣️', 40, 5, 4),
    (p_user_id, 'IELTS Reading', 'Practice IELTS Reading test sections', '📖', 50, 6, 1),
    (p_user_id, 'IELTS Listening', 'Practice IELTS Listening test sections', '🎧', 50, 6, 2),
    (p_user_id, 'IELTS Writing', 'Practice IELTS Writing Task 1 and Task 2', '✍️', 50, 6, 3),
    (p_user_id, 'IELTS Speaking', 'Practice IELTS Speaking mock interviews', '🎤', 50, 6, 4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email = 'mentor2435@gmail.com' THEN 'mentor' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;
  
  IF NEW.email <> 'mentor2435@gmail.com' THEN
    PERFORM seed_default_tree(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
