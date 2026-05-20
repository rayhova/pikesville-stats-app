alter table public.game_prep
  add column if not exists key_matchups text,
  add column if not exists key_metrics text,
  add column if not exists timeout_prompt text,
  add column if not exists timeout_defense_checklist text,
  add column if not exists timeout_offense_checklist text,
  add column if not exists timeout_press_poise_checklist text,
  add column if not exists timeout_lineup_questions text,
  add column if not exists timeout_late_game_checklist text;
