-- 01_character_expansion.sql
-- Extension to the characters table to support the new gameplay mechanics

ALTER TABLE public.characters
ADD COLUMN hp_current INTEGER DEFAULT 10,
ADD COLUMN hp_max INTEGER DEFAULT 10,
ADD COLUMN hit_dice TEXT,
ADD COLUMN skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN status_effects JSONB DEFAULT '[]'::jsonb;
