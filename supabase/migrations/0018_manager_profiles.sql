create table if not exists manager_profiles (
  id text primary key,
  full_name text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);
