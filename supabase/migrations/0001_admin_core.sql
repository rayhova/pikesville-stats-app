create extension if not exists pgcrypto;

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_year text not null,
  starts_on date,
  ends_on date,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'complete')),
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  is_pikesville boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.team_seasons (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  label text not null,
  team_type text not null check (team_type in ('ours', 'opponent')),
  level text,
  scouting_summary text,
  keys_to_winning text,
  actions_to_watch text,
  scouting_notes text,
  created_at timestamptz not null default now(),
  unique (season_id, program_id, label)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  dominant_hand text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.roster_memberships (
  id uuid primary key default gen_random_uuid(),
  team_season_id uuid not null references public.team_seasons (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  jersey_number text,
  position text,
  height text,
  is_active boolean not null default true,
  scouting_notes text,
  tendencies text,
  strengths text,
  weaknesses text,
  matchup_notes text,
  shooting_notes text,
  effort_notes text,
  created_at timestamptz not null default now(),
  unique (team_season_id, player_id)
);

create table if not exists public.play_libraries (
  id uuid primary key default gen_random_uuid(),
  team_season_id uuid not null references public.team_seasons (id) on delete cascade,
  play_name text not null,
  play_family text,
  play_side text not null check (play_side in ('offense', 'defense')),
  notes text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  home_team_season_id uuid not null references public.team_seasons (id),
  away_team_season_id uuid not null references public.team_seasons (id),
  starts_at timestamptz,
  location text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'final')),
  current_quarter integer not null default 1,
  current_seconds_remaining integer not null default 480,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_prep (
  game_id uuid primary key references public.games (id) on delete cascade,
  team_summary_override text,
  keys_to_winning_override text,
  actions_to_watch_override text,
  matchup_notes text,
  bench_reminders text,
  special_situations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_state (
  game_id uuid primary key references public.games (id) on delete cascade,
  team_on_offense text check (team_on_offense in ('home', 'away')),
  home_offense_play_id uuid references public.play_libraries (id),
  home_defense_play_id uuid references public.play_libraries (id),
  away_offense_play_id uuid references public.play_libraries (id),
  away_defense_play_id uuid references public.play_libraries (id),
  home_score integer not null default 0,
  away_score integer not null default 0,
  home_fouls integer not null default 0,
  away_fouls integer not null default 0,
  home_full_timeouts integer not null default 3,
  home_30_timeouts integer not null default 2,
  away_full_timeouts integer not null default 3,
  away_30_timeouts integer not null default 2,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_lineups (
  game_id uuid not null references public.games (id) on delete cascade,
  team_side text not null check (team_side in ('home', 'away')),
  roster_membership_id uuid not null references public.roster_memberships (id),
  is_on_floor boolean not null default false,
  entered_at_sequence integer,
  primary key (game_id, team_side, roster_membership_id)
);

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  sequence_number integer not null,
  team_side text not null check (team_side in ('home', 'away')),
  event_type text not null,
  quarter integer not null,
  seconds_remaining integer not null,
  roster_membership_id uuid references public.roster_memberships (id),
  related_roster_membership_id uuid references public.roster_memberships (id),
  shot_result text check (shot_result in ('make', 'miss')),
  shot_value integer check (shot_value in (1, 2, 3)),
  shot_x numeric(6, 3),
  shot_y numeric(6, 3),
  offense_play_id uuid references public.play_libraries (id),
  defense_play_id uuid references public.play_libraries (id),
  team_on_offense text check (team_on_offense in ('home', 'away')),
  active_home_roster_ids uuid[] not null default '{}',
  active_away_roster_ids uuid[] not null default '{}',
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  edited_by uuid,
  edited_at timestamptz,
  deleted_at timestamptz,
  unique (game_id, sequence_number)
);

create table if not exists public.coaching_observations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  team_side text check (team_side in ('home', 'away')),
  roster_membership_id uuid references public.roster_memberships (id),
  quarter integer not null,
  seconds_remaining integer not null,
  tag text not null,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists team_seasons_program_idx
  on public.team_seasons (program_id, season_id);
create index if not exists roster_memberships_player_idx
  on public.roster_memberships (player_id);
create index if not exists roster_memberships_team_season_idx
  on public.roster_memberships (team_season_id);
create index if not exists play_libraries_team_season_idx
  on public.play_libraries (team_season_id, play_side);
create index if not exists game_events_game_id_idx
  on public.game_events (game_id, sequence_number);
create index if not exists game_events_roster_membership_id_idx
  on public.game_events (roster_membership_id);
create index if not exists game_events_offense_play_id_idx
  on public.game_events (offense_play_id);
create index if not exists game_events_defense_play_id_idx
  on public.game_events (defense_play_id);

alter table public.seasons enable row level security;
alter table public.programs enable row level security;
alter table public.team_seasons enable row level security;
alter table public.players enable row level security;
alter table public.roster_memberships enable row level security;
alter table public.play_libraries enable row level security;
alter table public.games enable row level security;
alter table public.game_prep enable row level security;
alter table public.game_state enable row level security;
alter table public.game_lineups enable row level security;
alter table public.game_events enable row level security;
alter table public.coaching_observations enable row level security;

create policy "authenticated read seasons"
  on public.seasons for select to authenticated using (true);
create policy "authenticated write seasons"
  on public.seasons for all to authenticated using (true) with check (true);

create policy "authenticated read programs"
  on public.programs for select to authenticated using (true);
create policy "authenticated write programs"
  on public.programs for all to authenticated using (true) with check (true);

create policy "authenticated read team_seasons"
  on public.team_seasons for select to authenticated using (true);
create policy "authenticated write team_seasons"
  on public.team_seasons for all to authenticated using (true) with check (true);

create policy "authenticated read players"
  on public.players for select to authenticated using (true);
create policy "authenticated write players"
  on public.players for all to authenticated using (true) with check (true);

create policy "authenticated read roster_memberships"
  on public.roster_memberships for select to authenticated using (true);
create policy "authenticated write roster_memberships"
  on public.roster_memberships for all to authenticated using (true) with check (true);

create policy "authenticated read play_libraries"
  on public.play_libraries for select to authenticated using (true);
create policy "authenticated write play_libraries"
  on public.play_libraries for all to authenticated using (true) with check (true);

create policy "authenticated read games"
  on public.games for select to authenticated using (true);
create policy "authenticated write games"
  on public.games for all to authenticated using (true) with check (true);

create policy "authenticated read game_prep"
  on public.game_prep for select to authenticated using (true);
create policy "authenticated write game_prep"
  on public.game_prep for all to authenticated using (true) with check (true);

create policy "authenticated read game_state"
  on public.game_state for select to authenticated using (true);
create policy "authenticated write game_state"
  on public.game_state for all to authenticated using (true) with check (true);

create policy "authenticated read game_lineups"
  on public.game_lineups for select to authenticated using (true);
create policy "authenticated write game_lineups"
  on public.game_lineups for all to authenticated using (true) with check (true);

create policy "authenticated read game_events"
  on public.game_events for select to authenticated using (true);
create policy "authenticated write game_events"
  on public.game_events for all to authenticated using (true) with check (true);

create policy "authenticated read coaching_observations"
  on public.coaching_observations for select to authenticated using (true);
create policy "authenticated write coaching_observations"
  on public.coaching_observations for all to authenticated using (true) with check (true);
