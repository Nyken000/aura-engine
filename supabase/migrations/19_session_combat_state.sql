-- =============================================
-- Migration 19: Session-scoped combat state
-- Multiplayer combat must live on the session,
-- not on individual characters.
-- =============================================

CREATE TABLE IF NOT EXISTS public.session_combat_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'ended')),
  round INTEGER NOT NULL DEFAULT 1,
  turn_index INTEGER NOT NULL DEFAULT 0,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.session_combat_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_session_combat_states_session_id
  ON public.session_combat_states (session_id);

CREATE POLICY "Session combat is viewable by participants"
  ON public.session_combat_states
  FOR SELECT
  USING (
    session_id IN (
      SELECT sp.session_id
      FROM public.session_players sp
      WHERE sp.user_id = auth.uid()
    )
    OR
    session_id IN (
      SELECT gs.id
      FROM public.game_sessions gs
      WHERE gs.host_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create session combat"
  ON public.session_combat_states
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT sp.session_id
      FROM public.session_players sp
      WHERE sp.user_id = auth.uid()
    )
    OR
    session_id IN (
      SELECT gs.id
      FROM public.game_sessions gs
      WHERE gs.host_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update session combat"
  ON public.session_combat_states
  FOR UPDATE
  USING (
    session_id IN (
      SELECT sp.session_id
      FROM public.session_players sp
      WHERE sp.user_id = auth.uid()
    )
    OR
    session_id IN (
      SELECT gs.id
      FROM public.game_sessions gs
      WHERE gs.host_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS on_session_combat_states_updated ON public.session_combat_states;

CREATE TRIGGER on_session_combat_states_updated
  BEFORE UPDATE ON public.session_combat_states
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();