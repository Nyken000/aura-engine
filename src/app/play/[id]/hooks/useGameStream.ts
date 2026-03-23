'use client'

import { useCallback, useState } from 'react'

import {
  consumeAssistantStreamChunk,
  createGameClientRuntimeState,
} from '../game-client-runtime'
import type { DiceRollRequired } from '@/types/dice'
import type { StructuredIntent } from '@/lib/game/structured-intents'
import type { GameChatTab } from '../types'

type UseGameStreamParams = {
  characterId: string
  sessionId: string | null
  chatTab: GameChatTab
  onSystemRefresh: () => void
  onRequestError?: (error: unknown) => void
}

export function useGameStream({
  characterId,
  sessionId,
  chatTab,
  onSystemRefresh,
  onRequestError,
}: UseGameStreamParams) {
  const [isSending, setIsSending] = useState(false)
  const [typewriterText, setTypewriterText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pendingDiceRoll, setPendingDiceRoll] = useState<DiceRollRequired | null>(null)
  const [pendingAssistantClientEventId, setPendingAssistantClientEventId] = useState<string | null>(null)

  const handleStreamResponse = useCallback(
    async (response: Response) => {
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`Error del servidor (${response.status})${detail ? `: ${detail}` : ''}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = (await response.json()) as { system_only?: boolean }
        if (json.system_only) {
          setIsSending(false)
          setIsTyping(false)
          setTypewriterText('')
          onSystemRefresh()
        }
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setIsSending(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let runtimeState = createGameClientRuntimeState([])

      setIsTyping(true)
      setTypewriterText('')
      setPendingDiceRoll(null)
      setPendingAssistantClientEventId(null)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value, { stream: true })
        const result = consumeAssistantStreamChunk(runtimeState, chunkText, buffer)

        runtimeState = result.state
        buffer = result.remainingBuffer

        setIsTyping(result.state.isTyping)
        setTypewriterText(result.state.typewriterText)
        setPendingDiceRoll(result.state.pendingDiceRoll)
        setPendingAssistantClientEventId(result.state.pendingAssistantClientEventId)

        if (result.refreshRequested) {
          setIsSending(false)
          setIsTyping(false)
          setTypewriterText('')
          onSystemRefresh()
        }
      }
    },
    [onSystemRefresh],
  )

  const sendMessage = useCallback(
    async (content: string, clientEventId?: string, intent?: StructuredIntent | null) => {
      if (isSending) return

      setIsSending(true)
      try {
        const response = await fetch('/api/engine/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            characterId,
            content,
            sessionId,
            clientEventId,
            channel: chatTab,
            intent,
          }),
        })

        await handleStreamResponse(response)
      } catch (error) {
        setIsSending(false)
        setIsTyping(false)
        setTypewriterText('')
        onRequestError?.(error)
      }
    },
    [characterId, chatTab, handleStreamResponse, onRequestError, sessionId, isSending],
  )

  const sendDiceResolution = useCallback(
    async (content: string) => {
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
            characterId,
            sessionId,
            clientEventId: pendingAssistantClientEventId,
            channel: chatTab,
          }),
        })

        await handleStreamResponse(response)
      } catch (error) {
        setIsSending(false)
        setIsTyping(false)
        setTypewriterText('')
        onRequestError?.(error)
      }
    },
    [characterId, chatTab, handleStreamResponse, onRequestError, pendingAssistantClientEventId, sessionId],
  )

  return {
    isSending,
    isTyping,
    typewriterText,
    pendingDiceRoll,
    sendMessage,
    sendDiceResolution,
  }
}
