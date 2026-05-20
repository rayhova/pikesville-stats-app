import Link from "next/link";
import { PersistenceBadge } from "@/components/persistence-badge";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { formatGameRowDate } from "@/lib/date-format";
import {
  getAdminPersistenceMode,
  listDrillLibraryRows,
  listEventAttendanceRows,
  listGameRows,
  listCoachProfileRows,
  listManagerProfileRows,
  listPracticePlanRows,
  listPlayLibraryRows,
  listPlayerRosterRows,
  listSeasonSummaries,
  listTeamSeasonRows,
} from "@/lib/admin-repository";
import { summarizeEventAttendance } from "@/lib/event-attendance";

function toTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export default async function AdminDashboardPage() {
  const [seasonSummaries, teamSeasonRows, playerRows, coachRows, managerRows, games, playRows, drillRows, practiceRows, attendanceRows] = await Promise.all([
    listSeasonSummaries(),
    listTeamSeasonRows(),
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
    listGameRows(),
    listPlayLibraryRows(),
    listDrillLibraryRows(),
    listPracticePlanRows(),
    listEventAttendanceRows(),
  ]);
  const activeSeason = seasonSummaries.find((season) => season.status === "active");
  const liveGame = games.find((game) => game.status === "live");
  const now = Date.now();
  const futureGames = games
    .map((game) => ({ ...game, startsAtMs: toTimestamp(game.startsAt ?? game.date) }))
    .filter((game) => game.startsAtMs !== null && game.startsAtMs >= now)
    .sort((left, right) => (left.startsAtMs ?? 0) - (right.startsAtMs ?? 0));
  const completedGames = games
    .map((game) => ({ ...game, startsAtMs: toTimestamp(game.startsAt ?? game.date) }))
    .filter((game) => game.startsAtMs !== null && game.startsAtMs < now)
    .sort((left, right) => (right.startsAtMs ?? 0) - (left.startsAtMs ?? 0));
  const nextGame = futureGames[0] ?? null;
  const lastGame = completedGames[0] ?? null;
  const nextGameAttendanceSummary = nextGame
    ? summarizeEventAttendance(attendanceRows, "game", nextGame.id)
    : null;
  const persistenceMode = getAdminPersistenceMode();

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Setup / Admin</p>
          <h2>Control Center</h2>
          <p>
            This is the pregame hub for season setup, roster management, play
            libraries, scouting prep, and live game entry points.
          </p>
        </div>

        <ResponsivePageActions showHome={false} menuLabel="Menu">
          <Link href="/admin/games" className="button-link">
            Create Game
          </Link>
          {liveGame ? (
            <Link href={`/games/${liveGame.id}`} className="button-link secondary">
              Open Scorer
            </Link>
          ) : null}
        </ResponsivePageActions>
      </header>

      <section className="stat-grid">
        <article className="stat-card">
          <h3>Active Season</h3>
          <span className="stat-value">{activeSeason?.schoolYear}</span>
          <p>{activeSeason?.name}</p>
        </article>
        <article className="stat-card">
          <h3>Team Seasons</h3>
          <span className="stat-value">{teamSeasonRows.length}</span>
          <p>
            {teamSeasonRows.filter((team) => team.type === "opponent").length} opponent season records ready
          </p>
        </article>
        <article className="stat-card">
          <h3>Roster Entries</h3>
          <span className="stat-value">{playerRows.length}</span>
          <p>Player identity can persist while season roster data changes</p>
        </article>
        <article className="stat-card">
          <h3>Coaches</h3>
          <span className="stat-value">{coachRows.length}</span>
          <p>Profiles ready for targeted coach assignments</p>
        </article>
        <article className="stat-card">
          <h3>Managers</h3>
          <span className="stat-value">{managerRows.length}</span>
          <p>Profiles ready for calendar and task access</p>
        </article>
        <article className="stat-card">
          <h3>Play Entries</h3>
          <span className="stat-value">{playRows.length}</span>
          <p>Season-specific live context libraries</p>
        </article>
        <article className="stat-card">
          <h3>Drill Entries</h3>
          <span className="stat-value">{drillRows.length}</span>
          <p>Coach-facing drill bank for practice planning</p>
        </article>
        <article className="stat-card">
          <h3>Practice Plans</h3>
          <span className="stat-value">{practiceRows.length}</span>
          <p>Schedules, circuits, and post-practice logs in one place</p>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Last Game</p>
          <h3>{lastGame?.opponent ?? "No completed games yet"}</h3>
          <p>
            {lastGame ? `${formatGameRowDate(lastGame)} · ${lastGame.location}` : "Your most recent matchup will show here."}
          </p>
          {lastGame ? (
            <div className="pill-row">
              <span className="pill alt">{lastGame.status}</span>
              <span className="pill">{lastGame.score}</span>
            </div>
          ) : null}
          {lastGame ? (
            <div className="action-row">
              <Link href={`/stats/postgame/${lastGame.id}`} className="button-link">
                Postgame
              </Link>
              <Link href={`/stats/games/${lastGame.id}`} className="button-link ghost">
                Game Stats
              </Link>
            </div>
          ) : null}
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Next Scheduled Game</p>
          <h3>{nextGame?.opponent ?? "No scheduled games"}</h3>
          <p>
            {nextGame ? `${formatGameRowDate(nextGame)} · ${nextGame.location}` : "Create a game to start prep."}
          </p>
          {nextGame ? (
            <>
              <div className="pill-row">
                <span className="pill alt">Prep {nextGame.prepStatus}</span>
                <span className="pill">{nextGame.season}</span>
                {nextGameAttendanceSummary && nextGameAttendanceSummary.coming.manager === 0 ? (
                  <span className="pill danger">No managers marked coming</span>
                ) : null}
              </div>
              <div className="action-row">
                <Link href={`/admin/games/${nextGame.id}/prep/scouting`} className="button-link">
                  Edit Report
                </Link>
                <Link href={`/admin/games/${nextGame.id}/prep/game-plan`} className="button-link ghost">
                  Game Plan
                </Link>
                <Link href={`/admin/games/${nextGame.id}/prep/timeout`} className="button-link ghost">
                  Timeout
                </Link>
                <Link href={`/stats/games/${nextGame.id}`} className="button-link ghost">
                  Open Stats
                </Link>
                <Link href={`/scouting/${nextGame.id}`} className="button-link ghost">
                  Open Scouting Report
                </Link>
                <Link href={`/observations/${nextGame.id}`} className="button-link ghost">
                  Open Notes
                </Link>
              </div>
            </>
          ) : null}
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Live Entry Point</p>
          <h3>{liveGame ? `${liveGame.opponent} is live` : "No live game"}</h3>
          <p>
            Keep official stats in the scorer tab and coaching notes in the
            observation tab so two coaches can work in parallel.
          </p>
          <div className="pill-row">
            <span className="pill alt">Stats Tab</span>
            <span className="pill">Observations Tab</span>
          </div>
          {liveGame ? (
            <div className="action-row">
              <Link href={`/games/${liveGame.id}`} className="button-link">
                Enter Live Scorer
              </Link>
              <Link href={`/observations/${liveGame.id}`} className="button-link ghost">
                Open Observations
              </Link>
            </div>
          ) : null}
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Quick Actions</p>
          <div className="pill-row">
            <Link href="/admin/seasons" className="button-link ghost">
              Seasons
            </Link>
            <Link href="/stats" className="button-link ghost">
              Stats
            </Link>
            <Link href="/admin/teams" className="button-link ghost">
              Teams
            </Link>
            <Link href="/admin/players" className="button-link ghost">
              Players
            </Link>
            <Link href="/admin/coaches" className="button-link ghost">
              Coaches
            </Link>
            <Link href="/admin/managers" className="button-link ghost">
              Managers
            </Link>
            <Link href="/admin/plays" className="button-link ghost">
              Plays
            </Link>
            <Link href="/admin/drills" className="button-link ghost">
              Drills
            </Link>
            <Link href="/admin/practices" className="button-link ghost">
              Practices
            </Link>
            <Link href="/admin/assignments" className="button-link ghost">
              Assignments
            </Link>
            <Link href="/admin/access" className="button-link ghost">
              Access
            </Link>
            <Link href="/drills" className="button-link ghost">
              Drill Library
            </Link>
            <Link href="/practices" className="button-link ghost">
              Coach Practice View
            </Link>
          </div>
        </article>
      </section>
    </>
  );
}
