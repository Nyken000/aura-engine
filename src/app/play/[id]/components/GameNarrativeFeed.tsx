'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Dices, Sparkles } from 'lucide-react'

import type {
  CharacterSheet,
  NarrativeEvent,
  SemanticEntityAnnotation,
  SessionQuest,
  SidebarSelection,
} from '../types'
import { DiceRoller } from './DiceRoller'
import type { DiceRollOutcome, DiceRollRequired } from '@/types/dice'

function getSenderName(event: NarrativeEvent, fallback: string) {
  return event.payload?.sender_name || event.characters?.name || fallback
}

function getCombatBadgeColor(event: NarrativeEvent) {
  if (event.event_type === 'damage_applied') return 'text-red-400 border-red-900/50 bg-red-950/30'
  if (event.event_type === 'healing_applied') return 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30'
  if (event.event_type === 'condition_applied') return 'text-amber-500 border-amber-900/50 bg-amber-950/30'
  if (event.event_type === 'attack_declared') return 'text-orange-400 border-orange-900/50 bg-orange-950/30'
  if (event.event_type === 'combat_ended') return 'text-sky-400 border-sky-900/50 bg-sky-950/30'
  return 'text-stone-400 border-stone-800 bg-stone-900/50'
}

function getCombatBadgeLabel(event: NarrativeEvent) {
  if (event.event_type === 'damage_applied') return 'Daño'
  if (event.event_type === 'healing_applied') return 'Curación'
  if (event.event_type === 'condition_applied') return 'Condición'
  if (event.event_type === 'attack_declared') return 'Ataque'
  if (event.event_type === 'combat_ended') return 'Combate Finalizado'
  return 'Combate'
}

