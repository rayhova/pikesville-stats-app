create table if not exists practice_plans (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  team_season_id uuid not null references team_seasons (id) on delete cascade,
  title text not null,
  practice_date date not null,
  start_time text not null,
  length_minutes integer not null default 90,
  practice_goal text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practice_plans_season_idx on practice_plans (season_id, practice_date desc);
create index if not exists practice_plans_team_idx on practice_plans (team_season_id, practice_date desc);
