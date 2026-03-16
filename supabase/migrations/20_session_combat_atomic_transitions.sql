-- =============================================
-- Migration 20: Align session combat schema with runtime
-- and atomically persist critical shared-combat transitions.
-- =============================================

ALTER TABLE public.session_combat_states
  DROP CONSTRAINT IF EXISTS session_combat_states_status_check;

ALTER TABLE public.session_combat_states
  ADD CONSTRAINT session_combat_states_status_check
  CHECK (status IN ('idle', 'initiative', 'active', 'ended'));

CREATE OR REPLACE FUNCTION public.apply_session_combat_state_transition(
  p_session_id UUID,
  p_status TEXT,
  p_round INTEGER,
  p_turn_index INTEGER,
  p_participants JSONB,
  p_turn_player_id UUID DEFAULT NULL,
  p_emit_turn_advanced BOOLEAN DEFAULT FALSE,
  p_world_id UUID DEFAULT NULL,
  p_character_id UUID DEFAULT NULL,
  p_event_content TEXT DEFAULT '[SISTEMA_TURNO_SIGUIENTE]',
  p_event_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'session_id is required';
  END IF;

  IF p_status NOT IN ('idle', 'initiative', 'active', 'ended') THEN
    RAISE EXCEPTION 'invalid session combat status: %', p_status;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.game_sessions gs
    WHERE gs.id = p_session_id
      AND (
        gs.host_id = v_actor_id
        OR EXISTS (
          SELECT 1
          FROM public.session_players sp
          WHERE sp.session_id = gs.id
            AND sp.user_id = v_actor_id
            AND sp.status = 'joined'
        )
      )
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'not authorized to mutate this session combat state';
  END IF;

  INSERT INTO public.session_combat_states AS scs (
    session_id,
    status,
    round,
    turn_index,
    participants
  ) VALUES (
    p_session_id,
    p_status,
    GREATEST(COALESCE(p_round, 1), 1),
    GREATEST(COALESCE(p_turn_index, 0), 0),
    COALESCE(p_participants, '[]'::jsonb)
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    round = EXCLUDED.round,
    turn_index = EXCLUDED.turn_index,
    participants = EXCLUDED.participants,
    updated_at = timezone('utc'::text, now());

  UPDATE public.game_sessions
  SET turn_player_id = p_turn_player_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_session_id;

  IF p_emit_turn_advanced THEN
    INSERT INTO public.narrative_events (
      world_id,
      character_id,
      role,
      content,
      session_id,
      event_type,
      payload
    ) VALUES (
      p_world_id,
      p_character_id,
      'system',
      COALESCE(NULLIF(p_event_content, ''), '[SISTEMA_TURNO_SIGUIENTE]'),
      p_session_id,
      'turn_advanced',
      COALESCE(p_event_payload, '{}'::jsonb)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_session_combat_state_transition(
  UUID,
  TEXT,
  INTEGER,
  INTEGER,
  JSONB,
  UUID,
  BOOLEAN,
  UUID,
  UUID,
  TEXT,
  JSONB
) TO authenticated;