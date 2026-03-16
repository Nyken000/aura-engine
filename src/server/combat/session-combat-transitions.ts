import type { SupabaseClient } from '@supabase/supabase-js'
import type { JsonObject, SessionCombatStateRecord } from './session-combat'

export type SessionCombatTransitionEvent = {
    worldId?: string | null
    characterId?: string | null
    content?: string
    payload?: JsonObject
} | null

export async function persistSessionCombatTransition(params: {
    supabase: SupabaseClient
    sessionId: string
    combatState: SessionCombatStateRecord
    turnPlayerId: string | null
    turnAdvancedEvent?: SessionCombatTransitionEvent
}): Promise<void> {
    const { supabase, sessionId, combatState, turnPlayerId, turnAdvancedEvent } = params

    const { error } = await supabase.rpc('apply_session_combat_state_transition', {
        p_session_id: sessionId,
        p_status: combatState.status,
        p_round: combatState.round,
        p_turn_index: combatState.turn_index,
        p_participants: combatState.participants,
        p_turn_player_id: turnPlayerId,
        p_emit_turn_advanced: Boolean(turnAdvancedEvent),
        p_world_id: turnAdvancedEvent?.worldId ?? null,
        p_character_id: turnAdvancedEvent?.characterId ?? null,
        p_event_content: turnAdvancedEvent?.content ?? '[SISTEMA_TURNO_SIGUIENTE]',
        p_event_payload: turnAdvancedEvent?.payload ?? {},
    })

    if (error) {
        throw new Error(`Error al persistir transición de combate compartido: ${error.message}`)
    }
}