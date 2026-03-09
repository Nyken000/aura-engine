import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CharacterCreationClient from './CharacterCreationClient'

export default async function NewCharacterPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch all available worlds (public OR user's own)
  const { data: worlds } = await supabase
    .from('worlds')
    .select('id, name, description, is_public, creator_id')
    .or(`is_public.eq.true,creator_id.eq.${user.id}`)
    .order('name')

  return <CharacterCreationClient worlds={worlds || []} userId={user.id} />
}
