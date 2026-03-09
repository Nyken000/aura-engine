-- Enable pgvector extension for cascade memory (RAG)
create extension if not exists vector;

-- Table: characters
create table characters (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade null, -- Optional linking to auth
    name text not null,
    stats jsonb not null default '{}'::jsonb, -- Dynamic stats
    inventory jsonb not null default '[]'::jsonb,
    suspicion int not null default 0 check (suspicion >= 0 and suspicion <= 100),
    credibility int not null default 50 check (credibility >= 0 and credibility <= 100),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: campaigns
create table campaigns (
    id uuid primary key default gen_random_uuid(),
    character_id uuid references characters(id) on delete cascade not null,
    global_state jsonb not null default '{}'::jsonb, -- Global consequences/events
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: memories (Cascade Memory / RAG)
create table memories (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid references campaigns(id) on delete cascade not null,
    content text not null,
    embedding vector(768), -- Assumes Gemini 1.5 embeddings size or standard text-embedding-bge
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: 768 is a common embedding dimension (e.g. for text-embedding-004 gemini).
-- We will use a standard Cosine Distance function to search for similar memories.

-- Function for similarity search
create or replace function match_memories(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    campaign_filter uuid
)
returns table (
    id uuid,
    content text,
    similarity float
)
language sql stable
as $$
select
    memories.id,
    memories.content,
    1 - (memories.embedding <=> query_embedding) as similarity
from memories
where 1 - (memories.embedding <=> query_embedding) > match_threshold
    and memories.campaign_id = campaign_filter
order by similarity desc
limit match_count;
$$;

-- RLS Policies
-- To make it secure, you would add Row Level Security policies here.
-- For the prototyping phase, we can allow anon read/write if needed, but it's recommended to link with auth.users.
