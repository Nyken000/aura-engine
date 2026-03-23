'use client'

import { useMemo } from 'react'
import {
  BookOpen,
  Compass,
  HeartHandshake,
  Map as MapIcon,
  ScrollText,
  Shield,
  Swords,
  Users,
  Package,
  MapPinned,
  Flag,
} from 'lucide-react'

import { type Campaign } from '@/utils/game/campaigns'
import type {
  ComposerActionRequest,
  NarrativeEvent,
  NpcRelationship,
  NpcRelationshipEvent,
  QuickAction,
  SemanticEntityAnnotation,
  SessionCombatParticipant,
  SessionCombatState,
  SessionCompanion,
  SessionPlayer,
  SessionQuest,
  SessionQuestUpdate,
  SidebarCompanion,
  SidebarSelection,
  WorldData,
} from '../types'
import { GameAccordionSection } from './GameAccordionSection'
import { GameContextActions } from './GameContextActions'
import type { StructuredIntent } from '@/lib/game/structured-intents'

function buildQuestIntent(
  type: 'quest.accept' | 'quest.decline' | 'quest.negotiate',
  quest: SessionQuest,
): StructuredIntent {
  return {
    type,
    target: {
      kind: 'quest',
      questSlug: quest.slug,
      questTitle: quest.title,
      objectiveSummary: quest.objective_summary ?? null,
      rewardSummary: quest.reward_summary ?? null,
      offeredByNpcKey: quest.offered_by_npc_key ?? null,
    },
    prompt:
      type === 'quest.accept'
        ? `Acepto la misión "${quest.title}".`
        : type === 'quest.decline'
          ? `Rechazo la misión "${quest.title}".`
          : `Estoy dispuesto a aceptar "${quest.title}", pero quiero negociar la recompensa.`,
  }
}

function buildRelationshipIntent(
  type: 'relationship.ask_help' | 'relationship.collect_favor',
  relationship: NpcRelationship,
): StructuredIntent {
  return {
    type,
    target: {
      kind: 'relationship',
      npcKey: relationship.npc_key,
      npcName: relationship.npc_name,
    },
    prompt:
      type === 'relationship.ask_help'
        ? `Quiero pedirle ayuda a ${relationship.npc_name} para nuestra situación actual.`
        : `Quiero recordarle a ${relationship.npc_name} que me debe un favor.`,
  }
}

function buildEntityIntent(
  type: 'entity.travel' | 'entity.investigate' | 'entity.inspect' | 'faction.approach',
  entity: SemanticEntityAnnotation,
): StructuredIntent {
  return {
    type,
    target: {
      kind: 'entity',
      entityKind: entity.kind === 'npc' ? 'npc' : entity.kind,
      entityKey: entity.key,
      entityLabel: entity.label,
    },
    prompt:
      type === 'entity.travel'
        ? `Quiero dirigirme hacia ${entity.label}.`
        : type === 'entity.investigate'
          ? `Quiero investigar más sobre ${entity.label}.`
          : type === 'faction.approach'
            ? `Quiero acercarme a la facción ${entity.label} con cautela.`
            : `Quiero inspeccionar ${entity.label} con detalle.`,
  }
}

