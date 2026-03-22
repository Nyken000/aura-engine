-- =============================================
-- Migration 27: Enable realtime publication for
-- multiplayer session tables.
--
-- Fixes missing cross-client updates where rows
-- are persisted correctly but postgres_changes
-- does not emit to subscribed clients.
-- =============================================

ALTER TABLE public.narrative_events REPLICA IDENTITY FULL;
ALTER TABLE public.session_players REPLICA IDENTITY FULL;
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.session_combat_states REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'narrative_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.narrative_events;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_combat_states'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_combat_states;
  END IF;
END
$$;