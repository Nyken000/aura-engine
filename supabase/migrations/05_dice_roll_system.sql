-- 05_dice_roll_system.sql
-- Extension to the narrative_events table to support GM-requested dice rolls

ALTER TABLE public.narrative_events
ADD COLUMN dice_roll_required JSONB DEFAULT NULL;
