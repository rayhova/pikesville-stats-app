# Staging Checklist

Use this after the first staging deploy.

## Deploy

1. Deploy the `stats-app` directory as the app root
2. Confirm staging env vars are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Confirm the latest Supabase migrations are already applied

## Smoke test

1. Open `/`
2. Set access role to `Admin`
3. Open `/admin/games`
4. Open a real game into:
   - `Prep`
   - `Scouting`
   - `Observation`
   - `Scorer`

## Scorer checks

1. Change possession
2. Start and pause the clock
3. Change quarter and save
4. Log:
   - made shot
   - missed shot
   - rebound
   - steal
   - block
   - foul
5. Confirm score, player stats, and event feed update
6. Open `Stats` overlay and switch tabs
7. Save a substitution and confirm it persists after refresh

## Observation checks

1. Open the same game in `/observations/[gameId]`
2. Confirm live events appear within a reasonable delay
3. Log player and play observations
4. Confirm recent observations update and persist after refresh

## Scouting / prep checks

1. Confirm opponent overview loads
2. Confirm starters and reserves are separated correctly
3. Save the game plan card
4. Save the timeout card
5. Refresh and confirm both cards still persist

## If staging feels slow

Check these first:

- browser/device performance
- Supabase response time
- whether only one scorer screen is actively logging
- whether observation delay is just polling delay rather than a failed save

If the scorer still feels delayed in staging, the next upgrade is moving scorer event logging to a lighter dedicated API flow or realtime channel.
