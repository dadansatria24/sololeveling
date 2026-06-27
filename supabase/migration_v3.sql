-- ============================================
-- Solo Leveling v3 — Custom Copy, Onboarding & Mentor Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Alter profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_guided BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Alter skill_nodes table
ALTER TABLE skill_nodes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE skill_nodes ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT true;
ALTER TABLE skill_nodes ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES skill_nodes(id) ON DELETE SET NULL;

-- 3. Alter quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES quizzes(id) ON DELETE SET NULL;

-- 4. Update Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users and mentors can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor');

CREATE POLICY "Users and mentors can update profiles"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor');

-- 5. Update Policies for skill_nodes to support mentor control
DROP POLICY IF EXISTS "Users can view own skill nodes" ON skill_nodes;
DROP POLICY IF EXISTS "Users can insert own skill nodes" ON skill_nodes;
DROP POLICY IF EXISTS "Users can update own skill nodes" ON skill_nodes;
DROP POLICY IF EXISTS "Users can delete own skill nodes" ON skill_nodes;

-- View: own, public templates, or guided students (for mentors)
CREATE POLICY "Select skill nodes"
  ON skill_nodes FOR SELECT
  USING (
    auth.uid() = user_id 
    OR is_public = true 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor'
  );

-- Insert: own or student (for mentors)
CREATE POLICY "Insert skill nodes"
  ON skill_nodes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor' 
      AND (SELECT is_guided FROM profiles WHERE id = skill_nodes.user_id) = true
    )
  );

-- Update: own or student (for mentors)
CREATE POLICY "Update skill nodes"
  ON skill_nodes FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor' 
      AND (SELECT is_guided FROM profiles WHERE id = skill_nodes.user_id) = true
    )
  );

-- Delete: own or student (for mentors)
CREATE POLICY "Delete skill nodes"
  ON skill_nodes FOR DELETE
  USING (
    auth.uid() = user_id 
    OR (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'mentor' 
      AND (SELECT is_guided FROM profiles WHERE id = skill_nodes.user_id) = true
    )
  );

-- 6. Update Policies for quizzes to allow viewing public ones
DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;

CREATE POLICY "Select quizzes"
  ON quizzes FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- 7. Update Policies for quiz_questions
DROP POLICY IF EXISTS "Users can view questions of own quizzes" ON quiz_questions;

CREATE POLICY "Select quiz questions"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND (quizzes.user_id = auth.uid() OR quizzes.is_public = true)
    )
  );

-- 8. Update handle_new_user trigger function to support role and seed
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile, set role to 'mentor' for the special email
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email = 'mentor2435@gmail.com' THEN 'mentor' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Seed tree ONLY for normal users
  IF NEW.email <> 'mentor2435@gmail.com' THEN
    PERFORM seed_default_tree(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
