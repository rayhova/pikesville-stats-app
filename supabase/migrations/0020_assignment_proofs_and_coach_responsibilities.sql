insert into storage.buckets (id, name, public)
values ('assignment-proofs', 'assignment-proofs', true)
on conflict (id) do nothing;

create table if not exists coach_responsibility_templates (
  id uuid primary key,
  label text not null,
  coach_profile_id text references coach_profiles (id) on delete set null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

insert into coach_responsibility_templates (id, label, coach_profile_id, sort_order)
values
  ('5c30e767-9ab3-442b-8482-fcf056feabdd', 'Timeout (Card Check) & Bench Setup', 'coach-mike', 1),
  ('9ed9dd0d-2ca4-49c5-b486-9b571af29c48', 'Defensive Execution', 'coach-tyra', 2),
  ('e7854597-fd66-477c-a1a8-60f92b26daf9', 'Possession Value/Subs', 'coach-mike', 3),
  ('9c1ff716-072e-4150-8e25-a595dbe7d08a', 'Offball Movement', null, 4),
  ('2576fc53-f79b-4b19-b50f-0234b9d5a1f9', 'Scout/Adjustment', 'coach-tyra', 5),
  ('9107c849-f41e-4f7d-a7bd-1cfd296ba027', 'Managers/Table', 'coach-craig', 6),
  ('2b7db9fe-4d1c-4891-aae3-ef7e687507f7', 'In Between Quarter Possession', null, 7),
  ('2d2a31fb-53d0-444a-97c1-7ac5d87f0f99', 'Bench & Energy', null, 8),
  ('077be7ee-1bcb-451a-a563-339f8f55755b', 'Late Game TO/Strategy', 'coach-craig', 9)
on conflict (id) do update
set
  label = excluded.label,
  coach_profile_id = excluded.coach_profile_id,
  sort_order = excluded.sort_order;

alter table game_prep
  add column if not exists coaching_responsibility_rows jsonb not null default '[]'::jsonb;

create table if not exists program_assignment_proofs (
  id uuid primary key,
  assignment_id uuid not null references program_assignments (id) on delete cascade,
  submitted_by_role text not null,
  submitted_by_roster_membership_id uuid references roster_memberships (id) on delete set null,
  submitted_by_coach_profile_id text references coach_profiles (id) on delete set null,
  submitted_by_manager_profile_id text references manager_profiles (id) on delete set null,
  image_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
