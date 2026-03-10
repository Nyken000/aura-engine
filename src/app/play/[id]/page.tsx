import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'
import { getCampaignById } from '@/utils/game/campaigns'
import { generateOpeningMonologue } from '@/utils/ai/engine'

export default async function PlayPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string }
  searchParams: { session?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Fetch Character
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', params.id)
    .single()

  if (charError || !character) redirect('/dashboard')
  if (character.user_id !== user.id) redirect('/dashboard')

  // 2. Fetch World (Optional now for multiplayer-only characters)
  let world = null
  if (character.world_id) {
    const { data: w } = await supabase
      .from('worlds')
      .select('*')
      .eq('id', character.world_id)
      .single()
    world = w
  }

  // 3. Get This Character's Campaign
  const campaign = character.campaign_id 
    ? getCampaignById(character.campaign_id) 
    : null

  // 4. Detect multiplayer session
  const sessionId = searchParams.session || null
  let session = null
  let sessionPlayers: any[] = []

  if (sessionId) {
    const { data: sess } = await supabase
      .from('game_sessions')
      .select('*, worlds(*)')
      .eq('id', sessionId)
      .single()
    session = sess

    const { data: players } = await supabase
      .from('session_players')
      .select('*, profiles!user_id(id, username, avatar_url), characters(id, name, stats, hp_current, hp_max)')
      .eq('session_id', sessionId)
      .eq('status', 'joined')
      .order('joined_at', { ascending: true })
    sessionPlayers = players || []
  }

  // 5. Fetch narrative events
  //    Multiplayer: filter by session_id | Single: filter by character_id
  let eventsQuery = supabase
    .from('narrative_events')
    .select('*, characters(name)')
    .order('created_at', { ascending: true })

  if (sessionId) {
    eventsQuery = eventsQuery.eq('session_id', sessionId)
  } else {
    eventsQuery = eventsQuery.eq('character_id', character.id)
  }

  const { data: existingEvents } = await eventsQuery
  let initialEvents = existingEvents || []

  // 6. If no events yet for this character (single player only), generate opening
  if (initialEvents.length === 0 && !sessionId) {
    const worldName = world ? world.name : 'las Tierras Desconocidas';
    const fallbackText = `Las puertas de **${worldName}** se abren ante ti. ¿Qué harás?`;
    
    const openingText = (campaign && world)
      ? await generateOpeningMonologue(character, campaign, world).catch(err => {
          console.error("Failed to generate opening:", err)
          return `Has llegado a **${worldName}**. El destino te aguarda...`
        })
      : fallbackText

    const { data: insertedOpening } = await supabase
      .from('narrative_events')
      .insert([{
        world_id: world ? world.id : null,
        character_id: character.id,
        role: 'assistant',
        content: openingText
      }])
      .select('*, characters(name)')
      .single()

    if (insertedOpening) {
      initialEvents = [insertedOpening]
    }
  }

  return (
    <GameClient 
      character={character} 
      world={world}
      campaign={campaign || null}
      initialEvents={initialEvents}
      currentUser={user}
      session={session}
      sessionPlayers={sessionPlayers}
    />
  )
}

