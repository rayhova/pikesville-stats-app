create table if not exists public.drill_libraries (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  drill_type text,
  play_type text,
  tags text[] not null default '{}',
  description text,
  instructions text,
  notes text,
  video_url text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists drill_libraries_title_idx
  on public.drill_libraries (title);

alter table public.drill_libraries enable row level security;
