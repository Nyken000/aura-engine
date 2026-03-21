-- Fase 3: rule_book_chunks -> pgvector + RPC de similitud
-- Mantiene compatibilidad con embedding jsonb existente
-- y añade búsqueda vectorial real para el retrieval del motor.

create extension if not exists vector
with schema extensions;

alter table public.rule_book_chunks
  add column if not exists embedding_vector vector(768);

-- Backfill desde jsonb legacy.
-- embedding es un array jsonb y su representación textual ya es válida para vector,
-- por ejemplo: [0.1, 0.2, 0.3]
update public.rule_book_chunks
set embedding_vector = (embedding::text)::vector(768)
where embedding_vector is null
  and embedding is not null
  and jsonb_typeof(embedding) = 'array'
  and jsonb_array_length(embedding) = 768;

create index if not exists rule_book_chunks_embedding_vector_hnsw_idx
  on public.rule_book_chunks
  using hnsw (embedding_vector vector_cosine_ops);

drop function if exists public.match_rule_book_chunks(vector(768), float, int, uuid);

create or replace function public.match_rule_book_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_rule_book_id uuid default null
)
returns table (
  id uuid,
  rule_book_id uuid,
  chunk_index integer,
  title text,
  content text,
  page_from integer,
  page_to integer,
  similarity double precision
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    rbc.id,
    rbc.rule_book_id,
    rbc.chunk_index,
    rbc.title,
    rbc.content,
    rbc.page_from,
    rbc.page_to,
    1 - (rbc.embedding_vector <=> query_embedding) as similarity
  from public.rule_book_chunks rbc
  inner join public.rule_books rb
    on rb.id = rbc.rule_book_id
  where rb.processing_state = 'INDEXED'
    and rbc.embedding_vector is not null
    and (filter_rule_book_id is null or rbc.rule_book_id = filter_rule_book_id)
    and (1 - (rbc.embedding_vector <=> query_embedding)) >= match_threshold
  order by
    rbc.embedding_vector <=> query_embedding asc,
    rbc.rule_book_id asc,
    rbc.chunk_index asc
  limit greatest(match_count, 1);
end;
$$;

grant execute on function public.match_rule_book_chunks(vector(768), float, int, uuid) to authenticated;
grant execute on function public.match_rule_book_chunks(vector(768), float, int, uuid) to service_role;