alter table public.play_libraries
  add column if not exists play_scope text not null default 'team'
    check (play_scope in ('team', 'global_opponent'));

alter table public.play_libraries
  alter column team_season_id drop not null;

