-- ============================================
-- Solo Leveling v2 — Full Schema (Reference)
-- ============================================

-- 1. profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1
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

-- 4. xp_logs table (kept for general XP tracking)
CREATE TABLE xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  xp INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- skill_nodes
CREATE POLICY "Users can view own skill nodes"
  ON skill_nodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skill nodes"
  ON skill_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skill nodes"
  ON skill_nodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own skill nodes"
  ON skill_nodes FOR DELETE USING (auth.uid() = user_id);

-- node_completions
CREATE POLICY "Users can view own completions"
  ON node_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions"
  ON node_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- xp_logs
CREATE POLICY "Users can view own xp logs"
  ON xp_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp logs"
  ON xp_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

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
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  PERFORM seed_default_tree(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
