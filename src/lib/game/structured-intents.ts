export type StructuredIntentType =
  | 'quest.accept'
  | 'quest.decline'
  | 'quest.negotiate'
  | 'relationship.ask_help'
  | 'relationship.collect_favor'
  | 'entity.investigate'
  | 'entity.travel'
  | 'entity.inspect'
  | 'faction.approach'

export type StructuredIntentQuestTarget = {
  kind: 'quest'
  questSlug: string
  questTitle: string
  objectiveSummary?: string | null
  rewardSummary?: string | null
  offeredByNpcKey?: string | null
  offeredByNpcName?: string | null
}

export type StructuredIntentRelationshipTarget = {
  kind: 'relationship'
  npcKey: string
  npcName: string
}

export type StructuredIntentEntityTarget = {
  kind: 'entity'
  entityKind: 'location' | 'item' | 'faction' | 'objective' | 'npc'
  entityKey: string
  entityLabel: string
}

export type StructuredIntentTarget =
  | StructuredIntentQuestTarget
  | StructuredIntentRelationshipTarget
  | StructuredIntentEntityTarget

export type StructuredIntent = {
  type: StructuredIntentType
  target: StructuredIntentTarget
  prompt?: string | null
  metadata?: Record<string, unknown> | null
}

export function isStructuredIntent(value: unknown): value is StructuredIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const candidate = value as Record<string, unknown>
  const type = candidate.type
  const target = candidate.target

  if (typeof type !== 'string') return false
  if (!target || typeof target !== 'object' || Array.isArray(target)) return false

  const targetRecord = target as Record<string, unknown>

  if (targetRecord.kind === 'quest') {
    return typeof targetRecord.questSlug === 'string' && typeof targetRecord.questTitle === 'string'
  }

  if (targetRecord.kind === 'relationship') {
    return typeof targetRecord.npcKey === 'string' && typeof targetRecord.npcName === 'string'
  }

  if (targetRecord.kind === 'entity') {
    return (
      typeof targetRecord.entityKind === 'string' &&
      typeof targetRecord.entityKey === 'string' &&
      typeof targetRecord.entityLabel === 'string'
    )
  }

  return false
}

export function summarizeStructuredIntent(intent: StructuredIntent): string {
  switch (intent.type) {
    case 'quest.accept':
      return `Aceptar la misión "${intent.target.kind === 'quest' ? intent.target.questTitle : 'sin título'}".`
    case 'quest.decline':
      return `Rechazar la misión "${intent.target.kind === 'quest' ? intent.target.questTitle : 'sin título'}".`
    case 'quest.negotiate':
      return `Negociar condiciones para la misión "${intent.target.kind === 'quest' ? intent.target.questTitle : 'sin título'}".`
    case 'relationship.ask_help':
      return `Pedir ayuda a ${intent.target.kind === 'relationship' ? intent.target.npcName : 'un NPC'}.`
    case 'relationship.collect_favor':
      return `Cobrar un favor a ${intent.target.kind === 'relationship' ? intent.target.npcName : 'un NPC'}.`
    case 'entity.investigate':
      return `Investigar ${intent.target.kind === 'entity' ? intent.target.entityLabel : 'la entidad seleccionada'}.`
    case 'entity.travel':
      return `Viajar hacia ${intent.target.kind === 'entity' ? intent.target.entityLabel : 'el lugar seleccionado'}.`
    case 'entity.inspect':
      return `Inspeccionar ${intent.target.kind === 'entity' ? intent.target.entityLabel : 'la entidad seleccionada'}.`
    case 'faction.approach':
      return `Acercarse a ${intent.target.kind === 'entity' ? intent.target.entityLabel : 'la facción seleccionada'}.`
    default:
      return 'Resolver intención estructurada del jugador.'
  }
}
