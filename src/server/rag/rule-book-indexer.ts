import type { SupabaseClient } from '@supabase/supabase-js'
import pdf from 'pdf-parse'

type RuleBookChunkInsert = {
    rule_book_id: string
    chunk_index: number
    title: string
    content: string
    page_from: number | null
    page_to: number | null
    embedding: number[]
}

type SearchResult = {
    id: string
    title: string
    content: string
    similarity: number
    page_from?: number | null
    page_to?: number | null
}

type RuleBookRow = {
    id: string
    title: string
    processing_state: string
}

type RuleBookChunkRow = {
    rule_book_id: string
    chunk_index: number
    title: string
    content: string
    page_from: number | null
    page_to: number | null
    embedding: number[]
}

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_EMBED_MODEL = 'embeddinggemma'
const MAX_CHUNK_CHARS = 1800
const CHUNK_OVERLAP_CHARS = 300

function getOllamaBaseUrl(): string {
    return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '')
}

function getOllamaEmbedModel(): string {
    return process.env.OLLAMA_EMBED_MODEL || DEFAULT_OLLAMA_EMBED_MODEL
}

function buildOllamaHeaders(): HeadersInit {
    const headers = new Headers({
        'Content-Type': 'application/json',
    })

    if (process.env.OLLAMA_NGROK_SKIP_BROWSER_WARNING === 'true') {
        headers.set('ngrok-skip-browser-warning', 'true')
    }

    const hostHeader = process.env.OLLAMA_HOST_HEADER?.trim()
    if (hostHeader) {
        headers.set('host', hostHeader)
    }

    const authHeader = process.env.OLLAMA_AUTHORIZATION?.trim()
    if (authHeader) {
        headers.set('Authorization', authHeader)
    }

    return headers
}

async function generateEmbedding(input: string): Promise<number[]> {
    const response = await fetch(`${getOllamaBaseUrl()}/api/embed`, {
        method: 'POST',
        headers: buildOllamaHeaders(),
        body: JSON.stringify({
            model: getOllamaEmbedModel(),
            input,
            truncate: true,
        }),
        cache: 'no-store',
    })

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(`Ollama embed failed (${response.status}): ${errorBody || response.statusText}`)
    }

    const payload = (await response.json()) as {
        embeddings?: number[][]
    }

    const embedding = payload.embeddings?.[0]
    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Ollama no devolvió un embedding válido.')
    }

    return embedding
}

function normalizePdfText(text: string): string {
    return text
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
}

function splitIntoParagraphs(text: string): string[] {
    return text
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean)
}

function buildChunkTitle(ruleBookTitle: string, chunkIndex: number): string {
    return `${ruleBookTitle} · Fragmento ${chunkIndex + 1}`
}

