alter table public.roster_memberships
  add column if not exists closeout_type text
    check (closeout_type in ('curry', 'kyrie', 'ben')),
  add column if not exists speed_type text
    check (speed_type in ('cheetah', 'elephant', 'sloth')),
  add column if not exists defender_types text[],
  add column if not exists drive_preference text
    check (drive_preference in ('left', 'right', 'equal_driver')),
  add column if not exists trap_preference text
    check (trap_preference in ('trap', 'do_not_trap')),
  add column if not exists player_notes text;
