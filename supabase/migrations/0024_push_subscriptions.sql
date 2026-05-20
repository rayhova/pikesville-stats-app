create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  membership_id uuid references app_user_memberships (id) on delete cascade,
  role text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_notified_at timestamptz
);

create index if not exists push_subscriptions_auth_user_idx
  on push_subscriptions (auth_user_id, updated_at desc);
