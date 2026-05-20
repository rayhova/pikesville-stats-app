import Link from "next/link";
import { AccessSessionForm } from "@/components/access-session-form";
import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { APP_ROLE_OPTIONS } from "@/lib/access-config";
import {
  canUseObservations,
  canUseScorer,
  canViewStrategicPrep,
  requireAccessRole,
} from "@/lib/access-control";
import { listCoachProfileRows, listGameRows, listPlayerRosterRows } from "@/lib/admin-repository";
import { formatGameRowDate, formatGameRowTime } from "@/lib/date-format";

export default async function ScoutingIndexPage() {
  const session = await requireAccessRole(["admin", "coach", "player"]);
  const [games, playerRows, coachRows] = await Promise.all([
    listGameRows(),
    listPlayerRosterRows(),
    listCoachProfileRows(),
  ]);
  const playerOptions = playerRows
    .filter((player) => player.teamType === "ours")
    .map((player) => ({
      id: player.id,
      label: `${player.team} · ${player.season} · ${player.name} ${player.jersey}`,
    }));
  const coachOptions = coachRows.map((coach) => ({
    id: coach.id,
    label: `${coach.displayName} · ${coach.fullName}`,
  }));
  const hasLinkedSupabaseSession = session.authSource === "supabase" && Boolean(session.role);
  const showObservationColumn = session.role !== "player";
  const showLiveColumn = session.role !== "player";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentGames = games.filter((game) => {
    const startsAt = game.startsAt ? new Date(game.startsAt) : new Date(game.date);
    return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() >= today.getTime();
  }).sort((left, right) => {
    const leftTime = new Date(left.startsAt ?? left.date).getTime();
    const rightTime = new Date(right.startsAt ?? right.date).getTime();
    return leftTime - rightTime;
  });
  const olderGames = games.filter((game) => {
    const startsAt = game.startsAt ? new Date(game.startsAt) : new Date(game.date);
    return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() < today.getTime();
  }).sort((left, right) => {
    const leftTime = new Date(left.startsAt ?? left.date).getTime();
    const rightTime = new Date(right.startsAt ?? right.date).getTime();
    return rightTime - leftTime;
  });

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Scouting</p>
          <h2>Shared Reports</h2>
          <p>
            Coaches, managers, and players can review the opponent report here. Strategic game-plan
            cards stay restricted to admin and coaches.
          </p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} playerProfileHref={session.role === "player" ? "/profile" : null} />
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        {hasLinkedSupabaseSession ? (
          <article className="card signed-in-card">
            <h2>Signed In</h2>
            <p>
              Current access:{" "}
              <strong>{APP_ROLE_OPTIONS.find((option) => option.value === session.role)?.label}</strong>
            </p>
            <p className="meta">Signed in with your linked account.</p>
            <div className="action-row">
              <AuthSignOutButton />
            </div>
          </article>
        ) : (
          <AccessSessionForm
            currentRole={session.role}
            currentPlayerRosterMembershipId={session.playerRosterMembershipId}
            currentCoachProfileId={session.coachProfileId}
            currentManagerProfileId={session.managerProfileId}
            playerOptions={playerOptions}
            coachOptions={coachOptions}
            managerOptions={[]}
          />
        )}

        <article className="card">
          <h2>Role View</h2>
          <p>
            Current access:{" "}
            <strong>{APP_ROLE_OPTIONS.find((option) => option.value === session.role)?.label}</strong>
          </p>
          <ul>
            <li>All roles can view opponent overview, game emphasis, and player cards.</li>
            <li>Only Admin and Coach can view the game plan card and timeout checklist.</li>
            <li>Only Admin and Coach can open the live scorer.</li>
          </ul>
        </article>
      </section>

      <section className="table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>Current Games</h3>
              <p className="meta">Upcoming or same-day scouting flow.</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Opponent</th>
                <th>Season</th>
                <th>Status</th>
                <th>Scouting Report</th>
                <th>Stats</th>
                {showObservationColumn ? <th>Observe</th> : null}
                {showLiveColumn ? <th>Live</th> : null}
              </tr>
            </thead>
            <tbody>
              {currentGames.map((game) => (
                <tr key={game.id}>
                  <td>{formatGameRowDate(game)}</td>
                  <td>{formatGameRowTime(game)}</td>
                  <td>{game.opponent}</td>
                  <td>{game.season}</td>
                  <td>{game.status}</td>
                  <td>
                    <Link href={`/scouting/${game.id}`} className="button-link ghost">
                      Open Scouting Report
                    </Link>
                  </td>
                  <td>
                    <Link href={`/stats/games/${game.id}`} className="button-link ghost">
                      Open Stats
                    </Link>
                  </td>
                  {showObservationColumn ? (
                    <td>
                      {canUseObservations(session.role) ? (
                        <Link href={`/observations/${game.id}`} className="button-link ghost">
                          Open Notes
                        </Link>
                      ) : (
                        <span className="meta">No note access</span>
                      )}
                    </td>
                  ) : null}
                  {showLiveColumn ? (
                    <td>
                      {canUseScorer(session.role) ? (
                        <Link href={`/games/${game.id}`} className="button-link ghost">
                          Open Scorer
                        </Link>
                      ) : canViewStrategicPrep(session.role) ? (
                        <Link href={`/games/${game.id}`} className="button-link ghost">
                          View Live
                        </Link>
                      ) : (
                        <span className="meta">No live access</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {currentGames.length === 0 ? (
                <tr>
                  <td colSpan={showObservationColumn && showLiveColumn ? 9 : 7}>No current games.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>Older Games</h3>
              <p className="meta">Past scouting reports and game links.</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Opponent</th>
                <th>Season</th>
                <th>Status</th>
                <th>Scouting Report</th>
                <th>Stats</th>
                {showObservationColumn ? <th>Observe</th> : null}
                {showLiveColumn ? <th>Live</th> : null}
              </tr>
            </thead>
            <tbody>
              {olderGames.map((game) => (
                <tr key={game.id}>
                  <td>{formatGameRowDate(game)}</td>
                  <td>{formatGameRowTime(game)}</td>
                  <td>{game.opponent}</td>
                  <td>{game.season}</td>
                  <td>{game.status}</td>
                  <td>
                    <Link href={`/scouting/${game.id}`} className="button-link ghost">
                      Open Scouting Report
                    </Link>
                  </td>
                  <td>
                    <Link href={`/stats/games/${game.id}`} className="button-link ghost">
                      Open Stats
                    </Link>
                  </td>
                  {showObservationColumn ? (
                    <td>
                      {canUseObservations(session.role) ? (
                        <Link href={`/observations/${game.id}`} className="button-link ghost">
                          Open Notes
                        </Link>
                      ) : (
                        <span className="meta">No note access</span>
                      )}
                    </td>
                  ) : null}
                  {showLiveColumn ? (
                    <td>
                      {canUseScorer(session.role) ? (
                        <Link href={`/games/${game.id}`} className="button-link ghost">
                          Open Scorer
                        </Link>
                      ) : canViewStrategicPrep(session.role) ? (
                        <Link href={`/games/${game.id}`} className="button-link ghost">
                          View Live
                        </Link>
                      ) : (
                        <span className="meta">No live access</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {olderGames.length === 0 ? (
                <tr>
                  <td colSpan={showObservationColumn && showLiveColumn ? 9 : 7}>No older games.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}
