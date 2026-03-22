-- =============================================
-- Migration 26: Allow session participants to read
-- narrative events scoped to their joined session.
-- Fixes multiplayer group chat visibility where
-- each player could only see their own messages.
-- =============================================

DROP POLICY IF EXISTS "Session participants can view session narrative events"
  ON public.narrative_events;

CREATE POLICY "Session participants can view session narrative events"
  ON public.narrative_events
  FOR SELECT
  USING (
    session_id IS NOT NULL
    AND session_id IN (
      SELECT sp.session_id
      FROM public.session_players sp
      WHERE sp.user_id = auth.uid()
        AND sp.status = 'joined'
    )
  );