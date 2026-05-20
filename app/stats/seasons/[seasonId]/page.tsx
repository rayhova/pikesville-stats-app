import Link from "next/link";
import { notFound } from "next/navigation";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { ShotChartDisplay } from "@/components/shot-chart-display";
import { StatsModeToggle } from "@/components/stats-mode-toggle";
import { StatsOverlayTabNav } from "@/components/stats-overlay-tab-nav";
import { StatsQuarterFilterControls } from "@/components/stats-quarter-filter-controls";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import {
  getLiveScorerSnapshot,
  listGameEventFeed,
  listGameRows,
  listPlayerRosterRows,
  listSeasons,
} from "@/lib/admin-repository";
import {
  buildGameStatsReport,
  buildReportHref,
  buildSeasonStatsReport,
  calculateEffectiveFieldGoalPercentage,
  calculateFreeThrowRate,
  calculateGameEfficiency,
  calculatePointsPerShot,
  calculateTrueShootingPercentage,
  formatDecimal,
  formatMinutes,
  formatPct,
  formatQuarterLabel,
  formatQuarterSummary,
  formatRatio,
  getAvailableQuarters,
  parseQuarterFilter,
  parseStatMode,
  parseStatsTab,
  type LineupAnalyticsRow,
  type LineupGroupSize,
  type StatMode,
  type StatsTab,
} from "@/lib/reporting";

function formatSeasonValue(value: number, gameCount: number, statMode: StatMode, digits = 1) {
  if (statMode === "per-game") {
    return formatDecimal(gameCount > 0 ? value / gameCount : 0, digits);
  }

  return String(value);
}

function formatSeasonMinutes(seconds: number, gameCount: number, statMode: StatMode) {
  return statMode === "per-game"
    ? formatMinutes(gameCount > 0 ? seconds / gameCount : 0)
    : formatMinutes(seconds);
}

function formatSeasonPctLine(
  makes: number,
  attempts: number,
  gameCount: number,
  statMode: StatMode,
) {
  if (statMode === "per-game") {
    return `${formatSeasonValue(makes, gameCount, statMode)}/${formatSeasonValue(attempts, gameCount, statMode)} (${makes === 0 && attempts === 0 ? "-" : ((makes / Math.max(attempts, 1)) * 100).toFixed(1)}%)`;
  }

  return formatPct(makes, attempts);
}

function renderLineupTable(rows: LineupAnalyticsRow[], emptyLabel: string) {
  return (
    <table>
      <thead>
        <tr>
          <th>Lineup</th>
          <th>MIN</th>
          <th>Stints</th>
          <th>+/-</th>
          <th>PF</th>
          <th>PA</th>
          <th>Margin/Event</th>
          <th>Score Events</th>
          <th>Logged Events</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.slice(0, 20).map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{formatMinutes(row.secondsPlayed)}</td>
              <td>{row.stintCount}</td>
              <td>{row.plusMinus > 0 ? `+${row.plusMinus}` : row.plusMinus}</td>
              <td>{row.pointsFor}</td>
              <td>{row.pointsAgainst}</td>
              <td>{formatRatio(row.plusMinus, row.totalEvents)}</td>
              <td>{row.scoringEvents}</td>
              <td>{row.totalEvents}</td>
            </tr>
          ))
        ) : (
          <tr><td colSpan={9}>{emptyLabel}</td></tr>
        )}
      </tbody>
    </table>
  );
}

