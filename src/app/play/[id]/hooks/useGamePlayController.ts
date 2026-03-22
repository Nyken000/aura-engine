import type { FormEvent } from 'react'

import {
  buildDiceResultFeedbackMessage,
  serializeDiceResultMarker,
  type DiceRollOutcome,
  type DiceRollRequired,
} from '@/types/dice'
import type {
  CharacterSheet,
  GameChatTab,
  NarrativeEvent,
  SessionCombatParticipant,
  SessionCombatState,
  SessionData,
} from '../types'

type UseGamePlayControllerParams = {
  character: CharacterSheet
  currentUserId: string
  sessionId: string | null
  liveSession: SessionData | null
  liveSessionCombat: SessionCombatState | null
  chatTab: GameChatTab
  inputText: string
  setInputText: (value: string) => void
  isSending: boolean
  pendingDiceRoll: DiceRollRequired | null
  appendOptimisticEvent: (event: NarrativeEvent) => void
  sendMessage: (content: string, clientEventId?: string) => Promise<void>
  sendDiceResolution: (content: string) => Promise<void>
  onInvalidGroupChannel?: () => void
}

export function useGamePlayController({
  character,
  currentUserId,
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
  onInvalidGroupChannel,
}: UseGamePlayControllerParams) {
  const activeCombatParticipant: SessionCombatParticipant | null =
    liveSessionCombat?.status === 'active'
      ? liveSessionCombat.participants[liveSessionCombat.turn_index] ?? null
      : null

  const myInitiativeParticipant =
    liveSessionCombat?.participants.find(
      (participant) => participant.is_player && participant.user_id === currentUserId,
    ) ?? null

  const isWaitingForInitiative = liveSessionCombat?.status === 'initiative'
  const hasSubmittedInitiative = (myInitiativeParticipant?.initiative ?? 0) > 0

  const isMyTurn =
    liveSessionCombat?.status === 'active'
      ? activeCombatParticipant?.is_player === true &&
        activeCombatParticipant.user_id === currentUserId
      : !liveSession || liveSession.turn_player_id === currentUserId

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!inputText.trim() || isSending) return

    if (chatTab === 'group' && !sessionId) {
      console.error('El chat grupal requiere una sesión activa')
      onInvalidGroupChannel?.()
      return
    }

    const message = inputText.trim()
    const clientEventId = crypto.randomUUID()

    setInputText('')

    const optimisticEvent: NarrativeEvent = {
      id: `optimistic:${clientEventId}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      client_event_id: clientEventId,
      event_type: chatTab === 'group' ? 'group_message' : 'player_message',
      payload: {
        sender_name: character.name,
        channel: chatTab,
      },
      character_id: character.id,
    }

    appendOptimisticEvent(optimisticEvent)
    await sendMessage(message, clientEventId)
  }

  const handleDiceResult = async (result: DiceRollOutcome) => {
    if (!pendingDiceRoll) return

    const feedback = buildDiceResultFeedbackMessage(result)
    const marker = serializeDiceResultMarker(result)
    const content = `${marker}\n${feedback}`

    await sendDiceResolution(content)
  }

  return {
    activeCombatParticipant,
    isWaitingForInitiative: Boolean(isWaitingForInitiative),
    hasSubmittedInitiative,
    isMyTurn,
    handleSubmit,
    handleDiceResult,
  }
}
