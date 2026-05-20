create table if not exists public.program_alerts (
  id uuid primary key,
  title text not null,
  body text not null,
  href text,
  category text not null default 'custom',
  source_role text,
  source_label text,
  target_roles text[] not null default '{}',
  target_roster_membership_ids uuid[] not null default '{}',
  target_coach_profile_ids text[] not null default '{}',
  target_manager_profile_ids text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.program_alert_reads (
  id uuid primary key,
  alert_id uuid not null references public.program_alerts(id) on delete cascade,
  reader_role text not null,
  roster_membership_id uuid,
  coach_profile_id text,
  manager_profile_id text,
  read_at timestamptz not null default now()
);

alter table if exists public.program_alerts
  alter column target_coach_profile_ids type text[] using target_coach_profile_ids::text[],
  alter column target_manager_profile_ids type text[] using target_manager_profile_ids::text[];

alter table if exists public.program_alert_reads
  alter column coach_profile_id type text using coach_profile_id::text,
  alter column manager_profile_id type text using manager_profile_id::text;

drop index if exists public.program_alert_reads_unique_reader;

create unique index if not exists program_alert_reads_unique_reader
on public.program_alert_reads (
  alert_id,
  reader_role,
  coalesce(roster_membership_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(coach_profile_id, ''),
  coalesce(manager_profile_id, '')
);

create table if not exists public.coach_scouting_suggestions (
  id uuid primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  coach_profile_id text not null references public.coach_profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_practice_suggestions (
  id uuid primary key,
  practice_plan_id uuid not null references public.practice_plans(id) on delete cascade,
  coach_profile_id text not null references public.coach_profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);
