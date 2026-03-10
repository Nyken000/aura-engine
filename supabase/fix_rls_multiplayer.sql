-- 1. Drop the old conflicting policies for game_sessions
DROP POLICY IF EXISTS "Sessions are viewable by participants and by lobby status" ON public.game_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Host can update their session" ON public.game_sessions;
DROP POLICY IF EXISTS "Host can delete their session" ON public.game_sessions;

-- 2. Create the fixed policies for game_sessions
-- Anyone can SELECT a lobby session
-- Only the host can UPDATE/DELETE their session
-- Session participants can SELECT the session
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

-- 3. Drop the old conflicting policies for session_players
DROP POLICY IF EXISTS "Session players can view each other" ON public.session_players;
DROP POLICY IF EXISTS "Authenticated users can join sessions" ON public.session_players;
DROP POLICY IF EXISTS "Host and player can update session_player status" ON public.session_players;
DROP POLICY IF EXISTS "Player can update own status" ON public.session_players;
DROP POLICY IF EXISTS "Host can update any session_player status" ON public.session_players;

-- 4. Create the fixed policies for session_players
-- An authenticated user can always SELECT any session_player record
-- (this prevents the infinite recursion loop with game_sessions)
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
