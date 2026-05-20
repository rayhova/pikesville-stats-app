alter table program_assignments
  add column if not exists related_player_ids text[] not null default '{}';

update program_assignments
set related_player_ids = case
  when related_player_id is not null and not (related_player_id = any(related_player_ids))
    then array_append(related_player_ids, related_player_id)
  else related_player_ids
end;

create table if not exists program_assignment_completions (
  id uuid primary key,
  assignment_id uuid not null references program_assignments (id) on delete cascade,
  completed_by_role text not null check (completed_by_role in ('admin', 'coach', 'manager', 'player')),
  completed_by_roster_membership_id uuid references roster_memberships (id) on delete set null,
  completed_by_coach_profile_id text references coach_profiles (id) on delete set null,
  completed_by_manager_profile_id text references manager_profiles (id) on delete set null,
  completed_by_admin_auth_user_id uuid references auth.users (id) on delete set null,
  completed_at timestamptz not null default now()
);

create unique index if not exists program_assignment_completions_identity_idx
on program_assignment_completions (
  assignment_id,
  completed_by_role,
  completed_by_roster_membership_id,
  completed_by_coach_profile_id,
  completed_by_manager_profile_id,
  completed_by_admin_auth_user_id
) nulls not distinct;
