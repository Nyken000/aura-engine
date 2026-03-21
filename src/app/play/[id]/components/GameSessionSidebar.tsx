'use client'

import { Flame, Shield, Swords, Users, Map, BookOpen, ScrollText } from 'lucide-react'

import { type Campaign } from '@/utils/game/campaigns'
import type {
  SessionCombatParticipant,
  SessionCombatState,
  SessionData,
  SessionPlayer,
  WorldData,
} from '../types'
import { GameAccordionSection } from './GameAccordionSection'

const CAMPAIGN_THEME: Record<
  string,
  { border: string; glow: string; badge: string; label: string }
> = {
  'oakhaven-fall': {
    border: 'border-stone-500/35',
    glow: 'shadow-[0_0_28px_-10px_rgba(168,162,158,0.38)]',
    badge: 'border-stone-500/30 bg-stone-500/15 text-stone-300',
    label: 'Ceniza',
  },
  'leviathan-veil': {
    border: 'border-slate-500/35',
    glow: 'shadow-[0_0_28px_-10px_rgba(100,116,139,0.42)]',
    badge: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
    label: 'Mar',
  },
  'eternal-flame': {
    border: 'border-red-900/40',
    glow: 'shadow-[0_0_28px_-10px_rgba(153,27,27,0.42)]',
    badge: 'border-red-900/30 bg-red-900/15 text-red-400',
    label: 'Fuego',
  },
  'crimson-carnival': {
    border: 'border-rose-900/40',
    glow: 'shadow-[0_0_28px_-10px_rgba(159,18,57,0.42)]',
    badge: 'border-rose-900/30 bg-rose-900/15 text-rose-400',
    label: 'Carnaval',
  },
  'sand-king-tomb': {
    border: 'border-amber-700/40',
    glow: 'shadow-[0_0_28px_-10px_rgba(180,83,9,0.42)]',
    badge: 'border-amber-700/30 bg-amber-700/15 text-amber-500',
    label: 'Desierto',
  },
}

