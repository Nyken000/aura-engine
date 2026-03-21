import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { streamAiText } from '@/lib/ai/provider'
import { createClient } from '@/utils/supabase/server'
import { searchRelevantRuleBookChunks } from '@/server/rag/rule-book-indexer'
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
  SessionCombatParticipant,
  SessionCombatStateRecord,
  SessionPlayerRow,
} from '@/server/combat/session-combat'
import { persistSessionCombatTransition } from '@/server/combat/session-combat-transitions'
import { persistSessionCombatEvents } from '@/server/combat/session-combat-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CharacterRow = CharacterRecord

function createOllamaModelGateway(): EngineStreamModelGateway {
  return {
    async generateContentStream({ prompt }) {
      async function* stream() {
        for await (const chunk of streamAiText({
          prompt,
          temperature: 0.2,
        })) {
          yield {
            text() {
              return chunk
            },
          }
        }
      }

      return stream()
    },
  }
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
      const { error } = await supabase
        .from('narrative_events')
        .insert(rows as NarrativeEventInsert[])

      if (error) {
        throw new Error(`Error al insertar narrative_events: ${error.message}`)
      }
    },

    async updateCharacter(characterId, patch) {
      const { error } = await supabase
        .from('characters')
        .update(patch)
        .eq('id', characterId)

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
        throw new Error(
          `Error al upsert de session_combat_states: ${error.message}`,
        )
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
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const logFile = 'c:/proyectos/aura-engine/debug-log.txt'
  fs.appendFileSync(logFile, `[${new RegExp().toString()}] Request: ${JSON.stringify({ userId: user.id, characterId: body.characterId, sessionId: body.sessionId })}\n`)
  console.log('Stream API Request:', {
    userId: user.id,
    characterId: body.characterId,
    sessionId: body.sessionId,
    channel: body.channel,
  })

  const response = await processEngineStream({
    repository: createSupabaseEngineStreamRepository(
      supabase as unknown as SupabaseClient,
    ),
    modelGateway: createOllamaModelGateway(),
    userId: user.id,
    body,
  })

  fs.appendFileSync(logFile, `[${new RegExp().toString()}] Response Status: ${response.status}\n`)
  return response
}