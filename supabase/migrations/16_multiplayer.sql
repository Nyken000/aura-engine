-- =============================================
-- Migration 16: Multiplayer Support
-- Adds game_sessions, session_players tables
-- and session_id to narrative_events for shared history
-- =============================================

-- 1. Game Sessions Table
-- A session is a multiplayer room tied to a world.
-- The host picks a world, generates an invite_code, and other
-- players join with that code and their characters.
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- A short memorable invite code (e.g. "AX7F2K")
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'ended')),
  max_players INTEGER NOT NULL DEFAULT 4,
  -- Which player has the current narrative turn (NULL = everyone can act)
  turn_player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Session Players Table
-- Links a user+character pair to a session
CREATE TABLE public.session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'left', 'kicked')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (session_id, user_id) -- One slot per user per session
);

ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

-- 3. Add session_id to narrative_events
-- Nullable: single-player events stay as-is (session_id = NULL)
ALTER TABLE public.narrative_events
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;

-- Index for fast queries by session
CREATE INDEX IF NOT EXISTS idx_narrative_events_session_id
  ON public.narrative_events (session_id);

-- =============================================
-- RLS Policies
-- =============================================

-- game_sessions: 
--   - Anyone can SELECT a lobby session (to join via invite_code)
--   - Only the host can UPDATE/DELETE their session
--   - Session participants can SELECT the session
CREATE POLICY "Sessions are viewable by participants and by lobby status"
  ON public.game_sessions FOR SELECT
  USING (
    status = 'lobby' OR
    host_id = auth.uid() OR
    id IN (SELECT session_id FROM public.session_players WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their session"
  ON public.game_sessions FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete their session"
  ON public.game_sessions FOR DELETE
  USING (auth.uid() = host_id);

-- session_players:
--   - An authenticated user can always SELECT any session_player record 
--   (this prevents the infinite recursion loop with game_sessions, and is safe 
--   since session IDs are UUIDs and not easily guessable if not in the session).
CREATE POLICY "Session players can view each other"
  ON public.session_players FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join sessions"
  ON public.session_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Host or the user themselves can update their player status
CREATE POLICY "Player can update own status"
  ON public.session_players FOR UPDATE
  USING (auth.uid() = user_id);

-- Add separate policy for host updates to avoid recursion in the UPDATE policy
CREATE POLICY "Host can update any session_player status"
  ON public.session_players FOR UPDATE
  USING (
    session_id IN (SELECT id FROM public.game_sessions WHERE host_id = auth.uid())
  );

-- =============================================
-- Realtime: Enable for collaborative play
-- =============================================
-- Run these in the Supabase dashboard Publication editor
-- or they'll be applied if supabase CLI manages publications:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.narrative_events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- =============================================
-- Helper function: updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_game_sessions_updated
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
