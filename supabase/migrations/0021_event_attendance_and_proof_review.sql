alter table public.games
  add column if not exists attendance_mode text not null default 'mandatory'
  check (attendance_mode in ('mandatory', 'voluntary'));

alter table public.practice_plans
  add column if not exists attendance_mode text not null default 'mandatory'
  check (attendance_mode in ('mandatory', 'voluntary'));

alter table public.program_assignment_proofs
  add column if not exists review_status text not null default 'pending'
  check (review_status in ('pending', 'accepted', 'rejected'));

alter table public.program_assignment_proofs
  add column if not exists review_reason text;

alter table public.program_assignment_proofs
  add column if not exists reviewed_at timestamptz;

create table if not exists public.event_attendance_responses (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null check (event_kind in ('game', 'practice')),
  event_id text not null,
  attendee_role text not null check (attendee_role in ('player', 'coach', 'manager')),
  roster_membership_id uuid references public.roster_memberships (id) on delete set null,
  coach_profile_id text references public.coach_profiles (id) on delete set null,
  manager_profile_id text references public.manager_profiles (id) on delete set null,
  response_status text not null check (response_status in ('coming', 'out')),
  note text,
  updated_at timestamptz not null default now()
);

create unique index if not exists event_attendance_player_unique
  on public.event_attendance_responses (event_kind, event_id, attendee_role, roster_membership_id)
  where roster_membership_id is not null;

create unique index if not exists event_attendance_coach_unique
  on public.event_attendance_responses (event_kind, event_id, attendee_role, coach_profile_id)
  where coach_profile_id is not null;

create unique index if not exists event_attendance_manager_unique
  on public.event_attendance_responses (event_kind, event_id, attendee_role, manager_profile_id)
  where manager_profile_id is not null;
