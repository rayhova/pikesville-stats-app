alter table public.team_seasons
  add column if not exists offense text,
  add column if not exists defense text,
  add column if not exists press text,
  add column if not exists team_tendencies text,
  add column if not exists scouting_videos text[],
  add column if not exists keys_to_winning text;

alter table public.roster_memberships
  add column if not exists is_starter boolean not null default false;
