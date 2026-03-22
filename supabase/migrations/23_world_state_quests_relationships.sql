create table if not exists public.session_quests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  world_id uuid null references public.worlds(id) on delete set null,
  source_event_id uuid null references public.narrative_events(id) on delete set null,

  slug text not null,
  title text not null,
  description text not null,
  status text not null check (
    status in ('offered', 'accepted', 'declined', 'active', 'completed', 'failed')
  ),

  offered_by_npc_key text null,
  assigned_character_id uuid null references public.characters(id) on delete set null,

  objective_summary text null,
  reward_summary text null,
  failure_consequence text null,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_session_quests_session_slug
  on public.session_quests(session_id, slug);

create index if not exists idx_session_quests_session_status
  on public.session_quests(session_id, status, updated_at desc);

create table if not exists public.session_quest_updates (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.session_quests(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  source_event_id uuid null references public.narrative_events(id) on delete set null,

  update_type text not null check (
    update_type in (
      'offered',
      'accepted',
      'declined',
      'activated',
      'progressed',
      'completed',
      'failed',
      'note'
    )
  ),
  title text not null,
  description text not null,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_session_quest_updates_quest_created
  on public.session_quest_updates(quest_id, created_at desc);

create table if not exists public.npc_relationships (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  world_id uuid null references public.worlds(id) on delete set null,
  character_id uuid not null references public.characters(id) on delete cascade,

  npc_key text not null,
  npc_name text not null,

  affinity integer not null default 0,
  trust integer not null default 0,
  favor_debt integer not null default 0,
  hostility integer not null default 0,

  last_change_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_npc_relationships_session_character_npc
  on public.npc_relationships(session_id, character_id, npc_key);

create index if not exists idx_npc_relationships_session_character
  on public.npc_relationships(session_id, character_id, updated_at desc);

create table if not exists public.npc_relationship_events (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.npc_relationships(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  source_event_id uuid null references public.narrative_events(id) on delete set null,

  event_type text not null check (
    event_type in (
      'affinity_changed',
      'trust_changed',
      'favor_changed',
      'hostility_changed',
      'relationship_note'
    )
  ),
  reason text not null,
  affinity_delta integer not null default 0,
  trust_delta integer not null default 0,
  favor_debt_delta integer not null default 0,
  hostility_delta integer not null default 0,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_npc_relationship_events_relationship_created
  on public.npc_relationship_events(relationship_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_session_quests_updated_at on public.session_quests;
create trigger trg_session_quests_updated_at
before update on public.session_quests
for each row
execute procedure public.set_updated_at();

drop trigger if exists trg_npc_relationships_updated_at on public.npc_relationships;
create trigger trg_npc_relationships_updated_at
before update on public.npc_relationships
for each row
execute procedure public.set_updated_at();

alter table public.session_quests enable row level security;
alter table public.session_quest_updates enable row level security;
alter table public.npc_relationships enable row level security;
alter table public.npc_relationship_events enable row level security;

create policy "session quests are viewable by joined session members"
on public.session_quests
for select
using (
  exists (
    select 1
    from public.session_players sp
    where sp.session_id = session_quests.session_id
      and sp.user_id = auth.uid()
      and sp.status = 'joined'
  )
);

create policy "session quest updates are viewable by joined session members"
on public.session_quest_updates
for select
using (
  exists (
    select 1
    from public.session_players sp
    where sp.session_id = session_quest_updates.session_id
      and sp.user_id = auth.uid()
      and sp.status = 'joined'
  )
);

create policy "npc relationships are viewable by joined session members"
on public.npc_relationships
for select
using (
  exists (
    select 1
    from public.session_players sp
    where sp.session_id = npc_relationships.session_id
      and sp.user_id = auth.uid()
      and sp.status = 'joined'
  )
);

create policy "npc relationship events are viewable by joined session members"
on public.npc_relationship_events
for select
using (
  exists (
    select 1
    from public.session_players sp
    where sp.session_id = npc_relationship_events.session_id
      and sp.user_id = auth.uid()
      and sp.status = 'joined'
  )
);