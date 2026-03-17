'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import {
  Swords,
  Send,
  Heart,
  Backpack,
  Zap,
  Users,
  ScrollText,
  ArrowLeft,
  Shield,
  Flame,
  Target,
} from 'lucide-react'
import { submitChatAction } from './actions'
import { type Campaign } from '@/utils/game/campaigns'
import { ALL_SKILLS, skillModifier, formatMod, isSkillProficient, statMod } from '@/utils/game/skills'
import { DiceRoller } from './components/DiceRoller'
import { buildDiceResultFeedbackMessage, serializeDiceResultMarker, type DiceRollOutcome, type DiceRollRequired } from '@/types/dice'
import {
  mergeTimelineEvent,
  shouldRefreshTimelineGap,
  sortTimelineEvents,
} from './event-convergence'

type CharacterStats = {
  race?: string
  class?: string
  str?: number
  dex?: number
  con?: number
  int?: number
  wis?: number
  cha?: number
  [key: string]: unknown
}

type InventoryItem = {
  name: string
  type?: string
  description?: string
}

type CombatParticipant = {
  name: string
  hp: number
  max_hp: number
  ac: number
  initiative?: number
  is_player?: boolean
}

type CombatState = {
  in_combat: boolean
  turn: number
  participants: CombatParticipant[]
}

type NarrativeEvent = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  event_index?: number | null
  client_event_id?: string | null
  event_type?: string | null
  payload?: {
    sender_name?: string
    channel?: 'adventure' | 'group'
    combat?: {
      in_combat?: boolean
      initiative_requested?: boolean
    } | null
    [key: string]: unknown
  } | null
  characters?: { name: string } | null
  dice_roll_required?: DiceRollRequired | null
  combat?: {
    in_combat: boolean
    initiative_requested: boolean
  } | null
  character_id?: string | null
}

type CharacterSheet = {
  id: string
  name: string
  hp_current: number
  hp_max: number
  stats?: CharacterStats | null
  inventory?: InventoryItem[] | null
  skills?: string[] | null
  combat_state?: CombatState | null
}

type WorldData = {
  id: string
  name: string
  description: string
  genre?: string | null
}

type CurrentUser = {
  id: string
}

type SessionData = {
  id: string
  turn_player_id: string | null
}

type SessionCombatParticipant = {
  id?: string
  user_id?: string | null
  character_id?: string | null
  name: string
  hp: number
  max_hp: number
  ac: number
  initiative?: number | null
  is_player?: boolean
  is_defeated?: boolean
  conditions?: Array<{
    id?: string
    name: string
    duration_rounds?: number | null
    applied_at_round?: number | null
    applied_by_participant_id?: string | null
    source?: string | null
    summary?: string | null
  }>
}

type SessionCombatState = {
  session_id: string
  status: 'idle' | 'initiative' | 'active' | 'ended'
  round: number
  turn_index: number
  participants: SessionCombatParticipant[]
}

type SessionPlayer = {
  user_id: string
  profiles?: {
    username?: string | null
  } | null
  characters?: {
    id: string
    name: string
    hp_current: number
    hp_max: number
    stats?: CharacterStats | null
    inventory?: InventoryItem[] | null
  } | null
}

type RealtimeInsertPayload<T> = {
  new: T
}

type RealtimeUpdatePayload<T> = {
  new: T
}

function getSenderName(event: NarrativeEvent, fallback: string) {
  return event.payload?.sender_name || event.characters?.name || fallback
}

function getCombatBadgeColor(event: NarrativeEvent) {
  if (event.event_type === 'damage_applied') return 'bg-red-500/20 text-red-200 border-red-500/30'
  if (event.event_type === 'healing_applied') return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
  if (event.event_type === 'condition_applied') return 'bg-amber-500/20 text-amber-200 border-amber-500/30'
  if (event.event_type === 'attack_declared') return 'bg-orange-500/20 text-orange-200 border-orange-500/30'
  if (event.event_type === 'combat_ended') return 'bg-sky-500/20 text-sky-200 border-sky-500/30'
  return 'bg-violet-500/20 text-violet-200 border-violet-500/30'
}

