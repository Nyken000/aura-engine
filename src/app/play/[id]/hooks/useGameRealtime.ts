import { useCallback, useEffect, useState } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import type {
    CharacterSheet,
    NarrativeEvent,
    NpcRelationship,
    NpcRelationshipEvent,
    RealtimeInsertPayload,
    RealtimeUpdatePayload,
    SessionCombatState,
    SessionCompanion,
    SessionData,
    SessionPlayer,
    SessionQuest,
    SessionQuestUpdate,
} from '../types'

type RealtimeClient = ReturnType<typeof import('@/utils/supabase/client').createClient>

type UseGameRealtimeParams = {
    supabase: RealtimeClient
    initialCharacter: CharacterSheet
    initialEvents: NarrativeEvent[]
    initialSessionQuests: SessionQuest[]
    initialSessionQuestUpdates: SessionQuestUpdate[]
    initialNpcRelationships: NpcRelationship[]
    initialNpcRelationshipEvents: NpcRelationshipEvent[]
    initialSessionCompanions: SessionCompanion[]
    sessionId: string | null
    session: SessionData | null | undefined
    sessionPlayers: SessionPlayer[] | undefined
    sessionCombatState: SessionCombatState | null | undefined
    router: AppRouterInstance
    onNarrativeEvent?: (event: NarrativeEvent) => void
}