export default async function SeasonStatsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ seasonId: string }>;
  searchParams: Promise<{ quarter?: string | string[]; tab?: string | string[]; mode?: string | string[] }>;
}>) {
  await requireAccessRole(["admin", "coach", "player"]);
  const session = await getAccessSession();
  const { seasonId } = await params;
  const query = await searchParams;
  const [seasons, allGames, allPlayerRows] = await Promise.all([
    listSeasons(),
    listGameRows(),
    listPlayerRosterRows(),
  ]);
  const season = seasons.find((item) => item.id === seasonId);

  if (!season) {
    notFound();
  }

  const seasonGames = allGames.filter((game) => game.seasonId === seasonId);
  const availableQuarterSet = new Set<number>([1, 2, 3, 4]);
  const requestedQuarters = parseQuarterFilter(query.quarter);
  const activeTab = parseStatsTab(query.tab);
  const statMode = parseStatMode(query.mode);
  const gameReports = [];

  for (const game of seasonGames) {
    const [snapshot, eventFeed] = await Promise.all([
      getLiveScorerSnapshot(game.id),
      listGameEventFeed(game.id),
    ]);

    if (!snapshot) {
      continue;
    }

    for (const quarter of getAvailableQuarters(snapshot, eventFeed)) {
      availableQuarterSet.add(quarter);
    }
  }

  const availableQuarters = [...availableQuarterSet].sort((left, right) => left - right);
  const activeQuarters =
    requestedQuarters.length > 0
      ? availableQuarters.filter((quarter) => requestedQuarters.includes(quarter))
      : availableQuarters;

  for (const game of seasonGames.filter((item) => item.status !== "scheduled")) {
    const [snapshot, eventFeed] = await Promise.all([
      getLiveScorerSnapshot(game.id),
      listGameEventFeed(game.id),
    ]);

    if (!snapshot) {
      continue;
    }

    gameReports.push({
      gameId: game.id,
      report: buildGameStatsReport(snapshot, eventFeed, activeQuarters),
    });
  }

  const report = buildSeasonStatsReport(gameReports);
  const basePath = `/stats/seasons/${seasonId}`;
  const ourRosterMembershipIds = new Set(report.playerRows.map((row) => row.rosterMembershipId));
  const playerIdByRosterMembershipId = new Map(
    allPlayerRows.map((row) => [row.id, row.playerId]),
  );
  const tabs: Array<[StatsTab, string]> = [
    ["player", "Player Stats"],
    ["player-advanced", "Player Efficiency"],
    ["team", "Team Stats"],
    ["team-advanced", "Team Efficiency"],
    ["lineup", "Lineup +/-"],
    ["lineup-groups", "Lineup Groups"],
    ["plays", "Play Efficiency"],
    ["quarter", "Quarter Breakdown"],
    ["shots", "Shot Charts"],
  ];

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Season Stats</p>
          <h2>{season.name}</h2>
          <p>{season.schoolYear} · {report.seasonRecord.wins}-{report.seasonRecord.losses} in {report.seasonGameCount} tracked games</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
        </ResponsivePageActions>
      </header>

      <section className="panel-card quarter-filter-card">
        <div>
          <p className="eyebrow-label">Quarter Filter</p>
          <h3>Show Season Splits By Segment</h3>
          <p className="meta">Everything below is filtered to {formatQuarterSummary(activeQuarters)} across the season.</p>
        </div>
        <StatsQuarterFilterControls
          basePath={basePath}
          activeTab={activeTab}
          availableQuarters={availableQuarters}
          activeQuarters={activeQuarters}
          mode={statMode}
        />
      </section>

      <section className="table-grid overlay-table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>Season Report</h3>
              <p className="meta">Filtered to {formatQuarterSummary(activeQuarters)}.</p>
            </div>
            <div className="page-actions">
              <span className="pill alt">{formatQuarterSummary(activeQuarters)}</span>
              <StatsModeToggle
                options={[
                  {
                    value: "totals",
                    label: "Totals",
                    href: buildReportHref(basePath, { tab: activeTab, quarters: activeQuarters, mode: "totals" }),
                    active: statMode === "totals",
                  },
                  {
                    value: "per-game",
                    label: "Per Game",
                    href: buildReportHref(basePath, { tab: activeTab, quarters: activeQuarters, mode: "per-game" }),
                    active: statMode === "per-game",
                  },
                ]}
              />
            </div>
          </div>
          <StatsOverlayTabNav
            tabs={tabs.map(([value, label]) => ({
              value,
              label,
              href: buildReportHref(basePath, { tab: value, quarters: activeQuarters, mode: statMode }),
              active: activeTab === value,
            }))}
          />

          {activeTab === "player" ? (
            <div className="box-score-stack">
              <div>
                <p className="eyebrow-label">Pikesville</p>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>MIN</th>
                      <th>PTS</th>
                      <th>+/-</th>
                      <th>2CP</th>
                      <th>FG</th>
                      <th>3PT</th>
                      <th>FT</th>
                      <th>OREB</th>
                      <th>DREB</th>
                      <th>REB</th>
                      <th>AST</th>
                      <th>STL</th>
                      <th>BLK</th>
                      <th>TO</th>
                      <th>PF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.playerRows.map((row) => (
                      <tr key={row.rosterMembershipId}>
                        <td>
                          {playerIdByRosterMembershipId.get(row.rosterMembershipId) ? (
                            <Link
                              href={buildReportHref(`/stats/players/${playerIdByRosterMembershipId.get(row.rosterMembershipId)}`, {
                                tab: "player",
                                quarters: activeQuarters,
                                mode: statMode,
                                seasonId,
                              })}
                            >
                              {row.playerName} {row.jersey}
                            </Link>
                          ) : (
                            <>{row.playerName} {row.jersey}</>
                          )}
                        </td>
                        <td>{formatSeasonMinutes(report.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.points, report.seasonGameCount, statMode)}</td>
                        <td>{(() => {
                          const value = report.playerPlusMinus.get(row.rosterMembershipId) ?? 0;
                          const displayValue =
                            statMode === "per-game" && report.seasonGameCount > 0
                              ? Number(value / report.seasonGameCount)
                              : value;
                          return displayValue > 0
                            ? `+${formatDecimal(displayValue, statMode === "per-game" ? 1 : 0)}`
                            : formatDecimal(displayValue, statMode === "per-game" ? 1 : 0);
                        })()}</td>
                        <td>{formatSeasonValue(report.secondChancePoints.get(row.rosterMembershipId) ?? 0, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonPctLine(row.fgm, row.fga, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonPctLine(row.threePm, row.threePa, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonPctLine(row.ftm, row.fta, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.oreb, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.dreb, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.reb, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.ast, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.stl, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.blk, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.turnovers, report.seasonGameCount, statMode)}</td>
                        <td>{formatSeasonValue(row.fouls, report.seasonGameCount, statMode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "player-advanced" ? (
            <div className="box-score-stack">
              <div>
                <p className="eyebrow-label">Pikesville</p>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>MIN</th>
                      <th>+/-</th>
                      <th>EFF</th>
                      <th>eFG%</th>
                      <th>TS%</th>
                      <th>PPS</th>
                      <th>PITP</th>
                      <th>FTr</th>
                      <th>AST/TO</th>
                      <th>Stocks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.playerRows.map((row) => (
                      <tr key={row.rosterMembershipId}>
                        <td>
                          {playerIdByRosterMembershipId.get(row.rosterMembershipId) ? (
                            <Link
                              href={buildReportHref(`/stats/players/${playerIdByRosterMembershipId.get(row.rosterMembershipId)}`, {
                                tab: "player-advanced",
                                quarters: activeQuarters,
                                mode: statMode,
                                seasonId,
                              })}
                            >
                              {row.playerName} {row.jersey}
                            </Link>
                          ) : (
                            <>{row.playerName} {row.jersey}</>
                          )}
                        </td>
                        <td>{formatSeasonMinutes(report.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0, report.seasonGameCount, statMode)}</td>
                        <td>{(() => {
                          const value = report.playerPlusMinus.get(row.rosterMembershipId) ?? 0;
                          const displayValue =
                            statMode === "per-game" && report.seasonGameCount > 0
                              ? Number(value / report.seasonGameCount)
                              : value;
                          return displayValue > 0
                            ? `+${formatDecimal(displayValue, statMode === "per-game" ? 1 : 0)}`
                            : formatDecimal(displayValue, statMode === "per-game" ? 1 : 0);
                        })()}</td>
                        <td>{calculateGameEfficiency(row)}</td>
                        <td>{calculateEffectiveFieldGoalPercentage(row)}</td>
                        <td>{calculateTrueShootingPercentage(row)}</td>
                        <td>{calculatePointsPerShot(row)}</td>
                        <td>{formatSeasonValue(report.paintPoints.get(row.rosterMembershipId) ?? 0, report.seasonGameCount, statMode)}</td>
                        <td>{calculateFreeThrowRate(row)}</td>
                        <td>{formatRatio(row.ast, row.turnovers)}</td>
                        <td>{formatSeasonValue(row.stl + row.blk, report.seasonGameCount, statMode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "team" ? (
            <div className="box-score-stack">
              <div>
                <p className="eyebrow-label">Pikesville</p>
                <table><tbody>
                  <tr><th>PTS</th><td>{formatSeasonValue(report.ourTeamTotals.points, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>2CP</th><td>{formatSeasonValue(report.ourSecondChancePoints, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>FG</th><td>{formatSeasonPctLine(report.ourTeamTotals.fgm, report.ourTeamTotals.fga, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>3PT</th><td>{formatSeasonPctLine(report.ourTeamTotals.threePm, report.ourTeamTotals.threePa, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>FT</th><td>{formatSeasonPctLine(report.ourTeamTotals.ftm, report.ourTeamTotals.fta, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>OREB</th><td>{formatSeasonValue(report.ourTeamTotals.oreb, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>DREB</th><td>{formatSeasonValue(report.ourTeamTotals.dreb, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>REB</th><td>{formatSeasonValue(report.ourTeamTotals.reb, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>AST</th><td>{formatSeasonValue(report.ourTeamTotals.ast, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>STL</th><td>{formatSeasonValue(report.ourTeamTotals.stl, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>BLK</th><td>{formatSeasonValue(report.ourTeamTotals.blk, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>TO</th><td>{formatSeasonValue(report.ourTeamTotals.turnovers, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>PF</th><td>{formatSeasonValue(report.ourTeamTotals.fouls, report.seasonGameCount, statMode)}</td></tr>
                </tbody></table>
              </div>
              <div>
                <p className="eyebrow-label">Opponents</p>
                <table><tbody>
                  <tr><th>PTS</th><td>{formatSeasonValue(report.opponentTeamTotals.points, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>2CP</th><td>{formatSeasonValue(report.opponentSecondChancePoints, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>FG</th><td>{formatSeasonPctLine(report.opponentTeamTotals.fgm, report.opponentTeamTotals.fga, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>3PT</th><td>{formatSeasonPctLine(report.opponentTeamTotals.threePm, report.opponentTeamTotals.threePa, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>FT</th><td>{formatSeasonPctLine(report.opponentTeamTotals.ftm, report.opponentTeamTotals.fta, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>OREB</th><td>{formatSeasonValue(report.opponentTeamTotals.oreb, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>DREB</th><td>{formatSeasonValue(report.opponentTeamTotals.dreb, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>REB</th><td>{formatSeasonValue(report.opponentTeamTotals.reb, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>AST</th><td>{formatSeasonValue(report.opponentTeamTotals.ast, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>STL</th><td>{formatSeasonValue(report.opponentTeamTotals.stl, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>BLK</th><td>{formatSeasonValue(report.opponentTeamTotals.blk, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>TO</th><td>{formatSeasonValue(report.opponentTeamTotals.turnovers, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>PF</th><td>{formatSeasonValue(report.opponentTeamTotals.fouls, report.seasonGameCount, statMode)}</td></tr>
                </tbody></table>
              </div>
            </div>
          ) : null}

          {activeTab === "team-advanced" ? (
            <div className="box-score-stack">
              <div>
                <p className="eyebrow-label">Pikesville</p>
                <table><tbody>
                  <tr><th>eFG%</th><td>{calculateEffectiveFieldGoalPercentage(report.ourTeamTotals)}</td></tr>
                  <tr><th>TS%</th><td>{calculateTrueShootingPercentage(report.ourTeamTotals)}</td></tr>
                  <tr><th>PPS</th><td>{calculatePointsPerShot(report.ourTeamTotals)}</td></tr>
                  <tr><th>PITP</th><td>{formatSeasonValue(report.ourPaintPoints, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>POT</th><td>{formatSeasonValue(report.ourPointsOffTurnovers, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>FTr</th><td>{calculateFreeThrowRate(report.ourTeamTotals)}</td></tr>
                  <tr><th>AST/TO</th><td>{formatRatio(report.ourTeamTotals.ast, report.ourTeamTotals.turnovers)}</td></tr>
                  <tr><th>3PA Rate</th><td>{formatPct(report.ourTeamTotals.threePa, report.ourTeamTotals.fga)}</td></tr>
                  <tr><th>Stocks</th><td>{formatSeasonValue(report.ourTeamTotals.stl + report.ourTeamTotals.blk, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>EFF</th><td>{calculateGameEfficiency(report.ourTeamTotals)}</td></tr>
                </tbody></table>
              </div>
              <div>
                <p className="eyebrow-label">Opponents</p>
                <table><tbody>
                  <tr><th>eFG%</th><td>{calculateEffectiveFieldGoalPercentage(report.opponentTeamTotals)}</td></tr>
                  <tr><th>TS%</th><td>{calculateTrueShootingPercentage(report.opponentTeamTotals)}</td></tr>
                  <tr><th>PPS</th><td>{calculatePointsPerShot(report.opponentTeamTotals)}</td></tr>
                  <tr><th>PITP</th><td>{formatSeasonValue(report.opponentPaintPoints, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>POT</th><td>{formatSeasonValue(report.opponentPointsOffTurnovers, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>FTr</th><td>{calculateFreeThrowRate(report.opponentTeamTotals)}</td></tr>
                  <tr><th>AST/TO</th><td>{formatRatio(report.opponentTeamTotals.ast, report.opponentTeamTotals.turnovers)}</td></tr>
                  <tr><th>3PA Rate</th><td>{formatPct(report.opponentTeamTotals.threePa, report.opponentTeamTotals.fga)}</td></tr>
                  <tr><th>Stocks</th><td>{formatSeasonValue(report.opponentTeamTotals.stl + report.opponentTeamTotals.blk, report.seasonGameCount, statMode)}</td></tr>
                  <tr><th>EFF</th><td>{calculateGameEfficiency(report.opponentTeamTotals)}</td></tr>
                </tbody></table>
              </div>
            </div>
          ) : null}

          {activeTab === "lineup" ? (
            <div>
              <p className="eyebrow-label">Pikesville Lineups</p>
              {renderLineupTable(
                statMode === "per-game"
                  ? report.lineupAnalytics.map((row) => ({
                      ...row,
                      secondsPlayed: report.seasonGameCount > 0 ? row.secondsPlayed / report.seasonGameCount : 0,
                      plusMinus: report.seasonGameCount > 0 ? row.plusMinus / report.seasonGameCount : 0,
                      pointsFor: report.seasonGameCount > 0 ? row.pointsFor / report.seasonGameCount : 0,
                      pointsAgainst: report.seasonGameCount > 0 ? row.pointsAgainst / report.seasonGameCount : 0,
                      scoringEvents: report.seasonGameCount > 0 ? row.scoringEvents / report.seasonGameCount : 0,
                      totalEvents: report.seasonGameCount > 0 ? row.totalEvents / report.seasonGameCount : 0,
                    }))
                  : report.lineupAnalytics,
                "No lineup data yet for the selected quarter filter.",
              )}
            </div>
          ) : null}

          {activeTab === "lineup-groups" ? (
            <div>
              {[2, 3, 4].map((groupSize) => (
                <details key={groupSize} className="lineup-group-section" open={groupSize === 2}>
                  <summary>Pikesville {groupSize}-Player Groups</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>MIN</th>
                        <th>Stints</th>
                        <th>+/-</th>
                        <th>PF</th>
                        <th>PA</th>
                        <th>Score Events</th>
                        <th>Logged Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lineupGroups[groupSize as LineupGroupSize].length > 0 ? (
                        report.lineupGroups[groupSize as LineupGroupSize].map((row) => (
                          <tr key={row.key}>
                            <td>{row.label}</td>
                            <td>{formatSeasonMinutes(row.secondsPlayed, report.seasonGameCount, statMode)}</td>
                            <td>{row.stintCount}</td>
                            <td>{(statMode === "per-game" ? row.plusMinus / Math.max(report.seasonGameCount, 1) : row.plusMinus) > 0 ? `+${formatSeasonValue(row.plusMinus, report.seasonGameCount, statMode)}` : formatSeasonValue(row.plusMinus, report.seasonGameCount, statMode)}</td>
                            <td>{formatSeasonValue(row.pointsFor, report.seasonGameCount, statMode)}</td>
                            <td>{formatSeasonValue(row.pointsAgainst, report.seasonGameCount, statMode)}</td>
                            <td>{formatSeasonValue(row.scoringEvents, report.seasonGameCount, statMode)}</td>
                            <td>{formatSeasonValue(row.totalEvents, report.seasonGameCount, statMode)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={8}>No group data yet for the selected quarter filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </details>
              ))}
            </div>
          ) : null}

          {activeTab === "plays" ? (
            <div className="box-score-stack">
              {([["offense", "Pikesville Offense", report.offensePlayAnalytics], ["defense", "Pikesville Defense", report.defensePlayAnalytics], ["opp-off", "Opponent Offense", report.opponentOffensePlayAnalytics], ["opp-def", "Opponent Defense", report.opponentDefensePlayAnalytics]] as const).map(([key, label, rows]) => (
                <div key={key}>
                  <p className="eyebrow-label">{label}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Play</th>
                        <th>FG</th>
                        <th>3PT</th>
                        <th>FT</th>
                        <th>PITP</th>
                        <th>2CP</th>
                        <th>TO</th>
                        <th>OREB</th>
                        <th>Fouls</th>
                        <th>Poss</th>
                        <th>PPP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="play-cell">
                              <span>{row.name}</span>
                              {row.imageUrl ? <a href={row.imageUrl} target="_blank" rel="noreferrer">View image</a> : null}
                            </div>
                          </td>
                          <td>{formatSeasonPctLine(row.fgm, row.fga, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonPctLine(row.threePm, row.threePa, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonPctLine(row.ftm, row.fta, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonValue(row.paintPoints, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonValue(row.secondChancePoints, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonValue(row.turnovers, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonValue(row.offRebounds, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonValue(row.foulsDrawn, report.seasonGameCount, statMode)}</td>
                          <td>{formatSeasonValue(row.possessions, report.seasonGameCount, statMode)}</td>
                          <td>{row.pointsPerPossession}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "quarter" ? (
            <table>
              <thead>
                <tr>
                  <th>Quarter</th>
                  <th>Pikesville PTS</th>
                  <th>Opp PTS</th>
                  <th>Pikesville REB</th>
                  <th>Opp REB</th>
                  <th>Pikesville TO</th>
                  <th>Opp TO</th>
                  <th>Pikesville PF</th>
                  <th>Opp PF</th>
                  <th>Events</th>
                </tr>
              </thead>
              <tbody>
                {report.quarterBreakdown.map((row) => (
                  <tr key={row.quarter}>
                    <td>{formatQuarterLabel(row.quarter)}</td>
                    <td>{formatSeasonValue(row.ourPoints, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.opponentPoints, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.ourRebounds, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.opponentRebounds, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.ourTurnovers, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.opponentTurnovers, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.ourFouls, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.opponentFouls, report.seasonGameCount, statMode)}</td>
                    <td>{formatSeasonValue(row.events, report.seasonGameCount, statMode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {activeTab === "shots" ? (
            <section className="panel-grid reporting-dual-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Shot Chart</p>
                <h3>Season Shot Map</h3>
                <ShotChartDisplay
                  markers={report.shotMarkers.filter((marker) =>
                    marker.rosterMembershipId ? ourRosterMembershipIds.has(marker.rosterMembershipId) : false,
                  )}
                  large
                />
              </article>
            </section>
          ) : null}
        </article>
      </section>
    </main>
  );
}
