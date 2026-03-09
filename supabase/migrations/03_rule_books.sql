-- Migration: Rule Books (PDF Library)
-- Stores references to D&D rulebook PDFs uploaded by the user
-- Each book has a Supabase Storage URL and a Gemini File API URI

CREATE TABLE IF NOT EXISTS rule_books (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,                        -- "Player's Handbook (5E)"
  description TEXT,                                 -- Short note about what's in it
  file_name   TEXT NOT NULL,                        -- Original filename
  storage_path TEXT NOT NULL,                       -- Supabase Storage path
  file_size   BIGINT,                               -- Bytes
  mime_type   TEXT DEFAULT 'application/pdf',
  gemini_file_uri  TEXT,                            -- Gemini File API URI (e.g. "files/abc123")
  gemini_file_name TEXT,                            -- Gemini internal file name
  gemini_state     TEXT DEFAULT 'PROCESSING',       -- PROCESSING | ACTIVE | FAILED
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup per user
CREATE INDEX IF NOT EXISTS rule_books_user_id_idx ON rule_books(user_id);

-- RLS: Users can only access their own rule books
ALTER TABLE rule_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own rule books"
ON rule_books FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
