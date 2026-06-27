-- ============================================
-- Solo Leveling - Supabase Schema
-- ============================================

-- 1. profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE
);

-- 2. daily_quests table
CREATE TABLE daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  comic_done BOOLEAN NOT NULL DEFAULT false,
  reading_done BOOLEAN NOT NULL DEFAULT false,
  listening_done BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, date)
);

-- 3. xp_logs table
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
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- daily_quests: users can CRUD their own quests
CREATE POLICY "Users can view own daily quests"
  ON daily_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily quests"
  ON daily_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily quests"
  ON daily_quests FOR UPDATE
  USING (auth.uid() = user_id);

-- xp_logs: users can read/insert their own logs
CREATE POLICY "Users can view own xp logs"
  ON xp_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp logs"
  ON xp_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Trigger: auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
