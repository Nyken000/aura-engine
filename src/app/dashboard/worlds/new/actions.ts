'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createWorld(formData: FormData) {
  const supabase = createClient()
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const genre = formData.get('genre') as string
  const ai_rules = formData.get('ai_rules') as string
  const is_public = formData.get('is_public') === 'on'

  if (!name || !description) {
    return { error: 'Nombre y descripción son requeridos.' }
  }

  const worldData = {
    name,
    description,
    genre: genre || null,
    ai_rules: ai_rules || null,
    is_public,
    creator_id: user.id
  }

  const { error } = await supabase
    .from('worlds')
    .insert([worldData])
    .select()
    .single()

  if (error) {
    console.error("Error creating world:", error)
    return { error: 'Hubo un error al crear el mundo. Intenta de nuevo.' }
  }

  revalidatePath('/dashboard')
  redirect(`/dashboard`)
}
