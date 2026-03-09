import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabaseClient";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!apiKey) return null;
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return null;
  }
}

export async function storeMemory(campaignId: string, content: string) {
  const embedding = await generateEmbedding(content);
  if (!embedding || !supabase) return;

  const { error } = await supabase.from("memories").insert({
    campaign_id: campaignId,
    content,
    embedding
  });

  if (error) console.error("Failed to store memory:", error);
}

export async function fetchRelevantMemories(campaignId: string, query: string, limit: number = 3) {
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding || !supabase) return [];

  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7, // 70% similarity threshold
    match_count: limit,
    campaign_filter: campaignId
  });

  if (error) {
    console.error("Failed to fetch memories:", error);
    return [];
  }

  return data;
}
