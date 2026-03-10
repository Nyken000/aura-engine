-- Migration: 10_fix_vector_dimensions
-- Description: The latest Gemini API for embeddings uses 3072 dimensions securely. We need to recreate the table/function to fit this data.

-- 1. Drop existing function that depends on the vector size
drop function if exists public.match_dnd_knowledge;

-- 2. Drop the table we just created (it's empty anyway because the script failed)
drop table if exists public.dnd_knowledge cascade;

-- 3. Recreate the core knowledge table with vector(3072)
create table public.dnd_knowledge (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  entity_type text not null, 
  source_book text not null, 
  category text not null,
  content text not null, 
  metadata jsonb default '{}'::jsonb, 
  embedding vector(3072), -- Gemini embedding-001 uses 3072 dimensions!
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Recreate the index (Skipped)
-- pgvector's HNSW index supports up to 2000 dimensions. Since gemini-embedding-001 gives us 3072, we will use Exact k-NN Search.
-- For a dataset of a few thousand rules, Exact Search is practically instant anyway!
-- create index on public.dnd_knowledge using hnsw ... (REMOVED)

-- 5. Set up Row Level Security
alter table public.dnd_knowledge enable row level security;
create policy "Enable read access for all users" on public.dnd_knowledge 
  for select using ( auth.role() = 'authenticated' );

-- 6. Recreate the RPC Search Function with vector(3072)
create or replace function public.match_dnd_knowledge (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_category text default null
)
returns table (
  id uuid,
  name text,
  entity_type text,
  source_book text,
  category text,
  content text,
  similarity float
)
language plpgsql
security definer 
as $$
begin
  return query
  select
    dk.id,
    dk.name,
    dk.entity_type,
    dk.source_book,
    dk.category,
    dk.content,
    (1 - (dk.embedding <#> query_embedding)) as similarity
  from public.dnd_knowledge dk
  where 1 - (dk.embedding <#> query_embedding) > match_threshold
    and (filter_category is null or dk.category = filter_category)
  order by dk.embedding <#> query_embedding 
  limit match_count;
end;
$$;
