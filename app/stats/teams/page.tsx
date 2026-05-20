import Link from "next/link";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import { listGameRows, listTeamSeasonRows } from "@/lib/admin-repository";

export default async function TeamDirectoryPage() {
  await requireAccessRole(["admin", "coach", "player"]);
  const session = await getAccessSession();
  const [teamRows, games] = await Promise.all([listTeamSeasonRows(), listGameRows()]);

  const cards = teamRows
    .map((team) => {
      const teamGames = games.filter(
        (game) =>
          game.homeTeamSeasonId === team.id || game.awayTeamSeasonId === team.id,
      );

      return {
        ...team,
        gameCount: teamGames.filter((game) => game.status !== "scheduled").length,
        lastGame: [...teamGames]
          .sort((left, right) => right.date.localeCompare(left.date))[0]
          ?.date,
      };
    })
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "ours" ? -1 : 1;
      }
      return (
        right.season.localeCompare(left.season) ||
        left.name.localeCompare(right.name) ||
        left.label.localeCompare(right.label)
      );
    });

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Team Profiles</p>
          <h2>Season Teams</h2>
          <p>Open a team-season home for roster context, stats, shot chart, lineup trends, and play trends.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        {cards.map((team) => (
          <article key={team.id} className="card team-directory-card">
            <div className="team-directory-card-top">
              <div>
                <p className="eyebrow-label">{team.season}</p>
                <h2>
                  {team.name} {team.label}
                </h2>
                <p className="meta">
                  {team.type === "ours" ? "Pikesville Team" : "Opponent Team"}
                  {team.activePlayers ? ` · ${team.activePlayers} active players` : ""}
                </p>
              </div>
              <span className={`pill ${team.type === "ours" ? "" : "alt"}`}>
                {team.type === "ours" ? "Pikesville" : "Opponent"}
              </span>
            </div>
            <p className="meta">
              {team.gameCount} tracked game{team.gameCount === 1 ? "" : "s"}
              {team.lastGame ? ` · Last game ${team.lastGame}` : ""}
            </p>
            {team.type === "opponent" && team.scoutingSummary ? (
              <p className="meta">{team.scoutingSummary}</p>
            ) : null}
            <div className="action-row">
              <Link href={`/stats/teams/${team.id}`} className="button-link">
                Open Team Page
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
