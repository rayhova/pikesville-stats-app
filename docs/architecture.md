# Pikesville Stats App Architecture

## Goal

Rebuild the live basketball stats tool as a standalone multi-device web app with a tablet-first interface, realtime sync, event editing, season reporting, and installable app behavior.

This app is separate from WordPress. WordPress can remain the public site if needed, but it should not be the source of truth for live game tracking.

## Recommended stack

- Next.js App Router frontend
- Supabase Auth
- Supabase Postgres
- Supabase Realtime for live updates
- PWA installability for iPad/tablet/laptop use

## Product model

The app is not a page-based CMS. It is an event-driven stats system.

### Source of truth

Each recorded action during a game is stored as a `game_event`.

Examples:
- made 3-point shot
- missed 2-point shot
- offensive rebound
- assist
- steal
- turnover
- sub in
- sub out
- foul
- timeout
- note or correction

### Derived data

Everything else should be calculated from events:
- player box scores
- team totals
- quarter splits
- shot charts
- plus-minus
- lineup plus-minus
- play efficiency
- defensive effectiveness
- season aggregates

This makes editing safer because we change the event history and recalculate the outputs instead of trying to patch many separate counters.

## Important modeling rule: plays are context, not standalone events

The selected offensive and defensive plays are persistent live context values, not individual logged actions.

Example:
- Pikesville offense play selected: `Horns`
- Opponent defense selected: `2-3 Zone`
- A made shot happens

The resulting shot event should store the active context:
- offensive play = `Horns`
- defense faced = `2-3 Zone`

That means play efficiency can be calculated from the tagged events without cluttering the event log with duplicate "play selected" entries every few seconds.

### Recommended behavior

- A play selection changes the current live context for one side of the ball.
- That context remains active until a coach or scorer changes it.
- Every new event stores the active context snapshot at the time it was recorded.

This gives you:
- possession-level tagging without extra noise
- easier editing
- better offensive and defensive reporting

## Basketball ops model

The rebuilt app should cover both live stats and prep context, not just in-game button presses.

### Core setup before a game

- Seasons
- Teams
- Players
- Team plays
- Opponent teams
- Opponent players
- Game plans
- Games

### Seasons

Seasons are the top-level container for:
- teams
- games
- stats
- reports
- playbooks

### Teams and players

Your own team and opponent teams should both be modeled as programs with season-specific team records.

Important distinction:
- base program identity persists across years
- season-specific team data does not
- player identity can persist across years
- roster membership is season-specific

Player profile fields should support:
- full name
- persistent identity notes

Roster membership fields should support:
- jersey number
- position
- height
- scouting notes
- tendencies

### Play libraries

The app should support two play libraries:
- your team play library
- opponent play/action library

Both libraries are selectable during a game and can be attached as live context to events.
These should generally be season-specific so opponent data does not accidentally carry over year to year.

## Scouting model

Scouting should live inside the new app, not in WordPress.

### Team scouting

An opponent season-team record should carry team-level scouting information such as:
- summary
- keys to winning
- actions to watch for
- defensive coverages they use
- offensive actions they run

### Player scouting

An opponent player's season roster record should carry player-level scouting information such as:
- tendencies
- strengths
- weaknesses
- shooting notes
- effort / motor notes
- matchup notes

### Game prep layer

For a specific game, we should add a game-prep layer that pulls in the opponent team and player scouting and lets you add game-specific emphasis:
- keys to winning for this game
- focus actions to watch
- matchup notes
- reminders visible during the game

This lets the live scorer app show coaching context without creating a separate integration path.

## Future coaching / observation view

After the live scorer is stable, a second view can be built for qualitative coaching observations.

That view should be able to show:
- live stats
- team scouting summary
- player tendencies
- keys to winning
- actions to watch for

It should also allow qualitative observations like:
- allowed open shot
- good defensive possession
- bad defensive possession
- poor player movement
- strong player movement
- good effort
- bad effort

These should be modeled separately from box-score events so qualitative coaching observations do not distort official stats.

## Realtime and multi-device rule

Recommended roles:
- one primary scorer device with full write access during live games
- one or more viewer devices for coaches and staff
- optional editor devices for trusted staff if needed later

This keeps the UX simpler and reduces conflicting simultaneous edits.

## Offline support

The app should support temporary offline use during games:
- queue unsynced events locally
- preserve event order
- sync when connectivity returns
- visibly mark unsynced events

## Suggested screens

### 1. Live scorer

Core screen modeled after the current WordPress UI:
- home team roster cards
- away team roster cards
- current five on the floor for each side
- live score and clock
- timeout and foul tracking
- court tap for shot entry
- quick stat buttons
- active offensive and defensive play selectors

### 2. Midgame stats modal

- player box score
- player advanced stats
- team stats
- quarter breakdown
- event log
- lineup plus-minus
- play performance
- charts

### 3. Postgame review

- edit and audit event log
- finalize game
- lock official result
- export summary if needed

### 4. Season reports

- player shot charts
- team shot charts
- season box score splits
- play efficiency
- defense effectiveness
- lineup combinations

### 5. Future coaching / observation view

- live stats alongside scouting notes
- quick qualitative observation buttons
- player effort / movement tagging
- defensive execution notes
- open-shot / breakdown tracking

## Initial build phases

### Phase 1

- auth
- seasons
- teams and rosters
- player profiles
- play libraries
- opponent teams and opponent players
- game creation
- live game shell
- active lineups
- clock and score

### Phase 2

- shot entry
- stat entry
- substitutions
- event log
- editing

### Phase 3

- derived stats
- quarter filtering
- plus-minus
- lineup groups

### Phase 4

- play-context reporting
- charts
- shot charts
- season aggregation

### Phase 5

- offline queue
- PWA install
- permissions and audit trail

### Phase 6

- coaching / observation view
- qualitative tags and notes
- live scouting overlay
- side-by-side game context and stats

## Migration note

No WordPress migration is required to begin the rebuild.

We can rebuild cleanly and later decide whether to import:
- players
- teams
- plays
- seasons
- historical games

If the current WordPress UI is familiar, we should keep its interaction model as the visual starting point while improving the underlying architecture.

New scouting data should be entered directly in this app so live stats, scouting, and later coaching observations all use the same system.

## Related planning docs

- `docs/admin-setup.md` for setup/admin screens and workflows
- `docs/schema-outline.sql` for the first-pass data shape
