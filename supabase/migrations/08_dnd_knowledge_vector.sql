-- Migration: 08_dnd_knowledge_vector
-- Description: Enables pgvector and creates the main knowledge table for RAG

-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector
with schema extensions;

-- 2. Create the core knowledge table
create table if not exists public.dnd_knowledge (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  entity_type text not null, -- 'spell', 'background', 'item', 'monster', 'class_feature', etc.
  source_book text not null, -- 'PHB', 'TCE', 'XGE', etc.
  category text not null, -- 'Oficial (Core)', 'Oficial (Expansión)', 'Aventuras', 'Homebrew'
  content text not null, -- Fast, readable markdown representation of the rules
  metadata jsonb default '{}'::jsonb, -- Store structured data (damage dice, AC, level) for potential filtering
  embedding vector(768), -- Gemini uses 768 dimensions for text-embedding-004
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create an HNSW index for fast semantic search (L2 distance or Inner Product)
-- Using vector_ip_ops (Inner Product) as it is recommended for normalized embeddings (cosine similarity)
create index on public.dnd_knowledge using hnsw (embedding vector_ip_ops) with (m = 16, ef_construction = 64);

-- 4. Set up Row Level Security
alter table public.dnd_knowledge enable row level security;

-- Allow all authenticated users to read the knowledge
create policy "Enable read access for all users" on public.dnd_knowledge 
  for select using ( auth.role() = 'authenticated' );

-- Note: Inserting data will either be done by a service_role key or directly in dashboard.
