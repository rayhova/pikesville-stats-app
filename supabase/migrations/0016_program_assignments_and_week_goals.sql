create table if not exists week_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  start_date date not null,
  end_date date not null,
  target_roles text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists program_assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  assignment_type text not null,
  due_at timestamptz,
  is_active boolean not null default true,
  target_roles text[] not null default '{}',
  target_roster_membership_ids text[] not null default '{}',
  related_play_id text,
  related_game_id text,
  related_player_id text,
  video_embed_code text,
  shots_target integer,
  proof_required boolean not null default false,
  custom_url text,
  created_at timestamptz not null default now()
);
