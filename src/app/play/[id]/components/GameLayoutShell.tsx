'use client'

import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Menu, MessageSquare, ScrollText, Send, Users, Shield } from 'lucide-react'

import { type Campaign } from '@/utils/game/campaigns'
import { GameAmbientEffects } from './GameAmbientEffects'
import { GameCharacterPanel } from './GameCharacterPanel'
import { GameNarrativeFeed } from './GameNarrativeFeed'
import { GameSessionSidebar } from './GameSessionSidebar'
import type { DiceRollOutcome, DiceRollRequired } from '@/types/dice'
import type {
  CharacterSheet,
  NarrativeEvent,
  SessionCombatParticipant,
  SessionCombatState,
  SessionData,
  SessionPlayer,
  WorldData,
} from '../types'

type ChatTab = 'adventure' | 'group'

const CAMPAIGN_THEME: Record<
  string,
  { badge: string; label: string }
> = {
  'oakhaven-fall': {
    badge: 'border-stone-500/30 text-stone-300',
    label: 'Ceniza',
  },
  'leviathan-veil': {
    badge: 'border-slate-500/30 text-slate-300',
    label: 'Mar',
  },
  'eternal-flame': {
    badge: 'border-red-900/40 text-red-400',
    label: 'Fuego',
  },
  'crimson-carnival': {
    badge: 'border-rose-900/40 text-rose-400',
    label: 'Carnaval',
  },
  'sand-king-tomb': {
    badge: 'border-amber-700/40 text-amber-500',
    label: 'Desierto',
  },
}

