create table if not exists coach_profiles (
  id text primary key,
  full_name text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

insert into coach_profiles (id, full_name, display_name)
values
  ('coach-mike', 'Michael Wertlieb', 'Coach Mike'),
  ('coach-tyra', 'Tyra Hawkes', 'Coach Tyra'),
  ('coach-craig', 'Craig Copeland', 'Coach Craig')
on conflict (id) do update
set
  full_name = excluded.full_name,
  display_name = excluded.display_name;

alter table program_assignments
  add column if not exists target_coach_profile_ids text[] not null default '{}',
  add column if not exists related_play_ids text[] not null default '{}';

update program_assignments
set related_play_ids = array[related_play_id]
where related_play_id is not null
  and cardinality(related_play_ids) = 0;
