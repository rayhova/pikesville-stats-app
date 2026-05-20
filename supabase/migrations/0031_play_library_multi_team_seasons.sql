alter table public.play_libraries
  add column if not exists team_season_ids uuid[] not null default '{}';

update public.play_libraries
set team_season_ids = array[team_season_id]
where coalesce(array_length(team_season_ids, 1), 0) = 0;