export function GameLayoutShell({
  character,
  world,
  campaign,
  visibleEvents,
  currentUserId,
  liveSession,
  activeSessionPlayers,
  liveSessionCombat,
  activeCombatParticipant,
  isWaitingForInitiative,
  hasSubmittedInitiative,
  isMyTurn,
  chatTab,
  onChatTabChange,
  inputText,
  onInputTextChange,
  isSending,
  isTyping,
  typewriterText,
  pendingDiceRoll,
  onSubmit,
  onDiceResult,
  chatEndRef,
}: {
  character: CharacterSheet
  world: WorldData | null
  campaign: Campaign | null
  visibleEvents: NarrativeEvent[]
  currentUserId: string
  liveSession: SessionData | null
  activeSessionPlayers: SessionPlayer[]
  liveSessionCombat: SessionCombatState | null
  activeCombatParticipant: SessionCombatParticipant | null
  isWaitingForInitiative: boolean
  hasSubmittedInitiative: boolean
  isMyTurn: boolean
  chatTab: ChatTab
  onChatTabChange: (tab: ChatTab) => void
  inputText: string
  onInputTextChange: (value: string) => void
  isSending: boolean
  isTyping: boolean
  typewriterText: string
  pendingDiceRoll: DiceRollRequired | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void
  onDiceResult: (result: DiceRollOutcome) => Promise<void> | void
  chatEndRef: RefObject<HTMLDivElement | null>
}) {
  const campaignTheme = campaign ? CAMPAIGN_THEME[campaign.id] : null
  const canSendAdventureMessage = !isWaitingForInitiative && isMyTurn

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-stone-950 text-stone-200">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900/40 via-stone-950 to-black opacity-80" />
      <GameAmbientEffects />

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        {/* TOP NAVIGATION */}
        <nav className="relative z-30 flex h-14 lg:h-16 shrink-0 items-center justify-between border-b border-stone-800/60 bg-stone-950/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="cursor-pointer rounded-lg p-2 text-stone-500 transition-all duration-200 hover:bg-stone-800 hover:text-stone-300"
              title="Volver a la Taverna"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="h-5 w-px bg-stone-800" />

            {/* Title / Campaign / World info hidden on mobile, shown on tablet+ */}
            <div className="hidden sm:block">
              <p className="font-serif text-sm tracking-widest text-stone-300 uppercase">
                {world?.name || 'Reinos Desconocidos'}
              </p>
            </div>
          </div>

          <div className="flex flex-1 justify-center sm:hidden">
            <p className="font-serif text-sm tracking-widest text-amber-500/80 uppercase truncate">
              {campaign?.title || 'Aventura'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {campaign ? (
              <div
                className={`hidden items-center gap-2 rounded border px-3 py-1 text-[10px] uppercase tracking-widest md:flex ${campaignTheme?.badge ?? 'border-amber-900/40 text-amber-500'}`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {campaignTheme?.label ?? campaign.theme}
              </div>
            ) : null}

            {/* Mobile toggles for sidebars */}
            <button
              type="button"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="lg:hidden rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            >
              <Shield className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="lg:hidden rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </nav>

        {/* MAIN GAME AREA */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">

          {/* LEFT SIDEBAR (Character) */}
          <div
            className={`absolute inset-y-0 left-0 z-20 w-80 transform border-r border-stone-800/60 bg-stone-950/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`}
          >
            <GameCharacterPanel character={character} />
            <button
              type="button"
              onClick={() => setLeftSidebarOpen(false)}
              className="absolute -right-10 top-4 rounded-r-lg border border-l-0 border-stone-800/60 bg-stone-950/90 p-2 text-stone-400 lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* BACKGROUND OVERLAY FOR MOBILE SIDEBARS */}
          {(leftSidebarOpen || rightSidebarOpen) && (
            <div
              className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
              onClick={() => { setLeftSidebarOpen(false); setRightSidebarOpen(false) }}
            />
          )}

          {/* CENTER NARRATIVE FEED (Immersive) */}
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden items-center w-full">
            <header className="w-full max-w-4xl shrink-0 border-b border-stone-800/30 px-5 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="hidden sm:block">
                  <h2 className="font-serif text-xl text-amber-100/90 tracking-wide">
                    {campaign?.title || 'Aventura en curso'}
                  </h2>
                </div>

                <div className="flex w-full sm:w-auto overflow-hidden rounded-lg border border-stone-800 bg-stone-900/50">
                  <button
                    type="button"
                    onClick={() => onChatTabChange('adventure')}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2 text-xs uppercase tracking-widest transition-all ${chatTab === 'adventure'
                      ? 'bg-stone-800 text-amber-400 font-medium'
                      : 'text-stone-500 hover:bg-stone-800/50 hover:text-stone-300'
                      }`}
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    Crónica
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!liveSession) return
                      onChatTabChange('group')
                    }}
                    disabled={!liveSession}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2 text-xs uppercase tracking-widest transition-all border-l border-stone-800 ${!liveSession
                      ? 'cursor-not-allowed opacity-30 text-stone-600'
                      : chatTab === 'group'
                        ? 'bg-stone-800 text-sky-400 font-medium'
                        : 'text-stone-500 hover:bg-stone-800/50 hover:text-stone-300'
                      }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    OOC
                  </button>
                </div>
              </div>
            </header>

            {/* THE FEED COMPONENT */}
            <div className="w-full max-w-4xl flex-1 overflow-hidden flex flex-col relative">
              <GameNarrativeFeed
                visibleEvents={visibleEvents}
                character={character}
                isTyping={isTyping}
                typewriterText={typewriterText}
                chatEndRef={chatEndRef}
                /* Passing these specifically to integrate DiceRoller inline */
                pendingDiceRoll={pendingDiceRoll}
                onDiceResult={onDiceResult}
                isSending={isSending}
              />
              {/* Narrative events container without any mask for a cleaner look */}
            </div>

            {/* CHAT INPUT AREA */}
            <footer className="w-full max-w-4xl shrink-0 p-4">
              <div className="mx-auto w-full relative">
                {chatTab === 'adventure' && liveSession && !canSendAdventureMessage ? (
                  <div className="mb-3 rounded-lg border border-amber-900/30 bg-stone-900/50 px-4 py-3 text-center text-xs uppercase tracking-widest text-amber-500/70">
                    {isWaitingForInitiative
                      ? hasSubmittedInitiative
                        ? 'Esperando el inicio del combate...'
                        : 'El combate exige tu iniciativa.'
                      : 'Aguarda tu turno en las sombras...'}
                  </div>
                ) : null}

                <form onSubmit={onSubmit} className="flex items-end gap-2 relative">
                  <div className="absolute top-0 left-0 w-full h-full rounded-xl bg-stone-900/60 blur-md -z-10" />
                  <textarea
                    value={inputText}
                    onChange={(event) => onInputTextChange(event.target.value)}
                    rows={2}
                    placeholder={
                      chatTab === 'adventure'
                        ? 'Describe tu próxima acción en las sombras...'
                        : 'Mensaje fuera del personaje para el grupo...'
                    }
                    className={`custom-scrollbar w-full resize-none rounded-xl border bg-stone-950/80 px-4 py-3 text-sm leading-relaxed text-stone-200 placeholder:text-stone-600 transition-all duration-300 focus:outline-none focus:bg-stone-900 ${chatTab === 'group'
                      ? 'border-sky-900/40 focus:border-sky-700/60 ring-0'
                      : 'border-stone-800 focus:border-amber-900/60 ring-0'
                      }`}
                    disabled={isSending || (chatTab === 'adventure' && !canSendAdventureMessage) || !!pendingDiceRoll}
                  />

                  <button
                    type="submit"
                    disabled={
                      !inputText.trim() ||
                      isSending ||
                      (chatTab === 'adventure' && !canSendAdventureMessage) ||
                      !!pendingDiceRoll
                    }
                    className={`flex shrink-0 items-center justify-center rounded-xl p-3.5 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30 ${chatTab === 'group'
                      ? 'bg-sky-900/60 text-sky-200 hover:bg-sky-800'
                      : 'bg-stone-800 text-amber-400 hover:bg-stone-700 hover:text-amber-300 border border-stone-700'
                      }`}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </footer>
          </main>

          {/* RIGHT SIDEBAR (Session) */}
          <div
            className={`absolute inset-y-0 right-0 z-20 w-80 transform border-l border-stone-800/60 bg-stone-950/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
              }`}
          >
            <button
              type="button"
              onClick={() => setRightSidebarOpen(false)}
              className="absolute -left-10 top-4 rounded-l-lg border border-r-0 border-stone-800/60 bg-stone-950/90 p-2 text-stone-400 lg:hidden"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <GameSessionSidebar
              campaign={campaign}
              world={world}
              liveSession={liveSession}
              activeSessionPlayers={activeSessionPlayers}
              liveSessionCombat={liveSessionCombat}
              activeCombatParticipant={activeCombatParticipant}
              currentUserId={currentUserId}
              isWaitingForInitiative={isWaitingForInitiative}
              hasSubmittedInitiative={hasSubmittedInitiative}
            />
          </div>
        </div>
      </div>
    </div>
  )
}