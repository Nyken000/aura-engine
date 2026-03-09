'use server'

import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth/roles'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import { revalidatePath } from 'next/cache'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const fileManager = new GoogleAIFileManager(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

// Upload a PDF rulebook — ADMIN ONLY
export async function uploadRuleBook(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    // 1. Write to temp file for Gemini
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tmpPath = join(tmpdir(), `aura-${Date.now()}-${file.name}`)
    await writeFile(tmpPath, buffer)

    // 2. Upload to Supabase Storage (bucket: rule-books)
    const storagePath = `global/${Date.now()}-${file.name}`
    const { error: storageError } = await supabase.storage
      .from('rule-books')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (storageError) {
      await unlink(tmpPath).catch(() => {})
      return { error: `Error al subir al storage: ${storageError.message}` }
    }

    // 3. Upload to Gemini File API
    const uploadResult = await fileManager.uploadFile(tmpPath, {
      mimeType: 'application/pdf',
      displayName: title,
    })
    await unlink(tmpPath).catch(() => {})

    // 4. Poll until ACTIVE or FAILED (max 30s)
    let geminiFile = uploadResult.file
    let attempts = 0
    while (geminiFile.state === FileState.PROCESSING && attempts < 15) {
      await new Promise(r => setTimeout(r, 2000))
      geminiFile = await fileManager.getFile(geminiFile.name)
      attempts++
    }
    const geminiState = geminiFile.state === FileState.ACTIVE ? 'ACTIVE'
                      : geminiFile.state === FileState.FAILED ? 'FAILED' : 'PROCESSING'

    // 5. Save to DB (global, uploaded_by = current admin)
    const { error: dbError } = await supabase
      .from('rule_books')
      .insert([{
        uploaded_by: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: 'application/pdf',
        gemini_file_uri: geminiFile.uri,
        gemini_file_name: geminiFile.name,
        gemini_state: geminiState,
      }])

    if (dbError) return { error: `Error al guardar el registro: ${dbError.message}` }

    revalidatePath('/dashboard/library')
    return { success: true, state: geminiState }

  } catch (err: any) {
    console.error('Rule book upload error:', err)
    return { error: err.message || 'Error desconocido al subir el archivo.' }
  }
}

// Delete a rulebook — ADMIN ONLY
export async function deleteRuleBook(bookId: string) {
  const supabase = createClient()
  if (!(await isAdmin())) return { error: 'Solo los administradores pueden eliminar manuales.' }

  const { data: book } = await supabase
    .from('rule_books')
    .select('*')
    .eq('id', bookId)
    .single()

  if (!book) return { error: 'Libro no encontrado' }

  try {
    if (book.gemini_file_name) {
      await fileManager.deleteFile(book.gemini_file_name).catch(() => {})
    }
    await supabase.storage.from('rule-books').remove([book.storage_path])
    await supabase.from('rule_books').delete().eq('id', bookId)

    revalidatePath('/dashboard/library')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Fetch all rule books — for the admin Library page
export async function getRuleBooks() {
  const supabase = createClient()
  if (!(await isAdmin())) return []
  const { data } = await supabase
    .from('rule_books')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}
