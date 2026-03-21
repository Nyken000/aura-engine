import { useCallback, useEffect, useState } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import type {
    NarrativeEvent,
    RealtimeInsertPayload,
    RealtimeUpdatePayload,
    SessionCombatState,
    SessionData,
    SessionPlayer,
} from '../types'

type RealtimeClient = ReturnType<typeof import('@/utils/supabase/client').createClient>

type UseGameRealtimeParams = {
    supabase: RealtimeClient
    sessionId: string | null
    session: SessionData | null | undefined
    sessionPlayers: SessionPlayer[] | undefined
    sessionCombatState: SessionCombatState | null | undefined
    router: AppRouterInstance
    onNarrativeEvent: (event: NarrativeEvent) => void
}

export function useGameRealtime({
    supabase,
    sessionId,
    session,
    sessionPlayers,
    sessionCombatState,
    router,
    onNarrativeEvent,
}: UseGameRealtimeParams) {
    const [activeSessionPlayers, setActiveSessionPlayers] = useState<SessionPlayer[]>(sessionPlayers || [])
    const [liveSession, setLiveSession] = useState<SessionData | null>(session || null)
    const [liveSessionCombat, setLiveSessionCombat] = useState<SessionCombatState | null>(
        sessionCombatState || null,
    )

    useEffect(() => {
        setActiveSessionPlayers(sessionPlayers || [])
    }, [sessionPlayers])

    useEffect(() => {
        setLiveSession(session || null)
    }, [session])

    useEffect(() => {
        setLiveSessionCombat(sessionCombatState || null)
    }, [sessionCombatState])

    const refreshSessionPlayers = useCallback(async () => {
        if (!sessionId) return

        const { data, error } = await supabase
            .from('session_players')
            .select(
                '*, profiles!user_id(id, username, avatar_url), characters(id, name, stats, hp_current, hp_max)',
            )
            .eq('session_id', sessionId)
            .eq('status', 'joined')
            .order('joined_at', { ascending: true })

        if (error) {
            console.error('Failed to refresh session players:', error)
            router.refresh()
            return
        }

        setActiveSessionPlayers((data as SessionPlayer[] | null) ?? [])
    }, [sessionId, supabase, router])

    useEffect(() => {
        if (!sessionId) return

        void refreshSessionPlayers()
    }, [sessionId, refreshSessionPlayers])

    useEffect(() => {
        if (!sessionId) return

        const channel = supabase
            .channel(`game:${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'narrative_events',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: RealtimeInsertPayload<NarrativeEvent>) => {
                    onNarrativeEvent(payload.new)
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'narrative_events',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: RealtimeUpdatePayload<NarrativeEvent>) => {
                    onNarrativeEvent(payload.new)
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_sessions',
                    filter: `id=eq.${sessionId}`,
                },
                (payload: RealtimeUpdatePayload<SessionData>) => {
                    setLiveSession((prev) => ({ ...(prev || session || null), ...payload.new }))
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'session_combat_states',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: RealtimeUpdatePayload<SessionCombatState>) => {
                    setLiveSessionCombat(payload.new)
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'session_combat_states',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: RealtimeInsertPayload<SessionCombatState>) => {
                    setLiveSessionCombat(payload.new)
                },
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_players',
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    void refreshSessionPlayers()
                },
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [sessionId, session, supabase, onNarrativeEvent, refreshSessionPlayers])

    return {
        activeSessionPlayers,
        liveSession,
        liveSessionCombat,
    }
}