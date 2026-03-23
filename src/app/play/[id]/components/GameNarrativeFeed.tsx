'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Dices, Sparkles } from 'lucide-react'

import type { NarrativeEvent, CharacterSheet } from '../types'
import { DiceRoller } from './DiceRoller'
import type { DiceRollOutcome, DiceRollRequired } from '@/types/dice'

function getSenderName(event: NarrativeEvent, fallback: string) {
  return event.payload?.sender_name || event.characters?.name || fallback
}

function compareNarrativeEvents(a: NarrativeEvent, b: NarrativeEvent) {
  const timeDelta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  if (timeDelta !== 0) return timeDelta

  const indexA = typeof a.event_index === 'number' ? a.event_index : Number.MAX_SAFE_INTEGER
  const indexB = typeof b.event_index === 'number' ? b.event_index : Number.MAX_SAFE_INTEGER
  if (indexA !== indexB) return indexA - indexB

  return a.id.localeCompare(b.id)
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
  const paragraphs = text.split('\n')
  let charsRendered = 0

  return (
    <div className="space-y-3 font-serif text-[15px] leading-relaxed text-stone-300">
      {paragraphs.map((paragraph, index) => {
        const paraStart = charsRendered
        const paraEnd = paraStart + paragraph.length
        charsRendered = paraEnd + 1

        const visibleChars = Math.max(0, Math.min(paragraph.length, displayed.length - paraStart))
        const visibleParagraph = paragraph.slice(0, visibleChars)
        const isStarted = displayed.length > paraStart
        const isLastParagraph = index === paragraphs.length - 1
        const isLastVisible = isLastParagraph || displayed.length <= paraEnd

        if (!isStarted && paragraph === '') return <div key={index} className="h-2" />
        if (!isStarted) return null

        return (
          <p key={index} className={paragraph === '' ? 'h-2' : 'min-h-[1.5em]'}>
            {visibleParagraph}
            {isLastVisible && !isDone ? (
              <span className="ml-[2px] inline-block h-[1.1em] w-[2px] animate-pulse bg-amber-600/60 align-middle" />
            ) : null}
          </p>
        )
      })}
    </div>
  )
}

type FeedItemMeta = {
  senderName: string
  isUser: boolean
  isSystem: boolean
  isGroup: boolean
  isOwnUserMessage: boolean
}

function getFeedMeta(event: NarrativeEvent, character: CharacterSheet): FeedItemMeta {
  const senderName =
    event.role === 'user'
      ? getSenderName(event, character.name)
      : event.role === 'assistant'
        ? 'Dungeon Master'
        : 'Sistema'

  const isUser = event.role === 'user'
  const isSystem = event.role === 'system'
  const isGroup = event.payload?.channel === 'group'
  const isOwnUserMessage = isUser && senderName === character.name

  return {
    senderName,
    isUser,
    isSystem,
    isGroup,
    isOwnUserMessage,
  }
}

function shouldGroupWithPrevious(
  previous: NarrativeEvent | null,
  current: NarrativeEvent,
  character: CharacterSheet,
) {
  if (!previous) return false

  const prevMeta = getFeedMeta(previous, character)
  const currMeta = getFeedMeta(current, character)

  if (prevMeta.isSystem || currMeta.isSystem) return false

  return (
    prevMeta.senderName === currMeta.senderName &&
    prevMeta.isGroup === currMeta.isGroup &&
    prevMeta.isOwnUserMessage === currMeta.isOwnUserMessage &&
    previous.role === current.role
  )
}

