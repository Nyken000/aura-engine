import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'
import { getCampaignById } from '@/utils/game/campaigns'
import { generateOpeningMonologue } from '@/utils/ai/engine'
import type { SessionCombatStateRecord } from '@/types/session-combat'
import { getJoinedSessionMembership } from '@/server/sessions/session-access'
import type {
  NpcRelationship,
  NpcRelationshipEvent,
  SessionCompanion,
  SessionQuest,
  SessionQuestUpdate,
} from './types'

type CharacterRecord = {
  id: string
  user_id: string
  name: string
  campaign_id: string | null
  world_id: string | null
  hp_current: number
  hp_max: number
  stats?: Record<string, unknown> | null
  inventory?: { name: string; type?: string; description?: string }[] | null
}

type WorldRecord = {
  id: string
  name: string
  description: string
  genre?: string | null
}

type SessionRecord = {
  id: string
  turn_player_id: string | null
  worlds?: WorldRecord | null
}

type SessionPlayerRecord = {
  id: string
  user_id: string
  status: string
  profiles?: {
    id: string
    username: string | null
    avatar_url: string | null
  } | null
  characters?: {
    id: string
    name: string
    stats?: Record<string, unknown> | null
    hp_current: number
    hp_max: number
  } | null
}

type NarrativeEventRecord = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  event_index?: number | null
  client_event_id?: string | null
  event_type?: string | null
  payload?: Record<string, unknown> | null
  dice_roll_required?: {
    needed: boolean
    die: string
    stat: string
    skill: string | null
    dc: number
    flavor: string
  } | null
}

type SessionPlayerProfileRecord = {
  id: string
  username: string | null
  avatar_url: string | null
}

type SessionPlayerCharacterRecord = {
  id: string
  name: string
  stats?: Record<string, unknown> | null
  hp_current: number
  hp_max: number
}

type InsertedOpeningRecord = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  event_index?: number | null
  client_event_id?: string | null
  event_type?: string | null
  payload?: Record<string, unknown> | null
  dice_roll_required?: {
    needed: boolean
    die: string
    stat: string
    skill: string | null
    dc: number
    flavor: string
  } | null
}

type SessionQuestRecord = SessionQuest
type SessionQuestUpdateRecord = SessionQuestUpdate
type NpcRelationshipRecord = NpcRelationship
type NpcRelationshipEventRecord = NpcRelationshipEvent
type SessionCompanionRecord = SessionCompanion

