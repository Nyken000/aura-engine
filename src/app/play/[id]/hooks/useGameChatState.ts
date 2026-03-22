import { useEffect, useState } from 'react'

import type { GameChatTab } from '../types'

type UseGameChatStateParams = {
  hasActiveSession: boolean
}

export function useGameChatState({ hasActiveSession }: UseGameChatStateParams) {
  const [inputText, setInputText] = useState('')
  const [chatTab, setChatTab] = useState<GameChatTab>('adventure')

  useEffect(() => {
    if (!hasActiveSession && chatTab === 'group') {
      setChatTab('adventure')
    }
  }, [chatTab, hasActiveSession])

  return {
    inputText,
    setInputText,
    chatTab,
    setChatTab,
  }
}
