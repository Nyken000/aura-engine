import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { generateAiText } from '@/lib/ai/provider'
import type {
  SessionCombatParticipant,
  SessionCombatStateRecord,
  SessionPlayerRow,
} from '@/server/combat/session-combat'
import { persistSessionCombatEvents } from '@/server/combat/session-combat-events'
import { persistSessionCombatTransition } from '@/server/combat/session-combat-transitions'
import {
  processEngineStream,
  type CharacterRecord,
  type EngineStreamModelGateway,
  type EngineStreamRepository,
  type NarrativeEventInsert,
  type NarrativeEventRow,
  type RuleMatchRecord,
} from '@/server/engine/stream-runtime'
import type {
  NarrativeSemanticPayload,
  RelationshipDelta,
} from '@/server/world/world-state-types'
import { searchRelevantRuleBookChunks } from '@/server/rag/rule-book-indexer'
import { getJoinedSessionMembership } from '@/server/sessions/session-access'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CharacterRow = CharacterRecord

function logStreamEvent(message: string, payload?: Record<string, unknown>) {
  console.log('[engine/stream]', message, payload ?? {})
}

function createOllamaModelGateway(): EngineStreamModelGateway {
  return {
    async generateText({ prompt }) {
      return generateAiText({
        prompt,
      })
    },
  }
}

function resolveRelationshipEventType(delta: RelationshipDelta) {
  if ((delta.affinityDelta ?? 0) !== 0) return 'affinity_changed'
  if ((delta.trustDelta ?? 0) !== 0) return 'trust_changed'
  if ((delta.favorDebtDelta ?? 0) !== 0) return 'favor_changed'
  if ((delta.hostilityDelta ?? 0) !== 0) return 'hostility_changed'
  return 'relationship_note'
}

