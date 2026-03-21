'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { AlertTriangle, Dices, MessageSquare, Shield, Sparkles, Swords, User } from 'lucide-react'

import type { NarrativeEvent, CharacterSheet } from '../types'
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

export function GameNarrativeFeed({
  visibleEvents,
  character,
  isTyping,
  typewriterText,
  chatEndRef,
  pendingDiceRoll,
  onDiceResult,
  isSending,
}: {
  visibleEvents: NarrativeEvent[]
  character: CharacterSheet
  isTyping: boolean
  typewriterText: string
  chatEndRef: RefObject<HTMLDivElement | null>
  pendingDiceRoll: DiceRollRequired | null
  onDiceResult: (result: DiceRollOutcome) => Promise<void> | void
  isSending: boolean
}) {
  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden px-4 py-8 pb-16 md:px-8 custom-scrollbar scroll-smooth">
      <div className="flex-1 w-full mx-auto max-w-3xl flex flex-col gap-6 pb-4">
        
        {/* Ancient Divider */}
        <div className="mb-4 flex items-center justify-center opacity-40">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-700/50" />
          <div className="mx-2 text-[10px] tracking-[0.3em] text-amber-500 uppercase">La Crónica</div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-700/50" />
        </div>

        {visibleEvents.map((event) => {
          const senderName = event.role === 'user'
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

          // Dark Fantasy Bubble Styles
          let bubbleStyle = ''
          let labelColor = ''
          if (isUser) {
            if (isGroup) {
              bubbleStyle = 'border-sky-900/30 bg-sky-950/20 text-sky-100 ml-12 lg:ml-32 shadow-[0_4px_20px_-5px_rgba(8,145,178,0.15)]'
              labelColor = 'text-sky-500/70'
            } else {
              bubbleStyle = 'border-stone-700/60 bg-stone-800/60 text-stone-200 ml-12 lg:ml-32 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]'
              labelColor = 'text-stone-400'
            }
          } else if (isSystem) {
            bubbleStyle = 'border-stone-800/50 bg-stone-950/60 text-stone-400 mx-12 text-center text-sm italic py-2'
            labelColor = 'text-stone-500'
          } else {
            // GM
            bubbleStyle = 'border-amber-900/20 bg-stone-900/40 text-stone-200 mr-12 lg:mr-32 shadow-[0_4px_30px_-5px_rgba(217,119,6,0.1)]'
            labelColor = 'text-amber-600/80'
          }

          return (
            <div key={event.id} className={`flex flex-col w-full ${isUser ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}>
              
              {!isSystem && (
                <div className={`mb-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider ${labelColor}`}>
                  {isGroup && <span className="font-bold tracking-widest">[OOC]</span>}
                  <span className="opacity-80 font-medium tracking-widest">{senderName}</span>
                  
                  {isCombatSemantic && (
                    <span className={`inline-flex px-1.5 border rounded-[4px] text-[9px] ${getCombatBadgeColor(event)}`}>
                      {getCombatBadgeLabel(event)}
                    </span>
                  )}
                  {event.event_type === 'system_message' && (
                    <span className="text-amber-500/50 border border-amber-900/50 px-1.5 rounded-[4px] text-[9px]">Aviso</span>
                  )}
                </div>
              )}

              <div className={`relative w-fit max-w-[85%] rounded-2xl border px-5 py-4 backdrop-blur-sm ${bubbleStyle}`}>
                {/* Subtle magical glow for GM messages */}
                {!isUser && !isSystem && <div className="absolute inset-0 z-0 bg-gradient-to-b from-amber-900/10 to-transparent rounded-2xl pointer-events-none" />}
                
                <div className={`relative z-10 font-serif text-[15px] leading-relaxed ${isSystem ? 'text-sm' : ''}`}>
                  {event.content}
                </div>

                {event.dice_roll_required?.needed ? (
                  <div className="relative z-10 mt-4 rounded-xl border border-amber-900/40 bg-stone-950/60 p-3 pt-2">
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-500/80">
                      <Dices className="h-3.5 w-3.5" />
                      Prueba Requerida
                    </div>
                    <div className="text-sm font-serif italic text-stone-300">
                      "{event.dice_roll_required.flavor}"
                    </div>
                    <div className="mt-2 text-xs text-stone-500 font-medium tracking-wider">
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
           <div className="flex flex-col items-start mr-8 lg:mr-16">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-amber-600/80">
              <span className="font-medium tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Dungeon Master
              </span>
            </div>
            
            <div className="relative w-full rounded-xl border border-amber-900/20 bg-stone-900/20 px-5 py-4 backdrop-blur-sm">
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-amber-900/10 to-transparent rounded-xl pointer-events-none" />
              <div className="relative z-10">
                <TypewriterMessage text={typewriterText} charSpeed={20} />
              </div>
            </div>
          </div>
        )}

        {pendingDiceRoll && (
          <div className="flex flex-col items-center justify-center my-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        )}

        <div ref={chatEndRef as any} className="h-4" />
      </div>
    </div>
  )
}