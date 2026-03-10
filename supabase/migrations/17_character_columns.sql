-- 17_character_columns.sql
-- Add missing columns to characters table needed by the character creation system
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS background_story TEXT,
ADD COLUMN IF NOT EXISTS background_id UUID,
ADD COLUMN IF NOT EXISTS combat_state JSONB DEFAULT NULL;