function createSupabaseEngineStreamRepository(
  supabase: SupabaseClient,
): EngineStreamRepository {
  return {
    async getCharacterWithWorld(characterId) {
      const { data, error } = await supabase
        .from('characters')
        .select('*, worlds(*)')
        .eq('id', characterId)
        .single()

      if (error) return null
      return (data as CharacterRow | null) ?? null
    },

    async getJoinedSessionMembership(sessionId, userId) {
      return getJoinedSessionMembership(supabase, sessionId, userId)
    },

    async getRecentSessionEvents(sessionId) {
      const { data } = await supabase
        .from('narrative_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('event_index', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(20)

      return (data as NarrativeEventRow[] | null) ?? []
    },

    async getRecentCharacterEvents(characterId) {
      const { data } = await supabase
        .from('narrative_events')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false })
        .limit(8)

      return (data as NarrativeEventRow[] | null) ?? []
    },

    async getSessionPlayers(sessionId) {
      const { data } = await supabase
        .from('session_players')
        .select(
          '*, characters(id, name, stats, hp_current, hp_max, inventory), profiles!user_id(username)',
        )
        .eq('session_id', sessionId)
        .eq('status', 'joined')
        .order('joined_at', { ascending: true })

      return (data as SessionPlayerRow[] | null) ?? []
    },

    async getSessionCombatState(sessionId) {
      const { data, error } = await supabase
        .from('session_combat_states')
        .select('session_id, status, round, turn_index, participants')
        .eq('session_id', sessionId)
        .single()

      if (error) return null
      return (data as SessionCombatStateRecord | null) ?? null
    },

    async getSessionSnapshot(sessionId) {
      const [{ data: quests }, { data: relationships }] = await Promise.all([
        supabase.from('session_quests').select('*').eq('session_id', sessionId),
        supabase.from('npc_relationships').select('*').eq('session_id', sessionId),
      ])

      return {
        quests: quests ?? [],
        relationships: relationships ?? [],
      }
    },

    async searchRelevantRules(content) {
      try {
        const matches = await searchRelevantRuleBookChunks({
          supabase,
          query: content,
          limit: 3,
          minSimilarity: 0.18,
        })

        return matches as RuleMatchRecord[]
      } catch (error) {
        console.error('Rule book retrieval error:', error)
        return []
      }
    },

    async insertNarrativeEvents(rows) {
      const { data, error } = await supabase
        .from('narrative_events')
        .insert(rows as NarrativeEventInsert[])
        .select('id')

      if (error) {
        throw new Error(`Error al insertar narrative_events: ${error.message}`)
      }

      return data as { id: string }[]
    },

    async updateCharacter(characterId, patch) {
      const { error } = await supabase.from('characters').update(patch).eq('id', characterId)

      if (error) {
        throw new Error(`Error al actualizar character: ${error.message}`)
      }
    },

    async updateSessionCombatParticipants(sessionId, participants) {
      const { error } = await supabase
        .from('session_combat_states')
        .update({
          participants: participants as SessionCombatParticipant[],
        })
        .eq('session_id', sessionId)

      if (error) {
        throw new Error(
          `Error al actualizar participants de session_combat_states: ${error.message}`,
        )
      }
    },

    async upsertSessionCombatState(state) {
      const { error } = await supabase
        .from('session_combat_states')
        .upsert(state, { onConflict: 'session_id' })

      if (error) {
        throw new Error(`Error al upsert de session_combat_states: ${error.message}`)
      }
    },

    async persistCombatTransition(params) {
      await persistSessionCombatTransition({
        supabase,
        sessionId: params.sessionId,
        combatState: params.combatState,
        turnPlayerId: params.turnPlayerId,
        turnAdvancedEvent: params.turnAdvancedEvent,
      })
    },

    async persistCombatEvents(params) {
      return persistSessionCombatEvents({
        supabase,
        worldId: params.worldId,
        characterId: params.characterId,
        sessionId: params.sessionId,
        resolution: params.resolution,
        currentState: params.currentState,
        actingParticipant: params.actingParticipant,
      })
    },

    async persistNarrativeSemantic(params: {
      sessionId: string
      worldId?: string | null
      characterId: string
      sourceEventId: string
      semantic: NarrativeSemanticPayload
    }) {
      const { sessionId, worldId, characterId, sourceEventId, semantic } = params

      for (const quest of semantic.quests?.upserts ?? []) {
        const { data, error } = await supabase
          .from('session_quests')
          .upsert(
            {
              session_id: sessionId,
              world_id: worldId ?? null,
              source_event_id: sourceEventId,
              slug: quest.slug,
              title: quest.title,
              description: quest.description,
              status: quest.status,
              offered_by_npc_key: quest.offeredByNpcKey ?? null,
              assigned_character_id: quest.assignedCharacterId ?? characterId,
              objective_summary: quest.objectiveSummary ?? null,
              reward_summary: quest.rewardSummary ?? null,
              failure_consequence: quest.failureConsequence ?? null,
              metadata: quest.metadata ?? {},
            },
            { onConflict: 'session_id,slug' },
          )
          .select('id, slug')
          .single()

        if (error) {
          throw new Error(`Error al upsert de session_quests: ${error.message}`)
        }

        const matchingUpdates = (semantic.quests?.updates ?? []).filter(
          (update) => update.slug === quest.slug,
        )

        for (const update of matchingUpdates) {
          const { error: updateError } = await supabase.from('session_quest_updates').insert({
            quest_id: data.id,
            session_id: sessionId,
            source_event_id: sourceEventId,
            update_type: update.updateType,
            title: update.title,
            description: update.description,
            payload: update.payload ?? {},
          })

          if (updateError) {
            throw new Error(`Error al insertar session_quest_updates: ${updateError.message}`)
          }
        }
      }

      for (const delta of semantic.relationships ?? []) {
        const { data: relationshipSeed, error: seedError } = await supabase
          .from('npc_relationships')
          .upsert(
            {
              session_id: sessionId,
              world_id: worldId ?? null,
              character_id: characterId,
              npc_key: delta.npcKey,
              npc_name: delta.npcName,
              affinity: 0,
              trust: 0,
              favor_debt: 0,
              hostility: 0,
              last_change_reason: delta.reason,
              metadata: delta.metadata ?? {},
            },
            {
              onConflict: 'session_id,character_id,npc_key',
            },
          )
          .select('id, affinity, trust, favor_debt, hostility')
          .single()

        if (seedError) {
          throw new Error(`Error al upsert de npc_relationships: ${seedError.message}`)
        }

        const affinityDelta = delta.affinityDelta ?? 0
        const trustDelta = delta.trustDelta ?? 0
        const favorDebtDelta = delta.favorDebtDelta ?? 0
        const hostilityDelta = delta.hostilityDelta ?? 0

        const { error: updateError } = await supabase
          .from('npc_relationships')
          .update({
            affinity: relationshipSeed.affinity + affinityDelta,
            trust: relationshipSeed.trust + trustDelta,
            favor_debt: relationshipSeed.favor_debt + favorDebtDelta,
            hostility: relationshipSeed.hostility + hostilityDelta,
            last_change_reason: delta.reason,
            metadata: delta.metadata ?? {},
          })
          .eq('id', relationshipSeed.id)

        if (updateError) {
          throw new Error(`Error al actualizar npc_relationships: ${updateError.message}`)
        }

        const { error: eventError } = await supabase.from('npc_relationship_events').insert({
          relationship_id: relationshipSeed.id,
          session_id: sessionId,
          character_id: characterId,
          source_event_id: sourceEventId,
          event_type: resolveRelationshipEventType(delta),
          reason: delta.reason,
          affinity_delta: affinityDelta,
          trust_delta: trustDelta,
          favor_debt_delta: favorDebtDelta,
          hostility_delta: hostilityDelta,
          payload: delta.metadata ?? {},
        })

        if (eventError) {
          throw new Error(`Error al insertar npc_relationship_events: ${eventError.message}`)
        }
      }

      for (const companion of semantic.companions ?? []) {
        const { data: companionRecord, error: companionError } = await supabase
          .from('session_companions')
          .upsert(
            {
              session_id: sessionId,
              world_id: worldId ?? null,
              source_event_id: sourceEventId,
              npc_key: companion.npcKey,
              npc_name: companion.npcName,
              status: companion.action,
              joined_by_character_id: characterId,
              last_change_reason: companion.reason ?? null,
              metadata: companion.metadata ?? {},
            },
            {
              onConflict: 'session_id,npc_key',
            },
          )
          .select('id')
          .single()

        if (companionError) {
          throw new Error(`Error al upsert de session_companions: ${companionError.message}`)
        }

        const { error: companionEventError } = await supabase
          .from('session_companion_events')
          .insert({
            companion_id: companionRecord.id,
            session_id: sessionId,
            source_event_id: sourceEventId,
            actor_character_id: characterId,
            event_type: companion.action,
            reason: companion.reason ?? 'Cambio de estado del acompañante.',
            payload: companion.metadata ?? {},
          })

        if (companionEventError) {
          throw new Error(
            `Error al insertar session_companion_events: ${companionEventError.message}`,
          )
        }
      }
    },
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()

  logStreamEvent('request', {
    userId: user.id,
    characterId: body.characterId,
    sessionId: body.sessionId,
    channel: body.channel,
  })

  const response = await processEngineStream({
    repository: createSupabaseEngineStreamRepository(supabase as unknown as SupabaseClient),
    modelGateway: createOllamaModelGateway(),
    userId: user.id,
    body,
    logger: logStreamEvent,
  })

  logStreamEvent('response', {
    userId: user.id,
    characterId: body.characterId,
    sessionId: body.sessionId,
    status: response.status,
  })

  return response
}