-- Rule books RAG for Ollama / provider-agnostic ingestion
-- This migration keeps rule_books as the source of uploaded PDFs
-- and adds a dedicated chunk table plus a real indexing lifecycle.

alter table public.rule_books
  add column if not exists processing_state text
    default 'PROCESSING'
    check (processing_state in ('PROCESSING', 'INDEXED', 'FAILED')),
  add column if not exists processing_error text,
  add column if not exists chunk_count integer not null default 0,
  add column if not exists indexed_at timestamptz;

update public.rule_books
set
  processing_state = case
    when coalesce(gemini_state, '') = 'ACTIVE' then 'INDEXED'
    when coalesce(gemini_state, '') = 'FAILED' then 'FAILED'
    else 'PROCESSING'
  end,
  indexed_at = case
    when coalesce(gemini_state, '') = 'ACTIVE' and indexed_at is null then now()
    else indexed_at
  end
where processing_state is null
   or processing_state = 'PROCESSING';

create table if not exists public.rule_book_chunks (
  id uuid primary key default gen_random_uuid(),
  rule_book_id uuid not null references public.rule_books(id) on delete cascade,
  chunk_index integer not null,
  title text not null,
  content text not null,
  page_from integer,
  page_to integer,
  embedding jsonb not null,
  created_at timestamptz not null default now(),
  unique (rule_book_id, chunk_index)
);

create index if not exists rule_book_chunks_rule_book_id_idx
  on public.rule_book_chunks(rule_book_id);

create index if not exists rule_book_chunks_chunk_index_idx
  on public.rule_book_chunks(rule_book_id, chunk_index);

alter table public.rule_book_chunks enable row level security;

drop policy if exists "Admins manage rule book chunks" on public.rule_book_chunks;
create policy "Admins manage rule book chunks"
on public.rule_book_chunks
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users read indexed rule book chunks" on public.rule_book_chunks;
create policy "Authenticated users read indexed rule book chunks"
on public.rule_book_chunks
for select
using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.rule_books rb
    where rb.id = rule_book_chunks.rule_book_id
      and rb.processing_state = 'INDEXED'
  )
);