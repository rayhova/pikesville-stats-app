# Pikesville Stats App

Standalone rebuild of the live basketball stats app.

## Direction

- Keep the familiar tablet-first UI style from the current WordPress scorer
- Rebuild the live stats engine outside WordPress
- Use an event-driven model for safer editing and reporting
- Treat offensive and defensive play selections as live context tags, not standalone events
- Store scouting context in the same app so live stats and coaching views share one system

## Planned stack

- Next.js
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- PWA installability

## Local setup

1. Copy `.env.example` to `.env.local`
2. Add your Supabase project URL, publishable key, and service role key
3. Run the first migration in `supabase/migrations/0001_admin_core.sql`
4. Install dependencies and start the app

Until `.env.local` is configured, the admin pages read from mock data and the
forms intentionally do not persist anything.

## Staging deployment

Recommended staging target:

- Vercel for the Next.js app
- Existing Supabase project for database/auth/storage

Minimum staging env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Suggested Vercel setup:

1. Import the project
2. Set the Root Directory to `stats-app`
3. Add the three environment variables above to the staging environment
4. Deploy

After deploy, run the staging smoke test in [docs/staging-checklist.md](./docs/staging-checklist.md).

## Next steps

1. Install dependencies
2. Push the Supabase migration
3. Build seasons, teams, players, and play libraries
4. Build the scorer shell
5. Add auth-aware permissions beyond the first authenticated-only policies

## References

- [Architecture](./docs/architecture.md)
- [Setup / Admin Side](./docs/admin-setup.md)
- [Schema Outline](./docs/schema-outline.sql)
