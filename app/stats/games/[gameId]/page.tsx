import Link from "next/link";
import { notFound } from "next/navigation";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { ShotChartDisplay } from "@/components/shot-chart-display";
import { StatsOverlayTabNav } from "@/components/stats-overlay-tab-nav";
import { StatsQuarterFilterControls } from "@/components/stats-quarter-filter-controls";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import {
  getLiveScorerSnapshot,
  listGameEventFeed,
  listPlayerRosterRows,
} from "@/lib/admin-repository";
import {
  buildGameStatsReport,
  buildReportHref,
  calculateEffectiveFieldGoalPercentage,
  calculateFreeThrowRate,
  calculateGameEfficiency,
  calculatePointsPerShot,
  calculateTrueShootingPercentage,
  formatMinutes,
  formatPct,
  formatPercentage,
  formatQuarterLabel,
  formatQuarterSummary,
  formatRatio,
  parseQuarterFilter,
  parseStatsTab,
  type LineupAnalyticsRow,
  type LineupGroupSize,
  type StatsTab,
} from "@/lib/reporting";

function renderLineupTable(
  rows: LineupAnalyticsRow[],
  currentKey: string,
  emptyLabel: string,
) {
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
          rows.slice(0, 16).map((row) => (
            <tr key={row.key} className={row.key === currentKey ? "current-lineup-row" : ""}>
              <td>
                <div className="lineup-label-cell">
                  <span>{row.label}</span>
                  {row.key === currentKey ? <span className="pill alt">Current</span> : null}
                </div>
              </td>
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

export default async function GameStatsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ quarter?: string | string[]; tab?: string | string[] }>;
}>) {
  await requireAccessRole(["admin", "coach", "player"]);
  const session = await getAccessSession();
  const { gameId } = await params;
  const query = await searchParams;
  const [snapshot, eventFeed, allPlayerRows] = await Promise.all([
    getLiveScorerSnapshot(gameId),
    listGameEventFeed(gameId),
    listPlayerRosterRows(),
  ]);

  if (!snapshot) {
    notFound();
  }

  const availableQuarters = Array.from(
    new Set([1, 2, 3, 4, snapshot.quarter, ...eventFeed.map((event) => event.quarter)]),
  )
    .filter((quarter) => quarter >= 1)
    .sort((left, right) => left - right);
  const requestedQuarters = parseQuarterFilter(query.quarter);
  const activeTab = parseStatsTab(query.tab);
  const activeQuarters =
    requestedQuarters.length > 0
      ? availableQuarters.filter((quarter) => requestedQuarters.includes(quarter))
      : availableQuarters;
  const report = buildGameStatsReport(snapshot, eventFeed, activeQuarters);
  const basePath = `/stats/games/${gameId}`;
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
          <p className="eyebrow-label">Game Stats</p>
          <h2>{snapshot.title}</h2>
          <p>{snapshot.dateLabel} · {snapshot.location} · {snapshot.status}</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks
            session={session}
            liveGameId={gameId}
            extras={[{ href: `/stats/postgame/${gameId}`, label: "Postgame Summary" }]}
          />
        </ResponsivePageActions>
      </header>

      <section className="panel-card quarter-filter-card">
        <div>
          <p className="eyebrow-label">Quarter Filter</p>
          <h3>Show Stats By Segment</h3>
          <p className="meta">Everything below is filtered to {formatQuarterSummary(activeQuarters)}.</p>
        </div>
        <StatsQuarterFilterControls
          basePath={basePath}
          activeTab={activeTab}
          availableQuarters={availableQuarters}
          activeQuarters={activeQuarters}
        />
      </section>

      <section className="table-grid overlay-table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>Game Report</h3>
              <p className="meta">Filtered to {formatQuarterSummary(activeQuarters)}.</p>
            </div>
            <span className="pill alt">{formatQuarterSummary(activeQuarters)}</span>
          </div>
          <StatsOverlayTabNav
            tabs={tabs.map(([value, label]) => ({
              value,
              label,
              href: buildReportHref(basePath, { tab: value, quarters: activeQuarters }),
              active: activeTab === value,
            }))}
          />

          {activeTab === "player" ? (
            <div className="box-score-stack">
              {([["home", report.boxScore.homeTeamName, report.boxScore.homeRows], ["away", report.boxScore.awayTeamName, report.boxScore.awayRows]] as const).map(([side, label, rows]) => (
                <div key={side}>
                  <p className="eyebrow-label">{label}</p>
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
                      {rows.map((row) => (
                        <tr key={row.rosterMembershipId}>
                          <td>
                            {playerIdByRosterMembershipId.get(row.rosterMembershipId) ? (
                              <Link
                                href={buildReportHref(`/stats/players/${playerIdByRosterMembershipId.get(row.rosterMembershipId)}`, {
                                  tab: "player",
                                  quarters: activeQuarters,
                                })}
                              >
                                {row.playerName} {row.jersey}
                              </Link>
                            ) : (
                              <>{row.playerName} {row.jersey}</>
                            )}
                          </td>
                          <td>{formatMinutes(report.minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0)}</td>
                          <td>{row.points}</td>
                          <td>{(() => {
                            const value = (side === "home" ? report.playerPlusMinus.home : report.playerPlusMinus.away).get(row.rosterMembershipId) ?? 0;
                            return value > 0 ? `+${value}` : value;
                          })()}</td>
                          <td>{report.secondChanceSnapshot.playerPoints.get(row.rosterMembershipId) ?? 0}</td>
                          <td>{row.fgm}/{row.fga}</td>
                          <td>{row.threePm}/{row.threePa}</td>
                          <td>{row.ftm}/{row.fta}</td>
                          <td>{row.oreb}</td>
                          <td>{row.dreb}</td>
                          <td>{row.reb}</td>
                          <td>{row.ast}</td>
                          <td>{row.stl}</td>
                          <td>{row.blk}</td>
                          <td>{row.turnovers}</td>
                          <td>{row.fouls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "player-advanced" ? (
            <div className="box-score-stack">
              {([["home", report.boxScore.homeTeamName, report.boxScore.homeRows], ["away", report.boxScore.awayTeamName, report.boxScore.awayRows]] as const).map(([side, label, rows]) => (
                <div key={side}>
                  <p className="eyebrow-label">{label}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>MIN</th>
                        <th>Stints</th>
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
                      {rows.map((row) => (
                        <tr key={row.rosterMembershipId}>
                          <td>
                            {playerIdByRosterMembershipId.get(row.rosterMembershipId) ? (
                              <Link
                                href={buildReportHref(`/stats/players/${playerIdByRosterMembershipId.get(row.rosterMembershipId)}`, {
                                  tab: "player-advanced",
                                  quarters: activeQuarters,
                                })}
                              >
                                {row.playerName} {row.jersey}
                              </Link>
                            ) : (
                              <>{row.playerName} {row.jersey}</>
                            )}
                          </td>
                          <td>{formatMinutes(report.minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0)}</td>
                          <td>{report.minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.stintCount ?? 0}</td>
                          <td>{(() => {
                            const value = (side === "home" ? report.playerPlusMinus.home : report.playerPlusMinus.away).get(row.rosterMembershipId) ?? 0;
                            return value > 0 ? `+${value}` : value;
                          })()}</td>
                          <td>{calculateGameEfficiency(row)}</td>
                          <td>{calculateEffectiveFieldGoalPercentage(row)}</td>
                          <td>{calculateTrueShootingPercentage(row)}</td>
                          <td>{calculatePointsPerShot(row)}</td>
                          <td>{report.paintPointsSnapshot.playerPoints.get(row.rosterMembershipId) ?? 0}</td>
                          <td>{calculateFreeThrowRate(row)}</td>
                          <td>{formatRatio(row.ast, row.turnovers)}</td>
                          <td>{row.stl + row.blk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "team" ? (
            <div className="box-score-stack">
              {([["home", report.boxScore.homeTeamName, report.homeTeamTotals], ["away", report.boxScore.awayTeamName, report.awayTeamTotals]] as const).map(([side, label, totals]) => (
                <div key={side}>
                  <p className="eyebrow-label">{label}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>PTS</th>
                        <th>2CP</th>
                        <th>FG</th>
                        <th>FG%</th>
                        <th>3PT</th>
                        <th>3PT%</th>
                        <th>FT</th>
                        <th>FT%</th>
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
                      <tr>
                        <td>{totals.points}</td>
                        <td>{side === "home" ? report.secondChanceSnapshot.teamPoints.home : report.secondChanceSnapshot.teamPoints.away}</td>
                        <td>{totals.fgm}/{totals.fga}</td>
                        <td>{formatPercentage(totals.fgm, totals.fga)}</td>
                        <td>{totals.threePm}/{totals.threePa}</td>
                        <td>{formatPercentage(totals.threePm, totals.threePa)}</td>
                        <td>{totals.ftm}/{totals.fta}</td>
                        <td>{formatPercentage(totals.ftm, totals.fta)}</td>
                        <td>{totals.oreb}</td>
                        <td>{totals.dreb}</td>
                        <td>{totals.reb}</td>
                        <td>{totals.ast}</td>
                        <td>{totals.stl}</td>
                        <td>{totals.blk}</td>
                        <td>{totals.turnovers}</td>
                        <td>{totals.fouls}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "team-advanced" ? (
            <div className="box-score-stack">
              {([["home", report.boxScore.homeTeamName, report.homeTeamTotals], ["away", report.boxScore.awayTeamName, report.awayTeamTotals]] as const).map(([side, label, totals]) => (
                <div key={side}>
                  <p className="eyebrow-label">{label}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>eFG%</th>
                        <th>TS%</th>
                        <th>PPS</th>
                        <th>PITP</th>
                        <th>POT</th>
                        <th>FTr</th>
                        <th>AST/TO</th>
                        <th>3PA Rate</th>
                        <th>Stocks</th>
                        <th>EFF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{calculateEffectiveFieldGoalPercentage(totals)}</td>
                        <td>{calculateTrueShootingPercentage(totals)}</td>
                        <td>{calculatePointsPerShot(totals)}</td>
                        <td>{side === "home" ? report.paintPointsSnapshot.teamPoints.home : report.paintPointsSnapshot.teamPoints.away}</td>
                        <td>{side === "home" ? report.pointsOffTurnoversSnapshot.teamPoints.home : report.pointsOffTurnoversSnapshot.teamPoints.away}</td>
                        <td>{calculateFreeThrowRate(totals)}</td>
                        <td>{formatRatio(totals.ast, totals.turnovers)}</td>
                        <td>{formatPercentage(totals.threePa, totals.fga)}</td>
                        <td>{totals.stl + totals.blk}</td>
                        <td>{calculateGameEfficiency(totals)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "lineup" ? (
            <div className="box-score-stack">
              <div>
                <p className="eyebrow-label">{snapshot.homeTeam.name}</p>
                {renderLineupTable(report.homeLineupAnalytics, report.currentHomeLineupKey, "No lineup data yet for the selected quarter filter.")}
              </div>
              <div>
                <p className="eyebrow-label">{snapshot.awayTeam.name}</p>
                {renderLineupTable(report.awayLineupAnalytics, report.currentAwayLineupKey, "No lineup data yet for the selected quarter filter.")}
              </div>
            </div>
          ) : null}

          {activeTab === "lineup-groups" ? (
            <div className="box-score-stack">
              {([["home", snapshot.homeTeam.name, report.homeLineupGroups, report.currentHomeGroupKeys], ["away", snapshot.awayTeam.name, report.awayLineupGroups, report.currentAwayGroupKeys]] as const).map(([side, label, groups, currentKeys]) => (
                <div key={side}>
                  {[2, 3, 4].map((groupSize) => (
                    <details key={groupSize} className="lineup-group-section" open={groupSize === 2}>
                      <summary>{label} {groupSize}-Player Groups</summary>
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
                          {groups[groupSize as LineupGroupSize].length > 0 ? (
                            groups[groupSize as LineupGroupSize].map((row) => (
                              <tr key={row.key} className={currentKeys[groupSize as LineupGroupSize].has(row.key) ? "current-lineup-row" : ""}>
                                <td>
                                  <div className="lineup-label-cell">
                                    <span>{row.label}</span>
                                    {currentKeys[groupSize as LineupGroupSize].has(row.key) ? <span className="pill alt">Current</span> : null}
                                  </div>
                                </td>
                                <td>{formatMinutes(row.secondsPlayed)}</td>
                                <td>{row.stintCount}</td>
                                <td>{row.plusMinus > 0 ? `+${row.plusMinus}` : row.plusMinus}</td>
                                <td>{row.pointsFor}</td>
                                <td>{row.pointsAgainst}</td>
                                <td>{row.scoringEvents}</td>
                                <td>{row.totalEvents}</td>
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
              ))}
            </div>
          ) : null}

          {activeTab === "plays" ? (
            <div className="box-score-stack">
              {([["home-off", snapshot.homeTeam.name, report.homeOffensePlayAnalytics, "Play", false], ["home-def", snapshot.homeTeam.name, report.homeDefensePlayAnalytics, "Coverage", true], ["away-off", snapshot.awayTeam.name, report.awayOffensePlayAnalytics, "Play", false], ["away-def", snapshot.awayTeam.name, report.awayDefensePlayAnalytics, "Coverage", true]] as const).map(([key, label, rows, firstCol, defense]) => (
                <div key={key}>
                  <p className="eyebrow-label">{label} {defense ? "Defense" : "Offense"}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>{firstCol}</th>
                        <th>{defense ? "FG Against" : "FG"}</th>
                        <th>{defense ? "3PT Against" : "3PT"}</th>
                        <th>{defense ? "FT Against" : "FT"}</th>
                        <th>{defense ? "PITP Against" : "PITP"}</th>
                        <th>{defense ? "2CP Allowed" : "2CP"}</th>
                        <th>{defense ? "TO Forced" : "TO"}</th>
                        <th>{defense ? "OREB Allowed" : "OREB"}</th>
                        <th>{defense ? "Fouls" : "Fouls Drawn"}</th>
                        <th>Poss</th>
                        <th>{defense ? "PPP Allowed" : "PPP"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="play-cell">
                              <span>{row.name}</span>
                              {row.imageUrl ? (
                                <a href={row.imageUrl} target="_blank" rel="noreferrer">View image</a>
                              ) : null}
                            </div>
                          </td>
                          <td>{row.fgm}/{row.fga} ({formatPercentage(row.fgm, row.fga)})</td>
                          <td>{row.threePm}/{row.threePa}</td>
                          <td>{row.ftm}/{row.fta}</td>
                          <td>{row.paintPoints}</td>
                          <td>{row.secondChancePoints}</td>
                          <td>{row.turnovers}</td>
                          <td>{row.offRebounds}</td>
                          <td>{row.foulsDrawn}</td>
                          <td>{row.possessions}</td>
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
                  <th>{report.boxScore.homeTeamName} PTS</th>
                  <th>{report.boxScore.awayTeamName} PTS</th>
                  <th>{report.boxScore.homeTeamName} REB</th>
                  <th>{report.boxScore.awayTeamName} REB</th>
                  <th>{report.boxScore.homeTeamName} TO</th>
                  <th>{report.boxScore.awayTeamName} TO</th>
                  <th>{report.boxScore.homeTeamName} PF</th>
                  <th>{report.boxScore.awayTeamName} PF</th>
                  <th>Events</th>
                </tr>
              </thead>
              <tbody>
                {report.quarterBreakdown.map((row) => (
                  <tr key={row.quarter}>
                    <td>{formatQuarterLabel(row.quarter)}</td>
                    <td>{row.homePoints}</td>
                    <td>{row.awayPoints}</td>
                    <td>{row.homeRebounds}</td>
                    <td>{row.awayRebounds}</td>
                    <td>{row.homeTurnovers}</td>
                    <td>{row.awayTurnovers}</td>
                    <td>{row.homeFouls}</td>
                    <td>{row.awayFouls}</td>
                    <td>{row.possessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {activeTab === "shots" ? (
            <section className="panel-grid reporting-dual-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Shot Chart</p>
                <h3>All Logged Shots</h3>
                <ShotChartDisplay markers={report.shotMarkers} large />
              </article>
            </section>
          ) : null}
        </article>
      </section>
    </main>
  );
}
