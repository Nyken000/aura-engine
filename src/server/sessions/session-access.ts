import type { SupabaseClient } from '@supabase/supabase-js'

export type SessionAccessRecord = {
  id: string
  session_id: string
  user_id: string
  character_id: string | null
  status: string
}

export async function getJoinedSessionMembership(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<SessionAccessRecord | null> {
  const { data, error } = await supabase
    .from('session_players')
    .select('id, session_id, user_id, character_id, status')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .eq('status', 'joined')
    .maybeSingle()

  if (error) {
    console.error('Failed to resolve joined session membership:', error)
    return null
  }

  return (data as SessionAccessRecord | null) ?? null
}
