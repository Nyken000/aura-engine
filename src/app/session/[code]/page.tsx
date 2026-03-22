import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SessionLobbyClient from './SessionLobbyClient'

export default async function SessionPage({ params: paramsPromise }: { params: Promise<{ code: string }> }) {
  const params = await paramsPromise
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = params.code.toUpperCase()

  // Fetch the session
  const { data: session, error } = await supabase
    .from('game_sessions')
    .select('*, worlds(*), profiles!host_id(*)')
    .eq('invite_code', code)
    .single()

  if (error || !session) redirect('/dashboard')

  // Fetch all players in the session with their characters
  const { data: sessionPlayers } = await supabase
    .from('session_players')
    .select('*, profiles!user_id(id, username, avatar_url), characters(id, name, stats)')
    .eq('session_id', session.id)
    .eq('status', 'joined')
    .order('joined_at', { ascending: true })

  // Fetch all of this user's characters (not filtered by world, so any character can join any session)
  const { data: myCharacters } = await supabase
    .from('characters')
    .select('id, name, stats')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const isHost = session.host_id === user.id
  const myPlayer = sessionPlayers?.find(p => p.user_id === user.id)

  return (
    <SessionLobbyClient
      session={session}
      sessionPlayers={sessionPlayers || []}
      myCharacters={myCharacters || []}
      currentUser={user}
      isHost={isHost}
      myPlayer={myPlayer || null}
    />
  )
}
