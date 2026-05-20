alter table app_user_memberships
  alter column email drop not null;

alter table app_user_memberships
  drop constraint if exists app_user_memberships_email_key;

create unique index if not exists app_user_memberships_email_key
  on app_user_memberships (email)
  where email is not null;

alter table app_user_memberships
  add column if not exists invite_token text,
  add column if not exists invite_expires_at timestamptz;

create unique index if not exists app_user_memberships_invite_token_key
  on app_user_memberships (invite_token)
  where invite_token is not null;

create table if not exists player_parent_contacts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);
