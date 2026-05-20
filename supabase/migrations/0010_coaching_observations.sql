create table if not exists coaching_observations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  team_side text not null check (team_side in ('home', 'away')),
  roster_membership_id uuid references roster_memberships (id) on delete set null,
  quarter integer not null,
  seconds_remaining integer not null,
  tag text not null,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists coaching_observations_game_idx
  on coaching_observations (game_id, created_at desc);