function chunkRuleBookText(ruleBookTitle: string, text: string): Array<{
    title: string
    content: string
    page_from: number | null
    page_to: number | null
}> {
    const paragraphs = splitIntoParagraphs(text)
    const chunks: string[] = []
    let current = ''

    for (const paragraph of paragraphs) {
        const next = current ? `${current}\n\n${paragraph}` : paragraph

        if (next.length <= MAX_CHUNK_CHARS) {
            current = next
            continue
        }

        if (current) {
            chunks.push(current)
            const overlap = current.slice(-CHUNK_OVERLAP_CHARS).trim()
            current = overlap ? `${overlap}\n\n${paragraph}` : paragraph
            continue
        }

        for (let start = 0; start < paragraph.length; start += MAX_CHUNK_CHARS - CHUNK_OVERLAP_CHARS) {
            const slice = paragraph.slice(start, start + MAX_CHUNK_CHARS).trim()
            if (slice) {
                chunks.push(slice)
            }
        }
        current = ''
    }

    if (current.trim()) {
        chunks.push(current.trim())
    }

    return chunks.map((content, index) => ({
        title: buildChunkTitle(ruleBookTitle, index),
        content,
        page_from: null,
        page_to: null,
    }))
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return -1

    let dot = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return -1
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function updateRuleBookState(
    supabase: SupabaseClient,
    ruleBookId: string,
    patch: {
        processing_state?: 'PROCESSING' | 'INDEXED' | 'FAILED'
        processing_error?: string | null
        chunk_count?: number
        indexed_at?: string | null
    },
): Promise<void> {
    const { error } = await supabase
        .from('rule_books')
        .update(patch)
        .eq('id', ruleBookId)

    if (error) {
        throw new Error(`No se pudo actualizar rule_books: ${error.message}`)
    }
}

export async function indexRuleBook(params: {
    supabase: SupabaseClient
    ruleBookId: string
    ruleBookTitle: string
    fileBuffer: Buffer
}): Promise<{ chunkCount: number }> {
    const { supabase, ruleBookId, ruleBookTitle, fileBuffer } = params

    await updateRuleBookState(supabase, ruleBookId, {
        processing_state: 'PROCESSING',
        processing_error: null,
        chunk_count: 0,
        indexed_at: null,
    })

    try {
        const parsed = await pdf(fileBuffer)
        const normalizedText = normalizePdfText(parsed.text || '')

        if (normalizedText.length < 500) {
            throw new Error('El PDF no contiene suficiente texto extraíble para indexarlo.')
        }

        const chunks = chunkRuleBookText(ruleBookTitle, normalizedText)
        if (chunks.length === 0) {
            throw new Error('No se pudieron generar fragmentos indexables del PDF.')
        }

        const rows: RuleBookChunkInsert[] = []
        for (let i = 0; i < chunks.length; i += 1) {
            const chunk = chunks[i]
            const embedding = await generateEmbedding(chunk.content)

            rows.push({
                rule_book_id: ruleBookId,
                chunk_index: i,
                title: chunk.title,
                content: chunk.content,
                page_from: chunk.page_from,
                page_to: chunk.page_to,
                embedding,
            })
        }

        const { error: deleteError } = await supabase
            .from('rule_book_chunks')
            .delete()
            .eq('rule_book_id', ruleBookId)

        if (deleteError) {
            throw new Error(`No se pudieron limpiar chunks previos: ${deleteError.message}`)
        }

        const batchSize = 50
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize)
            const { error: insertError } = await supabase
                .from('rule_book_chunks')
                .insert(batch)

            if (insertError) {
                throw new Error(`No se pudieron guardar chunks: ${insertError.message}`)
            }
        }

        await updateRuleBookState(supabase, ruleBookId, {
            processing_state: 'INDEXED',
            processing_error: null,
            chunk_count: rows.length,
            indexed_at: new Date().toISOString(),
        })

        return { chunkCount: rows.length }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido durante la indexación.'

        await updateRuleBookState(supabase, ruleBookId, {
            processing_state: 'FAILED',
            processing_error: message,
            indexed_at: null,
        })

        throw error
    }
}

export async function searchRelevantRuleBookChunks(params: {
    supabase: SupabaseClient
    query: string
    limit?: number
    minSimilarity?: number
}): Promise<SearchResult[]> {
    const { supabase, query, limit = 3, minSimilarity = 0.18 } = params

    const queryEmbedding = await generateEmbedding(query)

    const { data: books, error: booksError } = await supabase
        .from('rule_books')
        .select('id, title, processing_state')
        .eq('processing_state', 'INDEXED')

    if (booksError) {
        throw new Error(`No se pudieron leer los rule_books indexados: ${booksError.message}`)
    }

    const indexedBooks = (books as RuleBookRow[] | null) ?? []
    if (indexedBooks.length === 0) return []

    const indexedBookIds = indexedBooks.map((book) => book.id)

    const { data: chunks, error: chunksError } = await supabase
        .from('rule_book_chunks')
        .select('rule_book_id, chunk_index, title, content, page_from, page_to, embedding')
        .in('rule_book_id', indexedBookIds)

    if (chunksError) {
        throw new Error(`No se pudieron leer los chunks indexados: ${chunksError.message}`)
    }

    const candidates = ((chunks as RuleBookChunkRow[] | null) ?? [])
        .map((chunk) => {
            const embedding = Array.isArray(chunk.embedding)
                ? chunk.embedding
                : []

            const similarity = cosineSimilarity(queryEmbedding, embedding)
            return {
                ...chunk,
                similarity,
            }
        })
        .filter((chunk) => chunk.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

    return candidates.map((chunk) => ({
        id: `${chunk.rule_book_id}:${chunk.chunk_index}`,
        title: chunk.title,
        content: chunk.content,
        similarity: chunk.similarity,
        page_from: chunk.page_from,
        page_to: chunk.page_to,
    }))
}