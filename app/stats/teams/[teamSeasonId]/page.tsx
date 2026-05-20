import Link from "next/link";
import { notFound } from "next/navigation";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { ShotChartDisplay } from "@/components/shot-chart-display";
import { StatsModeToggle } from "@/components/stats-mode-toggle";
import { StatsOverlayTabNav } from "@/components/stats-overlay-tab-nav";
import { StatsQuarterFilterControls } from "@/components/stats-quarter-filter-controls";
import { formatCompactDate } from "@/lib/date-format";
import {
  getLiveScorerSnapshot,
  listGameEventFeed,
  listGameRows,
  listPlayerRosterRows,
  listTeamSeasonRows,
  type BoxScoreRow,
} from "@/lib/admin-repository";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import {
  buildGameStatsReport,
  buildReportHref,
  calculateEffectiveFieldGoalPercentage,
  calculateFreeThrowRate,
  calculateTrueShootingPercentage,
  formatMinutes,
  formatPct,
  formatQuarterSummary,
  parseQuarterFilter,
  parseStatMode,
  type GameStatsReport,
  type LineupAnalyticsRow,
  type LineupGroupSize,
  type PlayAnalyticsRow,
  type ShotMarker,
  type TeamTotals,
} from "@/lib/reporting";

type TeamStatsTab =
  | "overview"
  | "roster"
  | "team"
  | "team-advanced"
  | "lineup"
  | "lineup-groups"
  | "plays"
  | "shots"
  | "games";

function parseTeamStatsTab(value: string | string[] | undefined): TeamStatsTab {
  const tabValue = Array.isArray(value) ? value[0] : value;
  return tabValue === "roster" ||
    tabValue === "team" ||
    tabValue === "team-advanced" ||
    tabValue === "lineup" ||
    tabValue === "lineup-groups" ||
    tabValue === "plays" ||
    tabValue === "shots" ||
    tabValue === "games"
    ? tabValue
    : "overview";
}

function createEmptyTotals(): TeamTotals {
  return {
    points: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    oreb: 0,
    dreb: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    turnovers: 0,
    fouls: 0,
  };
}

function addTotals(target: TeamTotals, source: TeamTotals) {
  target.points += source.points;
  target.fgm += source.fgm;
  target.fga += source.fga;
  target.threePm += source.threePm;
  target.threePa += source.threePa;
  target.ftm += source.ftm;
  target.fta += source.fta;
  target.oreb += source.oreb;
  target.dreb += source.dreb;
  target.reb += source.reb;
  target.ast += source.ast;
  target.stl += source.stl;
  target.blk += source.blk;
  target.turnovers += source.turnovers;
  target.fouls += source.fouls;
}

function formatTeamValue(value: number, gameCount: number, statMode: "totals" | "per-game", digits = 1) {
  if (statMode === "per-game") {
    return (gameCount > 0 ? value / gameCount : 0).toFixed(digits);
  }

  return String(value);
}

function formatSignedValue(value: number, gameCount: number, statMode: "totals" | "per-game", digits = 1) {
  const actual = statMode === "per-game" ? (gameCount > 0 ? value / gameCount : 0) : value;
  return actual > 0 ? `+${actual.toFixed(statMode === "per-game" ? digits : 0)}` : actual.toFixed(statMode === "per-game" ? digits : 0);
}

function formatPctLine(makes: number, attempts: number, gameCount: number, statMode: "totals" | "per-game") {
  if (statMode === "per-game") {
    const perGameMakes = gameCount > 0 ? makes / gameCount : 0;
    const perGameAttempts = gameCount > 0 ? attempts / gameCount : 0;
    const pct = makes === 0 && attempts === 0 ? "-" : ((makes / Math.max(attempts, 1)) * 100).toFixed(1);
    return `${perGameMakes.toFixed(1)}/${perGameAttempts.toFixed(1)} (${pct}%)`;
  }

  return formatPct(makes, attempts);
}

