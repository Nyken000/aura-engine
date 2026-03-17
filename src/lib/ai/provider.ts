import {
    generateChatJson as ollamaGenerateChatJson,
    generateEmbedding as ollamaGenerateEmbedding,
    generateText as ollamaGenerateText,
    streamGenerateText as ollamaStreamGenerateText,
    type OllamaChatMessage,
} from '@/lib/ai/ollama'

export type AiChatMessage = OllamaChatMessage

export async function generateAiText(params: {
    prompt: string
    system?: string
    temperature?: number
}): Promise<string> {
    return ollamaGenerateText(params)
}

export async function generateAiJson(params: {
    messages: AiChatMessage[]
    temperature?: number
    format?: 'json' | Record<string, unknown>
}): Promise<string> {
    return ollamaGenerateChatJson(params)
}

export async function* streamAiText(params: {
    prompt: string
    system?: string
    temperature?: number
}): AsyncGenerator<string> {
    for await (const chunk of ollamaStreamGenerateText(params)) {
        yield chunk
    }
}

export async function generateAiEmbedding(input: string): Promise<number[] | null> {
    return ollamaGenerateEmbedding(input)
}