function sortNarrativeEvents(events: NarrativeEvent[]) {
  return [...events].sort((a, b) => {
    const indexA = a.event_index ?? Number.MAX_SAFE_INTEGER
    const indexB = b.event_index ?? Number.MAX_SAFE_INTEGER

    if (indexA !== indexB) return indexA - indexB
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

function deriveCompanionsFromEvents(events: NarrativeEvent[]): SidebarCompanion[] {
  const companionMap = new Map<string, SidebarCompanion | null>()

  for (const event of sortNarrativeEvents(events)) {
    const companions = event.payload?.semantic?.companions ?? []

    for (const companion of companions) {
      if (!companion?.npcKey || !companion?.npcName) continue

      if (companion.action === 'left') {
        companionMap.set(companion.npcKey, null)
        continue
      }

      companionMap.set(companion.npcKey, {
        npcKey: companion.npcKey,
        npcName: companion.npcName,
        status: companion.action as 'joined' | 'available',
        reason: companion.reason ?? null,
      })
    }
  }

  return [...companionMap.values()]
    .filter((value): value is SidebarCompanion => value !== null)
    .sort((a, b) => a.npcName.localeCompare(b.npcName, 'es'))
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
      key={participant.id ?? `${participant.name}-${index}`}
      className={`relative flex items-center justify-between overflow-hidden rounded-lg border bg-stone-900/40 p-3 transition-all ${isCurrentTurn
          ? 'border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]'
          : isDefeated
            ? 'border-red-900/30 opacity-60 grayscale'
            : 'border-stone-800/80'
        }`}
    >
      <div
        className="absolute bottom-0 left-0 top-0 -z-10 bg-gradient-to-r from-red-900/20 to-transparent transition-all duration-1000"
        style={{ width: `${hpPercent}%` }}
      />

      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border shadow-inner ${isCurrentTurn ? 'border-amber-500/50 bg-amber-950/40' : 'border-stone-800 bg-stone-950'
            }`}
        >
          <span className="text-center font-serif text-sm font-bold text-stone-400">{index + 1}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`truncate font-serif text-sm tracking-wide ${isCurrentTurn ? 'text-amber-300' : 'text-stone-300'
                }`}
            >
              {participant.name}
            </span>
            {isDefeated ? (
              <span className="shrink-0 rounded border border-red-900/50 bg-red-950/50 px-1.5 py-px text-[9px] uppercase tracking-wider text-red-500">
                K.O.
              </span>
            ) : null}
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500">
            <span className="shrink-0">Ini: {participant.initiative ?? '?'}</span>
            <span className="shrink-0">HP: {participant.hp}/{participant.max_hp}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const QUEST_SECTION_ORDER: Array<{
  key: 'offered' | 'active' | 'completed' | 'failed'
  title: string
  statuses: SessionQuest['status'][]
  accent: string
  border: string
  text: string
}> = [
    {
      key: 'active',
      title: 'Activas',
      statuses: ['accepted', 'active'],
      accent: 'bg-amber-500/60',
      border: 'border-amber-900/40',
      text: 'text-amber-300',
    },
    {
      key: 'offered',
      title: 'Ofrecidas',
      statuses: ['offered'],
      accent: 'bg-sky-500/60',
      border: 'border-sky-900/40',
      text: 'text-sky-300',
    },
    {
      key: 'completed',
      title: 'Completadas',
      statuses: ['completed'],
      accent: 'bg-emerald-500/60',
      border: 'border-emerald-900/40',
      text: 'text-emerald-300',
    },
    {
      key: 'failed',
      title: 'Fallidas',
      statuses: ['failed'],
      accent: 'bg-red-500/60',
      border: 'border-red-900/40',
      text: 'text-red-300',
    },
  ]

function normalizeCompanions(
  canonicalCompanions: SessionCompanion[],
  eventCompanions: SidebarCompanion[],
): SidebarCompanion[] {
  if (canonicalCompanions.length > 0) {
    return canonicalCompanions
      .filter((companion) => companion.status !== 'left')
      .map((companion) => ({
        npcKey: companion.npc_key,
        npcName: companion.npc_name,
        status: (companion.status === 'available' ? 'available' : 'joined') as 'joined' | 'available',
        reason: companion.last_change_reason ?? null,
      }))
      .sort((a, b) => a.npcName.localeCompare(b.npcName, 'es'))
  }

  return eventCompanions
}

function getRelationTone(value: number, inverse = false) {
  const normalized = inverse ? -value : value

  if (normalized >= 8) return 'text-emerald-300'
  if (normalized >= 3) return 'text-emerald-400'
  if (normalized <= -8) return 'text-red-300'
  if (normalized <= -3) return 'text-red-400'
  return 'text-stone-300'
}

function getQuestUpdateLabel(updateType: SessionQuestUpdate['update_type']) {
  switch (updateType) {
    case 'offered':
      return 'Ofrecida'
    case 'accepted':
      return 'Aceptada'
    case 'declined':
      return 'Rechazada'
    case 'activated':
      return 'Activada'
    case 'progressed':
      return 'Progreso'
    case 'completed':
      return 'Completada'
    case 'failed':
      return 'Fallida'
    default:
      return 'Nota'
  }
}

function getEntitySummary(
  entity: SemanticEntityAnnotation,
  quests: SessionQuest[],
  relationships: NpcRelationship[],
) {
  if (entity.kind === 'npc') {
    const relationship = relationships.find((item) => item.npc_key === entity.key)
    if (!relationship) return 'NPC mencionado sin vínculo persistido todavía.'
    return relationship.last_change_reason || 'Hay un vínculo social persistido con este NPC.'
  }

  if (entity.kind === 'objective') {
    const linkedQuest = quests.find((quest) => quest.slug === entity.key)
    if (!linkedQuest) return 'Objetivo narrativo detectado en el feed.'
    return linkedQuest.objective_summary || linkedQuest.description
  }

  if (entity.kind === 'location') {
    return 'Lugar de interés detectado en la semántica narrativa.'
  }

  if (entity.kind === 'item') {
    return 'Ítem relevante detectado en la semántica narrativa.'
  }

  return 'Facción detectada en la semántica narrativa del feed.'
}

function buildQuestActions(quest: SessionQuest): QuickAction[] {
  if (quest.status === 'offered') {
    return [
      {
        id: `quest-accept-${quest.id}`,
        label: 'Aceptar',
        prompt: `Acepto la misión "${quest.title}".`,
        intent: buildQuestIntent('quest.accept', quest),
        tone: 'emerald',
      },
      {
        id: `quest-negotiate-${quest.id}`,
        label: 'Negociar',
        prompt: `Estoy dispuesto a aceptar "${quest.title}", pero quiero negociar la recompensa.`,
        intent: buildQuestIntent('quest.negotiate', quest),
        tone: 'amber',
      },
      {
        id: `quest-decline-${quest.id}`,
        label: 'Rechazar',
        prompt: `Rechazo la misión "${quest.title}".`,
        intent: buildQuestIntent('quest.decline', quest),
        tone: 'stone',
      },
    ]
  }

  const actions: QuickAction[] = [
    {
      id: `quest-talk-${quest.slug}`,
      label: 'Hablar sobre esto',
      prompt: `Quiero hablar sobre la misión "${quest.title}".`,
      tone: 'violet',
    },
  ]

  if (quest.status === 'accepted' || quest.status === 'active') {
    actions.push(
      {
        id: `quest-progress-${quest.slug}`,
        label: 'Pedir avance',
        prompt: `Quiero revisar el progreso actual de la misión "${quest.title}".`,
        tone: 'amber',
      },
      {
        id: `quest-plan-${quest.slug}`,
        label: 'Planear siguiente paso',
        prompt: `Propongo el siguiente paso para completar "${quest.title}".`,
        tone: 'sky',
      },
    )
  }

  return actions
}

function buildRelationshipActions(relationship: NpcRelationship): QuickAction[] {
  const actions: QuickAction[] = [
    {
      id: `rel-talk-${relationship.npc_key}`,
      label: 'Hablar',
      prompt: `Quiero hablar directamente con ${relationship.npc_name}.`,
      tone: 'violet',
    },
  ]

  if (relationship.favor_debt > 0) {
    actions.push({
      id: `rel-collect-${relationship.npc_key}`,
      label: 'Cobrar favor',
      prompt: `Quiero recordarle a ${relationship.npc_name} que me debe un favor.`,
      intent: buildRelationshipIntent('relationship.collect_favor', relationship),
      tone: 'amber',
    })
  }

  if (relationship.trust >= 3 || relationship.affinity >= 3) {
    actions.push({
      id: `rel-ask-help-${relationship.npc_key}`,
      label: 'Pedir ayuda',
      prompt: `Quiero pedirle ayuda a ${relationship.npc_name} para nuestra situación actual.`,
      intent: buildRelationshipIntent('relationship.ask_help', relationship),
      tone: 'emerald',
    })
  }

  if (relationship.hostility >= 3) {
    actions.push({
      id: `rel-calm-${relationship.npc_key}`,
      label: 'Calmar tensión',
      prompt: `Quiero intentar calmar la tensión con ${relationship.npc_name}.`,
      tone: 'stone',
    })
  }

  return actions
}

function buildEntityActions(entity: SemanticEntityAnnotation): QuickAction[] {
  const actions: QuickAction[] = []

  if (entity.kind === 'location') {
    actions.push(
      {
        id: `entity-travel-${entity.key}`,
        label: 'Viajar',
        prompt: `Quiero dirigirme hacia ${entity.label}.`,
        intent: buildEntityIntent('entity.travel', entity),
        tone: 'sky',
      },
      {
        id: `entity-investigate-${entity.key}`,
        label: 'Investigar',
        prompt: `Quiero investigar más sobre ${entity.label}.`,
        intent: buildEntityIntent('entity.investigate', entity),
        tone: 'amber',
      },
    )
  }

  if (entity.kind === 'item') {
    actions.push(
      {
        id: `entity-inspect-${entity.key}`,
        label: 'Inspeccionar',
        prompt: `Quiero inspeccionar ${entity.label} con detalle.`,
        tone: 'violet',
      },
      {
        id: `entity-obtain-${entity.key}`,
        label: 'Conseguir',
        prompt: `Quiero intentar conseguir ${entity.label}.`,
        tone: 'emerald',
      },
    )
  }

  if (entity.kind === 'faction') {
    return [
      {
        id: `entity-ask-${entity.key}`,
        label: 'Preguntar',
        prompt: `Quiero saber más sobre ${entity.label}.`,
        tone: 'sky',
      },
      {
        id: `entity-approach-${entity.key}`,
        label: 'Acercarme',
        prompt: `Quiero acercarme a la facción ${entity.label} con cautela.`,
        tone: 'amber',
      },
    ]
  }

  if (entity.kind === 'objective') {
    return [
      {
        id: `entity-focus-${entity.key}`,
        label: 'Priorizar',
        prompt: `Quiero centrarme ahora en el objetivo ${entity.label}.`,
        tone: 'amber',
      },
    ]
  }

  return []
}

function QuestHistoryPanel({
  quest,
  updates,
}: {
  quest: SessionQuest
  updates: SessionQuestUpdate[]
}) {
  return (
    <div className="rounded-xl border border-amber-900/40 bg-stone-900/50 p-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-amber-400">Detalle de misión</div>
      <h3 className="font-serif text-base tracking-wide text-amber-300">{quest.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-300">{quest.description}</p>

      {quest.objective_summary ? (
        <div className="mt-3 text-xs leading-relaxed text-stone-400">
          <span className="uppercase tracking-[0.2em] text-stone-500">Objetivo:</span> {quest.objective_summary}
        </div>
      ) : null}

      {quest.reward_summary ? (
        <div className="mt-1 text-xs leading-relaxed text-stone-400">
          <span className="uppercase tracking-[0.2em] text-stone-500">Recompensa:</span> {quest.reward_summary}
        </div>
      ) : null}

      <div className="mt-4 border-t border-stone-800 pt-4">
        <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-stone-500">Historial</div>

        <div className="space-y-2">
          {updates.length === 0 ? (
            <div className="rounded-lg border border-stone-800/70 bg-stone-950/50 p-3 text-xs text-stone-500">
              Esta misión aún no tiene actualizaciones registradas.
            </div>
          ) : (
            updates.map((update) => (
              <div
                key={update.id}
                className="rounded-lg border border-stone-800/70 bg-stone-950/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-serif text-sm text-stone-200">{update.title}</div>
                  <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">
                    {getQuestUpdateLabel(update.update_type)}
                  </div>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-stone-400">{update.description}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-stone-600">
                  {new Date(update.created_at).toLocaleString('es-CL')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function RelationshipHistoryPanel({
  relationship,
  events,
}: {
  relationship: NpcRelationship
  events: NpcRelationshipEvent[]
}) {
  return (
    <div className="rounded-xl border border-violet-900/40 bg-stone-900/50 p-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-violet-400">Vínculo social</div>
      <h3 className="font-serif text-base tracking-wide text-violet-300">{relationship.npc_name}</h3>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
          <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Afinidad</div>
          <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.affinity)}`}>
            {relationship.affinity}
          </div>
        </div>
        <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
          <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Confianza</div>
          <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.trust)}`}>
            {relationship.trust}
          </div>
        </div>
        <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
          <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Favor / deuda</div>
          <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.favor_debt)}`}>
            {relationship.favor_debt}
          </div>
        </div>
        <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
          <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Hostilidad</div>
          <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.hostility, true)}`}>
            {relationship.hostility}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-stone-800 pt-4">
        <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-stone-500">Historial social</div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="rounded-lg border border-stone-800/70 bg-stone-950/50 p-3 text-xs text-stone-500">
              Este NPC aún no tiene eventos sociales registrados.
            </div>
          ) : (
            events.map((event) => {
              const deltas: string[] = []

              if (event.affinity_delta !== 0) deltas.push(`Afinidad ${event.affinity_delta > 0 ? '+' : ''}${event.affinity_delta}`)
              if (event.trust_delta !== 0) deltas.push(`Confianza ${event.trust_delta > 0 ? '+' : ''}${event.trust_delta}`)
              if (event.favor_debt_delta !== 0) deltas.push(`Favor ${event.favor_debt_delta > 0 ? '+' : ''}${event.favor_debt_delta}`)
              if (event.hostility_delta !== 0) deltas.push(`Hostilidad ${event.hostility_delta > 0 ? '+' : ''}${event.hostility_delta}`)

              return (
                <div
                  key={event.id}
                  className="rounded-lg border border-stone-800/70 bg-stone-950/50 p-3"
                >
                  <div className="text-sm leading-relaxed text-stone-300">{event.reason}</div>

                  {deltas.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {deltas.map((delta) => (
                        <span
                          key={delta}
                          className="rounded-md border border-violet-900/30 bg-violet-950/20 px-2 py-1 text-[10px] uppercase tracking-wider text-violet-200"
                        >
                          {delta}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-stone-600">
                    {new Date(event.created_at).toLocaleString('es-CL')}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function EntityFocusPanel({
  entity,
  summary,
}: {
  entity: SemanticEntityAnnotation
  summary: string
}) {
  const icon =
    entity.kind === 'location' ? (
      <MapPinned className="h-4 w-4 text-sky-300" />
    ) : entity.kind === 'item' ? (
      <Package className="h-4 w-4 text-violet-300" />
    ) : entity.kind === 'faction' ? (
      <Flag className="h-4 w-4 text-emerald-300" />
    ) : (
      <MapIcon className="h-4 w-4 text-stone-300" />
    )

  return (
    <div className="rounded-xl border border-sky-900/40 bg-stone-900/50 p-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-sky-400">Entidad enfocada</div>

      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-serif text-base tracking-wide text-sky-300">{entity.label}</h3>
      </div>

      <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-stone-500">{entity.kind}</div>
      <p className="mt-3 text-sm leading-relaxed text-stone-300">{summary}</p>
    </div>
  )
}

export function GameSessionSidebar({
  campaign,
  campaignDescription,
  world,
  characterName,
  narrativeEvents,
  activeSessionPlayers,
  activeSessionQuests,
  activeSessionQuestUpdates,
  activeNpcRelationships,
  activeNpcRelationshipEvents,
  activeSessionCompanions,
  liveSessionCombat,
  activeCombatParticipant,
  currentUserId,
  isWaitingForInitiative,
  selection,
  onSelectionChange,
  onUsePrompt,
}: {
  campaign: Campaign | null
  campaignDescription: string | null
  world: WorldData | null
  characterName: string
  narrativeEvents: NarrativeEvent[]
  activeSessionPlayers: SessionPlayer[]
  activeSessionQuests: SessionQuest[]
  activeSessionQuestUpdates: SessionQuestUpdate[]
  activeNpcRelationships: NpcRelationship[]
  activeNpcRelationshipEvents: NpcRelationshipEvent[]
  activeSessionCompanions: SessionCompanion[]
  liveSessionCombat: SessionCombatState | null
  activeCombatParticipant: SessionCombatParticipant | null
  currentUserId: string
  isWaitingForInitiative: boolean
  selection: SidebarSelection
  onSelectionChange: (selection: SidebarSelection) => void
  onUsePrompt: (action: string | ComposerActionRequest) => void
}) {
  const isCombatActive = liveSessionCombat?.status === 'active'

  const derivedCompanions = useMemo(() => deriveCompanionsFromEvents(narrativeEvents), [narrativeEvents])
  const companions = useMemo(
    () => normalizeCompanions(activeSessionCompanions, derivedCompanions),
    [activeSessionCompanions, derivedCompanions],
  )

  const groupedQuests = useMemo(() => {
    return QUEST_SECTION_ORDER.map((section) => ({
      ...section,
      quests: activeSessionQuests
        .filter((quest) => section.statuses.includes(quest.status))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 4),
    })).filter((section) => section.quests.length > 0)
  }, [activeSessionQuests])

  const partyPlayers =
    activeSessionPlayers.length > 0
      ? activeSessionPlayers
      : [
        {
          user_id: currentUserId,
          profiles: { username: null },
          characters: {
            id: 'local-character',
            name: characterName,
            hp_current: 0,
            hp_max: 0,
          },
        },
      ]

  const selectedQuest =
    selection?.type === 'quest'
      ? activeSessionQuests.find((quest) => quest.slug === selection.questSlug) ?? null
      : null

  const selectedQuestUpdates = selectedQuest
    ? activeSessionQuestUpdates.filter((update) => update.quest_id === selectedQuest.id)
    : []

  const selectedRelationship =
    selection?.type === 'relationship'
      ? activeNpcRelationships.find((relationship) => relationship.npc_key === selection.npcKey) ?? null
      : null

  const selectedRelationshipEvents = selectedRelationship
    ? activeNpcRelationshipEvents.filter((event) => event.relationship_id === selectedRelationship.id)
    : []

  const selectedEntity = selection?.type === 'entity' ? selection.entity : null

  const contextualActions = useMemo(() => {
    if (selectedQuest) return buildQuestActions(selectedQuest)
    if (selectedRelationship) return buildRelationshipActions(selectedRelationship)
    if (selectedEntity) return buildEntityActions(selectedEntity)
    return []
  }, [selectedQuest, selectedRelationship, selectedEntity])

  const contextualActionsTitle = selectedQuest
    ? 'Acciones de misión'
    : selectedRelationship
      ? 'Acciones sociales'
      : selectedEntity
        ? 'Acciones contextuales'
        : 'Acciones'

  return (
    <aside className="custom-scrollbar flex h-full w-full flex-col gap-3 overflow-y-auto bg-stone-950 p-4 text-stone-300">
      <section className="relative shrink-0 overflow-hidden rounded-xl border border-stone-800 bg-stone-900/40 p-5 text-center">
        {isCombatActive ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-red-950/20 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="rounded-full border border-red-900/40 bg-red-950/40 p-2 shadow-[0_0_20px_-5px_rgba(220,38,38,0.4)]">
                <Swords className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="font-serif uppercase tracking-widest text-amber-500">Combate en Curso</h2>
              <div className="text-xs text-stone-400">
                Ronda <span className="text-stone-200">{liveSessionCombat?.round ?? 1}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-stone-800/20 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="rounded-full border border-stone-700 bg-stone-900 p-2">
                <Compass className="h-5 w-5 text-stone-400" />
              </div>
              <h2 className="font-serif uppercase tracking-widest text-stone-300">Exploración Libre</h2>
            </div>
          </>
        )}
      </section>

      {(selectedQuest || selectedRelationship || selectedEntity) && (
        <section className="shrink-0 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-stone-800/70 bg-stone-900/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Foco contextual</div>
            <button
              type="button"
              onClick={() => onSelectionChange(null)}
              className="rounded-md border border-stone-800 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-400 transition hover:bg-stone-800"
            >
              Limpiar
            </button>
          </div>

          {selectedQuest ? <QuestHistoryPanel quest={selectedQuest} updates={selectedQuestUpdates} /> : null}

          {selectedRelationship ? (
            <RelationshipHistoryPanel
              relationship={selectedRelationship}
              events={selectedRelationshipEvents}
            />
          ) : null}

          {selectedEntity ? (
            <EntityFocusPanel
              entity={selectedEntity}
              summary={getEntitySummary(selectedEntity, activeSessionQuests, activeNpcRelationships)}
            />
          ) : null}

          <GameContextActions
            title={contextualActionsTitle}
            actions={contextualActions}
            onUseAction={onUsePrompt}
          />
        </section>
      )}

      <div className="shrink-0">
        <GameAccordionSection
          title="Mundo"
          subtitle={world?.name || 'Territorio desconocido'}
          icon={<MapIcon className="h-4 w-4" />}
          defaultOpen
          accent="stone"
        >
          <div className="space-y-3 rounded border border-stone-800/80 bg-stone-900/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-serif text-sm tracking-wide text-amber-400/90">
                {campaign?.title || world?.name || 'Aventura en curso'}
              </h4>
              {world?.genre ? (
                <span className="rounded border border-stone-700 bg-stone-950 px-2 py-1 text-[10px] uppercase tracking-widest text-stone-400">
                  {world.genre}
                </span>
              ) : null}
            </div>

            <p className="text-xs leading-relaxed text-stone-300">
              {campaignDescription || world?.description || 'El mundo aguarda una nueva decisión que altere su curso.'}
            </p>
          </div>
        </GameAccordionSection>
      </div>

      <div className="shrink-0">
        <GameAccordionSection
          title="Misiones"
          subtitle={`${activeSessionQuests.length} registradas`}
          icon={<ScrollText className="h-4 w-4" />}
          defaultOpen
          accent="amber"
        >
          <div className="space-y-3">
            {groupedQuests.length === 0 ? (
              <div className="rounded-lg border border-stone-800/70 bg-stone-900/40 p-4 text-xs leading-relaxed text-stone-500">
                Aún no hay misiones persistidas en esta sesión.
              </div>
            ) : (
              groupedQuests.map((section) => (
                <div key={section.key} className="space-y-2">
                  <div className={`text-[10px] uppercase tracking-[0.24em] ${section.text}`}>{section.title}</div>

                  {section.quests.map((quest) => (
                    <button
                      key={quest.id}
                      type="button"
                      onClick={() =>
                        onSelectionChange({
                          type: 'quest',
                          questSlug: quest.slug,
                        })
                      }
                      className={`relative block w-full overflow-hidden rounded border bg-stone-900/50 p-3 text-left transition hover:bg-stone-900/70 ${section.border}`}
                    >
                      <div className={`absolute bottom-0 left-0 top-0 w-1 ${section.accent}`} />

                      <div className="ml-2 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className={`font-serif text-xs tracking-wide ${section.text}`}>{quest.title}</h4>
                          <span className="shrink-0 text-[9px] uppercase tracking-[0.22em] text-stone-500">
                            {new Date(quest.updated_at).toLocaleDateString('es-CL')}
                          </span>
                        </div>

                        <p className="text-[11px] leading-relaxed text-stone-400">{quest.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </GameAccordionSection>
      </div>

      <div className="shrink-0">
        <GameAccordionSection
          title="Equipo"
          subtitle={`${partyPlayers.length + companions.length} presentes`}
          icon={<Users className="h-4 w-4" />}
          defaultOpen
          accent="stone"
        >
          <div className="space-y-3">
            {isCombatActive ? (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.24em] text-amber-400">Iniciativa</div>

                {isWaitingForInitiative ? (
                  <div className="rounded-lg border border-amber-900/50 bg-stone-900/50 p-4 text-center">
                    <p className="mb-2 font-serif text-sm text-amber-500">Rodando Iniciativas</p>
                    <div className="flex justify-center -space-x-2">
                      {partyPlayers.map((player) => (
                        <div
                          key={player.user_id}
                          className="relative flex h-6 w-6 items-center justify-center rounded-full border border-stone-800 bg-stone-950 shadow-sm"
                        >
                          <span className="z-10 text-[9px] uppercase tracking-wider text-stone-500">
                            {player.profiles?.username?.slice(0, 2) || player.characters?.name?.slice(0, 2) || '?'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  liveSessionCombat?.participants?.map((participant, index) =>
                    renderParticipantCard(participant, index, activeCombatParticipant?.id === participant.id),
                  )
                )}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Jugadores</div>

              {partyPlayers.map((player) => {
                const isMe = player.user_id === currentUserId

                return (
                  <div
                    key={player.user_id}
                    className="flex items-center justify-between rounded-lg border border-stone-800/60 bg-stone-900/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-[13px] tracking-wide text-stone-300">
                        {player.characters?.name || 'Aventurero Desconocido'}
                        {isMe ? (
                          <span className="ml-2 text-[10px] uppercase tracking-widest text-amber-600 opacity-80">
                            (Tú)
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 truncate text-[10px] uppercase tracking-widest text-stone-500">
                        Ju: {player.profiles?.username || 'Desconocido'}
                      </div>
                    </div>

                    <div className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-stone-800 bg-stone-950">
                      <span className="font-serif text-xs text-stone-500">
                        {player.characters?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.24em] text-violet-400">Aliados y acompañantes</div>

              {companions.length === 0 ? (
                <div className="rounded-lg border border-stone-800/70 bg-stone-900/40 p-3 text-xs leading-relaxed text-stone-500">
                  Ningún NPC acompaña todavía al grupo.
                </div>
              ) : (
                companions.map((companion) => (
                  <button
                    key={companion.npcKey}
                    type="button"
                    onClick={() =>
                      onSelectionChange({
                        type: 'relationship',
                        npcKey: companion.npcKey,
                      })
                    }
                    className="block w-full rounded-lg border border-violet-900/40 bg-stone-900/40 p-3 text-left transition hover:bg-stone-900/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-serif text-[13px] tracking-wide text-violet-300">
                          {companion.npcName}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-violet-500/80">
                          {companion.status === 'joined' ? 'Aliado presente' : 'Disponible'}
                        </div>
                      </div>

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-violet-900/40 bg-violet-950/20">
                        <Shield className="h-4 w-4 text-violet-400" />
                      </div>
                    </div>

                    {companion.reason ? (
                      <div className="mt-2 text-[11px] leading-relaxed text-stone-400">{companion.reason}</div>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </GameAccordionSection>
      </div>

      <div className="shrink-0">
        <GameAccordionSection
          title="Relaciones"
          subtitle={`${activeNpcRelationships.length} vínculos`}
          icon={<HeartHandshake className="h-4 w-4" />}
          defaultOpen
          accent="stone"
        >
          <div className="space-y-3">
            {activeNpcRelationships.length === 0 ? (
              <div className="rounded-lg border border-stone-800/70 bg-stone-900/40 p-4 text-xs leading-relaxed text-stone-500">
                Todavía no hay vínculos sociales persistidos con NPCs en esta sesión.
              </div>
            ) : (
              activeNpcRelationships.slice(0, 6).map((relationship) => (
                <button
                  key={relationship.id}
                  type="button"
                  onClick={() =>
                    onSelectionChange({
                      type: 'relationship',
                      npcKey: relationship.npc_key,
                    })
                  }
                  className="block w-full rounded-lg border border-stone-800/70 bg-stone-900/40 p-3 text-left transition hover:bg-stone-900/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-sm tracking-wide text-stone-200">
                        {relationship.npc_name}
                      </div>
                      {relationship.last_change_reason ? (
                        <div className="mt-1 text-[10px] leading-relaxed text-stone-500">
                          {relationship.last_change_reason}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
                      <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Afinidad</div>
                      <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.affinity)}`}>
                        {relationship.affinity}
                      </div>
                    </div>
                    <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
                      <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Confianza</div>
                      <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.trust)}`}>
                        {relationship.trust}
                      </div>
                    </div>
                    <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
                      <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Favor / deuda</div>
                      <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.favor_debt)}`}>
                        {relationship.favor_debt}
                      </div>
                    </div>
                    <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
                      <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Hostilidad</div>
                      <div className={`mt-1 font-serif text-sm ${getRelationTone(relationship.hostility, true)}`}>
                        {relationship.hostility}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </GameAccordionSection>
      </div>

      <div className="shrink-0">
        <GameAccordionSection
          title="Crónica"
          subtitle="Contexto de campaña"
          icon={<BookOpen className="h-4 w-4" />}
          defaultOpen={false}
          accent="stone"
        >
          <div className="rounded border border-stone-800/80 bg-stone-900/40 p-4">
            <h4 className="mb-2 text-center font-serif text-sm tracking-wide text-amber-500/90">
              {world?.name || 'Mundo Desconocido'}
            </h4>
            <p className="text-justify text-xs font-light leading-relaxed text-stone-400">
              {campaignDescription ||
                world?.description ||
                'Las decisiones del grupo quedarán marcadas en la memoria del mundo.'}
            </p>
          </div>
        </GameAccordionSection>
      </div>
    </aside>
  )
}