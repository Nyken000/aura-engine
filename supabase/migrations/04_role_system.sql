-- Migration: Admin/Player Role System
-- Adds role-based access control to Aura Engine.
-- Roles: 'admin' (owner/developer) | 'player' (default for all new users)
--
-- What changes:
--   1. profiles table gets a `role` column
--   2. rule_books becomes GLOBAL (uploaded by admin, used by everyone)
--   3. Storage policies for rule-books bucket are updated
--   4. Dashboard Library is only visible/accessible to admins

-- ════════════════════════════════════════════════════════
-- 1. Add `role` to profiles
-- ════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'
  CHECK (role IN ('admin', 'player'));

-- Convenience function: returns true if the current user is an admin
-- Used in RLS policies throughout the app.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ════════════════════════════════════════════════════════
-- 2. Update trigger to set admin role for the FIRST user
--    (the project owner who deploys the app)
--    All subsequent users get 'player' by default.
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count INT;
BEGIN
  -- Count existing users to determine if this is the first one (admin)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  INSERT INTO public.profiles (id, username, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url',
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'player' END
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE WHEN user_count = 0 THEN 'admin' ELSE profiles.role END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════
-- 3. Rebuild rule_books as GLOBAL (admin-owned, player-readable)
-- ════════════════════════════════════════════════════════

-- Drop the old per-user table if it exists from migration 03
DROP TABLE IF EXISTS public.rule_books;

CREATE TABLE public.rule_books (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- admin who uploaded
  title            TEXT NOT NULL,
  description      TEXT,
  file_name        TEXT NOT NULL,
  storage_path     TEXT NOT NULL,          -- Supabase Storage path (rule-books bucket)
  file_size        BIGINT,
  mime_type        TEXT DEFAULT 'application/pdf',
  gemini_file_uri  TEXT,                   -- Gemini File API URI  e.g. "files/abc123"
  gemini_file_name TEXT,                   -- Gemini internal name (for deletion)
  gemini_state     TEXT DEFAULT 'PROCESSING' CHECK (gemini_state IN ('PROCESSING', 'ACTIVE', 'FAILED')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rule_books_state_idx ON public.rule_books(gemini_state);

ALTER TABLE public.rule_books ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage rule books"
ON public.rule_books FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated users can READ active rule books (needed for GM to reference them)
CREATE POLICY "Players can read active rule books"
ON public.rule_books FOR SELECT
USING (gemini_state = 'ACTIVE');

-- ════════════════════════════════════════════════════════
-- 4. Supabase Storage policies for "rule-books" bucket
-- These replace the need for manual policy setup in the UI.
-- Run after creating the bucket in the Supabase dashboard.
-- ════════════════════════════════════════════════════════

-- Admins can upload files to the rule-books bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' 
    AND policyname = 'Admins upload rule book PDFs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins upload rule book PDFs"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'rule-books' AND
        public.is_admin()
      )
    $policy$;
  END IF;
END $$;

-- Admins can delete files from the rule-books bucket  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' 
    AND policyname = 'Admins delete rule book PDFs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins delete rule book PDFs"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'rule-books' AND
        public.is_admin()
      )
    $policy$;
  END IF;
END $$;

-- All authenticated users can read files (needed for download links / GM context)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' 
    AND policyname = 'Authenticated users read rule books'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users read rule books"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'rule-books' AND
        auth.role() = 'authenticated'
      )
    $policy$;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════
-- MANUAL STEP: Promote your account to admin
-- Replace 'YOUR_EMAIL_HERE' with your actual account email
-- and run this in the SQL Editor after the migration:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');
--
-- ════════════════════════════════════════════════════════
