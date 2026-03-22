import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CharacterCreationClient from './CharacterCreationClient'

export default async function NewCharacterPage() {
  const supabase = await createClient()
  
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

  // Fetch all available backgrounds
  const { data: backgrounds } = await supabase
    .from('backgrounds')
    .select('*')
    .order('name')

  return <CharacterCreationClient worlds={worlds || []} backgrounds={backgrounds || []} />
}
