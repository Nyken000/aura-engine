-- Add campaign_id column to characters table to track which campaign the character is playing
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS campaign_id TEXT;
