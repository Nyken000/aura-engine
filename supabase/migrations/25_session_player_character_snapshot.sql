-- =============================================
-- Migration 25: Session player character snapshot
-- Stores the selected character snapshot directly on session_players
-- so multiplayer lobby/session UIs do not depend on cross-user
-- reads against public.characters.
-- =============================================

ALTER TABLE public.session_players
  ADD COLUMN IF NOT EXISTS selected_character_name TEXT,
  ADD COLUMN IF NOT EXISTS selected_character_stats JSONB,
  ADD COLUMN IF NOT EXISTS selected_character_hp_current INTEGER,
  ADD COLUMN IF NOT EXISTS selected_character_hp_max INTEGER;

COMMENT ON COLUMN public.session_players.selected_character_name IS
  'Snapshot of the selected character name visible to all session participants.';

COMMENT ON COLUMN public.session_players.selected_character_stats IS
  'Snapshot of selected character stats at selection time for multiplayer UI rendering.';

COMMENT ON COLUMN public.session_players.selected_character_hp_current IS
  'Snapshot of selected character current HP at selection time.';

COMMENT ON COLUMN public.session_players.selected_character_hp_max IS
  'Snapshot of selected character max HP at selection time.';

UPDATE public.session_players sp
SET
  selected_character_name = c.name,
  selected_character_stats = c.stats,
  selected_character_hp_current = c.hp_current,
  selected_character_hp_max = c.hp_max
FROM public.characters c
WHERE sp.character_id = c.id
  AND (
    sp.selected_character_name IS DISTINCT FROM c.name
    OR sp.selected_character_stats IS DISTINCT FROM c.stats
    OR sp.selected_character_hp_current IS DISTINCT FROM c.hp_current
    OR sp.selected_character_hp_max IS DISTINCT FROM c.hp_max
  );

UPDATE public.session_players
SET
  selected_character_name = NULL,
  selected_character_stats = NULL,
  selected_character_hp_current = NULL,
  selected_character_hp_max = NULL
WHERE character_id IS NULL
  AND (
    selected_character_name IS NOT NULL
    OR selected_character_stats IS NOT NULL
    OR selected_character_hp_current IS NOT NULL
    OR selected_character_hp_max IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_session_players_session_joined_order
  ON public.session_players (session_id, status, joined_at);