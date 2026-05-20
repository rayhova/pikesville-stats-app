-- First-pass schema outline for the rebuilt Pikesville stats app.
-- Intended as a planning document before real Supabase migrations are created.
--
-- Key modeling decisions:
-- 1. Player identity persists across seasons.
-- 2. Roster membership is season-specific.
-- 3. Opponent scouting does not carry from year to year unless re-entered.

create table seasons (
  id uuid primary key,
  name text not null,
  school_year text not null,
  starts_on date,
  ends_on date,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'complete'))
);

create table programs (
  id uuid primary key,
  name text not null,
  short_name text,
  is_pikesville boolean not null default false
);

create table team_seasons (
  id uuid primary key,
  season_id uuid not null references seasons (id) on delete cascade,
  program_id uuid not null references programs (id) on delete cascade,
  label text not null,
  team_type text not null check (team_type in ('ours', 'opponent')),
  level text,
  scouting_summary text,
  offense text,
  defense text,
  press text,
  team_tendencies text,
  scouting_videos text[],
  keys_to_winning text,
  actions_to_watch text,
  scouting_notes text,
  created_at timestamptz not null default now(),
  unique (season_id, program_id, label)
);

create table players (
  id uuid primary key,
  first_name text not null,
  last_name text not null,
  dominant_hand text,
  photo_url text,
  graduating_class text,
  notes text,
  created_at timestamptz not null default now()
);

create table player_evaluations (
  id uuid primary key,
  player_id uuid not null references players (id) on delete cascade,
  coach_name text not null,
  evaluation_date date not null,
  evaluation text not null,
  player_view_evaluation text,
  created_at timestamptz not null default now()
);

create table player_development_plans (
  id uuid primary key,
  player_id uuid not null references players (id) on delete cascade,
  plan_horizon text not null check (plan_horizon in ('short_term', 'long_term')),
  coach_name text not null,
  plan_date date not null,
  target_date date,
  goal_type text not null check (
    goal_type in (
      'skill_focus',
      'physical_development',
      'behavioral_goals',
      'tactical_or_team_goals'
    )
  ),
  plan_body text not null,
  created_at timestamptz not null default now()
);

