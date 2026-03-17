import { generateAiEmbedding } from '@/lib/ai/provider'
import { supabase } from '@/lib/supabaseClient'

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    return await generateAiEmbedding(text)
  } catch (error) {
    console.error('Embedding generation failed:', error)
    return null
  }
}

export async function storeMemory(campaignId: string, content: string) {
  const embedding = await generateEmbedding(content)
  if (!embedding || !supabase) return

  const { error } = await supabase.from('memories').insert({
    campaign_id: campaignId,
    content,
    embedding,
  })

  if (error) console.error('Failed to store memory:', error)
}

export async function fetchRelevantMemories(campaignId: string, query: string, limit = 3) {
  const queryEmbedding = await generateEmbedding(query)
  if (!queryEmbedding || !supabase) return []

  const { data, error } = await supabase.rpc('match_memories', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    campaign_filter: campaignId,
  })

  if (error) {
    console.error('Failed to fetch memories:', error)
    return []
  }

  return data
}