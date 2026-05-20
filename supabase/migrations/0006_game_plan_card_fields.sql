alter table public.game_prep
  add column if not exists identity text,
  add column if not exists defense_plan text,
  add column if not exists defense_matchups text,
  add column if not exists press_plan text,
  add column if not exists offense_vs_man text,
  add column if not exists offense_vs_big_lineup text,
  add column if not exists offense_actions text,
  add column if not exists zone_three_two_plan text,
  add column if not exists zone_two_three_plan text,
  add column if not exists blob_plan text,
  add column if not exists need_a_three_plan text,
  add column if not exists slob_plan text,
  add column if not exists subs_plan text;
