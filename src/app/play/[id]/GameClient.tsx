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
}

type SessionCombatState = {
  session_id: string
  status: 'idle' | 'initiative' | 'active' | 'ended'
  round: number
  turn_index: number
  participants: SessionCombatParticipant[]
}

type SessionPlayer = {
  id: string
  user_id: string
  profiles?: {
    username?: string | null
    avatar_url?: string | null
  } | null
  characters?: {
    id: string
    name: string
    stats?: CharacterStats | null
    hp_current: number
    hp_max: number
  } | null
}

type RealtimeInsertPayload<T> = {
  new: T
}

type RealtimeUpdatePayload<T> = {
  new: T
}

function TypewriterMessage({
  text,
  charSpeed = 20,
  onComplete,
}: {
  text: string
  charSpeed?: number
  onComplete?: () => void
}) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')

    const tick = () => {
      if (idxRef.current < text.length) {
        idxRef.current += 1
        setDisplayed(text.slice(0, idxRef.current))
        timerRef.current = setTimeout(tick, charSpeed)
      } else {
        onCompleteRef.current?.()
      }
    }

    timerRef.current = setTimeout(tick, 60)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, charSpeed])

  const isDone = displayed.length >= text.length
  const paragraphs = text.split('\n')
  let charsRendered = 0

  return (
    <div className="gm-text text-parchment-200 space-y-1">
      {paragraphs.map((para, pIdx) => {
        const paraStart = charsRendered
        const paraEnd = paraStart + para.length
        charsRendered = paraEnd + 1

        const visibleChars = Math.max(0, Math.min(para.length, displayed.length - paraStart))
        const visiblePara = para.slice(0, visibleChars)
        const isParaStarted = displayed.length > paraStart
        const isLastPara = pIdx === paragraphs.length - 1
        const isLastVisible = isLastPara || displayed.length <= paraEnd

        if (!isParaStarted && para === '') return <div key={pIdx} className="h-2" />
        if (!isParaStarted) return null

        return (
          <p
            key={pIdx}
            className={`${para === '' ? 'h-2' : 'min-h-[1.5em]'} animate-in fade-in slide-in-from-bottom-1 duration-300`}
          >
            {visiblePara}
            {isLastVisible && !isDone && (
              <span className="inline-block w-0.5 h-[1.1em] bg-amber-400/80 ml-[1px] animate-pulse align-middle rounded-sm" />
            )}
          </p>
        )
      })}
    </div>
  )
}

const CAMPAIGN_THEME: Record<
  string,
  { border: string; glow: string; badge: string; label: string }
> = {
  'oakhaven-fall': {
    border: 'border-gray-500/40',
    glow: 'shadow-[0_0_20px_-5px_rgba(100,116,139,0.4)]',
    badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    label: '🌫️ Ceniza',
  },
  'leviathan-veil': {
    border: 'border-cyan-500/40',
    glow: 'shadow-[0_0_20px_-5px_rgba(8,145,178,0.4)]',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    label: '⚓ Mar',
  },
  'eternal-flame': {
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_20px_-5px_rgba(202,138,4,0.5)]',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    label: '🔥 Fuego',
  },
  'crimson-carnival': {
    border: 'border-purple-500/40',
    glow: 'shadow-[0_0_20px_-5px_rgba(147,51,234,0.4)]',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    label: '🎪 Carnaval',
  },
  'sand-king-tomb': {
    border: 'border-yellow-600/40',
    glow: 'shadow-[0_0_20px_-5px_rgba(161,98,7,0.4)]',
    badge: 'bg-yellow-700/20 text-yellow-300 border-yellow-700/30',
    label: '🏜️ Desierto',
  },
}