export function useGameRealtime({
    supabase,
    initialCharacter,
    initialEvents,
    initialSessionQuests,
    initialSessionQuestUpdates,
    initialNpcRelationships,
    initialNpcRelationshipEvents,
    initialSessionCompanions,
    sessionId,
    session,
    sessionPlayers,
    sessionCombatState,
    router,
    onNarrativeEvent,
}: UseGameRealtimeParams) {
    const [activeSessionPlayers, setActiveSessionPlayers] = useState<SessionPlayer[]>(sessionPlayers || [])
    const [activeSessionQuests, setActiveSessionQuests] = useState<SessionQuest[]>(initialSessionQuests || [])
    const [activeSessionQuestUpdates, setActiveSessionQuestUpdates] = useState<SessionQuestUpdate[]>(
        initialSessionQuestUpdates || [],
    )
    const [activeNpcRelationships, setActiveNpcRelationships] = useState<NpcRelationship[]>(
        initialNpcRelationships || [],
    )
    const [activeNpcRelationshipEvents, setActiveNpcRelationshipEvents] = useState<NpcRelationshipEvent[]>(
        initialNpcRelationshipEvents || [],
    )
    const [activeSessionCompanions, setActiveSessionCompanions] = useState<SessionCompanion[]>(
        initialSessionCompanions || [],
    )
    const [liveSession, setLiveSession] = useState<SessionData | null>(session || null)
    const [liveSessionCombat, setLiveSessionCombat] = useState<SessionCombatState | null>(
        sessionCombatState || null,
    )
    const [character, setCharacter] = useState<CharacterSheet>(initialCharacter)
    const [events, setEvents] = useState<NarrativeEvent[]>(initialEvents)

    const appendOptimisticEvent = useCallback((event: NarrativeEvent) => {
        setEvents((prev) => [...prev, event])
    }, [])

    const handleNarrativeEvent = useCallback(
        (event: NarrativeEvent) => {
            onNarrativeEvent?.(event)
            setEvents((prev) => {
                if (prev.some((e) => e.id === event.id)) return prev
                return [...prev, event].sort((a, b) => {
                    const indexA = a.event_index ?? Number.MAX_SAFE_INTEGER
                    const indexB = b.event_index ?? Number.MAX_SAFE_INTEGER

                    if (indexA !== indexB) return indexA - indexB
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                })
            })
        },
        [onNarrativeEvent],
    )

    useEffect(() => {
        setEvents(initialEvents)
    }, [initialEvents])

    useEffect(() => {
        setCharacter(initialCharacter)
    }, [initialCharacter])

    useEffect(() => {
        setActiveSessionPlayers(sessionPlayers || [])
    }, [sessionPlayers])

    useEffect(() => {
        setActiveSessionQuests(initialSessionQuests || [])
    }, [initialSessionQuests])

    useEffect(() => {
        setActiveSessionQuestUpdates(initialSessionQuestUpdates || [])
    }, [initialSessionQuestUpdates])

    useEffect(() => {
        setActiveNpcRelationships(initialNpcRelationships || [])
    }, [initialNpcRelationships])

    useEffect(() => {
        setActiveNpcRelationshipEvents(initialNpcRelationshipEvents || [])
    }, [initialNpcRelationshipEvents])

    useEffect(() => {
        setActiveSessionCompanions(initialSessionCompanions || [])
    }, [initialSessionCompanions])

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

    const refreshSessionQuests = useCallback(async () => {
        if (!sessionId) return

        const { data, error } = await supabase
            .from('session_quests')
            .select('*')
            .eq('session_id', sessionId)
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Failed to refresh session quests:', error)
            router.refresh()
            return
        }

        setActiveSessionQuests((data as SessionQuest[] | null) ?? [])
    }, [sessionId, supabase, router])

    const refreshSessionQuestUpdates = useCallback(async () => {
        if (!sessionId) return

        const { data, error } = await supabase
            .from('session_quest_updates')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Failed to refresh session quest updates:', error)
            router.refresh()
            return
        }

        setActiveSessionQuestUpdates((data as SessionQuestUpdate[] | null) ?? [])
    }, [sessionId, supabase, router])

    const refreshNpcRelationships = useCallback(async () => {
        if (!sessionId || !initialCharacter.id) return

        const { data, error } = await supabase
            .from('npc_relationships')
            .select('*')
            .eq('session_id', sessionId)
            .eq('character_id', initialCharacter.id)
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Failed to refresh npc relationships:', error)
            router.refresh()
            return
        }

        setActiveNpcRelationships((data as NpcRelationship[] | null) ?? [])
    }, [sessionId, supabase, router, initialCharacter.id])

    const refreshNpcRelationshipEvents = useCallback(async () => {
        if (!sessionId || !initialCharacter.id) return

        const { data, error } = await supabase
            .from('npc_relationship_events')
            .select('*')
            .eq('session_id', sessionId)
            .eq('character_id', initialCharacter.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Failed to refresh npc relationship events:', error)
            router.refresh()
            return
        }

        setActiveNpcRelationshipEvents((data as NpcRelationshipEvent[] | null) ?? [])
    }, [sessionId, supabase, router, initialCharacter.id])

    const refreshSessionCompanions = useCallback(async () => {
        if (!sessionId) return

        const { data, error } = await supabase
            .from('session_companions')
            .select('*')
            .eq('session_id', sessionId)
            .neq('status', 'left')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Failed to refresh session companions:', error)
            router.refresh()
            return
        }

        setActiveSessionCompanions((data as SessionCompanion[] | null) ?? [])
    }, [sessionId, supabase, router])

    useEffect(() => {
        if (!sessionId) return

        void refreshSessionPlayers()
        void refreshSessionQuests()
        void refreshSessionQuestUpdates()
        void refreshNpcRelationships()
        void refreshNpcRelationshipEvents()
        void refreshSessionCompanions()
    }, [
        sessionId,
        refreshSessionPlayers,
        refreshSessionQuests,
        refreshSessionQuestUpdates,
        refreshNpcRelationships,
        refreshNpcRelationshipEvents,
        refreshSessionCompanions,
    ])

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
                    handleNarrativeEvent(payload.new)
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
                    handleNarrativeEvent(payload.new)
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
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_quests',
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    void refreshSessionQuests()
                },
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_quest_updates',
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    void refreshSessionQuestUpdates()
                },
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'npc_relationships',
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    void refreshNpcRelationships()
                },
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'npc_relationship_events',
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    void refreshNpcRelationshipEvents()
                },
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_companions',
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    void refreshSessionCompanions()
                },
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [
        sessionId,
        session,
        supabase,
        handleNarrativeEvent,
        refreshSessionPlayers,
        refreshSessionQuests,
        refreshSessionQuestUpdates,
        refreshNpcRelationships,
        refreshNpcRelationshipEvents,
        refreshSessionCompanions,
    ])

    return {
        character,
        events,
        activeSessionPlayers,
        activeSessionQuests,
        activeSessionQuestUpdates,
        activeNpcRelationships,
        activeNpcRelationshipEvents,
        activeSessionCompanions,
        liveSession,
        liveSessionCombat,
        appendOptimisticEvent,
    }
}