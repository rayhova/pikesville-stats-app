alter table if exists public.play_libraries
  add column if not exists image_url text;
