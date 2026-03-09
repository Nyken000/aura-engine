import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'
import { getCampaignById } from '@/utils/game/campaigns'
import { generateOpeningMonologue } from '@/utils/ai/engine'

export default async function PlayPage({ params }: { params: { id: string } }) {
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

  // 2. Fetch World
  const { data: world } = await supabase
    .from('worlds')
    .select('*')
    .eq('id', character.world_id)
    .single()

  if (!world) redirect('/dashboard')

  // 3. Get This Character's Campaign
  const campaign = character.campaign_id 
    ? getCampaignById(character.campaign_id) 
    : null

  // 4. Fetch this CHARACTER'S narrative events only
  //    GM responses are stored with this character's ID too, so we filter by character_id
  const { data: existingEvents } = await supabase
    .from('narrative_events')
    .select('*, characters(name)')
    .eq('character_id', character.id)
    .order('created_at', { ascending: true })

  let initialEvents = existingEvents || []

  // 5. If no events yet for this character, generate the dramatic opening monologue!
  if (initialEvents.length === 0) {
    const openingText = campaign
      ? await generateOpeningMonologue(character, campaign, world).catch(err => {
          console.error("Failed to generate opening:", err)
          return `Has llegado a las tierras de **${world.name}**. El destino te aguarda...`
        })
      : `Las puertas de **${world.name}** se abren ante ti. ¿Qué harás?`

    // Save opening monologue linked to THIS character so it's only generated once
    const { data: insertedOpening } = await supabase
      .from('narrative_events')
      .insert([{
        world_id: world.id,
        character_id: character.id,  // <-- Tied to the character, not just the world
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
    />
  )
}
