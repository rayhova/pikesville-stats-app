create table if not exists public.scoring_locks (
  game_id uuid primary key references public.games (id) on delete cascade,
  scorer_role text not null check (scorer_role in ('admin', 'coach')),
  scorer_user_id uuid,
  scorer_profile_id text,
  scorer_label text not null,
  device_id text not null,
  status text not null default 'active' check (status in ('active', 'released')),
  lock_started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scoring_locks_status_idx
  on public.scoring_locks (status, last_heartbeat_at);

alter table public.scoring_locks enable row level security;

create policy "authenticated read scoring_locks"
  on public.scoring_locks for select to authenticated using (true);

create policy "authenticated write scoring_locks"
  on public.scoring_locks for all to authenticated using (true) with check (true);
