export type OllamaChatMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}

type OllamaChatResponse = {
    message?: {
        content?: string
    }
}

type OllamaGenerateChunk = {
    response?: string
    done?: boolean
}

type OllamaEmbedResponse = {
    embeddings?: number[][]
}

type OllamaRequestOptions = {
    temperature?: number
    top_p?: number
    repeat_penalty?: number
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434'
const DEFAULT_MODEL = 'llama3'
const DEFAULT_EMBED_MODEL = 'embeddinggemma'
const DEFAULT_NARRATIVE_TEMPERATURE = 0.78
const DEFAULT_STRUCTURED_TEMPERATURE = 0.05
const DEFAULT_NARRATIVE_TOP_P = 0.92
const DEFAULT_STRUCTURED_TOP_P = 0.25
const DEFAULT_NARRATIVE_REPEAT_PENALTY = 1.1

function getRequiredEnv(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback
    if (!value) {
        throw new Error(`${name} is missing.`)
    }

    return value
}

function parseOptionalNumberEnv(name: string): number | undefined {
    const raw = process.env[name]?.trim()
    if (!raw) return undefined

    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
}

export function getOllamaBaseUrl(): string {
    return getRequiredEnv('OLLAMA_BASE_URL', DEFAULT_BASE_URL).replace(/\/$/, '')
}

export function getOllamaModel(): string {
    return getRequiredEnv('OLLAMA_MODEL', DEFAULT_MODEL)
}

export function getOllamaNarrativeModel(): string {
    return getRequiredEnv('OLLAMA_NARRATIVE_MODEL', getOllamaModel())
}

export function getOllamaStructuredModel(): string {
    return getRequiredEnv('OLLAMA_STRUCTURED_MODEL', getOllamaModel())
}

export function getOllamaEmbedModel(): string {
    return getRequiredEnv('OLLAMA_EMBED_MODEL', DEFAULT_EMBED_MODEL)
}

export function getOllamaNarrativeTemperature(): number {
    return (
        parseOptionalNumberEnv('OLLAMA_NARRATIVE_TEMPERATURE') ??
        parseOptionalNumberEnv('OLLAMA_TEMPERATURE') ??
        DEFAULT_NARRATIVE_TEMPERATURE
    )
}

export function getOllamaStructuredTemperature(): number {
    return (
        parseOptionalNumberEnv('OLLAMA_STRUCTURED_TEMPERATURE') ??
        DEFAULT_STRUCTURED_TEMPERATURE
    )
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

function buildNarrativeOptions(temperature?: number): OllamaRequestOptions {
    return {
        temperature: temperature ?? getOllamaNarrativeTemperature(),
        top_p:
            parseOptionalNumberEnv('OLLAMA_NARRATIVE_TOP_P') ??
            DEFAULT_NARRATIVE_TOP_P,
        repeat_penalty:
            parseOptionalNumberEnv('OLLAMA_NARRATIVE_REPEAT_PENALTY') ??
            DEFAULT_NARRATIVE_REPEAT_PENALTY,
    }
}

function buildStructuredOptions(temperature?: number): OllamaRequestOptions {
    return {
        temperature: temperature ?? getOllamaStructuredTemperature(),
        top_p:
            parseOptionalNumberEnv('OLLAMA_STRUCTURED_TOP_P') ??
            DEFAULT_STRUCTURED_TOP_P,
    }
}

async function ollamaFetch(path: string, body: Record<string, unknown>): Promise<Response> {
    const response = await fetch(`${getOllamaBaseUrl()}${path}`, {
        method: 'POST',
        headers: buildOllamaHeaders(),
        body: JSON.stringify(body),
        cache: 'no-store',
    })

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(`Ollama request failed (${response.status}): ${errorBody || response.statusText}`)
    }

    return response
}

export async function generateText(params: {
    prompt: string
    system?: string
    model?: string
    temperature?: number
}): Promise<string> {
    const response = await ollamaFetch('/api/generate', {
        model: params.model ?? getOllamaNarrativeModel(),
        prompt: params.prompt,
        system: params.system,
        stream: false,
        options: buildNarrativeOptions(params.temperature),
    })

    const payload = (await response.json()) as { response?: string }
    return payload.response?.trim() ?? ''
}

export async function generateChatJson(params: {
    messages: OllamaChatMessage[]
    model?: string
    temperature?: number
    format?: 'json' | Record<string, unknown>
}): Promise<string> {
    const response = await ollamaFetch('/api/chat', {
        model: params.model ?? getOllamaStructuredModel(),
        messages: params.messages,
        stream: false,
        format: params.format ?? 'json',
        options: buildStructuredOptions(params.temperature),
    })

    const payload = (await response.json()) as OllamaChatResponse
    return payload.message?.content?.trim() ?? ''
}

export async function* streamGenerateText(params: {
    prompt: string
    system?: string
    model?: string
    temperature?: number
}): AsyncGenerator<string> {
    const response = await ollamaFetch('/api/generate', {
        model: params.model ?? getOllamaNarrativeModel(),
        prompt: params.prompt,
        system: params.system,
        stream: true,
        options: buildNarrativeOptions(params.temperature),
    })

    if (!response.body) {
        throw new Error('Ollama streaming response did not include a body.')
    }

    const decoder = new TextDecoder()
    const reader = response.body.getReader()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            const payload = JSON.parse(trimmed) as OllamaGenerateChunk
            if (payload.response) {
                yield payload.response
            }
        }
    }

    const finalLine = buffer.trim()
    if (finalLine) {
        const payload = JSON.parse(finalLine) as OllamaGenerateChunk
        if (payload.response) {
            yield payload.response
        }
    }
}

export async function generateEmbedding(input: string): Promise<number[] | null> {
    const response = await ollamaFetch('/api/embed', {
        model: getOllamaEmbedModel(),
        input,
        truncate: true,
    })

    const payload = (await response.json()) as OllamaEmbedResponse
    const embedding = payload.embeddings?.[0]
    return Array.isArray(embedding) ? embedding : null
}