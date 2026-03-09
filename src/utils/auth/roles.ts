import { createClient } from '@/utils/supabase/server'

/**
 * Returns true if the currently authenticated user has the 'admin' role.
 * Used to protect admin-only pages and server actions.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return data?.role === 'admin'
}

/**
 * Returns the current user's role, or null if not authenticated.
 */
export async function getUserRole(): Promise<'admin' | 'player' | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data?.role as 'admin' | 'player') ?? 'player'
}
