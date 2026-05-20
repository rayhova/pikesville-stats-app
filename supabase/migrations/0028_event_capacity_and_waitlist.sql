alter table public.games
  add column if not exists capacity integer check (capacity is null or capacity > 0);

alter table public.practice_plans
  add column if not exists capacity integer check (capacity is null or capacity > 0);

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'event_attendance_responses'
    and pg_get_constraintdef(con.oid) ilike '%response_status%';

  if constraint_name is not null then
    execute format(
      'alter table public.event_attendance_responses drop constraint if exists %I',
      constraint_name
    );
  end if;
end $$;

alter table public.event_attendance_responses
  add constraint event_attendance_responses_response_status_check
  check (response_status in ('coming', 'waitlist', 'out'));
