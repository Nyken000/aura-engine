-- 06_combat_system.sql
-- Add combat_state to the characters table to persist combat encounters

ALTER TABLE public.characters
ADD COLUMN combat_state JSONB DEFAULT '{
  "in_combat": false,
  "turn": 0,
  "participants": []
}'::jsonb;
