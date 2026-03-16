import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'
import { getCampaignById } from '@/utils/game/campaigns'
import { generateOpeningMonologue } from '@/utils/ai/engine'
import type { SessionCombatStateRecord } from '@/types/session-combat'

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

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { session?: string }
}) {
  const supabase = createClient()
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

  let world: WorldRecord | null = null

  if (typedCharacter.world_id) {
    const { data: w } = await supabase.from('worlds').select('*').eq('id', typedCharacter.world_id).single()
    world = (w as WorldRecord | null) ?? null
  }

  const campaign = typedCharacter.campaign_id ? getCampaignById(typedCharacter.campaign_id) : null

  const sessionId = searchParams.session || null
  let session: SessionRecord | null = null
  let sessionPlayers: SessionPlayerRecord[] = []
  let sessionCombatState: SessionCombatStateRecord | null = null

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

    sessionPlayers = (players as SessionPlayerRecord[] | null) ?? []

    const { data: combat } = await supabase
      .from('session_combat_states')
      .select('session_id, status, round, turn_index, participants')
      .eq('session_id', sessionId)
      .single()

    sessionCombatState = (combat as SessionCombatStateRecord | null) ?? null
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
      initialEvents = [insertedOpening as NarrativeEventRecord]
    }
  }

  return (
    <GameClient
      character={typedCharacter}
      world={world}
      campaign={campaign || null}
      initialEvents={initialEvents}
      currentUser={user}
      session={session}
      sessionPlayers={sessionPlayers}
      sessionCombatState={sessionCombatState}
    />
  )
}