export default async function PlayPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const params = await paramsPromise
  const searchParams = await searchParamsPromise
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', params.id)
    .single()

  const typedCharacter = character as CharacterRecord | null

  if (charError || !typedCharacter) redirect('/dashboard')
  if (typedCharacter.user_id !== user.id) redirect('/dashboard')

  const sessionId = searchParams.session || null

  if (sessionId) {
    const membership = await getJoinedSessionMembership(supabase, sessionId, user.id)

    if (!membership) {
      redirect('/dashboard')
    }

    if (!membership.character_id) {
      redirect('/dashboard')
    }

    if (membership.character_id !== typedCharacter.id) {
      redirect(`/play/${membership.character_id}?session=${sessionId}`)
    }
  }

  let world: WorldRecord | null = null

  if (typedCharacter.world_id) {
    const { data: w } = await supabase.from('worlds').select('*').eq('id', typedCharacter.world_id).single()
    world = (w as WorldRecord | null) ?? null
  }

  const campaign = typedCharacter.campaign_id ? getCampaignById(typedCharacter.campaign_id) : null

  let session: SessionRecord | null = null
  let sessionPlayers: SessionPlayerRecord[] = []
  let sessionCombatState: SessionCombatStateRecord | null = null
  let sessionQuests: SessionQuestRecord[] = []
  let sessionQuestUpdates: SessionQuestUpdateRecord[] = []
  let npcRelationships: NpcRelationshipRecord[] = []
  let npcRelationshipEvents: NpcRelationshipEventRecord[] = []
  let sessionCompanions: SessionCompanionRecord[] = []

  if (sessionId) {
    const { data: sess } = await supabase.from('game_sessions').select('*, worlds(*)').eq('id', sessionId).single()
    session = (sess as SessionRecord | null) ?? null

    const { data: players } = await supabase
      .from('session_players')
      .select(
        '*, profiles!user_id(id, username, avatar_url), characters(id, name, stats, hp_current, hp_max)',
      )
      .eq('session_id', sessionId)
      .eq('status', 'joined')
      .order('joined_at', { ascending: true })

    sessionPlayers = ((players ?? []) as Array<
      Omit<SessionPlayerRecord, 'profiles' | 'characters'> & {
        profiles?: SessionPlayerProfileRecord | SessionPlayerProfileRecord[] | null
        characters?: SessionPlayerCharacterRecord | SessionPlayerCharacterRecord[] | null
      }
    >).map((player) => ({
      ...player,
      profiles: Array.isArray(player.profiles) ? player.profiles[0] ?? null : (player.profiles ?? null),
      characters: Array.isArray(player.characters) ? player.characters[0] ?? null : (player.characters ?? null),
    }))

    const { data: combat } = await supabase
      .from('session_combat_states')
      .select('session_id, status, round, turn_index, participants')
      .eq('session_id', sessionId)
      .single()

    sessionCombatState = (combat as SessionCombatStateRecord | null) ?? null

    const [
      { data: quests },
      { data: questUpdates },
      { data: relationships },
      { data: relationshipEvents },
      { data: companions },
    ] = await Promise.all([
      supabase
        .from('session_quests')
        .select('*')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('session_quest_updates')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false }),
      supabase
        .from('npc_relationships')
        .select('*')
        .eq('session_id', sessionId)
        .eq('character_id', typedCharacter.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('npc_relationship_events')
        .select('*')
        .eq('session_id', sessionId)
        .eq('character_id', typedCharacter.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('session_companions')
        .select('*')
        .eq('session_id', sessionId)
        .neq('status', 'left')
        .order('updated_at', { ascending: false }),
    ])

    sessionQuests = (quests as SessionQuestRecord[] | null) ?? []
    sessionQuestUpdates = (questUpdates as SessionQuestUpdateRecord[] | null) ?? []
    npcRelationships = (relationships as NpcRelationshipRecord[] | null) ?? []
    npcRelationshipEvents = (relationshipEvents as NpcRelationshipEventRecord[] | null) ?? []
    sessionCompanions = (companions as SessionCompanionRecord[] | null) ?? []
  }

  let initialEvents: NarrativeEventRecord[] = []

  if (sessionId) {
    const { data } = await supabase
      .from('narrative_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('event_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    initialEvents = (data as NarrativeEventRecord[] | null) ?? []
  } else {
    const { data } = await supabase
      .from('narrative_events')
      .select('*')
      .eq('character_id', typedCharacter.id)
      .order('created_at', { ascending: true })

    initialEvents = (data as NarrativeEventRecord[] | null) ?? []
  }

  if (initialEvents.length === 0 && !sessionId) {
    const worldName = world ? world.name : 'las Tierras Desconocidas'
    const fallbackText = `Las puertas de **${worldName}** se abren ante ti. ¿Qué harás?`

    const openingText =
      campaign && world
        ? await generateOpeningMonologue(typedCharacter, campaign, world).catch((error: unknown) => {
          console.error('Failed to generate opening:', error)
          return `Has llegado a **${worldName}**. El destino te aguarda...`
        })
        : fallbackText

    const { data: insertedOpening } = await supabase
      .from('narrative_events')
      .insert([
        {
          world_id: world ? world.id : null,
          character_id: typedCharacter.id,
          role: 'assistant',
          content: openingText,
          event_type: 'gm_message',
          payload: {
            sender_name: 'Game Master',
          },
        },
      ])
      .select('*')
      .single()

    if (insertedOpening) {
      initialEvents = [insertedOpening as InsertedOpeningRecord]
    }
  }

  return (
    <GameClient
      character={typedCharacter}
      world={world}
      campaign={campaign || null}
      initialEvents={initialEvents}
      initialSessionQuests={sessionQuests}
      initialSessionQuestUpdates={sessionQuestUpdates}
      initialNpcRelationships={npcRelationships}
      initialNpcRelationshipEvents={npcRelationshipEvents}
      initialSessionCompanions={sessionCompanions}
      currentUser={{ id: user.id }}
      session={session}
      sessionPlayers={sessionPlayers}
      sessionCombatState={sessionCombatState}
    />
  )
}