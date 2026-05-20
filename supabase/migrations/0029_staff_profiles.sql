alter table if exists public.coach_profiles
  add column if not exists staff_role text,
  add column if not exists bio text,
  add column if not exists photo_url text;

create table if not exists public.admin_profiles (
  id uuid primary key,
  auth_user_id uuid not null unique,
  auth_email text,
  full_name text not null,
  display_name text not null,
  staff_role text,
  bio text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('staff-photos', 'staff-photos', true)
on conflict (id) do nothing;
