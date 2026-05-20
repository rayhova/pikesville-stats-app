alter table public.player_evaluations
  add column if not exists player_view_evaluation text;
