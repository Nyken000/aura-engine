-- =============================================
-- Migration 18: Stable event ordering + client reconciliation
-- =============================================

-- 1) Session-scoped monotonic cursor
ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS event_cursor BIGINT NOT NULL DEFAULT 0;

-- 2) Narrative event reconciliation + ordering metadata
ALTER TABLE public.narrative_events
  ADD COLUMN IF NOT EXISTS event_index BIGINT,
  ADD COLUMN IF NOT EXISTS client_event_id UUID,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill old rows to avoid null ordering in legacy data
UPDATE public.narrative_events
SET event_type = COALESCE(event_type, 'message')
WHERE event_type IS NULL;

UPDATE public.narrative_events
SET payload = COALESCE(payload, '{}'::jsonb)
WHERE payload IS NULL;

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_narrative_events_session_order
  ON public.narrative_events (session_id, event_index ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_narrative_events_session_client_event_id
  ON public.narrative_events (session_id, client_event_id);

CREATE INDEX IF NOT EXISTS idx_narrative_events_character_order
  ON public.narrative_events (character_id, created_at ASC);

-- Unique only when both values exist
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_events_session_client_event_id
  ON public.narrative_events (session_id, client_event_id)
  WHERE session_id IS NOT NULL AND client_event_id IS NOT NULL;

-- 4) Allocator for stable session ordering
CREATE OR REPLACE FUNCTION public.allocate_session_event_index(target_session_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  next_index BIGINT;
BEGIN
  IF target_session_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.game_sessions
  SET event_cursor = event_cursor + 1
  WHERE id = target_session_id
  RETURNING event_cursor INTO next_index;

  RETURN next_index;
END;
$$;

-- 5) Trigger to assign event_index automatically
CREATE OR REPLACE FUNCTION public.assign_narrative_event_index()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL AND NEW.event_index IS NULL THEN
    NEW.event_index := public.allocate_session_event_index(NEW.session_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_narrative_event_index ON public.narrative_events;

CREATE TRIGGER trg_assign_narrative_event_index
  BEFORE INSERT ON public.narrative_events
  FOR EACH ROW
  EXECUTE PROCEDURE public.assign_narrative_event_index();