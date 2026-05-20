alter table coaching_observations
  add column if not exists observation_scope text not null default 'team'
    check (observation_scope in ('team', 'player', 'offense_play', 'defense_play')),
  add column if not exists play_library_id uuid references play_libraries (id) on delete set null,
  add column if not exists score_delta integer not null default 0;

create index if not exists coaching_observations_play_idx
  on coaching_observations (play_library_id, created_at desc);
