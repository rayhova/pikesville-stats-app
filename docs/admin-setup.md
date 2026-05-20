# Setup / Admin Side

## Purpose

The setup side is the control center for all data that powers:
- live stats
- game prep
- scouting
- season reporting
- the future observation tab

This should be optimized for desktop and tablet use before games, not for in-game speed.

## Primary admin areas

### 1. Dashboard

Purpose:
- quick entry point for the current season
- upcoming games
- recent games
- shortcuts to roster, playbook, and scouting prep

Recommended sections:
- current season summary
- next scheduled game
- recent finalized games
- incomplete scouting reports / prep items
- quick actions

Quick actions:
- create game
- add team
- add player
- add play
- open game prep

## 2. Seasons

Purpose:
- define the season container for all related data

List view:
- season name
- start date
- end date
- status: upcoming / active / complete
- counts for games, teams, players

Create/edit fields:
- season name
- school year label
- start date
- end date
- active season toggle

Recommended rule:
- only one season is active at a time

## 3. Teams

Purpose:
- manage both your team and opponent teams by season

Suggested split:
- base program records
- season team records

List view columns:
- team name
- season
- team type: ours / opponent
- number of active players
- last game date

Create/edit fields:
- team name
- short name
- season
- team type
- scouting summary
- keys to winning
- actions to watch
- general scouting notes

Recommended behavior:
- base program records carry identity only
- season team records carry year-specific scouting and prep context
- opponent scouting should reset each season unless intentionally re-entered

## 4. Players

Purpose:
- manage player identities plus season-specific roster membership

List filters:
- season
- team
- team type
- active / inactive
- position

List columns:
- player name
- jersey number
- position
- height
- team
- active status

Create/edit fields:
- first name
- last name
- persistent player identity
- dominant hand optional
- active status by roster entry, not by identity
- season team assignment

Season roster / scouting fields:
- scouting notes
- tendencies
- strengths
- weaknesses
- matchup notes
- shooting notes optional
- effort / motor notes optional

Recommended UX:
- one persistent player identity page
- one season roster panel showing the player's year-specific team data
- this is what allows Pikesville players to exist in multiple seasons cleanly

## 5. Play Libraries

Purpose:
- provide the selectable plays/actions used during games

Recommended structure:
- your offensive plays
- your defensive coverages
- opponent offensive actions
- opponent defensive coverages

List filters:
- season
- team
- side: offense / defense
- owner: ours / opponent

Create/edit fields:
- play name
- play family
- side: offense / defense
- team
- active toggle
- notes
- optional tags

Useful optional tags:
- zone
- man
- press
- baseline out of bounds
- sideline out of bounds
- half court
- transition

Recommended behavior:
- play entries should be season-specific
- that prevents opponent scouting from carrying over from year to year by accident

## 6. Games

Purpose:
- create and manage scheduled, live, and finalized games

List view columns:
- date
- opponent
- season
- status
- score
- prep status

Create/edit fields:
- season
- date and time
- home team
- away team
- location optional
- status

Useful actions:
- open live game
- open game prep
- finalize game
- duplicate setup from previous opponent

## 7. Game Prep

Purpose:
- create the game-specific prep layer that feeds both the scorer and the future observation view

This sits on top of the opponent team and player records.

Sections:

### Team overview

- opponent summary
- keys to winning
- actions to watch
- defensive tendencies
- offensive tendencies

### Opponent roster focus

For each opponent player:
- jersey
- position
- tendencies
- strengths
- weaknesses
- matchup notes
- shooting notes

### Game-specific overrides

Fields:
- keys to winning override
- actions to watch override
- matchup emphasis
- bench reminders
- special situations

### Game play context

Pregame selection:
- likely opponent offensive actions
- likely opponent defensive coverages
- our planned offensive packages
- our planned defensive coverages

Recommended output:
- the scorer tab can pull these into the in-game play selectors
- the observation tab can show them as reference cards

## 8. Optional imports later

Not required for MVP, but worth planning for:
- bulk roster import
- bulk play import
- duplicate prior season team
- duplicate prior opponent scouting shell

## Recommended navigation

### Top-level nav

- Dashboard
- Seasons
- Teams
- Players
- Plays
- Games

### Contextual nav inside a game

- Prep
- Live Stats
- Observations
- Postgame

## Roles and permissions

Recommended MVP roles:

### Admin

- full access to setup and live features

### Coach

- can view all setup data
- can edit scouting, game prep, and observations
- can enter live stats if permitted

### Scorer

- can open live games
- can enter official stats
- cannot change core setup data

### Viewer

- read-only access to selected live and report views

## Recommended build order for setup/admin

### MVP order

1. Seasons
2. Teams
3. Players
4. Play Libraries
5. Games
6. Game Prep

### Why this order

- seasons anchor everything
- teams and players give us roster data
- play libraries power the live game selectors
- games create the live game object
- game prep adds the scouting layer used before and during games

## Suggested screen map

### Dashboard
- overview cards
- upcoming games
- recent games
- quick actions

### Seasons
- season list
- create/edit drawer or modal

### Teams
- list page
- team detail page
- team scouting tab

### Players
- list page
- player detail page
- player scouting tab

### Plays
- list page
- filters by team and side
- create/edit modal

### Games
- list page
- create game modal
- game detail page

### Game Prep
- team summary panel
- player tendencies table
- keys to winning panel
- actions to watch panel
- reminders panel

## MVP decisions to keep things moving

- treat programs as persistent identities
- treat team seasons as the year-specific version of a program
- treat players as persistent identities
- treat roster memberships as the year-specific player record
- keep play libraries season-specific
- keep one game prep record per game
- allow later expansion for richer scouting templates
