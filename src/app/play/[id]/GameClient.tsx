'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/utils/supabase/client'
import {
  buildDiceResultFeedbackMessage,
  serializeDiceResultMarker,
  type DiceRollOutcome,
  type DiceRollRequired,
} from '@/types/dice'
import { type Campaign } from '@/utils/game/campaigns'
import { useGameRealtime } from './hooks/useGameRealtime'
import { useGameTimeline } from './hooks/useGameTimeline'
import { GameLayoutShell } from './components/GameLayoutShell'
import type {
  CharacterSheet,
  CurrentUser,
  NarrativeEvent,
  SessionCombatState,
  SessionData,
  SessionPlayer,
  NpcRelationship,
  NpcRelationshipEvent,
  SessionCompanion,
  SessionQuest,
  SessionQuestUpdate,
  WorldData,
} from './types'

export default function GameClient({
  character,
  world,
  campaign,
  initialEvents,
  initialSessionQuests,
  initialSessionQuestUpdates,
  initialNpcRelationships,
  initialNpcRelationshipEvents,
  initialSessionCompanions,
  currentUser,
  session,
  sessionPlayers,
  sessionCombatState,
}: {
  character: CharacterSheet
  world: WorldData | null
  campaign: Campaign | null
  initialEvents: NarrativeEvent[]
  initialSessionQuests: SessionQuest[]
  initialSessionQuestUpdates: SessionQuestUpdate[]
  initialNpcRelationships: NpcRelationship[]
  initialNpcRelationshipEvents: NpcRelationshipEvent[]
  initialSessionCompanions: SessionCompanion[]
  currentUser: CurrentUser
  session?: SessionData | null
  sessionPlayers?: SessionPlayer[]
  sessionCombatState?: SessionCombatState | null
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const sessionId = session?.id ?? null

  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [typewriterText, setTypewriterText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pendingDiceRoll, setPendingDiceRoll] = useState<DiceRollRequired | null>(null)
  const [pendingAssistantClientEventId, setPendingAssistantClientEventId] = useState<string | null>(null)
  const [chatTab, setChatTab] = useState<'adventure' | 'group'>('adventure')
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)

  const { events, visibleEvents, applyIncomingEvent, appendOptimisticEvent } = useGameTimeline({
    initialEvents,
    chatTab,
    router,
  })

  const {
    activeSessionPlayers,
    liveSession,
    liveSessionCombat,
  } = useGameRealtime({
    supabase,
    sessionId,
    initialCharacter: character,
    initialEvents,
    initialSessionQuests,
    initialSessionQuestUpdates,
    initialNpcRelationships,
    initialNpcRelationshipEvents,
    initialSessionCompanions,
    session,
    sessionPlayers,
    sessionCombatState,
    router,
    onNarrativeEvent: applyIncomingEvent,
  })

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

  const isMyTurn =
    liveSessionCombat?.status === 'active'
      ? activeCombatParticipant?.is_player === true &&
      activeCombatParticipant.user_id === currentUser.id
      : !liveSession || liveSession.turn_player_id === currentUser.id

  useEffect(() => {
    const container = chatScrollRef.current
    if (!container) return

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight

      shouldAutoScrollRef.current = distanceFromBottom < 96
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [events, isTyping])

  useEffect(() => {
    shouldAutoScrollRef.current = true
    chatEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [chatTab])

  const handleStreamResponse = async (response: Response) => {
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Error del servidor (${response.status})${detail ? `: ${detail}` : ''}`)
    }

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
    let sawDone = false

    setIsTyping(true)
    setTypewriterText('')

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        accumulated += decoder.decode(value, { stream: true })

        const lines = accumulated.split('\n')
        accumulated = lines.pop() || ''

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line) continue
          if (!line.startsWith('data:')) continue

          const payload = line.slice(5).trim()
          if (!payload) continue

          let parsed: {
            chunk?: string
            text?: string
            done?: boolean
            fullText?: string
            dice_roll_required?: DiceRollRequired | null
            assistant_client_event_id?: string | null
          }

          try {
            parsed = JSON.parse(payload)
          } catch {
            continue
          }

          const streamedText = parsed.chunk ?? parsed.text ?? ''

          if (streamedText) {
            finalAssistantText += streamedText
            setTypewriterText(finalAssistantText)
          }

          if (parsed.dice_roll_required) {
            finalDiceRollRequired = parsed.dice_roll_required
          }

          if (parsed.assistant_client_event_id) {
            finalAssistantClientEventId = parsed.assistant_client_event_id
          }

          if (parsed.done) {
            sawDone = true
            setPendingDiceRoll(finalDiceRollRequired)
            setPendingAssistantClientEventId(finalAssistantClientEventId)
            setIsTyping(false)
            setTypewriterText('')
            setIsSending(false)
            router.refresh()
          }
        }
      }
    } finally {
      if (!sawDone) {
        setIsTyping(false)
        setTypewriterText('')
        setIsSending(false)
      }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!inputText.trim() || isSending) return
    if (chatTab === 'group' && !sessionId) {
      console.error('El chat grupal requiere una sesión activa')
      return
    }

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

    appendOptimisticEvent(optimisticEvent)

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
    }
  }

  return (
    <GameLayoutShell
      character={character}
      world={world}
      campaign={campaign}
      visibleEvents={visibleEvents}
      currentUserId={currentUser.id}
      liveSession={liveSession}
      activeSessionPlayers={activeSessionPlayers}
      liveSessionCombat={liveSessionCombat}
      activeCombatParticipant={activeCombatParticipant}
      isWaitingForInitiative={Boolean(isWaitingForInitiative)}
      hasSubmittedInitiative={hasSubmittedInitiative}
      isMyTurn={isMyTurn}
      chatTab={chatTab}
      onChatTabChange={setChatTab}
      inputText={inputText}
      onInputTextChange={setInputText}
      isSending={isSending}
      isTyping={isTyping}
      typewriterText={typewriterText}
      pendingDiceRoll={pendingDiceRoll}
      onSubmit={handleSubmit}
      onDiceResult={handleDiceResult}
      chatEndRef={chatEndRef}
      chatScrollRef={chatScrollRef}
    />
  )
}