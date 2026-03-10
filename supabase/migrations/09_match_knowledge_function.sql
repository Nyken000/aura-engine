-- Migration: 09_match_knowledge_function
-- Description: Creates a PostgreSQL RPC function to securely expose pgvector searches

create or replace function public.match_dnd_knowledge (
  query_embedding vector(768),
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
security definer -- Run as creator (bypassing RLS for the function itself, though it queries a public-read table anyway)
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
    -- Compute Inner Product distance (assuming embeddings are normalized, 1 - (embedding <#> query) roughly equals cosine similarity)
    (1 - (dk.embedding <#> query_embedding)) as similarity
  from public.dnd_knowledge dk
  where 1 - (dk.embedding <#> query_embedding) > match_threshold
    and (filter_category is null or dk.category = filter_category)
  order by dk.embedding <#> query_embedding -- <#> is the negative inner product operator (ascending order means highest similarity)
  limit match_count;
end;
$$;