function getCombatBadgeLabel(event: NarrativeEvent) {
  if (event.event_type === 'damage_applied') return 'Daño'
  if (event.event_type === 'healing_applied') return 'Curación'
  if (event.event_type === 'condition_applied') return 'Condición'
  if (event.event_type === 'attack_declared') return 'Ataque'
  if (event.event_type === 'combat_ended') return 'Fin del combate'
  return 'Combate'
}

function FloatingRunes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-amber-200/10 text-xl animate-float-rune"
          style={
            {
              top: `${8 + (i % 7) * 12}%`,
              left: `${10 + i * 9}%`,
              '--duration': `${3 + (i % 4)}s`,
              '--delay': `${i * 0.7}s`,
              '--drift': `${-15 + (i % 5) * 10}px`,
            } as CSSProperties
          }
        >
          ✦
        </div>
      ))}
    </div>
  )
}

function sortEvents(events: NarrativeEvent[]) {
  return sortTimelineEvents(events)
}

function mergeEvent(prev: NarrativeEvent[], incoming: NarrativeEvent) {
  return mergeTimelineEvent(prev, incoming)
}

function shouldRefreshEventGap(prev: NarrativeEvent[], incoming: NarrativeEvent) {
  return shouldRefreshTimelineGap(prev, incoming)
}

function filterVisibleEvents(events: NarrativeEvent[], tab: 'adventure' | 'group') {
  return events.filter((event) => {
    const isOoc =
      event.event_type === 'group_message' ||
      event.payload?.channel === 'group' ||
      event.content.startsWith('[OOC]')

    const isHiddenSystemType =
      event.event_type === 'turn_advanced' ||
      event.event_type === 'dice_requested' ||
      event.event_type === 'dice_result' ||
      event.content.startsWith('[TIRADA:') ||
      event.content.startsWith('[SISTEMA_')

    if (isHiddenSystemType) return false
    if (tab === 'group') return isOoc

    return !isOoc
  })
}

