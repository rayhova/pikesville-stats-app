alter table public.practice_plans
  add column if not exists team_season_ids uuid[] not null default '{}'::uuid[];

update public.practice_plans
set team_season_ids = array[team_season_id]
where cardinality(team_season_ids) = 0
  and team_season_id is not null;