function renderParticipantCard(
  participant: SessionCombatParticipant,
  index: number,
  isCurrentTurn: boolean,
) {
  const hpPercent = Math.max(0, Math.min(100, (participant.hp / Math.max(participant.max_hp, 1)) * 100))
  const isDefeated = participant.is_defeated || participant.hp <= 0

  return (
    <div
      key={participant.id}
      className={`relative flex items-center justify-between overflow-hidden rounded-lg border bg-stone-900/40 p-3 transition-all ${
        isCurrentTurn
          ? 'border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]'
          : isDefeated
            ? 'border-red-900/30 opacity-60 grayscale'
            : 'border-stone-800/80'
      }`}
    >
      {/* Background HP overlay */}
      <div 
        className="absolute bottom-0 left-0 top-0 -z-10 bg-gradient-to-r from-red-900/20 to-transparent transition-all duration-1000"
        style={{ width: `${hpPercent}%` }}
      />
      
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border shadow-inner ${
            isCurrentTurn 
                ? 'border-amber-500/50 bg-amber-950/40' 
                : 'border-stone-800 bg-stone-950'
        }`}>
          <span className="font-serif text-sm font-bold text-stone-400 text-center">{index + 1}</span>
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-serif text-sm tracking-wide truncate ${isCurrentTurn ? 'text-amber-300' : 'text-stone-300'}`}>
              {participant.name}
            </span>
            {isDefeated && (
              <span className="shrink-0 rounded border border-red-900/50 bg-red-950/50 px-1.5 py-px text-[9px] uppercase tracking-wider text-red-500">
                K.O.
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500 mt-0.5">
            <span className="flex items-center gap-1 shrink-0">
               Ini: {('initiative' in participant) ? (participant as any).initiative : '?'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GameSessionSidebar({
  campaign,
  world,
  liveSession,
  activeSessionPlayers,
  liveSessionCombat,
  activeCombatParticipant,
  currentUserId,
  isWaitingForInitiative,
  hasSubmittedInitiative,
}: {
  campaign: Campaign | null
  world: WorldData | null
  liveSession: SessionData | null
  activeSessionPlayers: SessionPlayer[]
  liveSessionCombat: SessionCombatState | null
  activeCombatParticipant: SessionCombatParticipant | null
  currentUserId: string
  isWaitingForInitiative: boolean
  hasSubmittedInitiative: boolean
}) {
  const isCombatActive = liveSessionCombat?.status === 'active'

  return (
    <aside className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col p-4 bg-stone-950 text-stone-300 gap-3">
      
      {/* HEADER: COMBAT OR EXPLORATION */}
      <section className="shrink-0 relative overflow-hidden rounded-xl border border-stone-800 bg-stone-900/40 p-5 text-center">
        {isCombatActive ? (
          <>
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-red-950/20 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="rounded-full border border-red-900/40 bg-red-950/40 p-2 shadow-[0_0_20px_-5px_rgba(220,38,38,0.4)]">
                <Swords className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="font-serif tracking-widest text-amber-500 uppercase">Combate en Curso</h2>
              <div className="text-xs text-stone-400">
                Ronda <span className="text-stone-200">{('round' in (liveSessionCombat || {})) ? (liveSessionCombat as any).round : 1}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-stone-800/20 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="rounded-full border border-stone-700 bg-stone-900 p-2">
                 <Map className="h-5 w-5 text-stone-400" />
              </div>
              <h2 className="font-serif tracking-widest text-stone-300 uppercase">Exploración Libre</h2>
            </div>
          </>
        )}
      </section>

      {/* INITIATIVE OR GROUP */}
      <div className="shrink-0">
        {isCombatActive ? (
          <GameAccordionSection
            title="Iniciativas"
            subtitle="Orden de combate"
            icon={<Flame className="h-4 w-4" />}
            defaultOpen
            accent="amber"
          >
            {isWaitingForInitiative ? (
               <div className="rounded-lg border border-amber-900/50 bg-stone-900/50 p-4 text-center">
                  <p className="text-sm font-serif text-amber-500 mb-2">Rodando Iniciativas</p>
                  <div className="flex -space-x-2 justify-center">
                      {activeSessionPlayers.map((player) => (
                        <div key={player.user_id} className="h-6 w-6 rounded-full border border-stone-800 bg-stone-950 flex items-center justify-center relative shadow-sm">
                          <span className="text-[9px] uppercase tracking-wider text-stone-500 z-10">{player.profiles?.username?.slice(0, 2) || '?'}</span>
                        </div>
                      ))}
                  </div>
              </div>
            ) : (
              <div className="space-y-2">
                {liveSessionCombat?.participants?.map((participant, index) => {
                  const isCurrentTurn = activeCombatParticipant?.id === participant.id
                  return renderParticipantCard(participant, index, isCurrentTurn)
                })}
              </div>
            )}
          </GameAccordionSection>
        ) : (
          <GameAccordionSection
            title="Grupo Actual"
            subtitle={`${activeSessionPlayers.length} aventureros`}
            icon={<Users className="h-4 w-4" />}
            defaultOpen
            accent="stone"
          >
            <div className="space-y-2">
              {activeSessionPlayers.length === 0 ? (
                <div className="text-center p-3 text-xs italic text-stone-600">No hay nadie más en la sesión.</div>
              ) : (
                activeSessionPlayers.map((player) => {
                  const isMe = player.user_id === currentUserId
                  return (
                    <div key={player.user_id} className="rounded-lg border border-stone-800/60 bg-stone-900/30 p-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-serif text-[13px] tracking-wide text-stone-300 truncate">
                          {player.characters?.name || 'Aventurero Desconocido'}
                          {isMe && <span className="ml-2 text-[10px] uppercase tracking-widest text-amber-600 opacity-80">(Tú)</span>}
                        </div>
                        <div className="text-[10px] text-stone-500 mt-1 uppercase tracking-widest truncate">
                           Ju: {player.profiles?.username || 'Desconocido'}
                        </div>
                      </div>
                      <div className="shrink-0 ml-3 h-8 w-8 rounded bg-stone-950 border border-stone-800 flex items-center justify-center">
                         <span className="text-xs font-serif text-stone-500">{player.characters?.name?.charAt(0) || '?'}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </GameAccordionSection>
        )}
      </div>

      {/* CAMPAIGN INTRO */}
      <div className="shrink-0">
         <GameAccordionSection
            title="La Campaña"
            subtitle={campaign?.title || 'Relato del Mundo'}
            icon={<BookOpen className="h-4 w-4" />}
            defaultOpen={false}
            accent="stone"
          >
            <div className="rounded border border-stone-800/80 bg-stone-900/40 p-4">
              <h4 className="text-sm font-serif text-amber-500/90 mb-2 tracking-wide text-center">{world?.name || 'Mundo Desconocido'}</h4>
              <p className="text-xs text-stone-400 leading-relaxed font-light text-justify">
                {campaign?.description || world?.description || 'Nubes oscuras se ciernen sobre esta tierra de mitos olvidados. Los ecos de un antiguo mal resuenan en las profundidades, aguardando a aquellos suficientemente valientes para aventurarse en la oscuridad...'}
              </p>
            </div>
          </GameAccordionSection>
      </div>

      {/* QUESTS / MISIONES */}
      <div className="shrink-0">
         <GameAccordionSection
            title="Misiones"
            subtitle="Caminos del Destino"
            icon={<ScrollText className="h-4 w-4" />}
            defaultOpen={false}
            accent="amber"
          >
            <div className="space-y-2">
               {/* Placeholder Quest */}
               <div className="relative overflow-hidden rounded border border-amber-900/40 bg-stone-900/50 p-3">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600/50" />
                 <h4 className="text-xs font-serif text-amber-400 mb-1 tracking-wide ml-2">El Llamado Principal</h4>
                 <p className="text-[10px] text-stone-400 leading-relaxed font-light ml-2">Sigue los indicios narrativos presentados por el Dungeon Master para descubrir tu destino.</p>
               </div>
               {/* Completed Quest Placeholder */}
               <div className="relative overflow-hidden rounded border border-stone-800/50 bg-stone-950/50 p-3 opacity-60">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-600/50" />
                 <h4 className="text-xs font-serif text-stone-400 mb-1 tracking-wide ml-2 line-through">Inicio del Viaje</h4>
                 <p className="text-[10px] text-stone-500 leading-relaxed font-light ml-2">Has entrado a la sesión actual.</p>
               </div>
            </div>
          </GameAccordionSection>
      </div>

    </aside>
  )
}