function EmberParticles() {
  return (
    <div className="ember-container absolute inset-0 pointer-events-none overflow-hidden opacity-60" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="ember"
          style={
            {
              left: `${10 + i * 9}%`,
              '--duration': `${3 + (i % 4)}s`,
              '--delay': `${i * 0.7}s`,
              '--drift': `${-15 + (i % 5) * 10}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function sortEvents(events: NarrativeEvent[]) {
  return [...events].sort((a, b) => {
    const aHasIndex = typeof a.event_index === 'number'
    const bHasIndex = typeof b.event_index === 'number'

    if (aHasIndex && bHasIndex && a.event_index !== b.event_index) {
      return (a.event_index ?? 0) - (b.event_index ?? 0)
    }

    if (aHasIndex !== bHasIndex) {
      return aHasIndex ? -1 : 1
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

function mergeEvent(prev: NarrativeEvent[], incoming: NarrativeEvent) {
  const next = [...prev]
  const byId = next.findIndex((event) => event.id === incoming.id)

  if (byId >= 0) {
    next[byId] = { ...next[byId], ...incoming }
    return sortEvents(next)
  }

  if (incoming.client_event_id) {
    const byClientEventId = next.findIndex(
      (event) => event.client_event_id === incoming.client_event_id,
    )
    if (byClientEventId >= 0) {
      next[byClientEventId] = { ...next[byClientEventId], ...incoming }
      return sortEvents(next)
    }
  }

  next.push(incoming)
  return sortEvents(next)
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
  const supabase = createClient()

  const [events, setEvents] = useState<NarrativeEvent[]>(() => sortEvents(initialEvents || []))
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [typewriterText, setTypewriterText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pendingDiceRoll, setPendingDiceRoll] = useState<DiceRollRequired | null>(null)
  const [pendingAssistantClientEventId, setPendingAssistantClientEventId] = useState<string | null>(null)
  const [chatTab, setChatTab] = useState<'adventure' | 'group'>('adventure')
  const [activeSessionPlayers] = useState<SessionPlayer[]>(sessionPlayers || [])
  const [liveSession, setLiveSession] = useState<SessionData | null>(session || null)
  const [liveSessionCombat, setLiveSessionCombat] = useState<SessionCombatState | null>(sessionCombatState || null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEvents(sortEvents(initialEvents || []))
  }, [initialEvents])

  useEffect(() => {
    if (!session?.id) return

    const channel = supabase
      .channel(`game:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'narrative_events',
          filter: `session_id=eq.${session.id}`,
        },
        (payload: RealtimeInsertPayload<NarrativeEvent>) => {
          setEvents((prev) => mergeEvent(prev, payload.new))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'narrative_events',
          filter: `session_id=eq.${session.id}`,
        },
        (payload: RealtimeUpdatePayload<NarrativeEvent>) => {
          setEvents((prev) => mergeEvent(prev, payload.new))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`,
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
          filter: `session_id=eq.${session.id}`,
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
          filter: `session_id=eq.${session.id}`,
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
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, supabase, router])

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

    if (!response.body) throw new Error('Respuesta sin stream')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        const parsed = JSON.parse(line.slice(6)) as {
          error?: string
          chunk?: string
          done?: boolean
          narrative?: string
          dice_roll_required?: DiceRollRequired | null
          assistant_client_event_id?: string
        }

        if (parsed.error) throw new Error(parsed.error)
        if (parsed.chunk) accumulated += parsed.chunk

        if (parsed.done) {
          setPendingAssistantClientEventId(parsed.assistant_client_event_id ?? crypto.randomUUID())
          setPendingDiceRoll(parsed.dice_roll_required ?? null)
          setTypewriterText(parsed.narrative ?? accumulated)
          setIsTyping(true)
          setIsSending(false)
          router.refresh()
        }
      }
    }
  }

  const submitAutomatedAction = async (input: string | DiceRollOutcome) => {
    if (isSending) return

    setIsSending(true)
    const optimisticClientEventId = crypto.randomUUID()
    const content = typeof input === 'string' ? input : serializeDiceResultMarker(input)
    const isSilentEvent = typeof input !== 'string' || content.startsWith('[TIRADA') || content.startsWith('[SISTEMA_')

    if (!isSilentEvent) {
      setEvents((prev) =>
        mergeEvent(prev, {
          id: crypto.randomUUID(),
          client_event_id: optimisticClientEventId,
          role: 'user',
          content,
          created_at: new Date().toISOString(),
          event_type: 'player_message',
          payload: {
            sender_name: character.name,
            channel: 'adventure',
          },
        }),
      )
    }

    try {
      const response = await fetch('/api/engine/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          content,
          sessionId: liveSession?.id || null,
          clientEventId: optimisticClientEventId,
        }),
      })

      await handleStreamResponse(response)
    } catch (error) {
      console.error('Streaming error:', error)
      setIsSending(false)
      router.refresh()
    }
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()

    if (!inputText.trim() || isSending) return
    if (chatTab === 'adventure' && (isWaitingForInitiative || !isMyTurn)) return

    const userMessage = inputText.trim()
    const optimisticClientEventId = crypto.randomUUID()
    const optimisticEventId = crypto.randomUUID()

    setInputText('')
    setIsSending(true)
    setTypewriterText('')
    setIsTyping(false)
    setPendingDiceRoll(null)
    setPendingAssistantClientEventId(null)

    const optimisticEvent: NarrativeEvent = {
      id: optimisticEventId,
      client_event_id: optimisticClientEventId,
      role: 'user',
      content: chatTab === 'group' ? `[OOC] ${userMessage}` : userMessage,
      created_at: new Date().toISOString(),
      event_type: chatTab === 'group' ? 'group_message' : 'player_message',
      payload: {
        sender_name: character.name,
        channel: chatTab,
      },
    }

    setEvents((prev) => mergeEvent(prev, optimisticEvent))

    if (chatTab === 'group') {
      const result = await submitChatAction(
        character.id,
        userMessage,
        'group',
        liveSession?.id ?? null,
        optimisticClientEventId,
      )

      if (result?.error) {
        alert(result.error)
        setEvents((prev) => prev.filter((event) => event.id !== optimisticEventId))
      }

      setIsSending(false)
      return
    }

    try {
      const response = await fetch('/api/engine/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          content: userMessage,
          sessionId: liveSession?.id || null,
          clientEventId: optimisticClientEventId,
        }),
      })

      await handleStreamResponse(response)
    } catch (error) {
      console.error('Streaming error:', error)
      alert('El Oráculo no pudo responder. Intenta de nuevo.')
      setEvents((prev) => prev.filter((event) => event.id !== optimisticEventId))
      setIsSending(false)
    }
  }

  const hpPercentage = Math.max(
    0,
    Math.min(100, ((character.hp_current ?? character.hp_max) / character.hp_max) * 100),
  )
  const isCritical = hpPercentage <= 20
  const hpBarColor =
    hpPercentage > 50 ? 'bg-emerald-500' : hpPercentage > 20 ? 'bg-amber-400' : 'bg-red-500'

  const campaignTheme = campaign && CAMPAIGN_THEME[campaign.id]
  const combatState =
    liveSessionCombat && liveSessionCombat.status !== 'idle' && liveSessionCombat.status !== 'ended'
      ? {
          in_combat: true,
          turn: liveSessionCombat.turn_index,
          participants: liveSessionCombat.participants,
        }
      : character.combat_state ?? { in_combat: false, turn: 0, participants: [] }

  return (
    <div className="h-screen w-full bg-background flex flex-col text-foreground overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(202,138,4,0.04),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_100%,rgba(138,3,3,0.05),transparent)]" />
      </div>

      <nav className="relative z-20 h-14 border-b border-amber-900/20 bg-stone-950/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-foreground/40 hover:text-parchment-200 hover:bg-parchment-900/30 rounded-lg transition-all duration-200 cursor-pointer"
            title="Volver a la Taverna"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-5 bg-amber-900/40" />
          <div>
            <p className="font-display text-sm font-bold text-parchment-200 leading-none">
              {world?.name || 'Mundo Desconocido'}
            </p>
            <p className="text-[10px] text-foreground/40 mt-0.5">Sesión en curso</p>
          </div>
        </div>

        {campaign && (
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${campaignTheme?.badge ?? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
          >
            <ScrollText className="w-3 h-3" />
            {campaign.title}
          </div>
        )}

        {liveSession && activeSessionPlayers.length > 0 && (
          <div className="hidden md:flex items-center gap-2">
            {activeSessionPlayers.map((sessionPlayer) => {
              const isActive = liveSessionCombat?.status === 'active'
                ? activeCombatParticipant?.is_player === true && activeCombatParticipant.user_id === sessionPlayer.user_id
                : liveSession.turn_player_id === sessionPlayer.user_id
              const sessionCharacter = sessionPlayer.characters

              return (
                <div
                  key={sessionPlayer.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition-all ${isActive
                      ? 'border-amber-500/60 bg-amber-900/30 text-amber-300 shadow-[0_0_8px_-2px_rgba(245,158,11,0.4)]'
                      : 'border-stone-700/40 bg-stone-950/60 text-stone-500'
                    }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                  <span className="font-medium">{sessionPlayer.profiles?.username || '?'}</span>
                  {sessionCharacter && <span className="text-[10px] opacity-60">{sessionCharacter.name}</span>}
                </div>
              )
            })}
          </div>
        )}

        {!liveSession && <div className="w-20" />}
      </nav>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        <aside className="w-72 border-r border-amber-900/20 bg-stone-950/60 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blood-700/60 to-stone-900 border border-blood-500/25 flex items-center justify-center shrink-0 shadow-blood-sm">
                <Swords className="w-7 h-7 text-blood-400" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-base text-parchment-100 leading-tight truncate">
                  {character.name}
                </h2>
                <p className="text-xs text-amber-500/80 mt-0.5 font-medium">
                  {character.stats?.class || 'Aventurero'}
                </p>
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-0.5">
                  {character.stats?.race || 'Desconocida'}
                </p>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-stone-900/60 border border-blood-900/30">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center gap-1.5 font-bold text-blood-400">
                  <Heart className="w-3.5 h-3.5" /> Puntos de Vida
                </span>
                <span className={isCritical ? 'text-red-400 font-bold animate-pulse' : 'text-parchment-200 font-bold'}>
                  {character.hp_current ?? character.hp_max} / {character.hp_max}
                </span>
              </div>
              <div className="h-2.5 w-full bg-stone-900 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full ${hpBarColor} rounded-full transition-all duration-700 ${isCritical ? 'hp-critical' : ''}`}
                  style={{ width: `${hpPercentage}%` }}
                />
              </div>
              <div className="text-[10px] text-foreground/40 flex justify-between">
                <span>{Math.round(hpPercentage)}%</span>
                <span className={isCritical ? 'text-red-400/80 font-bold' : 'text-foreground/30'}>
                  {isCritical ? '¡ESTADO CRÍTICO!' : 'Estable'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Atributos
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'str', label: 'FUE', color: 'text-red-400' },
                  { key: 'dex', label: 'DES', color: 'text-emerald-400' },
                  { key: 'con', label: 'CON', color: 'text-orange-400' },
                  { key: 'int', label: 'INT', color: 'text-blue-400' },
                  { key: 'wis', label: 'SAB', color: 'text-cyan-400' },
                  { key: 'cha', label: 'CAR', color: 'text-pink-400' },
                ].map((stat) => (
                  <div
                    key={stat.key}
                    className="flex flex-col items-center bg-stone-900/60 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors group"
                  >
                    <span className={`text-[9px] font-bold ${stat.color} tracking-widest`}>{stat.label}</span>
                    <span className="text-xl font-mono font-bold text-white leading-tight">
                      {Number(character.stats?.[stat.key] ?? 10)}
                    </span>
                    <span className="text-[10px] font-mono text-foreground/40 group-hover:text-foreground/60 transition-colors">
                      {formatMod(statMod(Number(character.stats?.[stat.key] ?? 10)))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-amber-900/20">
              <h3 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Habilidades
                </span>
                <span className="text-[9px] text-amber-500/50">PROF +2</span>
              </h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {ALL_SKILLS.map((skill, i) => {
                  const statValue = Number(character.stats?.[skill.stat] ?? 10)
                  const proficient = isSkillProficient(skill, character.skills || [])
                  const totalMod = skillModifier(statValue, proficient)

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1 px-1.5 rounded bg-stone-900/40 border border-white/5 group"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full border border-amber-500/50 shrink-0 ${proficient ? 'bg-amber-500' : 'bg-transparent'}`}
                        />
                        <span className={`text-[10px] truncate ${proficient ? 'text-parchment-200' : 'text-foreground/50'}`}>
                          {skill.name}{' '}
                          <span className="text-[8px] text-foreground/30 uppercase ml-0.5">
                            ({skill.stat.substring(0, 3)})
                          </span>
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ${proficient ? 'text-amber-400 font-bold' : 'text-foreground/40'}`}>
                        {formatMod(totalMod)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-amber-900/20">
              <h3 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
                <Backpack className="w-3 h-3" /> Inventario
              </h3>
              {Array.isArray(character.inventory) && character.inventory.length > 0 ? (
                <ul className="space-y-1.5">
                  {character.inventory.map((item, i) => (
                    <li key={i} className="text-xs flex items-start gap-2 p-2 rounded-lg bg-stone-900/40 border border-white/5">
                      <span className={`mt-0.5 shrink-0 ${item.type === 'passive' ? 'text-magic-400' : 'text-amber-600/70'}`}>
                        {item.type === 'passive' ? '✦' : '▸'}
                      </span>
                      <div>
                        <span className={item.type === 'passive' ? 'text-magic-300 font-bold text-[11px]' : 'text-parchment-200 text-[11px]'}>
                          {item.name}
                        </span>
                        {item.description && (
                          <p className="text-[10px] text-foreground/40 mt-0.5 leading-snug">{item.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-foreground/30 italic">Bolsillos vacíos.</p>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 relative">
          <EmberParticles />

          <div className="relative z-10 h-12 border-b border-amber-900/20 bg-stone-950/60 flex items-stretch px-0 shrink-0">
            <button
              onClick={() => setChatTab('adventure')}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${chatTab === 'adventure'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-foreground/40 hover:text-parchment-300 hover:bg-white/5'
                }`}
            >
              <Flame className="w-4 h-4" />
              <span className="font-display">La Aventura</span>
            </button>
            <button
              onClick={() => setChatTab('group')}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${chatTab === 'group'
                  ? 'border-magic-400 text-magic-300 bg-magic-500/5'
                  : 'border-transparent text-foreground/40 hover:text-parchment-300 hover:bg-white/5'
                }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-display">Grupo</span>
            </button>
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
            {visibleEvents.map((evt, idx) => {
              const isUser = evt.role === 'user'

              const isOOC =
                evt.event_type === 'group_message' ||
                evt.payload?.channel === 'group' ||
                evt.content.startsWith('[OOC]')

              const content = isOOC ? evt.content.replace('[OOC]', '').trim() : evt.content
              const senderName = isUser
                ? evt.payload?.sender_name || evt.characters?.name || character.name
                : 'Game Master'

              const combatPayload = evt.payload?.combat || evt.combat

              return (
                <div
                  key={evt.id}
                  className={`flex flex-col max-w-[88%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <span className="text-[10px] text-foreground/40 mb-1.5 font-bold tracking-widest uppercase px-1">
                    {isOOC && <span className="text-magic-500 mr-1">[OOC]</span>}
                    {senderName}
                  </span>

                  {isUser ? (
                    <div
                      className={`px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed ${isOOC
                          ? 'bg-magic-900/30 border border-magic-500/20 text-parchment-200'
                          : 'bg-stone-800/80 border border-amber-900/30 text-parchment-200'
                        }`}
                    >
                      {content}
                    </div>
                  ) : (
                    <div className="parchment-card px-5 py-4 rounded-2xl rounded-tl-sm relative overflow-hidden flex flex-col items-start">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-600/60 via-amber-500/30 to-transparent" />
                      <div className="gm-text text-parchment-200 relative z-10 w-full">
                        {content.split('\n').map((line, lineIndex) => (
                          <p key={lineIndex} className={`${line === '' ? 'mt-3' : 'mt-1 first:mt-0'}`}>
                            {line}
                          </p>
                        ))}
                      </div>

                      {evt.dice_roll_required?.needed && (
                        <div className="mt-4 relative z-10 w-full border-t border-amber-900/30 pt-4 flex justify-center">
                          <DiceRoller
                            rollData={evt.dice_roll_required}
                            playerStats={(character.stats as unknown as Record<string, number>) ?? {}}
                            playerSkills={character.skills ?? []}
                            onRollComplete={submitAutomatedAction}
                            disabled={idx !== visibleEvents.length - 1 || isSending || isTyping || !isMyTurn}
                          />
                        </div>
                      )}

                      {combatPayload?.initiative_requested && combatState.in_combat && (
                        <div className="mt-4 relative z-10 w-full border-t border-blood-900/40 pt-4 flex justify-center">
                          <DiceRoller
                            rollData={{
                              needed: true,
                              die: 'd20',
                              stat: 'dex',
                              skill: null,
                              dc: 0,
                              flavor: 'Tirada de Iniciativa (DES)',
                            }}
                            playerStats={(character.stats as unknown as Record<string, number>) ?? {}}
                            playerSkills={character.skills ?? []}
                            onRollComplete={(outcome: DiceRollOutcome) => {
                              submitAutomatedAction(
                                `[SISTEMA_INICIATIVA: ${outcome.total}] ${buildDiceResultFeedbackMessage(outcome)}`,
                              )
                            }}
                            disabled={
                              idx !== visibleEvents.length - 1 ||
                              isSending ||
                              isTyping ||
                              liveSessionCombat?.status !== 'initiative' ||
                              hasSubmittedInitiative
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {isTyping && typewriterText && (
              <div className="flex flex-col mr-auto items-start max-w-[88%]">
                <span className="text-[10px] text-foreground/40 mb-1.5 font-bold tracking-widest uppercase ml-1">
                  Game Master
                </span>
                <div className="parchment-card px-5 py-4 rounded-2xl rounded-tl-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-600/60 via-amber-500/30 to-transparent" />
                  <div className="relative z-10">
                    <TypewriterMessage
                      text={typewriterText}
                      charSpeed={22}
                      onComplete={() => {
                        setEvents((prev) =>
                          mergeEvent(prev, {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: typewriterText,
                            created_at: new Date().toISOString(),
                            client_event_id: pendingAssistantClientEventId,
                            event_type: 'gm_message',
                            payload: {
                              sender_name: 'Game Master',
                              channel: 'adventure',
                            },
                            dice_roll_required: pendingDiceRoll,
                          }),
                        )

                        setIsTyping(false)
                        setTypewriterText('')
                        setPendingDiceRoll(null)
                        setPendingAssistantClientEventId(null)
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} className="h-2 w-full" />
          </div>

          <div className="relative z-10 p-4 bg-stone-950/80 border-t border-amber-900/20 backdrop-blur-sm shrink-0">
            {isWaitingForInitiative && chatTab === 'adventure' && liveSession && (
              <p className="text-center mb-3 text-[11px] text-amber-500/70 uppercase tracking-widest">
                {hasSubmittedInitiative ? 'Esperando iniciativas del resto de la mesa...' : 'Tira iniciativa para entrar al combate...'}
              </p>
            )}

            {!isWaitingForInitiative && !isMyTurn && chatTab === 'adventure' && liveSession && (
              <p className="text-center mb-3 text-[11px] text-amber-500/70 uppercase tracking-widest">
                Esperando el turno del otro jugador...
              </p>
            )}

            <form onSubmit={handleSend} className="relative max-w-3xl mx-auto flex items-end gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder={
                  chatTab === 'adventure'
                    ? '¿Qué harás? Escribe tu acción o diálogo...'
                    : 'Habla con tu grupo fuera del personaje...'
                }
                className={`w-full bg-stone-900/60 border ${chatTab === 'group'
                    ? 'border-magic-700/40 focus:border-magic-500/60 focus:ring-1 focus:ring-magic-500/30'
                    : 'border-amber-900/30 focus:border-amber-600/50 focus:ring-1 focus:ring-amber-500/20'
                  } rounded-xl px-4 py-3 text-parchment-200 placeholder:text-foreground/30 focus:outline-none resize-none custom-scrollbar text-sm leading-relaxed transition-all duration-200`}
                rows={2}
                disabled={isSending || (chatTab === 'adventure' && (isWaitingForInitiative || !isMyTurn))}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending || (chatTab === 'adventure' && (isWaitingForInitiative || !isMyTurn))}
                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${chatTab === 'group'
                    ? 'bg-magic-700/80 hover:bg-magic-600 text-white'
                    : 'bg-amber-700/80 hover:bg-amber-600 text-white'
                  }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </main>

        <aside className="w-64 border-l border-amber-900/20 bg-stone-950/60 hidden lg:flex flex-col shrink-0">
          <div className="p-5 space-y-6">
            <div className="space-y-3">
              <h3 className="font-display text-[10px] text-foreground/40 uppercase tracking-widest border-b border-amber-900/20 pb-2 flex items-center gap-2">
                <ScrollText className="w-3 h-3" /> Campaña Activa
              </h3>

              {campaign ? (
                <div className="space-y-3">
                  <p
                    className={`text-[10px] px-2 py-1 rounded-full border inline-flex items-center gap-1 ${campaignTheme?.badge ?? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                  >
                    {campaignTheme?.label ?? campaign.theme}
                  </p>
                  <p className="font-display font-bold text-parchment-100 text-sm leading-snug">
                    {campaign.title}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-foreground/30 italic leading-relaxed">{world?.description}</p>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-amber-900/20">
              <h3 className="font-display text-[10px] text-blood-400/60 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3" /> Orden de Iniciativa
              </h3>

              <div className="space-y-1.5 relative min-h-[60px]">
                {combatState.in_combat ? (
                  combatState.participants.map((participant, index) => {
                    const isCurrentTurn = index === combatState.turn
                    const hpPercent = Math.max(0, Math.min(100, (participant.hp / participant.max_hp) * 100))
                    const isDead = participant.hp <= 0

                    return (
                      <div
                        key={`${participant.name}-${index}`}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${isCurrentTurn && !isDead
                            ? 'bg-gradient-to-r from-blood-900/40 to-stone-900/40 border-l-2 border-l-blood-500 border-y-blood-500/20 border-r-stone-800/50'
                            : isDead
                              ? 'bg-stone-900/20 border-stone-800/50 opacity-40'
                              : 'bg-stone-950/60 border-white/5 opacity-80'
                          }`}
                      >
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-900/50" />
                        <div
                          className={`absolute bottom-0 left-0 h-1 ${isDead ? 'bg-stone-600' : 'bg-gradient-to-r from-blood-600 to-blood-400'}`}
                          style={{ width: `${hpPercent}%` }}
                        />

                        <div className="relative flex items-center justify-center w-6 h-6 rounded flex-shrink-0 bg-stone-800/80 text-foreground/40 ring-1 ring-white/10">
                          <span className="text-[10px] font-bold font-mono">{index + 1}</span>
                        </div>

                        <div className="min-w-0 flex-1 relative z-10">
                          <div className="flex justify-between items-center mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-xs font-bold truncate tracking-wide">
                                {participant.name}
                              </p>
                              {isCurrentTurn && !isDead && (
                                <Swords className="w-3 h-3 text-blood-400 animate-pulse flex-shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono tracking-tighter">
                              {participant.hp}/{participant.max_hp}
                            </span>
                          </div>
                          <p className="text-[9px] text-foreground/40 uppercase tracking-widest flex items-center justify-between">
                            <span>{participant.is_player ? character.stats?.class || 'Aventurero' : 'Enemigo'}</span>
                            <span className="opacity-70">
                              <Shield className="w-2.5 h-2.5 inline mr-0.5 mb-0.5" />
                              {participant.ac}
                            </span>
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-xs text-stone-500 italic">Combate inactivo...</div>
                )}
              </div>

              {combatState.in_combat && activeCombatParticipant?.is_player && (
                  <button
                    onClick={() => submitAutomatedAction('[SISTEMA_TURNO_SIGUIENTE] Mi turno ha terminado.')}
                    disabled={isSending || isTyping || !isMyTurn}
                    className="w-full mt-3 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest border transition-all duration-300 bg-gradient-to-r from-blood-900/40 via-blood-800/20 to-blood-900/40 text-blood-400 border-blood-500/30 hover:bg-blood-900/60 hover:border-blood-400/60 disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Zap className="w-3.5 h-3.5" />
                      Finalizar Mi Turno
                    </span>
                  </button>
                )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}