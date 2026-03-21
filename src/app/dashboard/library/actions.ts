'use server'

import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth/roles'
import { revalidatePath } from 'next/cache'

type RuleBookListItem = {
  id: string
  title: string
  description: string | null
  file_name: string
  file_size: number | null
  processing_state: string
  processing_error: string | null
  chunk_count: number | null
  indexed_at?: string | null
  created_at: string
}

export async function uploadRuleBook(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }
  if (!(await isAdmin())) return { error: 'Solo los administradores pueden subir manuales.' }

  const file = formData.get('file') as File
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  if (!file || file.size === 0) return { error: 'No se recibió ningún archivo.' }
  if (!title?.trim()) return { error: 'El título es obligatorio.' }
  if (!file.name.toLowerCase().endsWith('.pdf')) return { error: 'Solo se aceptan archivos PDF.' }
  if (file.size > 50 * 1024 * 1024) return { error: 'El archivo no puede superar 50MB.' }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const storagePath = `global/${Date.now()}-${file.name}`

    const { error: storageError } = await supabase.storage
      .from('rule-books')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (storageError) {
      return { error: `Error al subir al storage: ${storageError.message}` }
    }

    const { data: insertedBook, error: dbError } = await supabase
      .from('rule_books')
      .insert([
        {
          uploaded_by: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          file_name: file.name,
          storage_path: storagePath,
          file_size: file.size,
          mime_type: 'application/pdf',
          processing_state: 'PROCESSING',
          processing_error: null,
          chunk_count: 0,
          indexed_at: null,
        },
      ])
      .select('id, title, description, file_name, file_size, processing_state, processing_error, chunk_count, indexed_at, created_at')
      .single()

    if (dbError || !insertedBook) {
      await supabase.storage.from('rule-books').remove([storagePath]).catch(() => { })
      return { error: `Error al guardar el registro: ${dbError?.message || 'No se pudo crear el libro.'}` }
    }

    revalidatePath('/dashboard/library')
    return {
      success: true,
      book: insertedBook as RuleBookListItem,
    }
  } catch (error: unknown) {
    console.error('Rule book upload error:', error)
    return {
      error: error instanceof Error ? error.message : 'Error desconocido al subir el manual.',
    }
  }
}

export async function deleteRuleBook(bookId: string) {
  const supabase = createClient()

  if (!(await isAdmin())) {
    return { error: 'Solo los administradores pueden eliminar manuales.' }
  }

  const { data: book } = await supabase
    .from('rule_books')
    .select('*')
    .eq('id', bookId)
    .single()

  if (!book) return { error: 'Libro no encontrado.' }

  try {
    await supabase.storage.from('rule-books').remove([book.storage_path]).catch(() => { })

    const { error } = await supabase
      .from('rule_books')
      .delete()
      .eq('id', bookId)

    if (error) {
      return { error: `No se pudo eliminar el libro: ${error.message}` }
    }

    revalidatePath('/dashboard/library')
    return { success: true }
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : 'Error desconocido al eliminar el manual.',
    }
  }
}

export async function getRuleBooks(): Promise<RuleBookListItem[]> {
  const supabase = createClient()

  if (!(await isAdmin())) return []

  const { data } = await supabase
    .from('rule_books')
    .select('id, title, description, file_name, file_size, processing_state, processing_error, chunk_count, indexed_at, created_at')
    .order('created_at', { ascending: false })

  return (data as RuleBookListItem[] | null) ?? []
}