export default function GameClient({
  character,
  world,
  campaign,
  initialEvents,
  currentUser,
  session,
  sessionPlayers,
  sessionCombatState,
}: {
  character: CharacterSheet
  world: WorldData | null
  campaign: Campaign | null
  initialEvents: NarrativeEvent[]
  currentUser: CurrentUser
  session?: SessionData | null
  sessionPlayers?: SessionPlayer[]
  sessionCombatState?: SessionCombatState | null
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const sessionId = session?.id ?? null

  const [events, setEvents] = useState<NarrativeEvent[]>(() => sortEvents(initialEvents || []))
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [typewriterText, setTypewriterText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pendingDiceRoll, setPendingDiceRoll] = useState<DiceRollRequired | null>(null)
  const [pendingAssistantClientEventId, setPendingAssistantClientEventId] = useState<string | null>(null)
  const [chatTab, setChatTab] = useState<'adventure' | 'group'>('adventure')
  const [activeSessionPlayers, setActiveSessionPlayers] = useState<SessionPlayer[]>(sessionPlayers || [])
  const [liveSession, setLiveSession] = useState<SessionData | null>(session || null)
  const [liveSessionCombat, setLiveSessionCombat] = useState<SessionCombatState | null>(sessionCombatState || null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEvents(sortEvents(initialEvents || []))
  }, [initialEvents])

  useEffect(() => {
    setActiveSessionPlayers(sessionPlayers || [])
    setLiveSession(session || null)
    setLiveSessionCombat(sessionCombatState || null)
  }, [sessionPlayers, session, sessionCombatState])

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
          let shouldRefresh = false

          setEvents((prev) => {
            shouldRefresh = shouldRefreshEventGap(prev, payload.new)
            return mergeEvent(prev, payload.new)
          })

          if (shouldRefresh) router.refresh()
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
          let shouldRefresh = false

          setEvents((prev) => {
            shouldRefresh = shouldRefreshEventGap(prev, payload.new)
            return mergeEvent(prev, payload.new)
          })

          if (shouldRefresh) router.refresh()
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
          setLiveSession((prev) => ({ ...(prev || session), ...payload.new }))
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
          let shouldRefresh = false

          setLiveSessionCombat((prev) => {
            shouldRefresh =
              !prev ||
              prev.status !== payload.new.status ||
              prev.round !== payload.new.round ||
              prev.turn_index !== payload.new.turn_index ||
              prev.participants.length !== payload.new.participants.length

            return payload.new
          })

          if (shouldRefresh) router.refresh()
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
          router.refresh()
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
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, router])

  const activeCombatParticipant =
    liveSessionCombat?.status === 'active'
      ? liveSessionCombat.participants[liveSessionCombat.turn_index] ?? null
      : null

  const myInitiativeParticipant =
    liveSessionCombat?.participants.find(
      (participant) => participant.is_player && participant.user_id === currentUser.id,
    ) ?? null

  const isWaitingForInitiative = liveSessionCombat?.status === 'initiative'
  const hasSubmittedInitiative = (myInitiativeParticipant?.initiative ?? 0) > 0

  const isMyTurn = liveSessionCombat?.status === 'active'
    ? activeCombatParticipant?.is_player === true && activeCombatParticipant.user_id === currentUser.id
    : !liveSession || liveSession.turn_player_id === currentUser.id

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, chatTab, isTyping])

  const visibleEvents = useMemo(() => filterVisibleEvents(events, chatTab), [events, chatTab])

  const handleStreamResponse = async (response: Response) => {
    if (!response.ok) throw new Error('Error del servidor')

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const json = (await response.json()) as { system_only?: boolean }
      if (json.system_only) {
        setIsSending(false)
        router.refresh()
        return
      }
    }

    const reader = response.body?.getReader()
    if (!reader) {
      setIsSending(false)
      return
    }

    const decoder = new TextDecoder()
    let accumulated = ''
    let finalAssistantText = ''
    let finalDiceRollRequired: DiceRollRequired | null = null
    let finalAssistantClientEventId: string | null = null

    setIsTyping(true)
    setTypewriterText('')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      accumulated += decoder.decode(value, { stream: true })

      const chunks = accumulated.split('\n')
      accumulated = chunks.pop() || ''

      for (const chunk of chunks) {
        if (!chunk.trim()) continue

        let parsed: {
          text?: string
          done?: boolean
          fullText?: string
          dice_roll_required?: DiceRollRequired | null
          assistant_client_event_id?: string | null
        }

        try {
          parsed = JSON.parse(chunk)
        } catch {
          continue
        }

        if (parsed.text) {
          finalAssistantText += parsed.text
          setTypewriterText(finalAssistantText)
        }

        if (parsed.dice_roll_required) {
          finalDiceRollRequired = parsed.dice_roll_required
        }

        if (parsed.assistant_client_event_id) {
          finalAssistantClientEventId = parsed.assistant_client_event_id
        }

        if (parsed.done) {
          setPendingDiceRoll(finalDiceRollRequired)
          setPendingAssistantClientEventId(finalAssistantClientEventId)
          setIsTyping(false)
          setTypewriterText('')
          setIsSending(false)
          router.refresh()
        }
      }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!inputText.trim() || isSending) return

    const message = inputText.trim()
    const clientEventId = crypto.randomUUID()

    setInputText('')
    setIsSending(true)
    setPendingDiceRoll(null)
    setPendingAssistantClientEventId(null)

    const optimisticEvent: NarrativeEvent = {
      id: `optimistic:${clientEventId}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      client_event_id: clientEventId,
      event_type: chatTab === 'group' ? 'group_message' : 'player_message',
      payload:
        chatTab === 'group'
          ? {
            sender_name: character.name,
            channel: 'group',
          }
          : {
            sender_name: character.name,
            channel: 'adventure',
          },
      character_id: character.id,
    }

    setEvents((prev) => mergeEvent(prev, optimisticEvent))

    try {
      const response = await fetch('/api/engine/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          characterId: character.id,
          sessionId,
          clientEventId,
          channel: chatTab,
        }),
      })

      await handleStreamResponse(response)
    } catch (error) {
      console.error(error)
      setIsSending(false)
      setIsTyping(false)
      setTypewriterText('')
      router.refresh()
    }
  }

  const handleDiceResult = async (result: DiceRollOutcome) => {
    if (!pendingDiceRoll) return

    const feedback = buildDiceResultFeedbackMessage(result)
    const marker = serializeDiceResultMarker(result)
    const content = `${marker}\n${feedback}`

    setPendingDiceRoll(null)
    setIsSending(true)

    try {
      const response = await fetch('/api/engine/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          characterId: character.id,
          sessionId,
          assistantClientEventId: pendingAssistantClientEventId,
        }),
      })

      await handleStreamResponse(response)
    } catch (error) {
      console.error(error)
      setIsSending(false)
      setIsTyping(false)
      setTypewriterText('')
      router.refresh()
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0F1A] text-white">
      <FloatingRunes />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            {world?.name || 'Mundo desconocido'}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/20 p-3 text-amber-200">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">{character.name}</h1>
                  <p className="text-sm text-white/60">
                    {character.stats?.race || 'Aventurero'} · {character.stats?.class || 'Sin clase'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-red-200">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm font-medium">Salud</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {character.hp_current}/{character.hp_max}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-white/80">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Atributos</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => {
                      const value = Number(character.stats?.[stat] || 10)
                      return (
                        <div
                          key={stat}
                          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center"
                        >
                          <div className="text-xs uppercase text-white/50">{stat}</div>
                          <div className="font-semibold">{value}</div>
                          <div className="text-xs text-emerald-300">
                            {formatMod(statMod(value))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-white/80">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">Habilidades</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {ALL_SKILLS.map((skill, index) => {
                      const base = Number(character.stats?.[skill.stat] || 10)
                      const proficient = isSkillProficient(skill, character.skills ?? [])
                      const value = skillModifier(base, proficient)

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <span className="truncate text-white/80">{skill.name}</span>
                          <span className="font-semibold text-amber-200">{formatMod(value)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-white/80">
                    <Backpack className="h-4 w-4" />
                    <span className="text-sm font-medium">Inventario</span>
                  </div>

                  <div className="space-y-2">
                    {(character.inventory ?? []).map((item) => (
                      <div
                        key={item.name}
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                      >
                        {item.name}
                      </div>
                    ))}

                    {!character.inventory?.length && (
                      <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-white/40">
                        Sin objetos
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {liveSessionCombat && liveSessionCombat.status !== 'idle' && (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-2xl bg-red-500/20 p-2 text-red-200">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Combate shared</h2>
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      {liveSessionCombat.status === 'initiative'
                        ? 'Iniciativa'
                        : liveSessionCombat.status === 'active'
                          ? `Ronda ${liveSessionCombat.round}`
                          : liveSessionCombat.status === 'ended'
                            ? 'Finalizado'
                            : 'Idle'}
                    </p>
                  </div>
                </div>

                {isWaitingForInitiative && (
                  <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                    {hasSubmittedInitiative
                      ? 'Tu iniciativa ya fue enviada. Esperando al resto del grupo.'
                      : 'Debes tirar iniciativa para que comience el turno shared.'}
                  </div>
                )}

                {liveSessionCombat.status === 'active' && activeCombatParticipant && (
                  <div className="mb-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-sky-100">
                    Turno actual: <span className="font-semibold">{activeCombatParticipant.name}</span>
                    {isMyTurn ? ' · Es tu turno' : ''}
                  </div>
                )}

                <div className="space-y-2">
                  {liveSessionCombat.participants.map((participant) => {
                    const isActive =
                      liveSessionCombat.status === 'active' &&
                      liveSessionCombat.participants[liveSessionCombat.turn_index]?.id === participant.id

                    return (
                      <div
                        key={participant.id || participant.name}
                        className={`rounded-2xl border px-3 py-3 ${isActive
                            ? 'border-amber-400/30 bg-amber-500/10'
                            : 'border-white/10 bg-black/20'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-white">{participant.name}</div>
                            <div className="text-xs text-white/50">
                              {participant.is_player ? 'Jugador' : 'Enemigo'} · AC {participant.ac}
                            </div>
                          </div>

                          <div className="text-right text-sm">
                            <div className="font-semibold text-red-200">
                              {participant.hp}/{participant.max_hp} HP
                            </div>
                            {typeof participant.initiative === 'number' && (
                              <div className="text-xs text-white/50">
                                Init {participant.initiative}
                              </div>
                            )}
                          </div>
                        </div>

                        {participant.conditions?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {participant.conditions.map((condition, index) => (
                              <span
                                key={`${participant.id || participant.name}-${condition.id || condition.name}-${index}`}
                                className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100"
                              >
                                {condition.name}
                                {typeof condition.duration_rounds === 'number'
                                  ? ` · ${condition.duration_rounds}r`
                                  : ''}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {activeSessionPlayers.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-2xl bg-violet-500/20 p-2 text-violet-200">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Grupo</h2>
                    <p className="text-xs text-white/50">Sesión shared activa</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {activeSessionPlayers.map((player) => (
                    <div
                      key={player.user_id}
                      className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">
                            {player.characters?.name || player.profiles?.username || 'Jugador'}
                          </div>
                          <div className="text-xs text-white/50">
                            @{player.profiles?.username || 'unknown'}
                          </div>
                        </div>
                        <div className="text-right text-sm text-red-200">
                          {player.characters?.hp_current ?? 0}/{player.characters?.hp_max ?? 0} HP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>

          <section className="flex min-h-[70vh] flex-col rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/20 p-3 text-sky-200">
                  <ScrollText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Narrativa viva</h2>
                  <p className="text-sm text-white/50">
                    {campaign?.title || world?.description || 'La aventura continúa'}
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-2xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setChatTab('adventure')}
                  className={`rounded-xl px-4 py-2 text-sm transition ${chatTab === 'adventure'
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white'
                    }`}
                >
                  Aventura
                </button>
                <button
                  type="button"
                  onClick={() => setChatTab('group')}
                  className={`rounded-xl px-4 py-2 text-sm transition ${chatTab === 'group'
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white'
                    }`}
                >
                  Grupo
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {visibleEvents.map((event) => {
                const senderName =
                  event.role === 'user'
                    ? getSenderName(event, character.name)
                    : event.role === 'assistant'
                      ? 'GM'
                      : 'Sistema'

                const isUser = event.role === 'user'
                const isCombatSemantic =
                  event.event_type === 'damage_applied' ||
                  event.event_type === 'healing_applied' ||
                  event.event_type === 'condition_applied' ||
                  event.event_type === 'attack_declared' ||
                  event.event_type === 'combat_ended'

                return (
                  <div
                    key={event.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl rounded-3xl border px-4 py-3 ${isUser
                          ? 'border-amber-400/20 bg-amber-500/10 text-amber-50'
                          : 'border-white/10 bg-black/20 text-white/90'
                        }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
                        <span>{senderName}</span>
                        {isCombatSemantic ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 normal-case ${getCombatBadgeColor(event)}`}
                          >
                            {getCombatBadgeLabel(event)}
                          </span>
                        ) : null}
                      </div>

                      <div className="whitespace-pre-wrap text-sm leading-7">{event.content}</div>
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-3xl rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-white/90">
                    <div className="mb-2 text-xs uppercase tracking-wide text-white/50">GM</div>
                    <div className="whitespace-pre-wrap text-sm leading-7">{typewriterText}</div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {pendingDiceRoll ? (
              <div className="border-t border-white/10 px-5 py-4">
                <DiceRoller
                  rollData={pendingDiceRoll}
                  playerStats={(character.stats as Record<string, number>) ?? {}}
                  playerSkills={character.skills ?? []}
                  onRollComplete={handleDiceResult}
                  disabled={isSending}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="border-t border-white/10 px-5 py-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="message" className="mb-2 block text-sm text-white/50">
                      {chatTab === 'group' ? 'Mensaje para el grupo' : 'Tu acción'}
                    </label>
                    <textarea
                      id="message"
                      value={inputText}
                      onChange={(event) => setInputText(event.target.value)}
                      rows={3}
                      disabled={isSending}
                      placeholder={
                        chatTab === 'group'
                          ? 'Escribe un mensaje OOC para el grupo...'
                          : 'Describe tu acción...'
                      }
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-amber-400/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Enviar
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}