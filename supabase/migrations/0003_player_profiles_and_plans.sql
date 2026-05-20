alter table public.players
  add column if not exists photo_url text,
  add column if not exists graduating_class text;

create table if not exists public.player_evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  coach_name text not null,
  evaluation_date date not null,
  evaluation text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.player_development_plans (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  plan_horizon text not null
    check (plan_horizon in ('short_term', 'long_term')),
  coach_name text not null,
  plan_date date not null,
  target_date date,
  goal_type text not null
    check (
      goal_type in (
        'skill_focus',
        'physical_development',
        'behavioral_goals',
        'tactical_or_team_goals'
      )
    ),
  plan_body text not null,
  created_at timestamptz not null default now()
);

create index if not exists player_evaluations_player_idx
  on public.player_evaluations (player_id, evaluation_date desc);

create index if not exists player_development_plans_player_idx
  on public.player_development_plans (player_id, plan_horizon, plan_date desc);

alter table public.player_evaluations enable row level security;
alter table public.player_development_plans enable row level security;

create policy "authenticated read player_evaluations"
  on public.player_evaluations for select to authenticated using (true);
create policy "authenticated write player_evaluations"
  on public.player_evaluations for all to authenticated using (true) with check (true);

create policy "authenticated read player_development_plans"
  on public.player_development_plans for select to authenticated using (true);
create policy "authenticated write player_development_plans"
  on public.player_development_plans for all to authenticated using (true) with check (true);
