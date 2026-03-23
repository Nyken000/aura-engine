import type { JsonObject } from '@/server/combat/session-combat'
import type { NarrativeSemanticPayload } from '@/server/world/world-state-types'
import {
  summarizeStructuredIntent,
  type StructuredIntent,
} from '@/lib/game/structured-intents'

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function buildIntentAwareContent(params: {
  content?: string | null
  intent?: StructuredIntent | null
}): string | null {
  const content = params.content?.trim()

  if (content) {
    return content
  }

  if (!params.intent) {
    return null
  }

  const prompt = params.intent.prompt?.trim()
  if (prompt) {
    return prompt
  }

  return summarizeStructuredIntent(params.intent)
}

export function buildStructuredIntentPrompt(intent: StructuredIntent | null): string {
  if (!intent) return ''

  const targetLines =
    intent.target.kind === 'quest'
      ? [
        'Objetivo: misión',
        `Slug: ${intent.target.questSlug}`,
        `Título: ${intent.target.questTitle}`,
        intent.target.objectiveSummary
          ? `Resumen del objetivo: ${intent.target.objectiveSummary}`
          : null,
        intent.target.rewardSummary
          ? `Recompensa conocida: ${intent.target.rewardSummary}`
          : null,
        intent.target.offeredByNpcName
          ? `NPC relacionado: ${intent.target.offeredByNpcName}`
          : null,
      ]
      : intent.target.kind === 'relationship'
        ? [
          'Objetivo: relación social',
          `NPC: ${intent.target.npcName}`,
          `Clave NPC: ${intent.target.npcKey}`,
        ]
        : [
          'Objetivo: entidad del mundo',
          `Tipo entidad: ${intent.target.entityKind}`,
          `Clave entidad: ${intent.target.entityKey}`,
          `Etiqueta: ${intent.target.entityLabel}`,
        ]

  return `
ACCION ESTRUCTURADA DEL JUGADOR
Tipo: ${intent.type}
${targetLines.filter(Boolean).join('\n')}
Instrucción: trata esta intención como una acción explícita y confiable del jugador. Debes responder de forma consistente con esta acción, actualizar la semántica correspondiente y evitar reinterpretarla como una sugerencia ambigua.
`.trim()
}

function mergeUniqueByKey<T>(items: T[], key: (item: T) => string): T[] {
  const map = new Map<string, T>()

  for (const item of items) {
    map.set(key(item), item)
  }

  return [...map.values()]
}

export function deriveSemanticFromIntent(
  intent: StructuredIntent | null,
): NarrativeSemanticPayload | null {
  if (!intent) return null

  if (intent.target.kind === 'quest') {
    if (intent.type === 'quest.negotiate') {
      return {
        entities: [],
        quests: {
          upserts: [],
          updates: [
            {
              slug: intent.target.questSlug,
              updateType: 'note',
              title: `Negociación abierta: ${intent.target.questTitle}`,
              description: intent.prompt ?? summarizeStructuredIntent(intent),
              payload: {
                source: 'structured_intent',
                intent_type: intent.type,
              } as JsonObject,
            },
          ],
        },
      }
    }

    const status = intent.type === 'quest.accept' ? 'accepted' : 'declined'
    const updateType = intent.type === 'quest.accept' ? 'accepted' : 'declined'

    return {
      entities: [],
      quests: {
        upserts: [
          {
            slug: intent.target.questSlug,
            title: intent.target.questTitle,
            description: intent.prompt ?? summarizeStructuredIntent(intent),
            status,
            objectiveSummary: intent.target.objectiveSummary ?? null,
            rewardSummary: intent.target.rewardSummary ?? null,
            offeredByNpcKey: intent.target.offeredByNpcKey ?? null,
            metadata: {
              source: 'structured_intent',
              intent_type: intent.type,
            } as JsonObject,
          },
        ],
        updates: [
          {
            slug: intent.target.questSlug,
            updateType,
            title: intent.target.questTitle,
            description: intent.prompt ?? summarizeStructuredIntent(intent),
            payload: {
              source: 'structured_intent',
              intent_type: intent.type,
            } as JsonObject,
          },
        ],
      },
    }
  }

  if (intent.target.kind === 'relationship') {
    return {
      entities: [{ kind: 'npc', key: intent.target.npcKey, label: intent.target.npcName }],
      relationships: [
        {
          npcKey: intent.target.npcKey,
          npcName: intent.target.npcName,
          favorDebtDelta: intent.type === 'relationship.collect_favor' ? -1 : 0,
          trustDelta: intent.type === 'relationship.ask_help' ? 1 : 0,
          reason: intent.prompt ?? summarizeStructuredIntent(intent),
          metadata: {
            source: 'structured_intent',
            intent_type: intent.type,
          } as JsonObject,
        },
      ],
      companions:
        intent.type === 'relationship.ask_help'
          ? [
            {
              npcKey: intent.target.npcKey,
              npcName: intent.target.npcName,
              action: 'available',
              reason: 'El jugador pidió ayuda explícita a este NPC.',
              metadata: {
                source: 'structured_intent',
                intent_type: intent.type,
              } as JsonObject,
            },
          ]
          : [],
    }
  }

  return {
    entities: [
      {
        kind: intent.target.entityKind === 'npc' ? 'npc' : intent.target.entityKind,
        key: intent.target.entityKey,
        label: intent.target.entityLabel,
      },
    ],
    quests:
      intent.type === 'entity.investigate'
        ? {
          updates: [
            {
              slug: intent.target.entityKey,
              updateType: 'note',
              title: `Investigación: ${intent.target.entityLabel}`,
              description: intent.prompt ?? summarizeStructuredIntent(intent),
              payload: {
                source: 'structured_intent',
                intent_type: intent.type,
                entity_kind: intent.target.entityKind,
              } as JsonObject,
            },
          ],
        }
        : undefined,
  }
}

export function mergeSemanticPayload(
  base: NarrativeSemanticPayload | null,
  derived: NarrativeSemanticPayload | null,
): NarrativeSemanticPayload | null {
  if (!base && !derived) return null
  if (!base) return derived
  if (!derived) return base

  return {
    entities: mergeUniqueByKey(
      [...safeArray(base.entities), ...safeArray(derived.entities)],
      (item) => `${item.kind}:${item.key}`,
    ),
    quests: {
      upserts: mergeUniqueByKey(
        [...safeArray(base.quests?.upserts), ...safeArray(derived.quests?.upserts)],
        (item) => item.slug,
      ),
      updates: mergeUniqueByKey(
        [...safeArray(base.quests?.updates), ...safeArray(derived.quests?.updates)],
        (item) => `${item.slug}:${item.updateType}:${item.title}`,
      ),
    },
    relationships: mergeUniqueByKey(
      [...safeArray(base.relationships), ...safeArray(derived.relationships)],
      (item) => `${item.npcKey}:${item.reason}`,
    ),
    companions: mergeUniqueByKey(
      [...safeArray(base.companions), ...safeArray(derived.companions)],
      (item) => `${item.npcKey}:${item.action}`,
    ),
  }
}
