'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteCharacter(characterId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Debes iniciar sesión' }
  }

  // Double check that the character belongs to the user
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', characterId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting character:', error)
    return { error: 'Error al eliminar el personaje' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
