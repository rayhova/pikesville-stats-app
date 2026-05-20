create table if not exists app_user_memberships (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  auth_user_id uuid,
  role text not null check (role in ('admin', 'coach', 'manager', 'player')),
  player_roster_membership_id uuid references roster_memberships (id) on delete set null,
  coach_profile_id text references coach_profiles (id) on delete set null,
  manager_profile_id text references manager_profiles (id) on delete set null,
  is_active boolean not null default true,
  invite_link text,
  invite_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_user_memberships_role_target_check check (
    (
      role = 'admin'
      and player_roster_membership_id is null
      and coach_profile_id is null
      and manager_profile_id is null
    ) or (
      role = 'player'
      and player_roster_membership_id is not null
      and coach_profile_id is null
      and manager_profile_id is null
    ) or (
      role = 'coach'
      and player_roster_membership_id is null
      and coach_profile_id is not null
      and manager_profile_id is null
    ) or (
      role = 'manager'
      and player_roster_membership_id is null
      and coach_profile_id is null
      and manager_profile_id is not null
    )
  )
);

create unique index if not exists app_user_memberships_email_key
  on app_user_memberships (email);

create unique index if not exists app_user_memberships_auth_user_id_key
  on app_user_memberships (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists app_user_memberships_player_key
  on app_user_memberships (player_roster_membership_id)
  where player_roster_membership_id is not null;

create unique index if not exists app_user_memberships_coach_key
  on app_user_memberships (coach_profile_id)
  where coach_profile_id is not null;

create unique index if not exists app_user_memberships_manager_key
  on app_user_memberships (manager_profile_id)
  where manager_profile_id is not null;
