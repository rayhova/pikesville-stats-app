import Link from "next/link";
import { createGameAction, sendEventReminderAction, updateGameAttendanceModeAction } from "@/app/admin/actions";
import { PersistenceBadge } from "@/components/persistence-badge";
import { formatGameRowDate } from "@/lib/date-format";
import {
  getAdminPersistenceMode,
  listGameRows,
  listSeasons,
  listTeamSeasonRows,
} from "@/lib/admin-repository";

export default async function GamesPage() {
  const [games, seasons, teamSeasonRows] = await Promise.all([
    listGameRows(),
    listSeasons(),
    listTeamSeasonRows(),
  ]);
  const persistenceMode = getAdminPersistenceMode();
  const ourTeamRows = teamSeasonRows.filter((team) => team.type === "ours");
  const opponentTeamRows = teamSeasonRows.filter((team) => team.type === "opponent");

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Games</p>
          <h2>Games</h2>
          <p>
            Games connect the season, teams, prep context, live stats, and postgame
            review. Prep stays one click away from every matchup.
          </p>
        </div>
      </header>

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Game Schedule</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Season</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Attendance</th>
                  <th>Report</th>
                  <th>Edit Report</th>
                  <th>Game Plan</th>
                  <th>Timeout</th>
                  <th>Notify</th>
                  <th>Observe</th>
                  <th>Live</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td>{formatGameRowDate(game)}</td>
                    <td>{game.opponent}</td>
                    <td>{game.season}</td>
                    <td>{game.status}</td>
                    <td>{game.score}</td>
                    <td>
                      <form action={updateGameAttendanceModeAction} className="inline-form">
                        <input type="hidden" name="gameId" value={game.id} />
                        <select name="attendanceMode" defaultValue={game.attendanceMode}>
                          <option value="mandatory">Mandatory</option>
                          <option value="voluntary">Voluntary</option>
                        </select>
                        <input
                          name="capacity"
                          type="number"
                          min="1"
                          defaultValue={game.capacity ?? ""}
                          placeholder="Capacity"
                        />
                        <button className="button-link ghost" type="submit">
                          Save
                        </button>
                      </form>
                    </td>
                    <td>
                      <Link href={`/scouting/${game.id}`} className="button-link ghost">
                        Open Scouting Report
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/games/${game.id}/prep/scouting`} className="button-link ghost">
                        Edit Report
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/games/${game.id}/prep/game-plan`} className="button-link ghost">
                        Game Plan
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/games/${game.id}/prep/timeout`} className="button-link ghost">
                        Timeout
                      </Link>
                    </td>
                    <td>
                      <div className="management-actions">
                        <form action={sendEventReminderAction}>
                          <input type="hidden" name="eventKind" value="game" />
                          <input type="hidden" name="eventId" value={game.id} />
                          <input type="hidden" name="reminderType" value="attendance" />
                          <button className="button-link ghost" type="submit">
                            RSVP
                          </button>
                        </form>
                        <form action={sendEventReminderAction}>
                          <input type="hidden" name="eventKind" value="game" />
                          <input type="hidden" name="eventId" value={game.id} />
                          <input type="hidden" name="reminderType" value="event" />
                          <button className="button-link ghost" type="submit">
                            Game
                          </button>
                        </form>
                      </div>
                    </td>
                    <td>
                      <Link href={`/observations/${game.id}`} className="button-link ghost">
                        Open Notes
                      </Link>
                    </td>
                    <td>
                      <Link href={`/games/${game.id}`} className="button-link ghost">
                        Open Scorer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="panel-card admin-create-grid">
            <p className="eyebrow-label">Create Game</p>
            <h3>New Matchup</h3>
            <form action={createGameAction} className="form-grid">
              <div className="field-group">
                <label htmlFor="game-season">Season</label>
                <select id="game-season" name="seasonId" defaultValue={seasons[0]?.id}>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.schoolYear}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="game-status">Status</label>
                <select id="game-status" name="status" defaultValue="scheduled">
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="final">Final</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="home-team-season">Home Team</label>
                <select
                  id="home-team-season"
                  name="homeTeamSeasonId"
                  defaultValue={ourTeamRows[0]?.id}
                >
                  {ourTeamRows.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.season} · {team.name} · {team.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="away-team-season">Away Team</label>
                <select
                  id="away-team-season"
                  name="awayTeamSeasonId"
                  defaultValue={opponentTeamRows[0]?.id}
                >
                  {opponentTeamRows.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.season} · {team.name} · {team.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="starts-at">Date And Time</label>
                <input id="starts-at" name="startsAt" type="datetime-local" />
              </div>
              <div className="field-group">
                <label htmlFor="location">Location</label>
                <input id="location" name="location" placeholder="Home, Away, or gym name" />
              </div>
              <div className="field-group">
                <label htmlFor="game-attendance-mode">Attendance</label>
                <select id="game-attendance-mode" name="attendanceMode" defaultValue="mandatory">
                  <option value="mandatory">Mandatory</option>
                  <option value="voluntary">Voluntary</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="game-capacity">Capacity</label>
                <input id="game-capacity" name="capacity" type="number" min="1" placeholder="Optional" />
              </div>
              <div className="action-row field-span-2">
                <button className="button-link" type="submit">
                  Save Game
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </>
  );
}
