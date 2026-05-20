import Link from "next/link";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import { formatGameRowDate } from "@/lib/date-format";
import { listGameRows, listSeasons } from "@/lib/admin-repository";

export default async function StatsHubPage() {
  await requireAccessRole(["admin", "coach", "player"]);
  const session = await getAccessSession();
  const [seasons, games] = await Promise.all([listSeasons(), listGameRows()]);
  const recentGames = [...games].reverse().slice(0, 8);

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Stats</p>
          <h2>Reporting Hub</h2>
          <p>Jump into season summaries, player homes, and individual game reports built from the live event stream.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        <article className="card">
          <p className="eyebrow-label">Teams</p>
          <h2>Team Profiles</h2>
          <p>Season-specific team homes for roster context, records, shot charts, lineup trends, and play trends.</p>
          <div className="action-row">
            <Link href="/stats/teams" className="button-link">
              Open Teams
            </Link>
          </div>
        </article>
        <article className="card">
          <p className="eyebrow-label">Players</p>
          <h2>Player Profiles</h2>
          <p>Stats, shot charts, evaluations, and development plans all live together on the player home.</p>
          <div className="action-row">
            <Link href="/stats/players" className="button-link">
              Open Players
            </Link>
          </div>
        </article>
        {seasons.map((season) => (
          <article key={season.id} className="card">
            <p className="eyebrow-label">{season.schoolYear}</p>
            <h2>{season.name}</h2>
            <p>Status: {season.status}</p>
            <div className="action-row">
              <Link href={`/stats/seasons/${season.id}`} className="button-link">
                Open Season Stats
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="table-grid">
        <article className="table-card">
          <h3>Recent Games</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Season</th>
                <th>Status</th>
                <th>Score</th>
                <th>Reports</th>
              </tr>
            </thead>
            <tbody>
              {recentGames.map((game) => (
                <tr key={game.id}>
                  <td>{formatGameRowDate(game)}</td>
                  <td>{game.opponent}</td>
                  <td>{game.season}</td>
                  <td>{game.status}</td>
                  <td>{game.score}</td>
                  <td>
                    <div className="action-row">
                      <Link href={`/stats/postgame/${game.id}`} className="button-link ghost">
                        Postgame
                      </Link>
                      <Link href={`/stats/games/${game.id}`} className="button-link ghost">
                        Full Stats
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}