function mergeLineupRows(target: Map<string, LineupAnalyticsRow>, rows: LineupAnalyticsRow[]) {
  for (const row of rows) {
    const current = target.get(row.key) ?? { ...row };
    if (!target.has(row.key)) {
      target.set(row.key, { ...row });
      continue;
    }
    current.pointsFor += row.pointsFor;
    current.pointsAgainst += row.pointsAgainst;
    current.plusMinus += row.plusMinus;
    current.scoringEvents += row.scoringEvents;
    current.totalEvents += row.totalEvents;
    current.secondsPlayed += row.secondsPlayed;
    current.stintCount += row.stintCount;
    target.set(row.key, current);
  }
}

function mergePlayRows(target: Map<string, PlayAnalyticsRow>, rows: PlayAnalyticsRow[]) {
  for (const row of rows) {
    const current = target.get(row.id) ?? { ...row, pointsPerPossession: "-" };
    if (!target.has(row.id)) {
      target.set(row.id, { ...row });
      continue;
    }
    current.fgm += row.fgm;
    current.fga += row.fga;
    current.threePm += row.threePm;
    current.threePa += row.threePa;
    current.ftm += row.ftm;
    current.fta += row.fta;
    current.points += row.points;
    current.paintPoints += row.paintPoints;
    current.secondChancePoints += row.secondChancePoints;
    current.turnovers += row.turnovers;
    current.offRebounds += row.offRebounds;
    current.foulsDrawn += row.foulsDrawn;
    current.possessions += row.possessions;
    current.pointsPerPossession =
      current.possessions > 0 ? (current.points / current.possessions).toFixed(2) : "-";
    target.set(row.id, current);
  }
}

function renderLineupTable(
  rows: LineupAnalyticsRow[],
  currentKey: string,
  emptyLabel: string,
  gameCount: number,
  statMode: "totals" | "per-game",
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
          <th>Events</th>
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
              <td>{statMode === "per-game" ? formatMinutes(gameCount > 0 ? row.secondsPlayed / gameCount : 0) : formatMinutes(row.secondsPlayed)}</td>
              <td>{formatTeamValue(row.stintCount, gameCount, statMode)}</td>
              <td>{formatSignedValue(row.plusMinus, gameCount, statMode)}</td>
              <td>{formatTeamValue(row.pointsFor, gameCount, statMode)}</td>
              <td>{formatTeamValue(row.pointsAgainst, gameCount, statMode)}</td>
              <td>{formatTeamValue(row.totalEvents, gameCount, statMode)}</td>
            </tr>
          ))
        ) : (
          <tr><td colSpan={7}>{emptyLabel}</td></tr>
        )}
      </tbody>
    </table>
  );
}

type TeamGameReport = {
  gameId: string;
  date: string;
  opponent: string;
  score: string;
  result: string;
  teamSide: "home" | "away";
  opponentName: string;
  report: GameStatsReport;
  teamTotals: TeamTotals;
  opponentTotals: TeamTotals;
  teamRows: BoxScoreRow[];
  shotMarkers: ShotMarker[];
  lineupAnalytics: LineupAnalyticsRow[];
  lineupGroups: Record<LineupGroupSize, LineupAnalyticsRow[]>;
  offensePlayAnalytics: PlayAnalyticsRow[];
  defensePlayAnalytics: PlayAnalyticsRow[];
  currentLineupKey: string;
};

