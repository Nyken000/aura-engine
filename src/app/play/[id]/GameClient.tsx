'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/utils/supabase/client'
import { type Campaign } from '@/utils/game/campaigns'
import { useGameRealtime } from './hooks/useGameRealtime'
import { useGameStream } from './hooks/useGameStream'
import { useGameTimeline } from './hooks/useGameTimeline'
import { useGameChatState } from './hooks/useGameChatState'
import { useGamePlayController } from './hooks/useGamePlayController'
import { GameLayoutShell } from './components/GameLayoutShell'
import type {
  CharacterSheet,
  ComposerActionRequest,
  CurrentUser,
  NarrativeEvent,
  NpcRelationship,
  NpcRelationshipEvent,
  SessionCombatState,
  SessionCompanion,
  SessionData,
  SessionPlayer,
  SessionQuest,
  SessionQuestUpdate,
  SidebarSelection,
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
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const [sidebarSelection, setSidebarSelection] = useState<SidebarSelection>(null)

  const { inputText, setInputText, chatTab, setChatTab } = useGameChatState({
    hasActiveSession: Boolean(sessionId),
  })

  const { events, visibleEvents, applyIncomingEvent, appendOptimisticEvent } = useGameTimeline({
    initialEvents,
    chatTab,
    router,
  })

  const {
    activeSessionPlayers,
    activeSessionQuests,
    activeSessionQuestUpdates,
    activeNpcRelationships,
    activeNpcRelationshipEvents,
    activeSessionCompanions,
    liveSession,
    liveSessionCombat,
  } = useGameRealtime({
    supabase,
    initialCharacter: character,
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
    onNarrativeEvent: applyIncomingEvent,
  })

  const { isSending, isTyping, typewriterText, pendingDiceRoll, sendMessage, sendDiceResolution } =
    useGameStream({
      characterId: character.id,
      sessionId,
      chatTab,
      onSystemRefresh: () => router.refresh(),
      onRequestError: (error) => {
        console.error(error)
      },
    })

  const {
    activeCombatParticipant,
    isWaitingForInitiative,
    hasSubmittedInitiative,
    isMyTurn,
    handleSubmit,
    handleDiceResult,
    submitAction,
  } = useGamePlayController({
    character,
    currentUserId: currentUser.id,
    sessionId,
    liveSession,
    liveSessionCombat,
    chatTab,
    inputText,
    setInputText,
    isSending,
    pendingDiceRoll,
    appendOptimisticEvent,
    sendMessage,
    sendDiceResolution,
    onInvalidGroupChannel: () => setChatTab('adventure'),
  })

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, chatTab, isTyping])

  const handleQuestAction = async (action: string | ComposerActionRequest) => {
    const normalizedAction: ComposerActionRequest =
      typeof action === 'string'
        ? { prompt: action, chatTab: 'adventure' }
        : { ...action, chatTab: action.chatTab ?? 'adventure' }

    if (normalizedAction.intent) {
      if (normalizedAction.chatTab) {
        setChatTab(normalizedAction.chatTab)
      }

      await submitAction(normalizedAction)
      return
    }

    setChatTab(normalizedAction.chatTab ?? 'adventure')
    setInputText(normalizedAction.prompt)
  }

  return (
    <GameLayoutShell
      character={character}
      world={world}
      campaign={campaign}
      allEvents={events}
      visibleEvents={visibleEvents}
      currentUserId={currentUser.id}
      liveSession={liveSession}
      activeSessionPlayers={activeSessionPlayers}
      activeSessionQuests={activeSessionQuests}
      activeSessionQuestUpdates={activeSessionQuestUpdates}
      activeNpcRelationships={activeNpcRelationships}
      activeNpcRelationshipEvents={activeNpcRelationshipEvents}
      activeSessionCompanions={activeSessionCompanions}
      liveSessionCombat={liveSessionCombat}
      activeCombatParticipant={activeCombatParticipant}
      isWaitingForInitiative={isWaitingForInitiative}
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
      onQuestAction={handleQuestAction}
      sidebarSelection={sidebarSelection}
      onSidebarSelectionChange={setSidebarSelection}
      chatEndRef={chatEndRef}
    />
  )
}