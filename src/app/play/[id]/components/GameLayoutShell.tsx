'use client'

import { useMemo, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Shield,
  Send,
  ScrollText,
  Users,
} from 'lucide-react'

import { type Campaign } from '@/utils/game/campaigns'
import { GameAmbientEffects } from './GameAmbientEffects'
import { GameCharacterPanel } from './GameCharacterPanel'
import { GameNarrativeFeed } from './GameNarrativeFeed'
import { GameSessionSidebar } from './GameSessionSidebar'
import type { DiceRollOutcome, DiceRollRequired } from '@/types/dice'
import type {
  CharacterSheet,
  ComposerActionRequest,
  GameChatTab,
  NarrativeEvent,
  NpcRelationship,
  NpcRelationshipEvent,
  SessionCombatParticipant,
  SessionCombatState,
  SessionCompanion,
  SessionData,
  SessionPlayer,
  SessionQuest,
  SessionQuestUpdate,
  SidebarSelection,
  WorldAlert,
  WorldData,
} from '../types'
import { GameWorldAlerts } from './GameWorldAlerts'

const CAMPAIGN_THEME: Record<string, { badge: string; label: string }> = {
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

function getCampaignDescription(campaign: Campaign | null): string | null {
  if (!campaign) return null
  return 'description' in campaign && typeof campaign.description === 'string'
    ? campaign.description
    : null
}

function buildWorldAlerts({
  quests,
  relationships,
  companions,
}: {
  quests: SessionQuest[]
  relationships: NpcRelationship[]
  companions: SessionCompanion[]
}): WorldAlert[] {
  const alerts: WorldAlert[] = []

  const offeredQuest = quests.find((quest) => quest.status === 'offered')
  if (offeredQuest) {
    alerts.push({
      id: `quest-${offeredQuest.slug}`,
      kind: 'quest',
      title: 'Encargo pendiente',
      detail: `${offeredQuest.title} sigue esperando una respuesta clara del grupo.`,
      actionLabel: 'Ver misión',
      selection: { type: 'quest', questSlug: offeredQuest.slug },
      prompt: `Quiero responder al encargo "${offeredQuest.title}".`,
    })
  }

  const tenseRelationship = relationships.find(
    (relationship) => relationship.hostility >= 3 || relationship.trust <= -3,
  )
  if (tenseRelationship) {
    alerts.push({
      id: `social-${tenseRelationship.npc_key}`,
      kind: 'social',
      title: 'Tensión social',
      detail: `${tenseRelationship.npc_name} mantiene una relación delicada contigo. Conviene manejarla con cuidado.`,
      actionLabel: 'Ver vínculo',
      selection: { type: 'relationship', npcKey: tenseRelationship.npc_key },
      prompt: `Quiero hablar con ${tenseRelationship.npc_name} para calmar la tensión entre nosotros.`,
    })
  }

  const joinedCompanion = companions.find((companion) => companion.status === 'joined')
  if (joinedCompanion) {
    alerts.push({
      id: `companion-${joinedCompanion.npc_key}`,
      kind: 'companion',
      title: 'Aliado disponible',
      detail: `${joinedCompanion.npc_name} está presente y puede intervenir si se le da un rol claro.`,
      actionLabel: 'Ver aliado',
      selection: { type: 'relationship', npcKey: joinedCompanion.npc_key },
      prompt: `Quiero pedirle a ${joinedCompanion.npc_name} que me ayude con el siguiente paso.`,
    })
  }

  return alerts.slice(0, 3)
}

export function GameLayoutShell({
  character,
  world,
  campaign,
  allEvents,
  visibleEvents,
  currentUserId,
  liveSession,
  activeSessionPlayers,
  activeSessionQuests,
  activeSessionQuestUpdates,
  activeNpcRelationships,
  activeNpcRelationshipEvents,
  activeSessionCompanions,
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
  onQuestAction,
  sidebarSelection,
  onSidebarSelectionChange,
  chatEndRef,
}: {
  character: CharacterSheet
  world: WorldData | null
  campaign: Campaign | null
  allEvents: NarrativeEvent[]
  visibleEvents: NarrativeEvent[]
  currentUserId: string
  liveSession: SessionData | null
  activeSessionPlayers: SessionPlayer[]
  activeSessionQuests: SessionQuest[]
  activeSessionQuestUpdates: SessionQuestUpdate[]
  activeNpcRelationships: NpcRelationship[]
  activeNpcRelationshipEvents: NpcRelationshipEvent[]
  activeSessionCompanions: SessionCompanion[]
  liveSessionCombat: SessionCombatState | null
  activeCombatParticipant: SessionCombatParticipant | null
  isWaitingForInitiative: boolean
  hasSubmittedInitiative: boolean
  isMyTurn: boolean
  chatTab: GameChatTab
  onChatTabChange: (tab: GameChatTab) => void
  inputText: string
  onInputTextChange: (value: string) => void
  isSending: boolean
  isTyping: boolean
  typewriterText: string
  pendingDiceRoll: DiceRollRequired | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void
  onDiceResult: (result: DiceRollOutcome) => Promise<void> | void
  onQuestAction: (action: string | ComposerActionRequest) => void
  sidebarSelection: SidebarSelection
  onSidebarSelectionChange: (selection: SidebarSelection) => void
  chatEndRef: RefObject<HTMLDivElement | null>
}) {
  const campaignTheme = campaign ? CAMPAIGN_THEME[campaign.id] : null
  const canSendAdventureMessage = !isWaitingForInitiative && isMyTurn
  const isSoloMode = !liveSession
  const campaignDescription = useMemo(() => getCampaignDescription(campaign), [campaign])

  const worldAlerts = useMemo(
    () =>
      buildWorldAlerts({
        quests: activeSessionQuests,
        relationships: activeNpcRelationships,
        companions: activeSessionCompanions,
      }),
    [activeSessionQuests, activeNpcRelationships, activeSessionCompanions],
  )

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-stone-950 text-stone-200">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900/40 via-stone-950 to-black opacity-80" />
      <GameAmbientEffects />

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        <nav className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-stone-800/60 bg-stone-950/80 px-4 backdrop-blur-md lg:h-16">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="cursor-pointer rounded-lg p-2 text-stone-500 transition-all duration-200 hover:bg-stone-800 hover:text-stone-300"
              title="Volver a la Taverna"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="h-5 w-px bg-stone-800" />

            <div className="hidden sm:block">
              <p className="font-serif text-sm uppercase tracking-widest text-stone-300">
                {world?.name || 'Reinos Desconocidos'}
              </p>
            </div>
          </div>

          <div className="flex flex-1 justify-center sm:hidden">
            <p className="truncate font-serif text-sm uppercase tracking-widest text-amber-500/80">
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

            <button
              type="button"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200 lg:hidden"
            >
              <Shield className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200 lg:hidden"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </nav>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 z-20 w-80 transform border-r border-stone-800/60 bg-stone-950/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
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

          {(leftSidebarOpen || rightSidebarOpen) && (
            <div
              className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
              onClick={() => {
                setLeftSidebarOpen(false)
                setRightSidebarOpen(false)
              }}
            />
          )}

          <main className="relative flex min-w-0 flex-1 flex-col items-center overflow-hidden">
            <header className="w-full max-w-4xl shrink-0 border-b border-stone-800/30 px-5 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="hidden sm:block">
                  <h2 className="font-serif text-xl tracking-wide text-amber-100/90">
                    {campaign?.title || 'Aventura en curso'}
                  </h2>
                </div>

                <div className="flex w-full overflow-hidden rounded-lg border border-stone-800 bg-stone-900/50 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => onChatTabChange('adventure')}
                    className={`inline-flex flex-1 items-center justify-center gap-2 px-6 py-2 text-xs uppercase tracking-widest transition-all sm:flex-none ${chatTab === 'adventure'
                        ? 'bg-stone-800 font-medium text-amber-400'
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
                    className={`inline-flex flex-1 items-center justify-center gap-2 border-l border-stone-800 px-6 py-2 text-sm transition sm:flex-none ${!liveSession
                        ? 'cursor-not-allowed text-stone-600/50'
                        : chatTab === 'group'
                          ? 'bg-white/10 font-medium text-white'
                          : 'text-stone-500 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <Users className="h-4 w-4" />
                    Grupo
                  </button>
                </div>
              </div>

              {isSoloMode ? (
                <div className="mt-3 rounded-lg border border-stone-800/80 bg-stone-900/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
                  Modo individual activo. El canal de <span className="text-stone-200">Grupo</span> se habilita solo dentro de una sesión multijugador válida.
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-sky-900/40 bg-sky-950/20 px-4 py-3 text-xs uppercase tracking-[0.2em] text-sky-200/80">
                  Sesión multijugador sincronizada. El canal de <span className="text-sky-100">Grupo</span> comparte contexto entre jugadores activos.
                </div>
              )}
            </header>

            <div className="relative flex w-full max-w-4xl flex-1 flex-col overflow-hidden">
              <div className="px-4 pt-4 md:px-8">
                <GameWorldAlerts
                  alerts={worldAlerts}
                  onSelect={onSidebarSelectionChange}
                  onUsePrompt={onQuestAction}
                />
              </div>

              <GameNarrativeFeed
                visibleEvents={visibleEvents}
                character={character}
                isTyping={isTyping}
                typewriterText={typewriterText}
                chatEndRef={chatEndRef}
                pendingDiceRoll={pendingDiceRoll}
                onDiceResult={onDiceResult}
                isSending={isSending}
                onQuestAction={onQuestAction}
                onSidebarSelectionChange={onSidebarSelectionChange}
                activeSessionQuests={activeSessionQuests}
              />
            </div>

            <footer className="w-full max-w-4xl shrink-0 p-4">
              <div className="relative mx-auto w-full">
                {chatTab === 'adventure' && liveSession && !canSendAdventureMessage ? (
                  <div className="mb-3 rounded-lg border border-amber-900/30 bg-stone-900/50 px-4 py-3 text-center text-xs uppercase tracking-widest text-amber-500/70">
                    {isWaitingForInitiative
                      ? hasSubmittedInitiative
                        ? 'Esperando el inicio del combate...'
                        : 'El combate exige tu iniciativa.'
                      : 'Aguarda tu turno en las sombras...'}
                  </div>
                ) : null}

                <form onSubmit={onSubmit} className="relative flex items-end gap-2">
                  <div className="absolute left-0 top-0 -z-10 h-full w-full rounded-xl bg-stone-900/60 blur-md" />
                  <textarea
                    value={inputText}
                    onChange={(event) => onInputTextChange(event.target.value)}
                    rows={2}
                    placeholder={
                      chatTab === 'adventure'
                        ? 'Describe tu próxima acción en las sombras...'
                        : 'Mensaje fuera del personaje para el grupo...'
                    }
                    className={`custom-scrollbar w-full resize-none rounded-xl border bg-stone-950/80 px-4 py-3 text-sm leading-relaxed text-stone-200 transition-all duration-300 placeholder:text-stone-600 focus:bg-stone-900 focus:outline-none ${chatTab === 'group'
                        ? 'border-sky-900/40 ring-0 focus:border-sky-700/60'
                        : 'border-stone-800 ring-0 focus:border-amber-900/60'
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
                        : 'border border-stone-700 bg-stone-800 text-amber-400 hover:bg-stone-700 hover:text-amber-300'
                      }`}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </footer>
          </main>

          <div
            className={`absolute inset-y-0 right-0 z-20 w-96 transform border-l border-stone-800/60 bg-stone-950/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
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
              campaignDescription={campaignDescription}
              world={world}
              characterName={character.name}
              narrativeEvents={allEvents}
              activeSessionPlayers={activeSessionPlayers}
              activeSessionQuests={activeSessionQuests}
              activeSessionQuestUpdates={activeSessionQuestUpdates}
              activeNpcRelationships={activeNpcRelationships}
              activeNpcRelationshipEvents={activeNpcRelationshipEvents}
              activeSessionCompanions={activeSessionCompanions}
              liveSessionCombat={liveSessionCombat}
              activeCombatParticipant={activeCombatParticipant}
              currentUserId={currentUserId}
              isWaitingForInitiative={isWaitingForInitiative}
              selection={sidebarSelection}
              onSelectionChange={onSidebarSelectionChange}
              onUsePrompt={onQuestAction}
            />
          </div>
        </div>
      </div>
    </div>
  )
}