export default async function TeamProfilePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ teamSeasonId: string }>;
  searchParams: Promise<{ quarter?: string | string[]; tab?: string | string[]; mode?: string | string[] }>;
}>) {
  await requireAccessRole(["admin", "coach", "player"]);
  const session = await getAccessSession();
  const { teamSeasonId } = await params;
  const query = await searchParams;
  const [teamRows, playerRows, games] = await Promise.all([
    listTeamSeasonRows(),
    listPlayerRosterRows(),
    listGameRows(),
  ]);

  const team = teamRows.find((entry) => entry.id === teamSeasonId);
  if (!team) {
    notFound();
  }

  const teamRosterRows = playerRows
    .filter((row) => row.teamSeasonId === teamSeasonId)
    .sort((left, right) => Number(right.isStarter) - Number(left.isStarter) || left.jersey.localeCompare(right.jersey));
  const trackedGames = games.filter(
    (game) =>
      game.status !== "scheduled" &&
      (game.homeTeamSeasonId === teamSeasonId || game.awayTeamSeasonId === teamSeasonId),
  );
  const now = Date.now();
  const scoutingGame = games
    .filter((game) => game.homeTeamSeasonId === teamSeasonId || game.awayTeamSeasonId === teamSeasonId)
    .map((game) => ({
      ...game,
      startsAtMs: game.startsAt ? new Date(game.startsAt).getTime() : new Date(game.date).getTime(),
    }))
    .sort((left, right) => {
      const leftFuture = left.startsAtMs >= now;
      const rightFuture = right.startsAtMs >= now;
      if (leftFuture !== rightFuture) {
        return leftFuture ? -1 : 1;
      }
      return leftFuture ? left.startsAtMs - right.startsAtMs : right.startsAtMs - left.startsAtMs;
    })[0];
  const availableQuarterSet = new Set<number>([1, 2, 3, 4]);

  for (const game of trackedGames) {
    const [snapshot, eventFeed] = await Promise.all([
      getLiveScorerSnapshot(game.id),
      listGameEventFeed(game.id),
    ]);
    if (!snapshot) {
      continue;
    }
    for (const quarter of reportAvailableQuarters(snapshot, eventFeed)) {
      availableQuarterSet.add(quarter);
    }
  }

  const availableQuarters = [...availableQuarterSet].sort((left, right) => left - right);
  const requestedQuarters = parseQuarterFilter(query.quarter);
  const activeQuarters =
    requestedQuarters.length > 0
      ? availableQuarters.filter((quarter) => requestedQuarters.includes(quarter))
      : availableQuarters;
  const activeTab = parseTeamStatsTab(query.tab);
  const statMode = query.mode ? parseStatMode(query.mode) : "per-game";

  const teamReports: TeamGameReport[] = [];

  for (const game of trackedGames) {
    const [snapshot, eventFeed] = await Promise.all([
      getLiveScorerSnapshot(game.id),
      listGameEventFeed(game.id),
    ]);
    if (!snapshot) {
      continue;
    }
    const report = buildGameStatsReport(snapshot, eventFeed, activeQuarters);
    const teamSide = game.homeTeamSeasonId === teamSeasonId ? "home" : "away";
    const opponentSide = teamSide === "home" ? "away" : "home";
    const teamTotals = teamSide === "home" ? report.homeTeamTotals : report.awayTeamTotals;
    const opponentTotals = opponentSide === "home" ? report.homeTeamTotals : report.awayTeamTotals;
    const teamRowsForGame = teamSide === "home" ? report.boxScore.homeRows : report.boxScore.awayRows;
    const shotMarkers = report.shotMarkers.filter((marker) => marker.teamSide === teamSide);
    const teamPoints = teamTotals.points;
    const opponentPoints = opponentTotals.points;
    teamReports.push({
      gameId: game.id,
      date: game.date,
      opponent: game.opponent,
      score: game.score,
      result: teamPoints > opponentPoints ? "W" : teamPoints < opponentPoints ? "L" : "T",
      teamSide,
      opponentName: opponentSide === "home" ? report.boxScore.homeTeamName : report.boxScore.awayTeamName,
      report,
      teamTotals,
      opponentTotals,
      teamRows: teamRowsForGame,
      shotMarkers,
      lineupAnalytics: teamSide === "home" ? report.homeLineupAnalytics : report.awayLineupAnalytics,
      lineupGroups: teamSide === "home" ? report.homeLineupGroups : report.awayLineupGroups,
      offensePlayAnalytics: teamSide === "home" ? report.homeOffensePlayAnalytics : report.awayOffensePlayAnalytics,
      defensePlayAnalytics: teamSide === "home" ? report.homeDefensePlayAnalytics : report.awayDefensePlayAnalytics,
      currentLineupKey: teamSide === "home" ? report.currentHomeLineupKey : report.currentAwayLineupKey,
    });
  }

  const teamTotals = createEmptyTotals();
  const opponentTotals = createEmptyTotals();
  const playerTotals = new Map<string, BoxScoreRow>();
  const playerPlusMinus = new Map<string, number>();
  const lineupRows = new Map<string, LineupAnalyticsRow>();
  const groupRows = {
    2: new Map<string, LineupAnalyticsRow>(),
    3: new Map<string, LineupAnalyticsRow>(),
    4: new Map<string, LineupAnalyticsRow>(),
  } satisfies Record<LineupGroupSize, Map<string, LineupAnalyticsRow>>;
  const offensePlayRows = new Map<string, PlayAnalyticsRow>();
  const defensePlayRows = new Map<string, PlayAnalyticsRow>();
  const shotMarkers: ShotMarker[] = [];
  let wins = 0;
  let losses = 0;
  let paintPoints = 0;
  let secondChancePoints = 0;
  let pointsOffTurnovers = 0;
  let currentLineupKey = "";

  for (const game of teamReports) {
    addTotals(teamTotals, game.teamTotals);
    addTotals(opponentTotals, game.opponentTotals);
    if (game.teamTotals.points > game.opponentTotals.points) wins += 1;
    if (game.teamTotals.points < game.opponentTotals.points) losses += 1;
    currentLineupKey = game.currentLineupKey || currentLineupKey;

    for (const row of game.teamRows) {
      const current = playerTotals.get(row.rosterMembershipId) ?? { ...row };
      if (!playerTotals.has(row.rosterMembershipId)) {
        playerTotals.set(row.rosterMembershipId, { ...row });
      } else {
        current.points += row.points;
        current.fgm += row.fgm;
        current.fga += row.fga;
        current.threePm += row.threePm;
        current.threePa += row.threePa;
        current.ftm += row.ftm;
        current.fta += row.fta;
        current.oreb += row.oreb;
        current.dreb += row.dreb;
        current.reb += row.reb;
        current.ast += row.ast;
        current.stl += row.stl;
        current.blk += row.blk;
        current.turnovers += row.turnovers;
        current.fouls += row.fouls;
        playerTotals.set(row.rosterMembershipId, current);
      }
      const plusMap = game.teamSide === "home" ? game.report.playerPlusMinus.home : game.report.playerPlusMinus.away;
      playerPlusMinus.set(
        row.rosterMembershipId,
        (playerPlusMinus.get(row.rosterMembershipId) ?? 0) +
          (plusMap.get(row.rosterMembershipId) ?? 0),
      );
    }

    shotMarkers.push(...game.shotMarkers);
    mergeLineupRows(lineupRows, game.lineupAnalytics);
    for (const size of [2, 3, 4] as LineupGroupSize[]) {
      mergeLineupRows(groupRows[size], game.lineupGroups[size]);
    }
    mergePlayRows(offensePlayRows, game.offensePlayAnalytics);
    mergePlayRows(defensePlayRows, game.defensePlayAnalytics);

    if (game.teamSide === "home") {
      paintPoints += game.report.paintPointsSnapshot.teamPoints.home;
      secondChancePoints += game.report.secondChanceSnapshot.teamPoints.home;
      pointsOffTurnovers += game.report.pointsOffTurnoversSnapshot.teamPoints.home;
    } else {
      paintPoints += game.report.paintPointsSnapshot.teamPoints.away;
      secondChancePoints += game.report.secondChanceSnapshot.teamPoints.away;
      pointsOffTurnovers += game.report.pointsOffTurnoversSnapshot.teamPoints.away;
    }
  }

  const rosterStatRows = [...playerTotals.values()]
    .map((row) => ({
      ...row,
      plusMinus: playerPlusMinus.get(row.rosterMembershipId) ?? 0,
    }))
    .sort((left, right) => right.points - left.points || left.playerName.localeCompare(right.playerName));
  const sortedLineups = [...lineupRows.values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed);
  const sortedGroupRows = {
    2: [...groupRows[2].values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed),
    3: [...groupRows[3].values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed),
    4: [...groupRows[4].values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed),
  } satisfies Record<LineupGroupSize, LineupAnalyticsRow[]>;
  const sortedOffensePlays = [...offensePlayRows.values()].sort((left, right) => right.points - left.points || right.possessions - left.possessions);
  const sortedDefensePlays = [...defensePlayRows.values()].sort((left, right) => Number.parseFloat(left.pointsPerPossession) - Number.parseFloat(right.pointsPerPossession));
  const basePath = `/stats/teams/${teamSeasonId}`;
  const tabs: Array<{ value: TeamStatsTab; label: string }> = [
    { value: "overview", label: "Overview" },
    { value: "roster", label: "Roster" },
    { value: "team", label: "Team Stats" },
    { value: "team-advanced", label: "Team Efficiency" },
    { value: "lineup", label: "Lineup +/-" },
    { value: "lineup-groups", label: "Lineup Groups" },
    { value: "plays", label: "Play Efficiency" },
    { value: "shots", label: "Shot Chart" },
    { value: "games", label: "Game Log" },
  ];

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Team Profile</p>
          <h2>{team.name} {team.label}</h2>
          <p>
            <strong className="player-profile-emphasis">{team.season}</strong>
          </p>
          <p className="meta">
            {team.type === "ours" ? "Pikesville Team" : "Opponent Team"} · {trackedGames.length} tracked games · {wins}-{losses}
          </p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks
            session={session}
            extras={
              scoutingGame
                ? [{ href: `/scouting/${scoutingGame.id}`, label: "Open Scouting Report", variant: "secondary" }]
                : []
            }
          />
        </ResponsivePageActions>
      </header>

      <section className="panel-card quarter-filter-card">
        <div>
          <p className="eyebrow-label">Quarter Filter</p>
          <h3>Focus The Team View</h3>
          <p className="meta">Everything below is filtered to {formatQuarterSummary(activeQuarters)}.</p>
        </div>
        <div className="page-actions">
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
          <StatsQuarterFilterControls
            basePath={basePath}
            activeTab={activeTab}
            availableQuarters={availableQuarters}
            activeQuarters={activeQuarters}
            mode={statMode}
          />
        </div>
      </section>

      <section className="table-grid overlay-table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>{team.name} {team.label}</h3>
              <p className="meta">{formatQuarterSummary(activeQuarters)} · {trackedGames.length} game sample</p>
            </div>
            <span className="pill alt">{team.type === "ours" ? "Pikesville" : "Opponent"}</span>
          </div>
          {scoutingGame ? (
            <div className="action-row">
              <Link href={`/scouting/${scoutingGame.id}`} className="button-link secondary">
                Open Scouting Report
              </Link>
            </div>
          ) : null}
          <StatsOverlayTabNav
            tabs={tabs.map((tab) => ({
              value: tab.value,
              label: tab.label,
              href: buildReportHref(basePath, { tab: tab.value, quarters: activeQuarters, mode: statMode }),
              active: activeTab === tab.value,
            }))}
          />

          {activeTab === "overview" ? (
            <section className="panel-grid reporting-dual-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Season Snapshot</p>
                <h3>Record And Identity</h3>
                <div className="box-score-stack">
                  <div className="management-card">
                    <p><strong>Record:</strong> {wins}-{losses}</p>
                    <p><strong>Active Players:</strong> {team.activePlayers}</p>
                    <p><strong>Type:</strong> {team.type === "ours" ? "Pikesville Team" : "Opponent Team"}</p>
                  </div>
                </div>
              </article>
              <article className="panel-card">
                <p className="eyebrow-label">Top-Level Production</p>
                <h3>Per Game Markers</h3>
                <div className="box-score-stack">
                  <div className="management-card">
                    <p><strong>PPG:</strong> {formatTeamValue(teamTotals.points, trackedGames.length, "per-game")}</p>
                    <p><strong>RPG:</strong> {formatTeamValue(teamTotals.reb, trackedGames.length, "per-game")}</p>
                    <p><strong>APG:</strong> {formatTeamValue(teamTotals.ast, trackedGames.length, "per-game")}</p>
                    <p><strong>PITP:</strong> {formatTeamValue(paintPoints, trackedGames.length, "per-game")}</p>
                    <p><strong>2CP:</strong> {formatTeamValue(secondChancePoints, trackedGames.length, "per-game")}</p>
                    <p><strong>POT:</strong> {formatTeamValue(pointsOffTurnovers, trackedGames.length, "per-game")}</p>
                  </div>
                </div>
              </article>
              {team.type === "opponent" ? (
                <article className="panel-card">
                  <p className="eyebrow-label">Scouting Summary</p>
                  <h3>Prep Snapshot</h3>
                  <div className="box-score-stack">
                    {team.scoutingSummary ? <div className="management-card"><p>{team.scoutingSummary}</p></div> : null}
                    {team.offense ? <div className="management-card"><p><strong>Offense:</strong> {team.offense}</p></div> : null}
                    {team.defense ? <div className="management-card"><p><strong>Defense:</strong> {team.defense}</p></div> : null}
                    {team.press ? <div className="management-card"><p><strong>Press:</strong> {team.press}</p></div> : null}
                    {team.keysToWinning ? <div className="management-card"><p><strong>Keys:</strong> {team.keysToWinning}</p></div> : null}
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}

          {activeTab === "roster" ? (
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Role</th>
                  <th>POS</th>
                  <th>MIN</th>
                  <th>PTS</th>
                  <th>REB</th>
                  <th>AST</th>
                  <th>+/-</th>
                </tr>
              </thead>
              <tbody>
                {rosterStatRows.length > 0 ? rosterStatRows.map((row) => {
                  const rosterInfo = teamRosterRows.find((entry) => entry.id === row.rosterMembershipId);
                  const playerLink = team.type === "ours" && rosterInfo?.playerId ? `/stats/players/${rosterInfo.playerId}` : null;
                  return (
                    <tr key={row.rosterMembershipId}>
                      <td>{playerLink ? <Link href={playerLink}>{row.playerName} {row.jersey}</Link> : `${row.playerName} ${row.jersey}`}</td>
                      <td>{rosterInfo?.isStarter ? "Starter" : "Reserve"}</td>
                      <td>{row.position}</td>
                      <td>{formatMinutes(statMode === "per-game" ? ((teamReports.reduce((sum, game) => sum + (game.report.minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0), 0)) / Math.max(trackedGames.length, 1)) : teamReports.reduce((sum, game) => sum + (game.report.minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0), 0))}</td>
                      <td>{formatTeamValue(row.points, trackedGames.length, statMode)}</td>
                      <td>{formatTeamValue(row.reb, trackedGames.length, statMode)}</td>
                      <td>{formatTeamValue(row.ast, trackedGames.length, statMode)}</td>
                      <td>{formatSignedValue(row.plusMinus, trackedGames.length, statMode)}</td>
                    </tr>
                  );
                }) : <tr><td colSpan={8}>No roster stats yet.</td></tr>}
              </tbody>
            </table>
          ) : null}

          {activeTab === "team" ? (
            <table>
              <thead>
                <tr>
                  <th>PTS</th>
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
                <tr>
                  <td>{formatTeamValue(teamTotals.points, trackedGames.length, statMode)}</td>
                  <td>{formatPctLine(teamTotals.fgm, teamTotals.fga, trackedGames.length, statMode)}</td>
                  <td>{formatPctLine(teamTotals.threePm, teamTotals.threePa, trackedGames.length, statMode)}</td>
                  <td>{formatPctLine(teamTotals.ftm, teamTotals.fta, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.oreb, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.dreb, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.reb, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.ast, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.stl, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.blk, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.turnovers, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(teamTotals.fouls, trackedGames.length, statMode)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}

          {activeTab === "team-advanced" ? (
            <table>
              <thead>
                <tr>
                  <th>eFG%</th>
                  <th>TS%</th>
                  <th>FTr</th>
                  <th>PITP</th>
                  <th>2CP</th>
                  <th>POT</th>
                  <th>AST/TO</th>
                  <th>Opp PPG</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{calculateEffectiveFieldGoalPercentage(teamTotals)}</td>
                  <td>{calculateTrueShootingPercentage(teamTotals)}</td>
                  <td>{calculateFreeThrowRate(teamTotals)}</td>
                  <td>{formatTeamValue(paintPoints, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(secondChancePoints, trackedGames.length, statMode)}</td>
                  <td>{formatTeamValue(pointsOffTurnovers, trackedGames.length, statMode)}</td>
                  <td>{teamTotals.turnovers > 0 ? (teamTotals.ast / teamTotals.turnovers).toFixed(2) : "-"}</td>
                  <td>{formatTeamValue(opponentTotals.points, trackedGames.length, statMode)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}

          {activeTab === "lineup" ? renderLineupTable(sortedLineups, currentLineupKey, "No lineup data yet.", trackedGames.length, statMode) : null}

          {activeTab === "lineup-groups" ? (
            <div className="box-score-stack">
              {([2, 3, 4] as LineupGroupSize[]).map((size) => (
                <details key={size} className="lineup-group-section" open={size === 2}>
                  <summary>{size}-Player Groups</summary>
                  {renderLineupTable(sortedGroupRows[size], "", `No ${size}-player group data yet.`, trackedGames.length, statMode)}
                </details>
              ))}
            </div>
          ) : null}

          {activeTab === "plays" ? (
            <section className="panel-grid reporting-dual-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Offense Plays</p>
                <h3>Tagged Offense</h3>
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
                    {sortedOffensePlays.length > 0 ? sortedOffensePlays.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{formatTeamValue(row.points, trackedGames.length, statMode)}</td>
                        <td>{formatTeamValue(row.possessions, trackedGames.length, statMode)}</td>
                        <td>{row.pointsPerPossession}</td>
                        <td>{formatTeamValue(row.turnovers, trackedGames.length, statMode)}</td>
                        <td>{formatTeamValue(row.secondChancePoints, trackedGames.length, statMode)}</td>
                      </tr>
                    )) : <tr><td colSpan={6}>No offense play data yet.</td></tr>}
                  </tbody>
                </table>
              </article>
              <article className="panel-card">
                <p className="eyebrow-label">Defense Plays</p>
                <h3>Tagged Defense</h3>
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
                    {sortedDefensePlays.length > 0 ? sortedDefensePlays.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{formatTeamValue(row.possessions, trackedGames.length, statMode)}</td>
                        <td>{row.pointsPerPossession}</td>
                        <td>{formatTeamValue(row.turnovers, trackedGames.length, statMode)}</td>
                        <td>{formatTeamValue(row.offRebounds, trackedGames.length, statMode)}</td>
                        <td>{formatTeamValue(row.secondChancePoints, trackedGames.length, statMode)}</td>
                      </tr>
                    )) : <tr><td colSpan={6}>No defense play data yet.</td></tr>}
                  </tbody>
                </table>
              </article>
            </section>
          ) : null}

          {activeTab === "shots" ? (
            <section className="panel-grid reporting-dual-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Shot Chart</p>
                <h3>{team.name} Shot Map</h3>
                <ShotChartDisplay markers={shotMarkers} large />
              </article>
            </section>
          ) : null}

          {activeTab === "games" ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th>FG</th>
                  <th>3PT</th>
                  <th>FT</th>
                  <th>REB</th>
                  <th>TO</th>
                  <th>Game</th>
                </tr>
              </thead>
              <tbody>
                {teamReports.map((game) => (
                  <tr key={game.gameId}>
                    <td>{formatCompactDate(game.date)}</td>
                    <td>{game.opponentName}</td>
                    <td>{game.result}</td>
                    <td>{game.teamTotals.points}-{game.opponentTotals.points}</td>
                    <td>{formatPct(game.teamTotals.fgm, game.teamTotals.fga)}</td>
                    <td>{formatPct(game.teamTotals.threePm, game.teamTotals.threePa)}</td>
                    <td>{formatPct(game.teamTotals.ftm, game.teamTotals.fta)}</td>
                    <td>{game.teamTotals.reb}</td>
                    <td>{game.teamTotals.turnovers}</td>
                    <td>
                      <Link href={`/stats/games/${game.gameId}`} className="button-link ghost">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function reportAvailableQuarters(snapshot: Awaited<ReturnType<typeof getLiveScorerSnapshot>>, eventFeed: Awaited<ReturnType<typeof listGameEventFeed>>) {
  return Array.from(
    new Set([1, 2, 3, 4, snapshot?.quarter ?? 1, ...eventFeed.map((event) => event.quarter)]),
  )
    .filter((quarter) => quarter >= 1)
    .sort((left, right) => left - right);
}