create table roster_memberships (
  id uuid primary key,
  team_season_id uuid not null references team_seasons (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  jersey_number text,
  position text,
  height text,
  is_active boolean not null default true,
  is_starter boolean not null default false,
  closeout_type text check (closeout_type in ('curry', 'kyrie', 'ben')),
  speed_type text check (speed_type in ('cheetah', 'elephant', 'sloth')),
  defender_types text[],
  drive_preference text check (drive_preference in ('left', 'right', 'equal_driver')),
  trap_preference text check (trap_preference in ('trap', 'do_not_trap')),
  player_notes text,
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

create table week_goals (
  id uuid primary key,
  title text not null,
  body text,
  start_date date not null,
  end_date date not null,
  target_roles text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table program_assignments (
  id uuid primary key,
  title text not null,
  body text,
  assignment_type text not null,
  due_at timestamptz,
  is_active boolean not null default true,
  target_roles text[] not null default '{}',
  target_roster_membership_ids text[] not null default '{}',
  target_coach_profile_ids text[] not null default '{}',
  target_manager_profile_ids text[] not null default '{}',
  related_play_id text,
  related_play_ids text[] not null default '{}',
  related_game_id text,
  related_player_id text,
  related_player_ids text[] not null default '{}',
  video_embed_code text,
  shots_target integer,
  proof_required boolean not null default false,
  custom_url text,
  created_at timestamptz not null default now()
);

create table program_assignment_completions (
  id uuid primary key,
  assignment_id uuid not null references program_assignments (id) on delete cascade,
  completed_by_role text not null,
  completed_by_roster_membership_id uuid references roster_memberships (id) on delete set null,
  completed_by_coach_profile_id text references coach_profiles (id) on delete set null,
  completed_by_manager_profile_id text references manager_profiles (id) on delete set null,
  completed_by_admin_auth_user_id uuid references auth.users (id) on delete set null,
  completed_at timestamptz not null default now()
);

create table program_assignment_proofs (
  id uuid primary key,
  assignment_id uuid not null references program_assignments (id) on delete cascade,
  submitted_by_role text not null,
  submitted_by_roster_membership_id uuid references roster_memberships (id) on delete set null,
  submitted_by_coach_profile_id text references coach_profiles (id) on delete set null,
  submitted_by_manager_profile_id text references manager_profiles (id) on delete set null,
  image_urls text[] not null default '{}',
  notes text,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected')),
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table event_attendance_responses (
  id uuid primary key,
  event_kind text not null check (event_kind in ('game', 'practice')),
  event_id text not null,
  attendee_role text not null check (attendee_role in ('player', 'coach', 'manager')),
  roster_membership_id uuid references roster_memberships (id) on delete set null,
  coach_profile_id text references coach_profiles (id) on delete set null,
  manager_profile_id text references manager_profiles (id) on delete set null,
  response_status text not null check (response_status in ('coming', 'waitlist', 'out')),
  note text,
  updated_at timestamptz not null default now()
);

create table coach_profiles (
  id text primary key,
  full_name text not null,
  display_name text not null,
  staff_role text,
  bio text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table admin_profiles (
  id uuid primary key,
  auth_user_id uuid not null unique,
  auth_email text,
  full_name text not null,
  display_name text not null,
  staff_role text,
  bio text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table manager_profiles (
  id text primary key,
  full_name text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table app_user_memberships (
  id uuid primary key,
  email text unique,
  auth_user_id uuid unique,
  role text not null check (role in ('admin', 'coach', 'manager', 'player')),
  player_roster_membership_id uuid references roster_memberships (id) on delete set null,
  coach_profile_id text references coach_profiles (id) on delete set null,
  manager_profile_id text references manager_profiles (id) on delete set null,
  is_active boolean not null default true,
  invite_link text,
  invite_generated_at timestamptz,
  invite_token text unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table player_parent_contacts (
  id uuid primary key,
  player_id uuid not null references players (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table coach_responsibility_templates (
  id uuid primary key,
  label text not null,
  coach_profile_id text references coach_profiles (id) on delete set null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table play_libraries (
  id uuid primary key,
  team_season_id uuid references team_seasons (id) on delete cascade,
  team_season_ids uuid[] not null default '{}',
  play_scope text not null default 'team' check (play_scope in ('team', 'global_opponent')),
  play_name text not null,
  play_family text,
  play_side text not null check (play_side in ('offense', 'defense')),
  notes text,
  image_url text,
  embed_code text,
  tags text[] not null default '{}',
  is_active boolean not null default true
);

create table drill_libraries (
  id uuid primary key,
  legacy_id text unique,
  title text not null,
  drill_type text,
  play_type text,
  tags text[] not null default '{}',
  description text,
  instructions text,
  notes text,
  video_url text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table games (
  id uuid primary key,
  season_id uuid not null references seasons (id) on delete cascade,
  home_team_season_id uuid not null references team_seasons (id),
  away_team_season_id uuid not null references team_seasons (id),
  starts_at timestamptz,
  location text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'final')),
  attendance_mode text not null default 'mandatory'
    check (attendance_mode in ('mandatory', 'voluntary')),
  capacity integer check (capacity is null or capacity > 0),
  current_quarter integer not null default 1,
  current_seconds_remaining integer not null default 480,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table game_prep (
  game_id uuid primary key references games (id) on delete cascade,
  team_summary_override text,
  keys_to_winning_override text,
  actions_to_watch_override text,
  matchup_notes text,
  bench_reminders text,
  special_situations text,
  identity text,
  defense_plan text,
  defense_matchups text,
  press_plan text,
  offense_vs_man text,
  offense_vs_zone text,
  offense_vs_big_lineup text,
  offense_actions text,
  zone_three_two_plan text,
  zone_two_three_plan text,
  blob_plan text,
  need_a_three_plan text,
  slob_plan text,
  subs_plan text,
  key_matchups text,
  key_metrics text,
  coaching_responsibilities text,
  coaching_responsibility_rows jsonb not null default '[]'::jsonb,
  timeout_prompt text,
  timeout_defense_checklist text,
  timeout_offense_checklist text,
  timeout_press_poise_checklist text,
  timeout_lineup_questions text,
  timeout_late_game_checklist text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table game_state (
  game_id uuid primary key references games (id) on delete cascade,
  team_on_offense text check (team_on_offense in ('home', 'away')),
  home_offense_play_id uuid references play_libraries (id),
  home_defense_play_id uuid references play_libraries (id),
  away_offense_play_id uuid references play_libraries (id),
  away_defense_play_id uuid references play_libraries (id),
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

create table game_lineups (
  game_id uuid not null references games (id) on delete cascade,
  team_side text not null check (team_side in ('home', 'away')),
  roster_membership_id uuid not null references roster_memberships (id),
  is_on_floor boolean not null default false,
  entered_at_sequence integer,
  primary key (game_id, team_side, roster_membership_id)
);

create table game_events (
  id uuid primary key,
  game_id uuid not null references games (id) on delete cascade,
  sequence_number integer not null,
  team_side text not null check (team_side in ('home', 'away')),
  event_type text not null,
  quarter integer not null,
  seconds_remaining integer not null,
  roster_membership_id uuid references roster_memberships (id),
  related_roster_membership_id uuid references roster_memberships (id),
  shot_result text check (shot_result in ('make', 'miss')),
  shot_value integer check (shot_value in (1, 2, 3)),
  shot_x numeric(6, 3),
  shot_y numeric(6, 3),
  offense_play_id uuid references play_libraries (id),
  defense_play_id uuid references play_libraries (id),
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

create index team_seasons_program_idx on team_seasons (program_id, season_id);
create index roster_memberships_player_idx on roster_memberships (player_id);
create index roster_memberships_team_season_idx on roster_memberships (team_season_id);
create index play_libraries_team_season_idx on play_libraries (team_season_id, play_side);
create index game_events_game_id_idx on game_events (game_id, sequence_number);
create index game_events_roster_membership_id_idx on game_events (roster_membership_id);
create index game_events_offense_play_id_idx on game_events (offense_play_id);
create index game_events_defense_play_id_idx on game_events (defense_play_id);

create table coaching_observations (
  id uuid primary key,
  game_id uuid not null references games (id) on delete cascade,
  team_side text check (team_side in ('home', 'away')),
  roster_membership_id uuid references roster_memberships (id),
  quarter integer not null,
  seconds_remaining integer not null,
  tag text not null,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table practice_plans (
  id uuid primary key,
  season_id uuid not null references seasons (id) on delete cascade,
  team_season_id uuid not null references team_seasons (id) on delete cascade,
  title text not null,
  practice_date date not null,
  start_time text not null,
  length_minutes integer not null default 90,
  attendance_mode text not null default 'mandatory'
    check (attendance_mode in ('mandatory', 'voluntary')),
  capacity integer check (capacity is null or capacity > 0),
  practice_goal text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index practice_plans_season_idx on practice_plans (season_id, practice_date desc);
create index practice_plans_team_idx on practice_plans (team_season_id, practice_date desc);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  membership_id uuid references app_user_memberships (id) on delete cascade,
  role text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_notified_at timestamptz
);

create index push_subscriptions_auth_user_idx on push_subscriptions (auth_user_id, updated_at desc);

create table program_alerts (
  id uuid primary key,
  title text not null,
  body text not null,
  href text,
  category text not null default 'custom',
  source_role text,
  source_label text,
  target_roles text[] not null default '{}',
  target_roster_membership_ids uuid[] not null default '{}',
  target_coach_profile_ids text[] not null default '{}',
  target_manager_profile_ids text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table program_alert_reads (
  id uuid primary key,
  alert_id uuid not null references program_alerts (id) on delete cascade,
  reader_role text not null,
  roster_membership_id uuid references roster_memberships (id) on delete cascade,
  coach_profile_id text references coach_profiles (id) on delete cascade,
  manager_profile_id text references manager_profiles (id) on delete cascade,
  read_at timestamptz not null default now()
);

create table coach_scouting_suggestions (
  id uuid primary key,
  game_id uuid not null references games (id) on delete cascade,
  coach_profile_id text not null references coach_profiles (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table coach_practice_suggestions (
  id uuid primary key,
  practice_plan_id uuid not null references practice_plans (id) on delete cascade,
  coach_profile_id text not null references coach_profiles (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

-- Suggested derived outputs
-- - materialized views for player box scores
-- - materialized views for team stats
-- - materialized views for lineup plus-minus
-- - materialized views for play efficiency
-- - materialized views for season shot charts
-- - filtered coaching observation summaries
--
-- Suggested auth roles later
-- - admin: full read/write
-- - coach: basketball operations write access, player evaluation access
-- - manager: live game + approved admin workflows
-- - player: self-only access to evaluations and development plans
