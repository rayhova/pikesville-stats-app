alter table if exists public.play_libraries
  add column if not exists embed_code text;