export function GameNarrativeFeed({
  visibleEvents,
  character,
  isTyping,
  typewriterText,
  chatEndRef,
  scrollContainerRef,
  pendingDiceRoll,
  onDiceResult,
  isSending,
}: {
  visibleEvents: NarrativeEvent[]
  character: CharacterSheet
  isTyping: boolean
  typewriterText: string
  chatEndRef: RefObject<HTMLDivElement | null>
  scrollContainerRef: RefObject<HTMLDivElement | null>
  pendingDiceRoll: DiceRollRequired | null
  onDiceResult: (result: DiceRollOutcome) => Promise<void> | void
  isSending: boolean
}) {
  const orderedEvents = useMemo(
    () => [...visibleEvents].sort(compareNarrativeEvents),
    [visibleEvents],
  )

  return (
    <div
      ref={scrollContainerRef}
      className="custom-scrollbar absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden px-4 py-8 pb-16 md:px-8"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 pb-4">
        <div className="mb-4 flex items-center justify-center opacity-40">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-700/50" />
          <div className="mx-2 text-[10px] uppercase tracking-[0.3em] text-amber-500">La Crónica</div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-700/50" />
        </div>

        {orderedEvents.map((event, index) => {
          const previousEvent = index > 0 ? orderedEvents[index - 1] : null
          const groupedWithPrevious = shouldGroupWithPrevious(previousEvent, event, character)

          const {
            senderName,
            isUser,
            isSystem,
            isGroup,
            isOwnUserMessage,
          } = getFeedMeta(event, character)

          const isCombatSemantic =
            event.event_type === 'damage_applied' ||
            event.event_type === 'healing_applied' ||
            event.event_type === 'condition_applied' ||
            event.event_type === 'attack_declared' ||
            event.event_type === 'combat_ended'

          let wrapperAlign = 'items-start'
          let bubbleStyle = ''
          let labelColor = ''

          if (isSystem) {
            wrapperAlign = 'items-center'
            bubbleStyle =
              'border-stone-800/50 bg-stone-950/60 text-stone-400 text-center text-sm italic py-2'
            labelColor = 'text-stone-500'
          } else if (isUser) {
            wrapperAlign = isOwnUserMessage ? 'items-end' : 'items-start'

            if (isGroup) {
              if (isOwnUserMessage) {
                bubbleStyle =
                  'border-sky-900/30 bg-sky-950/20 text-sky-100 shadow-[0_4px_20px_-5px_rgba(8,145,178,0.15)]'
                labelColor = 'text-sky-500/70'
              } else {
                bubbleStyle =
                  'border-indigo-900/30 bg-indigo-950/20 text-indigo-100 shadow-[0_4px_20px_-5px_rgba(79,70,229,0.15)]'
                labelColor = 'text-indigo-400/70'
              }
            } else {
              bubbleStyle =
                'border-stone-700/60 bg-stone-800/60 text-stone-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]'
              labelColor = 'text-stone-400'
            }
          } else {
            wrapperAlign = 'items-start'
            bubbleStyle =
              'border-amber-900/20 bg-stone-900/40 text-stone-200 shadow-[0_4px_30px_-5px_rgba(217,119,6,0.1)]'
            labelColor = 'text-amber-600/80'
          }

          return (
            <div
              key={event.id}
              className={`flex w-full flex-col ${wrapperAlign} ${groupedWithPrevious ? 'mt-1' : 'mt-4 first:mt-0'}`}
            >
              {!isSystem && !groupedWithPrevious ? (
                <div
                  className={`mb-1.5 flex max-w-[85%] flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider ${labelColor}`}
                >
                  {isGroup ? <span className="font-bold tracking-widest">[OOC]</span> : null}
                  <span className="font-medium tracking-widest opacity-90">{senderName}</span>

                  {isCombatSemantic ? (
                    <span
                      className={`inline-flex rounded-[4px] border px-1.5 text-[9px] ${getCombatBadgeColor(event)}`}
                    >
                      {getCombatBadgeLabel(event)}
                    </span>
                  ) : null}

                  {event.event_type === 'system_message' ? (
                    <span className="rounded-[4px] border border-amber-900/50 px-1.5 text-[9px] text-amber-500/50">
                      Aviso
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div
                className={`relative w-fit max-w-[85%] rounded-2xl border px-5 py-4 backdrop-blur-sm ${groupedWithPrevious ? 'rounded-t-md' : ''
                  } ${bubbleStyle}`}
              >
                {!isUser && !isSystem ? (
                  <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-gradient-to-b from-amber-900/10 to-transparent" />
                ) : null}

                <div className={`relative z-10 font-serif text-[15px] leading-relaxed ${isSystem ? 'text-sm' : ''}`}>
                  {event.content}
                </div>

                {event.dice_roll_required?.needed ? (
                  <div className="relative z-10 mt-4 rounded-xl border border-amber-900/40 bg-stone-950/60 p-3 pt-2">
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-500/80">
                      <Dices className="h-3.5 w-3.5" />
                      Prueba Requerida
                    </div>
                    <div className="font-serif text-sm italic text-stone-300">
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

        {isTyping ? (
          <div className="mt-4 flex w-full flex-col items-start">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-amber-600/80">
              <span className="flex items-center gap-1.5 font-medium tracking-widest">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Dungeon Master
              </span>
            </div>

            <div className="relative w-full rounded-xl border border-amber-900/20 bg-stone-900/20 px-5 py-4 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 z-0 rounded-xl bg-gradient-to-b from-amber-900/10 to-transparent" />
              <div className="relative z-10">
                {typewriterText.trim().length > 0 ? (
                  <TypewriterMessage text={typewriterText} charSpeed={20} />
                ) : (
                  <div className="flex items-center gap-3 text-sm text-amber-200/80">
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500/70 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500/70 [animation-delay:180ms]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500/70 [animation-delay:360ms]" />
                    </span>
                    <span>El Dungeon Master está tejiendo la siguiente respuesta...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {pendingDiceRoll ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 my-6 flex flex-col items-center justify-center duration-500">
            <div className="w-full max-w-sm rounded-2xl border border-amber-900/30 bg-stone-950/80 p-1 shadow-2xl backdrop-blur-md">
              <DiceRoller
                rollData={pendingDiceRoll}
                playerStats={(character.stats as Record<string, number>) ?? {}}
                playerSkills={character.skills ?? []}
                onRollComplete={onDiceResult}
                disabled={isSending}
              />
            </div>
          </div>
        ) : null}

        <div ref={chatEndRef} className="h-4" />
      </div>
    </div>
  )
}