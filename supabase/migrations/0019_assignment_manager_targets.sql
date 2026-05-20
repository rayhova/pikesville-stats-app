alter table program_assignments
  add column if not exists target_manager_profile_ids text[] not null default '{}';