function getEntityClasses(kind: SemanticEntityAnnotation['kind']) {
  switch (kind) {
    case 'npc':
      return 'text-rose-300 bg-rose-950/35 border-rose-900/50 hover:bg-rose-950/50'
    case 'location':
      return 'text-sky-300 bg-sky-950/35 border-sky-900/50 hover:bg-sky-950/50'
    case 'objective':
      return 'text-amber-300 bg-amber-950/35 border-amber-900/50 hover:bg-amber-950/50'
    case 'item':
      return 'text-violet-300 bg-violet-950/35 border-violet-900/50 hover:bg-violet-950/50'
    case 'faction':
      return 'text-emerald-300 bg-emerald-950/35 border-emerald-900/50 hover:bg-emerald-950/50'
    default:
      return 'text-stone-200 bg-stone-900/35 border-stone-800/60 hover:bg-stone-900/50'
  }
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSemanticTokens(content: string, entities: SemanticEntityAnnotation[]) {
  if (!entities.length) return [{ text: content, entity: null as SemanticEntityAnnotation | null }]

  const normalized = entities
    .flatMap((entity) => [entity.label, ...(entity.aliases ?? [])].map((alias) => ({ entity, alias })))
    .filter(({ alias }) => alias && alias.trim().length > 1)
    .sort((a, b) => b.alias.length - a.alias.length)

  const matches: Array<{ start: number; end: number; entity: SemanticEntityAnnotation }> = []

  for (const { entity, alias } of normalized) {
    const regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi')
    let result: RegExpExecArray | null = regex.exec(content)

    while (result) {
      const start = result.index
      const end = start + result[0].length
      const overlaps = matches.some((match) => !(end <= match.start || start >= match.end))

      if (!overlaps) {
        matches.push({ start, end, entity })
      }

      result = regex.exec(content)
    }
  }

  matches.sort((a, b) => a.start - b.start)

  const parts: Array<{ text: string; entity: SemanticEntityAnnotation | null }> = []
  let cursor = 0

  for (const match of matches) {
    if (match.start > cursor) {
      parts.push({ text: content.slice(cursor, match.start), entity: null })
    }

    parts.push({
      text: content.slice(match.start, match.end),
      entity: match.entity,
    })

    cursor = match.end
  }

  if (cursor < content.length) {
    parts.push({ text: content.slice(cursor), entity: null })
  }

  return parts
}

function SemanticNarrativeText({
  text,
  entities,
  onSidebarSelectionChange,
}: {
  text: string
  entities: SemanticEntityAnnotation[]
  onSidebarSelectionChange: (selection: SidebarSelection) => void
}) {
  const paragraphs = text.split('\n')

  return (
    <div className="space-y-3 font-serif text-[15px] leading-relaxed text-stone-300">
      {paragraphs.map((paragraph, index) => {
        if (paragraph.trim().length === 0) return <div key={index} className="h-2" />

        const tokens = buildSemanticTokens(paragraph, entities)

        return (
          <p key={index}>
            {tokens.map((token, tokenIndex) => {
              if (!token.entity) {
                return <Fragment key={`${index}-${tokenIndex}`}>{token.text}</Fragment>
              }

              return (
                <button
                  key={`${token.entity.key}-${index}-${tokenIndex}`}
                  type="button"
                  className={`inline rounded-md border px-1 py-0.5 font-medium transition ${getEntityClasses(token.entity.kind)}`}
                  onClick={() => {
                    const entity = token.entity as SemanticEntityAnnotation
                    if (entity.kind === 'npc') {
                      onSidebarSelectionChange({
                        type: 'relationship',
                        npcKey: entity.key,
                      })
                      return
                    }

                    onSidebarSelectionChange({
                      type: 'entity',
                      entity: entity,
                    })
                  }}
                >
                  {token.text}
                </button>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}

function TypewriterMessage({ text, charSpeed = 20 }: { text: string; charSpeed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')

    const tick = () => {
      if (idxRef.current < text.length) {
        idxRef.current += 1
        setDisplayed(text.slice(0, idxRef.current))
        timerRef.current = setTimeout(tick, charSpeed)
      }
    }

    timerRef.current = setTimeout(tick, 50)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, charSpeed])

  const isDone = displayed.length >= text.length
  const paragraphs = displayed.split('\n')

  return (
    <div className="space-y-3 font-serif text-[15px] leading-relaxed text-stone-300">
      {paragraphs.map((paragraph, index) => {
        const isLastParagraph = index === paragraphs.length - 1

        return (
          <p key={index} className={paragraph === '' ? 'h-2' : 'min-h-[1.5em]'}>
            {paragraph}
            {isLastParagraph && !isDone ? (
              <span className="ml-[2px] inline-block h-[1.1em] w-[2px] animate-pulse bg-amber-600/60 align-middle" />
            ) : null}
          </p>
        )
      })}
    </div>
  )
}

function QuestOfferCard({
  quest,
  onAccept,
  onDecline,
  onNegotiate,
  onOpenQuest,
}: {
  quest: NonNullable<NonNullable<NarrativeEvent['payload']>['semantic']>['quests'] extends infer T
  ? T extends { upserts?: infer U }
  ? U extends Array<infer Item>
  ? Item
  : never
  : never
  : never
  onAccept: () => void
  onDecline: () => void
  onNegotiate: () => void
  onOpenQuest: () => void
}) {
  return (
    <div className="mt-4 rounded-xl border border-amber-900/50 bg-stone-950/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-400">Encargo Ofrecido</div>
        <button
          type="button"
          onClick={onOpenQuest}
          className="rounded-md border border-amber-900/40 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-300 transition hover:bg-amber-950/30"
        >
          Ver detalle
        </button>
      </div>

      <h4 className="font-serif text-sm tracking-wide text-amber-300">{quest.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-stone-300">{quest.description}</p>

      {quest.objectiveSummary ? (
        <div className="mt-2 text-xs leading-relaxed text-stone-400">
          <span className="uppercase tracking-[0.2em] text-stone-500">Objetivo:</span> {quest.objectiveSummary}
        </div>
      ) : null}

      {quest.rewardSummary ? (
        <div className="mt-1 text-xs leading-relaxed text-stone-400">
          <span className="uppercase tracking-[0.2em] text-stone-500">Recompensa:</span> {quest.rewardSummary}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-900/30"
        >
          Aceptar
        </button>
        <button
          type="button"
          onClick={onNegotiate}
          className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs uppercase tracking-widest text-amber-300 transition hover:bg-amber-900/25"
        >
          Negociar
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2 text-xs uppercase tracking-widest text-red-300 transition hover:bg-red-900/25"
        >
          Rechazar
        </button>
      </div>
    </div>
  )
}

export function GameNarrativeFeed({
  visibleEvents,
  character,
  isTyping,
  typewriterText,
  chatEndRef,
  pendingDiceRoll,
  onDiceResult,
  isSending,
  onQuestAction,
  onSidebarSelectionChange,
  activeSessionQuests,
}: {
  visibleEvents: NarrativeEvent[]
  character: CharacterSheet
  isTyping: boolean
  typewriterText: string
  chatEndRef: RefObject<HTMLDivElement | null>
  pendingDiceRoll: DiceRollRequired | null
  onDiceResult: (result: DiceRollOutcome) => Promise<void> | void
  isSending: boolean
  onQuestAction: (text: string) => void
  onSidebarSelectionChange: (selection: SidebarSelection) => void
  activeSessionQuests: SessionQuest[]
}) {
  return (
    <div className="custom-scrollbar absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden px-4 py-8 pb-16 scroll-smooth md:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 pb-4">
        <div className="mb-4 flex items-center justify-center opacity-40">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-700/50" />
          <div className="mx-2 text-[10px] uppercase tracking-[0.3em] text-amber-500">La Crónica</div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-700/50" />
        </div>

        {visibleEvents.map((event) => {
          const senderName =
            event.role === 'user'
              ? getSenderName(event, character.name)
              : event.role === 'assistant'
                ? 'Dungeon Master'
                : 'Sistema'

          const isUser = event.role === 'user'
          const isGroup = event.payload?.channel === 'group'
          const isCombatSemantic =
            event.event_type === 'damage_applied' ||
            event.event_type === 'healing_applied' ||
            event.event_type === 'condition_applied' ||
            event.event_type === 'attack_declared' ||
            event.event_type === 'combat_ended'

          const isSystem = event.role === 'system'
          const semanticEntities = event.payload?.semantic?.entities ?? []
          const questOffers =
            event.payload?.semantic?.quests?.upserts?.filter((quest) => quest.status === 'offered') ?? []

          let bubbleStyle = ''
          let labelColor = ''

          if (isUser) {
            if (isGroup) {
              bubbleStyle =
                'border-sky-900/30 bg-sky-950/20 text-sky-100 ml-12 lg:ml-32 shadow-[0_4px_20px_-5px_rgba(8,145,178,0.15)]'
              labelColor = 'text-sky-500/70'
            } else {
              bubbleStyle =
                'border-stone-700/60 bg-stone-800/60 text-stone-200 ml-12 lg:ml-32 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]'
              labelColor = 'text-stone-400'
            }
          } else if (isSystem) {
            bubbleStyle = 'border-stone-800/50 bg-stone-950/60 text-stone-400 mx-12 text-center text-sm italic py-2'
            labelColor = 'text-stone-500'
          } else {
            bubbleStyle =
              'border-amber-900/20 bg-stone-900/40 text-stone-200 mr-12 lg:mr-32 shadow-[0_4px_30px_-5px_rgba(217,119,6,0.1)]'
            labelColor = 'text-amber-600/80'
          }

          return (
            <div
              key={event.id}
              className={`flex w-full flex-col ${isUser ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}
            >
              {!isSystem && (
                <div className={`mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider ${labelColor}`}>
                  {isGroup && <span className="font-bold tracking-widest">[OOC]</span>}
                  <span className="font-medium tracking-widest opacity-80">{senderName}</span>

                  {isCombatSemantic && (
                    <span className={`inline-flex rounded-[4px] border px-1.5 text-[9px] ${getCombatBadgeColor(event)}`}>
                      {getCombatBadgeLabel(event)}
                    </span>
                  )}

                  {event.event_type === 'system_message' && (
                    <span className="rounded-[4px] border border-amber-900/50 px-1.5 text-[9px] text-amber-500/50">
                      Aviso
                    </span>
                  )}
                </div>
              )}

              <div className={`relative w-fit max-w-[85%] rounded-2xl border px-5 py-4 backdrop-blur-sm ${bubbleStyle}`}>
                {!isUser && !isSystem && (
                  <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-gradient-to-b from-amber-900/10 to-transparent" />
                )}

                <div className={`relative z-10 ${isSystem ? 'text-sm' : ''}`}>
                  <SemanticNarrativeText
                    text={event.content}
                    entities={semanticEntities}
                    onSidebarSelectionChange={onSidebarSelectionChange}
                  />
                </div>

                {questOffers.map((quest) => {
                  const existingQuest = activeSessionQuests.find((item) => item.slug === quest.slug)

                  return (
                    <QuestOfferCard
                      key={quest.slug}
                      quest={quest}
                      onAccept={() => onQuestAction(`Acepto el encargo "${quest.title}".`)}
                      onDecline={() => onQuestAction(`Rechazo el encargo "${quest.title}".`)}
                      onNegotiate={() =>
                        onQuestAction(
                          `Puedo ayudar con "${quest.title}", pero quiero mejores condiciones. ¿Qué obtengo a cambio?`,
                        )
                      }
                      onOpenQuest={() =>
                        onSidebarSelectionChange({
                          type: 'quest',
                          questSlug: existingQuest?.slug ?? quest.slug,
                        })
                      }
                    />
                  )
                })}

                {event.dice_roll_required?.needed ? (
                  <div className="relative z-10 mt-4 rounded-xl border border-amber-900/40 bg-stone-950/60 p-3 pt-2">
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-500/80">
                      <Dices className="h-3.5 w-3.5" />
                      Prueba Requerida
                    </div>
                    <div className="text-sm font-serif italic text-stone-300">
                      &ldquo;{event.dice_roll_required.flavor}&rdquo;
                    </div>
                    <div className="mt-2 text-xs font-medium tracking-wider text-stone-500">
                      {event.dice_roll_required.skill || event.dice_roll_required.stat}
                      <span className="mx-2 text-stone-700">|</span>
                      Dificultad <span className="text-amber-500">{event.dice_roll_required.dc}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="mr-8 flex flex-col items-start lg:mr-16">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-amber-600/80">
              <span className="flex items-center gap-1.5 font-medium tracking-widest">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Dungeon Master
              </span>
            </div>

            <div className="relative w-full rounded-xl border border-amber-900/20 bg-stone-900/20 px-5 py-4 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 z-0 rounded-xl bg-gradient-to-b from-amber-900/10 to-transparent" />
              <div className="relative z-10">
                <TypewriterMessage text={typewriterText} charSpeed={20} />
              </div>
            </div>
          </div>
        )}

        {pendingDiceRoll && (
          <div className="animate-in fade-in slide-in-from-bottom-4 my-6 flex flex-col items-center justify-center duration-500">
            <div className="w-full max-w-sm rounded-2xl border border-amber-900/40 bg-stone-950/80 p-4 shadow-[0_8px_30px_-10px_rgba(217,119,6,0.25)]">
              <DiceRoller
                rollData={pendingDiceRoll}
                playerStats={(character.stats as Record<string, number>) ?? {}}
                playerSkills={character.skills ?? []}
                onRollComplete={onDiceResult}
                disabled={isSending}
              />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  )
}