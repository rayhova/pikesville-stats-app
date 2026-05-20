import Link from "next/link";
import { notFound } from "next/navigation";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { ShotChartDisplay } from "@/components/shot-chart-display";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import { getLiveScorerSnapshot, listGameEventFeed } from "@/lib/admin-repository";
import {
  buildGameStatsReport,
  calculateEffectiveFieldGoalPercentage,
  calculateTrueShootingPercentage,
  formatMinutes,
  formatPct,
  getAvailableQuarters,
} from "@/lib/reporting";

function topLabel(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function averageLabel(total: number, possessions: number) {
  if (possessions <= 0) {
    return "-";
  }

  return (total / possessions).toFixed(2);
}

export default async function PostgameSummaryPage({
  params,
}: Readonly<{
  params: Promise<{ gameId: string }>;
}>) {
  await requireAccessRole(["admin", "coach", "player"]);
  const session = await getAccessSession();
  const { gameId } = await params;
  const [snapshot, eventFeed] = await Promise.all([
    getLiveScorerSnapshot(gameId),
    listGameEventFeed(gameId),
  ]);

  if (!snapshot) {
    notFound();
  }

  const report = buildGameStatsReport(
    snapshot,
    eventFeed,
    getAvailableQuarters(snapshot, eventFeed),
  );
  const ourScore = report.ourSide === "home" ? report.homeTeamTotals.points : report.awayTeamTotals.points;
  const opponentScore = report.opponentSide === "home" ? report.homeTeamTotals.points : report.awayTeamTotals.points;
  const resultLabel =
    ourScore > opponentScore ? "Win" : ourScore < opponentScore ? "Loss" : "Tie";
  const ourTotals = report.ourSide === "home" ? report.homeTeamTotals : report.awayTeamTotals;
  const opponentTotals = report.opponentSide === "home" ? report.homeTeamTotals : report.awayTeamTotals;
  const topScorer = [...report.ourRows].sort((left, right) => right.points - left.points)[0];
  const topRebounder = [...report.ourRows].sort((left, right) => right.reb - left.reb)[0];
  const topPlaymaker = [...report.ourRows].sort((left, right) => right.ast - left.ast)[0];
  const bestLineup = report.ourSide === "home" ? report.homeLineupAnalytics[0] : report.awayLineupAnalytics[0];
  const toughestLineup = [...(report.ourSide === "home" ? report.homeLineupAnalytics : report.awayLineupAnalytics)]
    .sort((left, right) => left.plusMinus - right.plusMinus)[0];
  const bestOffensePlay =
    report.ourSide === "home" ? report.homeOffensePlayAnalytics[0] : report.awayOffensePlayAnalytics[0];
  const bestDefensePlay =
    report.ourSide === "home" ? report.homeDefensePlayAnalytics[0] : report.awayDefensePlayAnalytics[0];
  const topOurPlayers = [...report.ourRows]
    .sort((left, right) => right.points - left.points || right.reb - left.reb || right.ast - left.ast)
    .slice(0, 5);
  const topOpponentPlayers = [...report.opponentRows]
    .sort((left, right) => right.points - left.points || right.reb - left.reb || right.ast - left.ast)
    .slice(0, 5);
  const topOffensePlays = [...(report.ourSide === "home" ? report.homeOffensePlayAnalytics : report.awayOffensePlayAnalytics)]
    .filter((row) => row.possessions > 0)
    .slice(0, 3);
  const topDefensePlays = [...(report.ourSide === "home" ? report.homeDefensePlayAnalytics : report.awayDefensePlayAnalytics)]
    .filter((row) => row.possessions > 0)
    .slice(0, 3);

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Postgame Summary</p>
          <h2>{snapshot.title}</h2>
          <p>{snapshot.dateLabel} · {snapshot.location} · {resultLabel}</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks
            session={session}
            extras={[{ href: `/stats/games/${gameId}`, label: "Full Game Report" }]}
          />
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        <article className="card">
          <p className="eyebrow-label">{resultLabel}</p>
          <h2>{ourScore} - {opponentScore}</h2>
          <p>{report.ourName} vs {report.opponentName}</p>
        </article>
        <article className="card">
          <p className="eyebrow-label">Leaders</p>
          <h2>{topScorer?.playerName ?? "N/A"}</h2>
          <p>{topScorer?.points ?? 0} PTS · {topRebounder?.playerName ?? "N/A"} {topRebounder?.reb ?? 0} REB · {topPlaymaker?.playerName ?? "N/A"} {topPlaymaker?.ast ?? 0} AST</p>
        </article>
        <article className="card">
          <p className="eyebrow-label">Impact</p>
          <h2>{bestLineup?.label ?? "No lineup data"}</h2>
          <p>{bestLineup ? `${formatMinutes(bestLineup.secondsPlayed)} MIN · ${topLabel(bestLineup.plusMinus)}` : "No lineup data yet."}</p>
        </article>
      </section>

      <section className="panel-grid reporting-dual-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Quarter Breakdown</p>
          <h3>Flow Of The Game</h3>
          <table>
            <thead>
              <tr>
                <th>Quarter</th>
                <th>{report.ourName}</th>
                <th>{report.opponentName}</th>
                <th>REB</th>
                <th>TO</th>
              </tr>
            </thead>
            <tbody>
              {report.quarterBreakdown.map((row) => (
                <tr key={row.quarter}>
                  <td>{row.quarter <= 4 ? `Q${row.quarter}` : `OT${row.quarter - 4}`}</td>
                  <td>{report.ourSide === "home" ? row.homePoints : row.awayPoints}</td>
                  <td>{report.opponentSide === "home" ? row.homePoints : row.awayPoints}</td>
                  <td>
                    {report.ourSide === "home" ? row.homeRebounds : row.awayRebounds}-
                    {report.opponentSide === "home" ? row.homeRebounds : row.awayRebounds}
                  </td>
                  <td>
                    {report.ourSide === "home" ? row.homeTurnovers : row.awayTurnovers}-
                    {report.opponentSide === "home" ? row.homeTurnovers : row.awayTurnovers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Team Snapshot</p>
          <h3>Efficiency And Possession Markers</h3>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>{report.ourName}</th>
                <th>{report.opponentName}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>FG</td><td>{formatPct(ourTotals.fgm, ourTotals.fga)}</td><td>{formatPct(opponentTotals.fgm, opponentTotals.fga)}</td></tr>
              <tr><td>3PT</td><td>{formatPct(ourTotals.threePm, ourTotals.threePa)}</td><td>{formatPct(opponentTotals.threePm, opponentTotals.threePa)}</td></tr>
              <tr><td>FT</td><td>{formatPct(ourTotals.ftm, ourTotals.fta)}</td><td>{formatPct(opponentTotals.ftm, opponentTotals.fta)}</td></tr>
              <tr><td>eFG%</td><td>{calculateEffectiveFieldGoalPercentage(ourTotals)}</td><td>{calculateEffectiveFieldGoalPercentage(opponentTotals)}</td></tr>
              <tr><td>TS%</td><td>{calculateTrueShootingPercentage(ourTotals)}</td><td>{calculateTrueShootingPercentage(opponentTotals)}</td></tr>
              <tr><td>PITP</td><td>{report.ourSide === "home" ? report.paintPointsSnapshot.teamPoints.home : report.paintPointsSnapshot.teamPoints.away}</td><td>{report.opponentSide === "home" ? report.paintPointsSnapshot.teamPoints.home : report.paintPointsSnapshot.teamPoints.away}</td></tr>
              <tr><td>2CP</td><td>{report.ourSide === "home" ? report.secondChanceSnapshot.teamPoints.home : report.secondChanceSnapshot.teamPoints.away}</td><td>{report.opponentSide === "home" ? report.secondChanceSnapshot.teamPoints.home : report.secondChanceSnapshot.teamPoints.away}</td></tr>
              <tr><td>POT</td><td>{report.ourSide === "home" ? report.pointsOffTurnoversSnapshot.teamPoints.home : report.pointsOffTurnoversSnapshot.teamPoints.away}</td><td>{report.opponentSide === "home" ? report.pointsOffTurnoversSnapshot.teamPoints.home : report.pointsOffTurnoversSnapshot.teamPoints.away}</td></tr>
              <tr><td>REB</td><td>{ourTotals.reb}</td><td>{opponentTotals.reb}</td></tr>
              <tr><td>TO</td><td>{ourTotals.turnovers}</td><td>{opponentTotals.turnovers}</td></tr>
            </tbody>
          </table>
        </article>
      </section>

      <section className="panel-grid reporting-dual-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Difference Makers</p>
          <h3>{report.ourName} Leaders</h3>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>STL</th>
                <th>BLK</th>
                <th>+/-</th>
              </tr>
            </thead>
            <tbody>
              {topOurPlayers.map((row) => (
                <tr key={row.rosterMembershipId}>
                  <td>{row.playerName} {row.jersey}</td>
                  <td>{row.points}</td>
                  <td>{row.reb}</td>
                  <td>{row.ast}</td>
                  <td>{row.stl}</td>
                  <td>{row.blk}</td>
                  <td>{topLabel((report.ourSide === "home" ? report.playerPlusMinus.home : report.playerPlusMinus.away).get(row.rosterMembershipId) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Opponent Pulse</p>
          <h3>{report.opponentName} Leaders</h3>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>STL</th>
                <th>BLK</th>
              </tr>
            </thead>
            <tbody>
              {topOpponentPlayers.map((row) => (
                <tr key={row.rosterMembershipId}>
                  <td>{row.playerName} {row.jersey}</td>
                  <td>{row.points}</td>
                  <td>{row.reb}</td>
                  <td>{row.ast}</td>
                  <td>{row.stl}</td>
                  <td>{row.blk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section className="panel-grid reporting-dual-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Possession Battle</p>
          <h3>Where The Margin Came From</h3>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>{report.ourName}</th>
                <th>{report.opponentName}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>AST</td><td>{ourTotals.ast}</td><td>{opponentTotals.ast}</td></tr>
              <tr><td>STL</td><td>{ourTotals.stl}</td><td>{opponentTotals.stl}</td></tr>
              <tr><td>BLK</td><td>{ourTotals.blk}</td><td>{opponentTotals.blk}</td></tr>
              <tr><td>OREB</td><td>{ourTotals.oreb}</td><td>{opponentTotals.oreb}</td></tr>
              <tr><td>DREB</td><td>{ourTotals.dreb}</td><td>{opponentTotals.dreb}</td></tr>
              <tr><td>AST/TO</td><td>{averageLabel(ourTotals.ast, Math.max(ourTotals.turnovers, 1))}</td><td>{averageLabel(opponentTotals.ast, Math.max(opponentTotals.turnovers, 1))}</td></tr>
              <tr><td>PF</td><td>{ourTotals.fouls}</td><td>{opponentTotals.fouls}</td></tr>
            </tbody>
          </table>
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Lineup Impact</p>
          <h3>Best And Toughest Stretches</h3>
          <div className="box-score-stack">
            <div className="management-card">
              <p className="eyebrow-label">Best Lineup</p>
              <h4>{bestLineup?.label ?? "No lineup data"}</h4>
              <p>{bestLineup ? `${formatMinutes(bestLineup.secondsPlayed)} MIN · ${topLabel(bestLineup.plusMinus)} · ${bestLineup.pointsFor}-${bestLineup.pointsAgainst}` : "No lineup data yet."}</p>
            </div>
            <div className="management-card">
              <p className="eyebrow-label">Toughest Stretch</p>
              <h4>{toughestLineup?.label ?? "No lineup data"}</h4>
              <p>{toughestLineup ? `${formatMinutes(toughestLineup.secondsPlayed)} MIN · ${topLabel(toughestLineup.plusMinus)} · ${toughestLineup.pointsFor}-${toughestLineup.pointsAgainst}` : "No lineup data yet."}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="panel-grid reporting-dual-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Play Impact</p>
          <h3>Best Tagged Actions</h3>
          <div className="box-score-stack">
            <div className="management-card">
              <p className="eyebrow-label">Offense</p>
              <h4>{bestOffensePlay?.name ?? "No offense play data"}</h4>
              <p>{bestOffensePlay ? `${bestOffensePlay.points} PTS · ${bestOffensePlay.possessions} Poss · ${bestOffensePlay.pointsPerPossession} PPP` : "No offense play data yet."}</p>
            </div>
            <div className="management-card">
              <p className="eyebrow-label">Defense</p>
              <h4>{bestDefensePlay?.name ?? "No defense play data"}</h4>
              <p>{bestDefensePlay ? `${bestDefensePlay.turnovers} TO Forced · ${bestDefensePlay.pointsPerPossession} PPP Allowed` : "No defense play data yet."}</p>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Shot Chart</p>
          <h3>Game Shot Map</h3>
          <ShotChartDisplay markers={report.shotMarkers} large />
        </article>
      </section>

      <section className="panel-grid reporting-dual-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Offense Plays</p>
          <h3>Top Tagged Offense</h3>
          <table>
            <thead>
              <tr>
                <th>Play</th>
                <th>PTS</th>
                <th>Poss</th>
                <th>PPP</th>
                <th>TO</th>
                <th>2CP</th>
              </tr>
            </thead>
            <tbody>
              {topOffensePlays.length > 0 ? topOffensePlays.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.points}</td>
                  <td>{row.possessions}</td>
                  <td>{row.pointsPerPossession}</td>
                  <td>{row.turnovers}</td>
                  <td>{row.secondChancePoints}</td>
                </tr>
              )) : <tr><td colSpan={6}>No offense play data yet.</td></tr>}
            </tbody>
          </table>
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Defense Plays</p>
          <h3>Top Tagged Defense</h3>
          <table>
            <thead>
              <tr>
                <th>Coverage</th>
                <th>Poss</th>
                <th>PPP Allowed</th>
                <th>TO Forced</th>
                <th>OREB Allowed</th>
                <th>2CP Allowed</th>
              </tr>
            </thead>
            <tbody>
              {topDefensePlays.length > 0 ? topDefensePlays.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.possessions}</td>
                  <td>{row.pointsPerPossession}</td>
                  <td>{row.turnovers}</td>
                  <td>{row.offRebounds}</td>
                  <td>{row.secondChancePoints}</td>
                </tr>
              )) : <tr><td colSpan={6}>No defense play data yet.</td></tr>}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}
