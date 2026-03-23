import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

import SessionLobbyClient from './SessionLobbyClient'
import type { CharacterStats } from '@/utils/session/session-player'

interface SessionLobbyPlayer {
  id: string
  user_id: string
  character_id: string | null
  status: string
  selected_character_name: string | null
  selected_character_stats: CharacterStats | null
  selected_character_hp_current?: number | null
  selected_character_hp_max?: number | null
  profiles: { id: string; username: string; avatar_url: string | null } | { id: string; username: string; avatar_url: string | null }[]
  characters: { id: string; name: string; stats: CharacterStats } | { id: string; name: string; stats: CharacterStats }[] | null
}

export default async function SessionPage({ params: paramsPromise }: { params: Promise<{ code: string }> }) {
  const params = await paramsPromise
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const code = params.code.toUpperCase()

  const { data: session, error } = await supabase
    .from('game_sessions')
    .select('*, worlds(*), profiles!host_id(*)')
    .eq('invite_code', code)
    .single()

  if (error || !session) redirect('/dashboard')

  const { data: sessionPlayers } = await supabase
    .from('session_players')
    .select(
      'id, user_id, character_id, status, joined_at, selected_character_name, selected_character_stats, selected_character_hp_current, selected_character_hp_max, profiles!user_id(id, username, avatar_url), characters(id, name, stats)',
    )
    .eq('session_id', session.id)
    .eq('status', 'joined')
    .order('joined_at', { ascending: true })

  const { data: myCharacters } = await supabase
    .from('characters')
    .select('id, name, stats')
    .eq('user_id', user.id)
    .eq('world_id', session.world_id)
    .order('created_at', { ascending: false })

  const typedSessionPlayers = ((sessionPlayers as unknown as SessionLobbyPlayer[] | null) ?? [])
    .filter((player): player is SessionLobbyPlayer => Boolean(player && typeof player === 'object'))
    .map((player) => ({
      ...player,
      profiles: Array.isArray(player.profiles) ? player.profiles[0] : player.profiles,
      characters: Array.isArray(player.characters) ? player.characters[0] : player.characters,
    }))

  const isHost = session.host_id === user.id
  const myPlayer = typedSessionPlayers.find((player) => player.user_id === user.id)

  return (
    <SessionLobbyClient
      session={session}
      sessionPlayers={typedSessionPlayers}
      myCharacters={myCharacters || []}
      currentUser={user}
      isHost={isHost}
      myPlayer={myPlayer || null}
    />
  )
}
