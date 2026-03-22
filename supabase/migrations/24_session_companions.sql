create table if not exists public.session_companions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  world_id uuid null references public.worlds(id) on delete set null,
  source_event_id uuid null references public.narrative_events(id) on delete set null,

  npc_key text not null,
  npc_name text not null,
  status text not null check (status in ('joined', 'available', 'left')),
  joined_by_character_id uuid null references public.characters(id) on delete set null,
  last_change_reason text null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_session_companions_session_npc
  on public.session_companions(session_id, npc_key);

create index if not exists idx_session_companions_session_status
  on public.session_companions(session_id, status, updated_at desc);

create table if not exists public.session_companion_events (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.session_companions(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  source_event_id uuid null references public.narrative_events(id) on delete set null,
  actor_character_id uuid null references public.characters(id) on delete set null,

  event_type text not null check (event_type in ('joined', 'available', 'left', 'note')),
  reason text not null,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_session_companion_events_companion_created
  on public.session_companion_events(companion_id, created_at desc);

drop trigger if exists trg_session_companions_updated_at on public.session_companions;
create trigger trg_session_companions_updated_at
before update on public.session_companions
for each row
execute procedure public.set_updated_at();

alter table public.session_companions enable row level security;
alter table public.session_companion_events enable row level security;

create policy "session companions are viewable by joined session members"
on public.session_companions
for select
using (
  exists (
    select 1
    from public.session_players sp
    where sp.session_id = session_companions.session_id
      and sp.user_id = auth.uid()
      and sp.status = 'joined'
  )
);

create policy "session companion events are viewable by joined session members"
on public.session_companion_events
for select
using (
  exists (
    select 1
    from public.session_players sp
    where sp.session_id = session_companion_events.session_id
      and sp.user_id = auth.uid()
      and sp.status = 'joined'
  )
);