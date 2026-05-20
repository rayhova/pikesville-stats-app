import type {
  BoxScoreRow,
  GameEventFeedItem,
  LiveBoxScore,
  LiveScorerSnapshot,
} from "@/lib/admin-repository";
import type { PlayerRosterRow, PlayLibraryRow } from "@/lib/admin-repository";

export interface TeamTotals {
  points: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnovers: number;
  fouls: number;
}

export interface QuarterScoreRow {
  quarter: number;
  label: string;
  ourPoints: number;
  opponentPoints: number;
}

export interface AggregatedPlayerRow extends TeamTotals {
  rosterMembershipId: string;
  playerName: string;
  jersey: string;
  position: string;
}

export type StatsTab =
  | "player"
  | "player-advanced"
  | "team"
  | "team-advanced"
  | "lineup"
  | "lineup-groups"
  | "plays"
  | "quarter"
  | "shots";
export type StatMode = "totals" | "per-game";

type TeamSide = "home" | "away";
export type LineupGroupSize = 2 | 3 | 4;

export interface LineupAnalyticsRow {
  key: string;
  playerIds: string[];
  label: string;
  pointsFor: number;
  pointsAgainst: number;
  plusMinus: number;
  scoringEvents: number;
  totalEvents: number;
  secondsPlayed: number;
  stintCount: number;
}

interface UsageRow {
  secondsPlayed: number;
  stintCount: number;
}

interface MinutesSnapshot {
  playerUsage: Map<string, UsageRow>;
  lineupUsage: {
    home: Map<string, UsageRow>;
    away: Map<string, UsageRow>;
  };
  groupUsage: {
    home: Record<LineupGroupSize, Map<string, UsageRow>>;
    away: Record<LineupGroupSize, Map<string, UsageRow>>;
  };
}

export interface PlayAnalyticsRow {
  id: string;
  name: string;
  family: string;
  imageUrl: string | null;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  points: number;
  paintPoints: number;
  secondChancePoints: number;
  turnovers: number;
  offRebounds: number;
  foulsDrawn: number;
  possessions: number;
  pointsPerPossession: string;
}

interface SecondChanceSnapshot {
  teamPoints: Record<TeamSide, number>;
  playerPoints: Map<string, number>;
  offensePlayPoints: Map<string, number>;
  defensePlayPoints: Map<string, number>;
}

interface PointsOffTurnoversSnapshot {
  teamPoints: Record<TeamSide, number>;
}

interface PaintPointsSnapshot {
  teamPoints: Record<TeamSide, number>;
  playerPoints: Map<string, number>;
}

interface PossessionTrip {
  key: string;
  quarter: number;
  offenseSide: TeamSide;
  offensePlayId: string | null;
  defensePlayId: string | null;
  points: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  paintPoints: number;
  secondChancePoints: number;
  turnovers: number;
  offRebounds: number;
  foulsDrawn: number;
  defensiveRebounds: number;
  foulsCommitted: number;
  hasTrackedAction: boolean;
}

export interface ShotMarker {
  id: string;
  x: number;
  y: number;
  result: "make" | "miss" | null;
  value: number | null;
  teamSide: "home" | "away";
  rosterMembershipId: string | null;
  playerName: string;
  jersey: string;
  quarter: number;
  secondsRemaining: number;
}

export interface GameStatsReport {
  availableQuarters: number[];
  activeQuarters: number[];
  boxScore: LiveBoxScore;
  homeTeamTotals: TeamTotals;
  awayTeamTotals: TeamTotals;
  ourSide: TeamSide;
  opponentSide: TeamSide;
  ourName: string;
  opponentName: string;
  ourRows: BoxScoreRow[];
  opponentRows: BoxScoreRow[];
  quarterBreakdown: Array<{
    quarter: number;
    homePoints: number;
    awayPoints: number;
    homeRebounds: number;
    awayRebounds: number;
    homeTurnovers: number;
    awayTurnovers: number;
    homeFouls: number;
    awayFouls: number;
    possessions: number;
  }>;
  minutesSnapshot: MinutesSnapshot;
  playerPlusMinus: {
    home: Map<string, number>;
    away: Map<string, number>;
  };
  secondChanceSnapshot: SecondChanceSnapshot;
  pointsOffTurnoversSnapshot: PointsOffTurnoversSnapshot;
  paintPointsSnapshot: PaintPointsSnapshot;
  homeLineupAnalytics: LineupAnalyticsRow[];
  awayLineupAnalytics: LineupAnalyticsRow[];
  homeLineupGroups: Record<LineupGroupSize, LineupAnalyticsRow[]>;
  awayLineupGroups: Record<LineupGroupSize, LineupAnalyticsRow[]>;
  homeOffensePlayAnalytics: PlayAnalyticsRow[];
  awayOffensePlayAnalytics: PlayAnalyticsRow[];
  homeDefensePlayAnalytics: PlayAnalyticsRow[];
  awayDefensePlayAnalytics: PlayAnalyticsRow[];
  shotMarkers: ShotMarker[];
  currentHomeLineupKey: string;
  currentAwayLineupKey: string;
  currentHomeGroupKeys: Record<LineupGroupSize, Set<string>>;
  currentAwayGroupKeys: Record<LineupGroupSize, Set<string>>;
}

export interface SeasonStatsReport {
  seasonGameCount: number;
  seasonRecord: { wins: number; losses: number };
  playerRows: AggregatedPlayerRow[];
  opponentPlayerRows: AggregatedPlayerRow[];
  ourTeamTotals: TeamTotals;
  opponentTeamTotals: TeamTotals;
  ourSecondChancePoints: number;
  opponentSecondChancePoints: number;
  ourPointsOffTurnovers: number;
  opponentPointsOffTurnovers: number;
  ourPaintPoints: number;
  opponentPaintPoints: number;
  playerUsage: Map<string, UsageRow>;
  playerPlusMinus: Map<string, number>;
  secondChancePoints: Map<string, number>;
  paintPoints: Map<string, number>;
  lineupAnalytics: LineupAnalyticsRow[];
  lineupGroups: Record<LineupGroupSize, LineupAnalyticsRow[]>;
  offensePlayAnalytics: PlayAnalyticsRow[];
  defensePlayAnalytics: PlayAnalyticsRow[];
  opponentOffensePlayAnalytics: PlayAnalyticsRow[];
  opponentDefensePlayAnalytics: PlayAnalyticsRow[];
  shotMarkers: ShotMarker[];
  quarterBreakdown: Array<{
    quarter: number;
    ourPoints: number;
    opponentPoints: number;
    ourRebounds: number;
    opponentRebounds: number;
    ourTurnovers: number;
    opponentTurnovers: number;
    ourFouls: number;
    opponentFouls: number;
    events: number;
  }>;
}

const REGULATION_PERIOD_SECONDS = 480;
const OVERTIME_PERIOD_SECONDS = 240;

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

function addRowToTotals(target: TeamTotals, row: TeamTotals) {
  target.points += row.points;
  target.fgm += row.fgm;
  target.fga += row.fga;
  target.threePm += row.threePm;
  target.threePa += row.threePa;
  target.ftm += row.ftm;
  target.fta += row.fta;
  target.oreb += row.oreb;
  target.dreb += row.dreb;
  target.reb += row.reb;
  target.ast += row.ast;
  target.stl += row.stl;
  target.blk += row.blk;
  target.turnovers += row.turnovers;
  target.fouls += row.fouls;
}

export function sumBoxScoreRows(rows: BoxScoreRow[]): TeamTotals {
  const totals = createEmptyTotals();

  for (const row of rows) {
    addRowToTotals(totals, row);
  }

  return totals;
}

export function sumTeamTotals(rows: TeamTotals[]): TeamTotals {
  const totals = createEmptyTotals();

  for (const row of rows) {
    addRowToTotals(totals, row);
  }

  return totals;
}

export function formatPct(makes: number, attempts: number) {
  if (attempts === 0) {
    return "0/0 (-)";
  }

  return `${makes}/${attempts} (${((makes / attempts) * 100).toFixed(1)}%)`;
}

export function formatAverage(total: number, count: number) {
  if (count === 0) {
    return "0.0";
  }

  return (total / count).toFixed(1);
}

export function formatQuarterLabel(quarter: number) {
  return quarter <= 4 ? `Q${quarter}` : `OT${quarter - 4}`;
}

export function formatQuarterSummary(quarters: number[]) {
  return quarters.map(formatQuarterLabel).join(" + ");
}

export function parseStatsTab(value: string | string[] | undefined): StatsTab {
  const tabValue = Array.isArray(value) ? value[0] : value;
  return tabValue === "player-advanced" ||
    tabValue === "team" ||
    tabValue === "team-advanced" ||
    tabValue === "lineup" ||
    tabValue === "lineup-groups" ||
    tabValue === "plays" ||
    tabValue === "quarter" ||
    tabValue === "shots"
    ? tabValue
    : "player";
}

export function parseStatMode(value: string | string[] | undefined): StatMode {
  const modeValue = Array.isArray(value) ? value[0] : value;
  return modeValue === "per-game" ? "per-game" : "totals";
}

export function parseQuarterFilter(value: string | string[] | undefined) {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];
  return rawValues
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 10);
}

export function buildReportHref(
  basePath: string,
  options: { tab?: string; quarters?: number[]; mode?: StatMode; seasonId?: string },
) {
  const params = new URLSearchParams();

  if (options.tab) {
    params.set("tab", options.tab);
  }

  if (options.mode && options.mode !== "totals") {
    params.set("mode", options.mode);
  }

  if (options.seasonId) {
    params.set("season", options.seasonId);
  }

  for (const quarter of options.quarters ?? []) {
    params.append("quarter", String(quarter));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits);
}

export function formatMinutes(seconds: number) {
  return formatDecimal(seconds / 60, 1);
}

export function formatRatio(numerator: number, denominator: number) {
  if (denominator === 0) {
    return numerator === 0 ? "-" : `${numerator}`;
  }

  return formatDecimal(numerator / denominator);
}

export function formatPercentage(makes: number, attempts: number) {
  if (attempts === 0) {
    return "-";
  }

  return `${((makes / attempts) * 100).toFixed(1)}%`;
}

export function calculateEffectiveFieldGoalPercentage(
  row: Pick<BoxScoreRow, "fgm" | "threePm" | "fga">,
) {
  if (row.fga === 0) {
    return "-";
  }

  return `${(((row.fgm + 0.5 * row.threePm) / row.fga) * 100).toFixed(1)}%`;
}

export function calculateTrueShootingPercentage(
  row: Pick<BoxScoreRow, "points" | "fga" | "fta">,
) {
  const denominator = 2 * (row.fga + 0.44 * row.fta);

  if (denominator === 0) {
    return "-";
  }

  return `${((row.points / denominator) * 100).toFixed(1)}%`;
}

export function calculatePointsPerShot(row: Pick<BoxScoreRow, "points" | "fga">) {
  if (row.fga === 0) {
    return "-";
  }

  return formatDecimal(row.points / row.fga);
}

export function calculateFreeThrowRate(row: Pick<BoxScoreRow, "fta" | "fga">) {
  if (row.fga === 0) {
    return "-";
  }

  return formatDecimal(row.fta / row.fga);
}

export function calculateGameEfficiency(
  row: Pick<
    BoxScoreRow,
    "points" | "reb" | "ast" | "stl" | "blk" | "fga" | "fgm" | "fta" | "ftm" | "turnovers"
  >,
) {
  return (
    row.points +
    row.reb +
    row.ast +
    row.stl +
    row.blk -
    (row.fga - row.fgm) -
    (row.fta - row.ftm) -
    row.turnovers
  );
}

export function getOurTeamSide(snapshot: LiveScorerSnapshot): "home" | "away" {
  return snapshot.homeTeam.teamType === "ours" ? "home" : "away";
}

export function getRowsForSide(
  boxScore: LiveBoxScore,
  side: "home" | "away",
): BoxScoreRow[] {
  return side === "home" ? boxScore.homeRows : boxScore.awayRows;
}

export function getOurVsOpponentBoxScore(
  snapshot: LiveScorerSnapshot,
  boxScore: LiveBoxScore,
) {
  const ourSide = getOurTeamSide(snapshot);
  const opponentSide = ourSide === "home" ? "away" : "home";
  const ourRows = getRowsForSide(boxScore, ourSide);
  const opponentRows = getRowsForSide(boxScore, opponentSide);

  return {
    ourSide,
    opponentSide,
    ourName: ourSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name,
    opponentName:
      opponentSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name,
    ourRows,
    opponentRows,
    ourTotals: sumBoxScoreRows(ourRows),
    opponentTotals: sumBoxScoreRows(opponentRows),
  };
}

export function buildQuarterScoreRows(
  snapshot: LiveScorerSnapshot,
  eventFeed: GameEventFeedItem[],
): QuarterScoreRow[] {
  const ourSide = getOurTeamSide(snapshot);
  const totalsByQuarter = new Map<number, QuarterScoreRow>();
  const orderedEvents = [...eventFeed].sort(
    (left, right) => left.sequenceNumber - right.sequenceNumber,
  );
  const maxQuarter = Math.max(
    snapshot.quarter,
    ...orderedEvents.map((event) => event.quarter),
    1,
  );

  for (let quarter = 1; quarter <= maxQuarter; quarter += 1) {
    totalsByQuarter.set(quarter, {
      quarter,
      label: formatQuarterLabel(quarter),
      ourPoints: 0,
      opponentPoints: 0,
    });
  }

  for (const event of orderedEvents) {
    if (event.eventType !== "shot" || event.shotResult !== "make") {
      continue;
    }

    const quarterRow = totalsByQuarter.get(event.quarter);

    if (!quarterRow) {
      continue;
    }

    if (event.teamSide === ourSide) {
      quarterRow.ourPoints += event.shotValue ?? 0;
    } else {
      quarterRow.opponentPoints += event.shotValue ?? 0;
    }
  }

  return [...totalsByQuarter.values()];
}

export function buildGameLeaders(rows: BoxScoreRow[]) {
  const byValue = (selector: (row: BoxScoreRow) => number) =>
    [...rows]
      .sort((left, right) => selector(right) - selector(left))
      .find((row) => selector(row) > 0) ?? null;

  return {
    points: byValue((row) => row.points),
    rebounds: byValue((row) => row.reb),
    assists: byValue((row) => row.ast),
    steals: byValue((row) => row.stl),
    blocks: byValue((row) => row.blk),
  };
}

export function aggregateSeasonPlayerRows(
  gameRows: BoxScoreRow[][],
): AggregatedPlayerRow[] {
  const totalsByPlayer = new Map<string, AggregatedPlayerRow>();

  for (const rows of gameRows) {
    for (const row of rows) {
      const existing = totalsByPlayer.get(row.rosterMembershipId);

      if (!existing) {
        totalsByPlayer.set(row.rosterMembershipId, {
          rosterMembershipId: row.rosterMembershipId,
          playerName: row.playerName,
          jersey: row.jersey,
          position: row.position,
          ...createEmptyTotals(),
        });
      }

      addRowToTotals(totalsByPlayer.get(row.rosterMembershipId)!, row);
    }
  }

  return [...totalsByPlayer.values()].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    return left.playerName.localeCompare(right.playerName);
  });
}

function aggregateBoxScoreRows(rows: BoxScoreRow[]) {
  return rows.reduce(
    (totals, row) => ({
      points: totals.points + row.points,
      fgm: totals.fgm + row.fgm,
      fga: totals.fga + row.fga,
      threePm: totals.threePm + row.threePm,
      threePa: totals.threePa + row.threePa,
      ftm: totals.ftm + row.ftm,
      fta: totals.fta + row.fta,
      oreb: totals.oreb + row.oreb,
      dreb: totals.dreb + row.dreb,
      reb: totals.reb + row.reb,
      ast: totals.ast + row.ast,
      stl: totals.stl + row.stl,
      blk: totals.blk + row.blk,
      turnovers: totals.turnovers + row.turnovers,
      fouls: totals.fouls + row.fouls,
    }),
    createEmptyTotals(),
  );
}

function getOpponentSide(teamSide: TeamSide): TeamSide {
  return teamSide === "home" ? "away" : "home";
}

function getScoredPoints(event: GameEventFeedItem) {
  return event.eventType === "shot" && event.shotResult === "make" ? event.shotValue ?? 0 : 0;
}

function isPaintMake(event: GameEventFeedItem) {
  return (
    event.eventType === "shot" &&
    event.shotResult === "make" &&
    event.shotValue === 2 &&
    event.shotX !== null &&
    event.shotY !== null &&
    event.shotX >= 37.8 &&
    event.shotX <= 62.2 &&
    event.shotY >= 48 &&
    event.shotY <= 93.5
  );
}

function buildRosterLookup(
  roster: Array<{ id: string; name: string; jersey: string }>,
) {
  return new Map(
    roster.map((player) => [
      player.id,
      player.jersey ? `${player.name} ${player.jersey}` : player.name,
    ]),
  );
}

function buildLineupLabel(playerIds: string[], rosterLookup: Map<string, string>) {
  return playerIds
    .map((playerId) => rosterLookup.get(playerId) ?? "Unknown")
    .join(", ");
}

function buildLineupKey(playerIds: string[]) {
  return [...playerIds].filter(Boolean).sort().join("|");
}

function buildGroupKeys(playerIds: string[], groupSize: LineupGroupSize) {
  const keys = new Set<string>();
  const normalizedIds = [...playerIds].filter(Boolean).sort();

  if (normalizedIds.length < groupSize) {
    return keys;
  }

  function walk(startIndex: number, currentIds: string[]) {
    if (currentIds.length === groupSize) {
      keys.add(buildLineupKey(currentIds));
      return;
    }

    for (let index = startIndex; index < normalizedIds.length; index += 1) {
      walk(index + 1, [...currentIds, normalizedIds[index]]);
    }
  }

  walk(0, []);
  return keys;
}

function getPeriodDurationSeconds(quarter: number) {
  return quarter <= 4 ? REGULATION_PERIOD_SECONDS : OVERTIME_PERIOD_SECONDS;
}

function getQuarterWindow(quarter: number) {
  const start = getElapsedGameSeconds(quarter, getPeriodDurationSeconds(quarter));
  const end = start + getPeriodDurationSeconds(quarter);
  return { start, end };
}

function getElapsedGameSeconds(quarter: number, secondsRemaining: number) {
  let elapsed = 0;

  for (let currentQuarter = 1; currentQuarter < quarter; currentQuarter += 1) {
    elapsed += getPeriodDurationSeconds(currentQuarter);
  }

  const periodDuration = getPeriodDurationSeconds(quarter);
  const clampedSecondsRemaining = Math.min(Math.max(secondsRemaining, 0), periodDuration);
  return elapsed + (periodDuration - clampedSecondsRemaining);
}

function ensureUsageRow(collection: Map<string, UsageRow>, key: string) {
  const existing = collection.get(key) ?? { secondsPlayed: 0, stintCount: 0 };
  collection.set(key, existing);
  return existing;
}

function ensureLineupRow(
  collection: Map<string, LineupAnalyticsRow>,
  playerIds: string[],
  rosterLookup: Map<string, string>,
) {
  const key = buildLineupKey(playerIds);
  const existing =
    collection.get(key) ??
    {
      key,
      playerIds,
      label: buildLineupLabel(playerIds, rosterLookup),
      pointsFor: 0,
      pointsAgainst: 0,
      plusMinus: 0,
      scoringEvents: 0,
      totalEvents: 0,
      secondsPlayed: 0,
      stintCount: 0,
    };

  collection.set(key, existing);
  return existing;
}

function getEventLineupIds(event: GameEventFeedItem, teamSide: TeamSide) {
  return [...(teamSide === "home" ? event.activeHomeRosterIds : event.activeAwayRosterIds)]
    .filter(Boolean)
    .sort();
}

function buildMinutesSnapshot(
  snapshot: LiveScorerSnapshot,
  events: GameEventFeedItem[],
  activeQuarters: number[],
): MinutesSnapshot {
  const playerUsage = new Map<string, UsageRow>();
  const lineupUsage = {
    home: new Map<string, UsageRow>(),
    away: new Map<string, UsageRow>(),
  };
  const groupUsage = {
    home: {
      2: new Map<string, UsageRow>(),
      3: new Map<string, UsageRow>(),
      4: new Map<string, UsageRow>(),
    } satisfies Record<LineupGroupSize, Map<string, UsageRow>>,
    away: {
      2: new Map<string, UsageRow>(),
      3: new Map<string, UsageRow>(),
      4: new Map<string, UsageRow>(),
    } satisfies Record<LineupGroupSize, Map<string, UsageRow>>,
  };

  const selectedQuarterWindows = activeQuarters.map(getQuarterWindow);
  const chronologicalEvents = [...events]
    .filter((event) => event.activeHomeRosterIds.length > 0 || event.activeAwayRosterIds.length > 0)
    .sort((left, right) => left.sequenceNumber - right.sequenceNumber)
    .map((event) => ({
      elapsedSeconds: getElapsedGameSeconds(event.quarter, event.secondsRemaining),
      homeIds: getEventLineupIds(event, "home"),
      awayIds: getEventLineupIds(event, "away"),
    }));

  if (chronologicalEvents.length === 0) {
    chronologicalEvents.push({
      elapsedSeconds: 0,
      homeIds: [...snapshot.homeTeam.onFloorIds].sort(),
      awayIds: [...snapshot.awayTeam.onFloorIds].sort(),
    });
  } else if (chronologicalEvents[0].elapsedSeconds > 0) {
    chronologicalEvents.unshift({
      elapsedSeconds: 0,
      homeIds: chronologicalEvents[0].homeIds,
      awayIds: chronologicalEvents[0].awayIds,
    });
  }

  const finalElapsedSeconds = Math.max(
    getElapsedGameSeconds(snapshot.quarter, snapshot.secondsRemaining),
    chronologicalEvents[chronologicalEvents.length - 1]?.elapsedSeconds ?? 0,
  );
  let previousHomeIds: string[] = [];
  let previousAwayIds: string[] = [];
  let previousHomeGroupKeys: Record<LineupGroupSize, Set<string>> = {
    2: new Set<string>(),
    3: new Set<string>(),
    4: new Set<string>(),
  };
  let previousAwayGroupKeys: Record<LineupGroupSize, Set<string>> = {
    2: new Set<string>(),
    3: new Set<string>(),
    4: new Set<string>(),
  };

  for (let index = 0; index < chronologicalEvents.length; index += 1) {
    const currentPoint = chronologicalEvents[index];
    const nextPoint = chronologicalEvents[index + 1];
    const selectedSegmentDuration = selectedQuarterWindows.reduce((total, window) => {
      const overlapStart = Math.max(currentPoint.elapsedSeconds, window.start);
      const overlapEnd = Math.min(nextPoint?.elapsedSeconds ?? finalElapsedSeconds, window.end);

      return total + Math.max(0, overlapEnd - overlapStart);
    }, 0);
    const homeKey = buildLineupKey(currentPoint.homeIds);
    const awayKey = buildLineupKey(currentPoint.awayIds);
    const homeGroupKeys: Record<LineupGroupSize, Set<string>> = {
      2: buildGroupKeys(currentPoint.homeIds, 2),
      3: buildGroupKeys(currentPoint.homeIds, 3),
      4: buildGroupKeys(currentPoint.homeIds, 4),
    };
    const awayGroupKeys: Record<LineupGroupSize, Set<string>> = {
      2: buildGroupKeys(currentPoint.awayIds, 2),
      3: buildGroupKeys(currentPoint.awayIds, 3),
      4: buildGroupKeys(currentPoint.awayIds, 4),
    };

    if (selectedSegmentDuration === 0) {
      previousHomeIds = currentPoint.homeIds;
      previousAwayIds = currentPoint.awayIds;
      previousHomeGroupKeys = homeGroupKeys;
      previousAwayGroupKeys = awayGroupKeys;
      continue;
    }

    if (homeKey) {
      const homeUsage = ensureUsageRow(lineupUsage.home, homeKey);
      if (index === 0 || homeKey !== buildLineupKey(previousHomeIds)) {
        homeUsage.stintCount += 1;
      }
      homeUsage.secondsPlayed += selectedSegmentDuration;
    }

    if (awayKey) {
      const awayUsage = ensureUsageRow(lineupUsage.away, awayKey);
      if (index === 0 || awayKey !== buildLineupKey(previousAwayIds)) {
        awayUsage.stintCount += 1;
      }
      awayUsage.secondsPlayed += selectedSegmentDuration;
    }

    for (const playerId of currentPoint.homeIds) {
      const playerRow = ensureUsageRow(playerUsage, playerId);
      if (index === 0 || !previousHomeIds.includes(playerId)) {
        playerRow.stintCount += 1;
      }
      playerRow.secondsPlayed += selectedSegmentDuration;
    }

    for (const playerId of currentPoint.awayIds) {
      const playerRow = ensureUsageRow(playerUsage, playerId);
      if (index === 0 || !previousAwayIds.includes(playerId)) {
        playerRow.stintCount += 1;
      }
      playerRow.secondsPlayed += selectedSegmentDuration;
    }

    for (const size of [2, 3, 4] as LineupGroupSize[]) {
      for (const groupKey of homeGroupKeys[size]) {
        const groupRow = ensureUsageRow(groupUsage.home[size], groupKey);
        if (index === 0 || !previousHomeGroupKeys[size].has(groupKey)) {
          groupRow.stintCount += 1;
        }
        groupRow.secondsPlayed += selectedSegmentDuration;
      }

      for (const groupKey of awayGroupKeys[size]) {
        const groupRow = ensureUsageRow(groupUsage.away[size], groupKey);
        if (index === 0 || !previousAwayGroupKeys[size].has(groupKey)) {
          groupRow.stintCount += 1;
        }
        groupRow.secondsPlayed += selectedSegmentDuration;
      }
    }

    previousHomeIds = currentPoint.homeIds;
    previousAwayIds = currentPoint.awayIds;
    previousHomeGroupKeys = homeGroupKeys;
    previousAwayGroupKeys = awayGroupKeys;
  }

  return { playerUsage, lineupUsage, groupUsage };
}

function registerLineupImpact(
  collection: Map<string, LineupAnalyticsRow>,
  playerIds: string[],
  pointsFor: number,
  pointsAgainst: number,
  rosterLookup: Map<string, string>,
  countScoringEvent: boolean,
) {
  if (playerIds.length === 0) {
    return;
  }

  const existing = ensureLineupRow(collection, playerIds, rosterLookup);
  existing.pointsFor += pointsFor;
  existing.pointsAgainst += pointsAgainst;
  existing.plusMinus += pointsFor - pointsAgainst;
  existing.totalEvents += 1;
  if (countScoringEvent) {
    existing.scoringEvents += 1;
  }
  collection.set(existing.key, existing);
}

function getLineupAnalytics(
  events: GameEventFeedItem[],
  teamSide: TeamSide,
  rosterLookup: Map<string, string>,
  currentLineupIds: string[],
  usageMap: Map<string, UsageRow>,
): LineupAnalyticsRow[] {
  const rows = new Map<string, LineupAnalyticsRow>();

  for (const [key, usage] of usageMap.entries()) {
    const playerIds = key.split("|").filter(Boolean);
    const row = ensureLineupRow(rows, playerIds, rosterLookup);
    row.secondsPlayed = usage.secondsPlayed;
    row.stintCount = usage.stintCount;
  }

  for (const event of events) {
    const lineupIds = getEventLineupIds(event, teamSide);
    if (lineupIds.length === 0) {
      continue;
    }

    const scoredPoints = getScoredPoints(event);
    const pointsFor = event.teamSide === teamSide ? scoredPoints : 0;
    const pointsAgainst = event.teamSide === teamSide ? 0 : scoredPoints;
    registerLineupImpact(
      rows,
      lineupIds,
      pointsFor,
      pointsAgainst,
      rosterLookup,
      scoredPoints > 0,
    );
  }

  return Array.from(rows.values()).sort(
    (left, right) =>
      Number(right.key === buildLineupKey(currentLineupIds)) -
        Number(left.key === buildLineupKey(currentLineupIds)) ||
      right.plusMinus - left.plusMinus ||
      right.pointsFor - left.pointsFor ||
      right.totalEvents - left.totalEvents,
  );
}

function getLineupGroupAnalytics(
  events: GameEventFeedItem[],
  teamSide: TeamSide,
  rosterLookup: Map<string, string>,
  currentLineupIds: string[],
  usageMap: Map<string, UsageRow>,
  groupSize: LineupGroupSize,
): LineupAnalyticsRow[] {
  const rows = new Map<string, LineupAnalyticsRow>();

  for (const [key, usage] of usageMap.entries()) {
    const playerIds = key.split("|").filter(Boolean);
    const row = ensureLineupRow(rows, playerIds, rosterLookup);
    row.secondsPlayed = usage.secondsPlayed;
    row.stintCount = usage.stintCount;
  }

  for (const event of events) {
    const lineupIds = getEventLineupIds(event, teamSide);
    if (lineupIds.length < groupSize) {
      continue;
    }

    const scoredPoints = getScoredPoints(event);
    const pointsFor = event.teamSide === teamSide ? scoredPoints : 0;
    const pointsAgainst = event.teamSide === teamSide ? 0 : scoredPoints;

    for (const groupKey of buildGroupKeys(lineupIds, groupSize)) {
      registerLineupImpact(
        rows,
        groupKey.split("|").filter(Boolean),
        pointsFor,
        pointsAgainst,
        rosterLookup,
        scoredPoints > 0,
      );
    }
  }

  const currentGroupKeys = buildGroupKeys(currentLineupIds, groupSize);
  return Array.from(rows.values()).sort(
    (left, right) =>
      Number(currentGroupKeys.has(right.key)) - Number(currentGroupKeys.has(left.key)) ||
      right.plusMinus - left.plusMinus ||
      right.pointsFor - left.pointsFor ||
      right.totalEvents - left.totalEvents,
  );
}

function buildPlayerPlusMinus(events: GameEventFeedItem[]) {
  const home = new Map<string, number>();
  const away = new Map<string, number>();
  const chronologicalEvents = [...events].sort((left, right) => left.sequenceNumber - right.sequenceNumber);

  for (const event of chronologicalEvents) {
    const points = getScoredPoints(event);
    if (points === 0) {
      continue;
    }

    const scoringIds = event.teamSide === "home" ? event.activeHomeRosterIds : event.activeAwayRosterIds;
    const defendingIds = event.teamSide === "home" ? event.activeAwayRosterIds : event.activeHomeRosterIds;
    const scoringMap = event.teamSide === "home" ? home : away;
    const defendingMap = event.teamSide === "home" ? away : home;

    for (const playerId of scoringIds) {
      scoringMap.set(playerId, (scoringMap.get(playerId) ?? 0) + points);
    }

    for (const playerId of defendingIds) {
      defendingMap.set(playerId, (defendingMap.get(playerId) ?? 0) - points);
    }
  }

  return { home, away };
}

function buildSecondChanceSnapshot(events: GameEventFeedItem[]): SecondChanceSnapshot {
  const snapshot: SecondChanceSnapshot = {
    teamPoints: { home: 0, away: 0 },
    playerPoints: new Map<string, number>(),
    offensePlayPoints: new Map<string, number>(),
    defensePlayPoints: new Map<string, number>(),
  };
  const chronologicalEvents = [...events].sort((left, right) => left.sequenceNumber - right.sequenceNumber);
  const activeFlags: Record<TeamSide, boolean> = { home: false, away: false };
  let activeQuarter: number | null = null;

  for (const event of chronologicalEvents) {
    if (activeQuarter !== event.quarter) {
      activeQuarter = event.quarter;
      activeFlags.home = false;
      activeFlags.away = false;
    }

    if (event.eventType === "rebound_off") {
      activeFlags[event.teamSide] = true;
      activeFlags[getOpponentSide(event.teamSide)] = false;
      continue;
    }

    if (event.eventType === "rebound_def" || event.eventType === "turnover" || event.eventType === "steal") {
      activeFlags.home = false;
      activeFlags.away = false;
      continue;
    }

    const points = getScoredPoints(event);
    if (points > 0 && activeFlags[event.teamSide]) {
      snapshot.teamPoints[event.teamSide] += points;

      if (event.rosterMembershipId) {
        snapshot.playerPoints.set(
          event.rosterMembershipId,
          (snapshot.playerPoints.get(event.rosterMembershipId) ?? 0) + points,
        );
      }
      if (event.offensePlayId) {
        snapshot.offensePlayPoints.set(
          event.offensePlayId,
          (snapshot.offensePlayPoints.get(event.offensePlayId) ?? 0) + points,
        );
      }
      if (event.defensePlayId) {
        snapshot.defensePlayPoints.set(
          event.defensePlayId,
          (snapshot.defensePlayPoints.get(event.defensePlayId) ?? 0) + points,
        );
      }
    }

    if (points > 0) {
      activeFlags.home = false;
      activeFlags.away = false;
    }
  }

  return snapshot;
}

function buildPointsOffTurnoversSnapshot(events: GameEventFeedItem[]): PointsOffTurnoversSnapshot {
  const snapshot: PointsOffTurnoversSnapshot = {
    teamPoints: { home: 0, away: 0 },
  };
  const chronologicalEvents = [...events].sort((left, right) => left.sequenceNumber - right.sequenceNumber);
  let pendingSide: TeamSide | null = null;
  let turnoverTeam: TeamSide | null = null;

  for (const event of chronologicalEvents) {
    if (event.eventType === "turnover") {
      turnoverTeam = event.teamSide;
      pendingSide = getOpponentSide(event.teamSide);
      continue;
    }

    if (!pendingSide || !turnoverTeam) {
      continue;
    }

    if (event.teamSide === pendingSide) {
      const points = getScoredPoints(event);
      if (points > 0) {
        snapshot.teamPoints[pendingSide] += points;
      }
      if (event.eventType === "turnover") {
        pendingSide = null;
        turnoverTeam = null;
      }
      continue;
    }

    if (
      event.teamSide === turnoverTeam &&
      (event.eventType === "shot" ||
        event.eventType === "turnover" ||
        event.eventType === "rebound_off" ||
        event.eventType === "rebound_def" ||
        event.eventType === "steal")
    ) {
      pendingSide = null;
      turnoverTeam = null;
    }
  }

  return snapshot;
}

function buildPaintPointsSnapshot(events: GameEventFeedItem[]): PaintPointsSnapshot {
  const snapshot: PaintPointsSnapshot = {
    teamPoints: { home: 0, away: 0 },
    playerPoints: new Map<string, number>(),
  };

  for (const event of events) {
    if (!isPaintMake(event)) {
      continue;
    }

    snapshot.teamPoints[event.teamSide] += 2;
    if (event.rosterMembershipId) {
      snapshot.playerPoints.set(
        event.rosterMembershipId,
        (snapshot.playerPoints.get(event.rosterMembershipId) ?? 0) + 2,
      );
    }
  }

  return snapshot;
}

function isAdministrativeEvent(event: GameEventFeedItem) {
  return (
    event.eventType === "lineup_change" ||
    event.eventType === "timeout_full" ||
    event.eventType === "timeout_30"
  );
}

function inferOffenseSideFromEvent(
  event: GameEventFeedItem,
  currentOffenseSide: TeamSide | null,
): TeamSide | null {
  if (event.eventType === "shot" || event.eventType === "turnover" || event.eventType === "rebound_off") {
    return event.teamSide;
  }

  if (event.eventType === "steal" || event.eventType === "rebound_def") {
    return getOpponentSide(event.teamSide);
  }

  return currentOffenseSide ?? event.teamOnOffense ?? null;
}

function shouldStartTrip(event: GameEventFeedItem, inferredOffenseSide: TeamSide | null) {
  if (!inferredOffenseSide || isAdministrativeEvent(event)) {
    return false;
  }

  return event.eventType !== "steal" && event.eventType !== "rebound_def";
}

function createEmptyPossessionTrip(event: GameEventFeedItem, offenseSide: TeamSide): PossessionTrip {
  return {
    key: `${event.quarter}-${event.sequenceNumber}-${offenseSide}`,
    quarter: event.quarter,
    offenseSide,
    offensePlayId: event.offensePlayId ?? null,
    defensePlayId: event.defensePlayId ?? null,
    points: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    paintPoints: 0,
    secondChancePoints: 0,
    turnovers: 0,
    offRebounds: 0,
    foulsDrawn: 0,
    defensiveRebounds: 0,
    foulsCommitted: 0,
    hasTrackedAction: false,
  };
}

function buildPossessionTrips(events: GameEventFeedItem[]) {
  const trips: PossessionTrip[] = [];
  const chronologicalEvents = [...events].sort((left, right) => left.sequenceNumber - right.sequenceNumber);
  let currentTrip: PossessionTrip | null = null;
  let secondChanceActive = false;

  function closeCurrentTrip() {
    if (currentTrip?.hasTrackedAction) {
      trips.push(currentTrip);
    }
    currentTrip = null;
    secondChanceActive = false;
  }

  for (const event of chronologicalEvents) {
    const inferredOffenseSide = inferOffenseSideFromEvent(event, currentTrip?.offenseSide ?? null);

    if (currentTrip && event.quarter !== currentTrip.quarter) {
      closeCurrentTrip();
    }

    if (currentTrip && inferredOffenseSide && inferredOffenseSide !== currentTrip.offenseSide && currentTrip.hasTrackedAction) {
      closeCurrentTrip();
    }

    if (!currentTrip && shouldStartTrip(event, inferredOffenseSide)) {
      currentTrip = createEmptyPossessionTrip(event, inferredOffenseSide!);
    }

    if (!currentTrip) {
      continue;
    }

    if (event.offensePlayId) {
      currentTrip.offensePlayId = event.offensePlayId;
    }
    if (event.defensePlayId) {
      currentTrip.defensePlayId = event.defensePlayId;
    }
    if (isAdministrativeEvent(event)) {
      continue;
    }

    if (event.teamSide === currentTrip.offenseSide) {
      if (event.eventType === "shot") {
        currentTrip.hasTrackedAction = true;
        if (event.shotValue === 1) {
          currentTrip.fta += 1;
          if (event.shotResult === "make") {
            currentTrip.ftm += 1;
            currentTrip.points += 1;
            if (secondChanceActive) {
              currentTrip.secondChancePoints += 1;
            }
          }
        } else {
          currentTrip.fga += 1;
          if (event.shotValue === 3) {
            currentTrip.threePa += 1;
          }
          if (event.shotResult === "make") {
            currentTrip.fgm += 1;
            currentTrip.points += event.shotValue ?? 0;
            if (event.shotValue === 3) {
              currentTrip.threePm += 1;
            }
            if (isPaintMake(event)) {
              currentTrip.paintPoints += 2;
            }
            if (secondChanceActive) {
              currentTrip.secondChancePoints += event.shotValue ?? 0;
            }
          }
        }
      }

      if (event.eventType === "rebound_off") {
        currentTrip.hasTrackedAction = true;
        currentTrip.offRebounds += 1;
        secondChanceActive = true;
      }

      if (event.eventType === "turnover") {
        currentTrip.hasTrackedAction = true;
        currentTrip.turnovers = 1;
      }
    } else {
      if (event.eventType === "personal_foul") {
        currentTrip.hasTrackedAction = true;
        currentTrip.foulsDrawn += 1;
        currentTrip.foulsCommitted += 1;
      }

      if (event.eventType === "rebound_def") {
        currentTrip.hasTrackedAction = true;
        currentTrip.defensiveRebounds += 1;
      }

      if (event.eventType === "steal") {
        currentTrip.hasTrackedAction = true;
        currentTrip.turnovers = 1;
      }
    }

    if (event.teamSide === currentTrip.offenseSide && event.eventType === "turnover") {
      closeCurrentTrip();
      continue;
    }

    if (event.teamSide !== currentTrip.offenseSide && event.eventType === "steal") {
      closeCurrentTrip();
      continue;
    }

    if (event.teamSide !== currentTrip.offenseSide && event.eventType === "rebound_def") {
      closeCurrentTrip();
    }
  }

  if (currentTrip?.hasTrackedAction) {
    closeCurrentTrip();
  }

  return trips;
}

function buildOffensePlayAnalytics(
  trips: PossessionTrip[],
  plays: Array<{ id: string; name: string; family: string; imageUrl?: string | null }>,
  teamSide: TeamSide,
) {
  const rows = new Map<string, PlayAnalyticsRow>(
    plays.map((play) => [
      play.id,
      {
        id: play.id,
        name: play.name,
        family: play.family,
        imageUrl: play.imageUrl ?? null,
        fgm: 0,
        fga: 0,
        threePm: 0,
        threePa: 0,
        ftm: 0,
        fta: 0,
        points: 0,
        paintPoints: 0,
        secondChancePoints: 0,
        turnovers: 0,
        offRebounds: 0,
        foulsDrawn: 0,
        possessions: 0,
        pointsPerPossession: "-",
      },
    ]),
  );

  for (const trip of trips) {
    if (trip.offenseSide !== teamSide || !trip.offensePlayId || !rows.has(trip.offensePlayId)) {
      continue;
    }

    const row = rows.get(trip.offensePlayId)!;
    row.fgm += trip.fgm;
    row.fga += trip.fga;
    row.threePm += trip.threePm;
    row.threePa += trip.threePa;
    row.ftm += trip.ftm;
    row.fta += trip.fta;
    row.points += trip.points;
    row.paintPoints += trip.paintPoints;
    row.secondChancePoints += trip.secondChancePoints;
    row.turnovers += trip.turnovers;
    row.offRebounds += trip.offRebounds;
    row.foulsDrawn += trip.foulsDrawn;
    row.possessions += 1;
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      pointsPerPossession: row.possessions > 0 ? formatDecimal(row.points / row.possessions) : "-",
    }))
    .sort((left, right) => right.points - left.points || right.possessions - left.possessions);
}

function buildDefensePlayAnalytics(
  trips: PossessionTrip[],
  plays: Array<{ id: string; name: string; family: string; imageUrl?: string | null }>,
  teamSide: TeamSide,
) {
  const rows = new Map<string, PlayAnalyticsRow>(
    plays.map((play) => [
      play.id,
      {
        id: play.id,
        name: play.name,
        family: play.family,
        imageUrl: play.imageUrl ?? null,
        fgm: 0,
        fga: 0,
        threePm: 0,
        threePa: 0,
        ftm: 0,
        fta: 0,
        points: 0,
        paintPoints: 0,
        secondChancePoints: 0,
        turnovers: 0,
        offRebounds: 0,
        foulsDrawn: 0,
        possessions: 0,
        pointsPerPossession: "-",
      },
    ]),
  );

  for (const trip of trips) {
    if (getOpponentSide(trip.offenseSide) !== teamSide || !trip.defensePlayId || !rows.has(trip.defensePlayId)) {
      continue;
    }

    const row = rows.get(trip.defensePlayId)!;
    row.fgm += trip.fgm;
    row.fga += trip.fga;
    row.threePm += trip.threePm;
    row.threePa += trip.threePa;
    row.ftm += trip.ftm;
    row.fta += trip.fta;
    row.points += trip.points;
    row.paintPoints += trip.paintPoints;
    row.secondChancePoints += trip.secondChancePoints;
    row.turnovers += trip.turnovers;
    row.offRebounds += trip.offRebounds;
    row.foulsDrawn += trip.foulsCommitted;
    row.possessions += 1;
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      pointsPerPossession: row.possessions > 0 ? formatDecimal(row.points / row.possessions) : "-",
    }))
    .sort((left, right) => {
      const leftValue = Number.parseFloat(left.pointsPerPossession);
      const rightValue = Number.parseFloat(right.pointsPerPossession);
      const normalizedLeft = Number.isFinite(leftValue) ? leftValue : Number.POSITIVE_INFINITY;
      const normalizedRight = Number.isFinite(rightValue) ? rightValue : Number.POSITIVE_INFINITY;
      return normalizedLeft - normalizedRight || left.points - right.points;
    });
}

function buildQuarterBreakdown(events: GameEventFeedItem[], quarters: number[]) {
  return quarters.map((quarter) => {
    const quarterEvents = events.filter((event) => event.quarter === quarter);

    return quarterEvents.reduce(
      (row, event) => {
        if (event.eventType === "shot" && event.shotResult === "make") {
          if (event.teamSide === "home") {
            row.homePoints += event.shotValue ?? 0;
          } else {
            row.awayPoints += event.shotValue ?? 0;
          }
        }

        if (event.eventType === "turnover") {
          if (event.teamSide === "home") {
            row.homeTurnovers += 1;
          } else {
            row.awayTurnovers += 1;
          }
        }

        if (event.eventType === "personal_foul") {
          if (event.teamSide === "home") {
            row.homeFouls += 1;
          } else {
            row.awayFouls += 1;
          }
        }

        if (event.eventType === "rebound_off" || event.eventType === "rebound_def") {
          if (event.teamSide === "home") {
            row.homeRebounds += 1;
          } else {
            row.awayRebounds += 1;
          }
        }

        row.possessions += 1;
        return row;
      },
      {
        quarter,
        homePoints: 0,
        awayPoints: 0,
        homeRebounds: 0,
        awayRebounds: 0,
        homeTurnovers: 0,
        awayTurnovers: 0,
        homeFouls: 0,
        awayFouls: 0,
        possessions: 0,
      },
    );
  });
}

export function getAvailableQuarters(snapshot: LiveScorerSnapshot, eventFeed: GameEventFeedItem[]) {
  return Array.from(new Set([1, 2, 3, 4, snapshot.quarter, ...eventFeed.map((event) => event.quarter)]))
    .filter((quarter) => quarter >= 1)
    .sort((left, right) => left - right);
}

export function buildGameStatsReport(
  snapshot: LiveScorerSnapshot,
  eventFeed: GameEventFeedItem[],
  activeQuarters: number[],
): GameStatsReport {
  const filteredEventFeed = activeQuarters.length > 0
    ? eventFeed.filter((event) => activeQuarters.includes(event.quarter))
    : eventFeed;
  const boxScore = buildLiveBoxScore(snapshot, filteredEventFeed);
  const homeTeamTotals = aggregateBoxScoreRows(boxScore.homeRows);
  const awayTeamTotals = aggregateBoxScoreRows(boxScore.awayRows);
  const quarterBreakdown = buildQuarterBreakdown(filteredEventFeed, activeQuarters);
  const minutesSnapshot = buildMinutesSnapshot(snapshot, eventFeed, activeQuarters);
  const playerPlusMinus = buildPlayerPlusMinus(filteredEventFeed);
  const secondChanceSnapshot = buildSecondChanceSnapshot(filteredEventFeed);
  const pointsOffTurnoversSnapshot = buildPointsOffTurnoversSnapshot(filteredEventFeed);
  const paintPointsSnapshot = buildPaintPointsSnapshot(filteredEventFeed);
  const possessionTrips = buildPossessionTrips(filteredEventFeed);
  const homeRosterLookup = buildRosterLookup(snapshot.homeTeam.roster);
  const awayRosterLookup = buildRosterLookup(snapshot.awayTeam.roster);
  const currentHomeLineupIds = [...snapshot.homeTeam.onFloorIds].sort();
  const currentAwayLineupIds = [...snapshot.awayTeam.onFloorIds].sort();
  const currentHomeLineupKey = buildLineupKey(currentHomeLineupIds);
  const currentAwayLineupKey = buildLineupKey(currentAwayLineupIds);
  const currentHomeGroupKeys = {
    2: buildGroupKeys(currentHomeLineupIds, 2),
    3: buildGroupKeys(currentHomeLineupIds, 3),
    4: buildGroupKeys(currentHomeLineupIds, 4),
  };
  const currentAwayGroupKeys = {
    2: buildGroupKeys(currentAwayLineupIds, 2),
    3: buildGroupKeys(currentAwayLineupIds, 3),
    4: buildGroupKeys(currentAwayLineupIds, 4),
  };
  const homeLineupAnalytics = getLineupAnalytics(
    filteredEventFeed,
    "home",
    homeRosterLookup,
    currentHomeLineupIds,
    minutesSnapshot.lineupUsage.home,
  );
  const awayLineupAnalytics = getLineupAnalytics(
    filteredEventFeed,
    "away",
    awayRosterLookup,
    currentAwayLineupIds,
    minutesSnapshot.lineupUsage.away,
  );
  const homeLineupGroups = {
    2: getLineupGroupAnalytics(filteredEventFeed, "home", homeRosterLookup, currentHomeLineupIds, minutesSnapshot.groupUsage.home[2], 2),
    3: getLineupGroupAnalytics(filteredEventFeed, "home", homeRosterLookup, currentHomeLineupIds, minutesSnapshot.groupUsage.home[3], 3),
    4: getLineupGroupAnalytics(filteredEventFeed, "home", homeRosterLookup, currentHomeLineupIds, minutesSnapshot.groupUsage.home[4], 4),
  };
  const awayLineupGroups = {
    2: getLineupGroupAnalytics(filteredEventFeed, "away", awayRosterLookup, currentAwayLineupIds, minutesSnapshot.groupUsage.away[2], 2),
    3: getLineupGroupAnalytics(filteredEventFeed, "away", awayRosterLookup, currentAwayLineupIds, minutesSnapshot.groupUsage.away[3], 3),
    4: getLineupGroupAnalytics(filteredEventFeed, "away", awayRosterLookup, currentAwayLineupIds, minutesSnapshot.groupUsage.away[4], 4),
  };
  const homeOffensePlayAnalytics = buildOffensePlayAnalytics(possessionTrips, snapshot.homeTeam.offensePlays, "home");
  const awayOffensePlayAnalytics = buildOffensePlayAnalytics(possessionTrips, snapshot.awayTeam.offensePlays, "away");
  const homeDefensePlayAnalytics = buildDefensePlayAnalytics(possessionTrips, snapshot.homeTeam.defensePlays, "home");
  const awayDefensePlayAnalytics = buildDefensePlayAnalytics(possessionTrips, snapshot.awayTeam.defensePlays, "away");
  const shotMarkers = filteredEventFeed
    .filter((event) => event.shotX !== null && event.shotY !== null)
    .map((event) => ({
      id: event.id,
      x: event.shotX ?? 0,
      y: event.shotY ?? 0,
      result: event.shotResult,
      value: event.shotValue,
      teamSide: event.teamSide,
      rosterMembershipId: event.rosterMembershipId,
      playerName:
        (event.rosterMembershipId
          ? homeRosterLookup.get(event.rosterMembershipId) ?? awayRosterLookup.get(event.rosterMembershipId)
          : null) ?? event.teamName,
      jersey:
        snapshot.homeTeam.roster.find((player) => player.id === event.rosterMembershipId)?.jersey ??
        snapshot.awayTeam.roster.find((player) => player.id === event.rosterMembershipId)?.jersey ??
        "",
      quarter: event.quarter,
      secondsRemaining: event.secondsRemaining,
    }));
  const ourSide = getOurTeamSide(snapshot);
  const opponentSide = getOpponentSide(ourSide);

  return {
    availableQuarters: getAvailableQuarters(snapshot, eventFeed),
    activeQuarters,
    boxScore,
    homeTeamTotals,
    awayTeamTotals,
    ourSide,
    opponentSide,
    ourName: ourSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name,
    opponentName: opponentSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name,
    ourRows: ourSide === "home" ? boxScore.homeRows : boxScore.awayRows,
    opponentRows: opponentSide === "home" ? boxScore.homeRows : boxScore.awayRows,
    quarterBreakdown,
    minutesSnapshot,
    playerPlusMinus,
    secondChanceSnapshot,
    pointsOffTurnoversSnapshot,
    paintPointsSnapshot,
    homeLineupAnalytics,
    awayLineupAnalytics,
    homeLineupGroups,
    awayLineupGroups,
    homeOffensePlayAnalytics,
    awayOffensePlayAnalytics,
    homeDefensePlayAnalytics,
    awayDefensePlayAnalytics,
    shotMarkers,
    currentHomeLineupKey,
    currentAwayLineupKey,
    currentHomeGroupKeys,
    currentAwayGroupKeys,
  };
}

function buildLiveBoxScore(snapshot: LiveScorerSnapshot, eventFeed: GameEventFeedItem[]): LiveBoxScore {
  const homeRows = snapshot.homeTeam.roster.map((player) => ({
    rosterMembershipId: player.id,
    playerName: player.name,
    jersey: player.jersey,
    position: player.position,
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
  }));
  const awayRows = snapshot.awayTeam.roster.map((player) => ({
    rosterMembershipId: player.id,
    playerName: player.name,
    jersey: player.jersey,
    position: player.position,
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
  }));
  const rowMap = new Map<string, BoxScoreRow>();

  for (const row of [...homeRows, ...awayRows]) {
    rowMap.set(row.rosterMembershipId, row);
  }

  for (const event of eventFeed) {
    if (!event.rosterMembershipId) continue;
    const row = rowMap.get(event.rosterMembershipId);
    if (!row) continue;

    if (event.eventType === "shot") {
      if (event.shotValue === 1) {
        row.fta += 1;
        if (event.shotResult === "make") {
          row.ftm += 1;
          row.points += 1;
        }
      } else {
        row.fga += 1;
        if (event.shotValue === 3) row.threePa += 1;
        if (event.shotResult === "make") {
          row.fgm += 1;
          row.points += event.shotValue ?? 0;
          if (event.shotValue === 3) row.threePm += 1;
        }
      }
    }

    if (event.eventType === "rebound_off") {
      row.oreb += 1;
      row.reb += 1;
    }
    if (event.eventType === "rebound_def") {
      row.dreb += 1;
      row.reb += 1;
    }
    if (event.eventType === "assist") row.ast += 1;
    if (event.eventType === "steal") row.stl += 1;
    if (event.eventType === "block") row.blk += 1;
    if (event.eventType === "turnover") row.turnovers += 1;
    if (event.eventType === "personal_foul") row.fouls += 1;
  }

  return {
    homeTeamName: snapshot.homeTeam.name,
    awayTeamName: snapshot.awayTeam.name,
    homeRows,
    awayRows,
  };
}

function mergeUsageMaps(target: Map<string, UsageRow>, source: Map<string, UsageRow>) {
  for (const [key, usage] of source.entries()) {
    const current = target.get(key) ?? { secondsPlayed: 0, stintCount: 0 };
    current.secondsPlayed += usage.secondsPlayed;
    current.stintCount += usage.stintCount;
    target.set(key, current);
  }
}

function mergeNumericMap(target: Map<string, number>, source: Map<string, number>) {
  for (const [key, value] of source.entries()) {
    target.set(key, (target.get(key) ?? 0) + value);
  }
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

function mergePlayAnalyticsRows(target: Map<string, PlayAnalyticsRow>, rows: PlayAnalyticsRow[]) {
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
      current.possessions > 0 ? formatDecimal(current.points / current.possessions) : "-";
    target.set(row.id, current);
  }
}

export function buildSeasonStatsReport(
  seasonGames: Array<{ gameId: string; report: GameStatsReport }>,
) : SeasonStatsReport {
  const playerRows = aggregateSeasonPlayerRows(seasonGames.map((item) => item.report.ourRows));
  const opponentPlayerRows = aggregateSeasonPlayerRows(
    seasonGames.map((item) => item.report.opponentRows),
  );
  const ourTeamTotals = sumTeamTotals(seasonGames.map((item) =>
    item.report.ourSide === "home" ? item.report.homeTeamTotals : item.report.awayTeamTotals,
  ));
  const opponentTeamTotals = sumTeamTotals(seasonGames.map((item) =>
    item.report.opponentSide === "home" ? item.report.homeTeamTotals : item.report.awayTeamTotals,
  ));
  const playerUsage = new Map<string, UsageRow>();
  const playerPlusMinus = new Map<string, number>();
  const secondChancePoints = new Map<string, number>();
  const paintPoints = new Map<string, number>();
  const lineupRows = new Map<string, LineupAnalyticsRow>();
  const groupRows = {
    2: new Map<string, LineupAnalyticsRow>(),
    3: new Map<string, LineupAnalyticsRow>(),
    4: new Map<string, LineupAnalyticsRow>(),
  } satisfies Record<LineupGroupSize, Map<string, LineupAnalyticsRow>>;
  const offensePlayRows = new Map<string, PlayAnalyticsRow>();
  const defensePlayRows = new Map<string, PlayAnalyticsRow>();
  const opponentOffensePlayRows = new Map<string, PlayAnalyticsRow>();
  const opponentDefensePlayRows = new Map<string, PlayAnalyticsRow>();
  const shotMarkers: ShotMarker[] = [];
  const quarterRows = new Map<number, SeasonStatsReport["quarterBreakdown"][number]>();
  let wins = 0;
  let losses = 0;
  let ourSecondChancePoints = 0;
  let opponentSecondChancePoints = 0;
  let ourPointsOffTurnovers = 0;
  let opponentPointsOffTurnovers = 0;
  let ourPaintPoints = 0;
  let opponentPaintPoints = 0;

  for (const { report } of seasonGames) {
    if (report.ourRows.reduce((sum, row) => sum + row.points, 0) > report.opponentRows.reduce((sum, row) => sum + row.points, 0)) {
      wins += 1;
    } else if (report.ourRows.reduce((sum, row) => sum + row.points, 0) < report.opponentRows.reduce((sum, row) => sum + row.points, 0)) {
      losses += 1;
    }

    const ourUsageMap = report.ourSide === "home"
      ? new Map([...report.minutesSnapshot.playerUsage.entries()].filter(([key]) => report.boxScore.homeRows.some((row) => row.rosterMembershipId === key)))
      : new Map([...report.minutesSnapshot.playerUsage.entries()].filter(([key]) => report.boxScore.awayRows.some((row) => row.rosterMembershipId === key)));
    mergeUsageMaps(playerUsage, ourUsageMap);
    mergeNumericMap(
      playerPlusMinus,
      report.ourSide === "home" ? report.playerPlusMinus.home : report.playerPlusMinus.away,
    );
    mergeNumericMap(secondChancePoints, report.secondChanceSnapshot.playerPoints);
    mergeNumericMap(paintPoints, report.paintPointsSnapshot.playerPoints);
    if (report.ourSide === "home") {
      ourSecondChancePoints += report.secondChanceSnapshot.teamPoints.home;
      opponentSecondChancePoints += report.secondChanceSnapshot.teamPoints.away;
      ourPointsOffTurnovers += report.pointsOffTurnoversSnapshot.teamPoints.home;
      opponentPointsOffTurnovers += report.pointsOffTurnoversSnapshot.teamPoints.away;
      ourPaintPoints += report.paintPointsSnapshot.teamPoints.home;
      opponentPaintPoints += report.paintPointsSnapshot.teamPoints.away;
    } else {
      ourSecondChancePoints += report.secondChanceSnapshot.teamPoints.away;
      opponentSecondChancePoints += report.secondChanceSnapshot.teamPoints.home;
      ourPointsOffTurnovers += report.pointsOffTurnoversSnapshot.teamPoints.away;
      opponentPointsOffTurnovers += report.pointsOffTurnoversSnapshot.teamPoints.home;
      ourPaintPoints += report.paintPointsSnapshot.teamPoints.away;
      opponentPaintPoints += report.paintPointsSnapshot.teamPoints.home;
    }
    mergeLineupRows(lineupRows, report.ourSide === "home" ? report.homeLineupAnalytics : report.awayLineupAnalytics);
    for (const size of [2, 3, 4] as LineupGroupSize[]) {
      mergeLineupRows(groupRows[size], report.ourSide === "home" ? report.homeLineupGroups[size] : report.awayLineupGroups[size]);
    }
    mergePlayAnalyticsRows(offensePlayRows, report.ourSide === "home" ? report.homeOffensePlayAnalytics : report.awayOffensePlayAnalytics);
    mergePlayAnalyticsRows(defensePlayRows, report.ourSide === "home" ? report.homeDefensePlayAnalytics : report.awayDefensePlayAnalytics);
    mergePlayAnalyticsRows(opponentOffensePlayRows, report.ourSide === "home" ? report.awayOffensePlayAnalytics : report.homeOffensePlayAnalytics);
    mergePlayAnalyticsRows(opponentDefensePlayRows, report.ourSide === "home" ? report.awayDefensePlayAnalytics : report.homeDefensePlayAnalytics);

    shotMarkers.push(
      ...report.shotMarkers.map((marker) => ({
        ...marker,
        teamSide:
          (marker.teamSide === report.ourSide ? "home" : "away") as "home" | "away",
      })),
    );

    for (const row of report.quarterBreakdown) {
      const current = quarterRows.get(row.quarter) ?? {
        quarter: row.quarter,
        ourPoints: 0,
        opponentPoints: 0,
        ourRebounds: 0,
        opponentRebounds: 0,
        ourTurnovers: 0,
        opponentTurnovers: 0,
        ourFouls: 0,
        opponentFouls: 0,
        events: 0,
      };
      if (report.ourSide === "home") {
        current.ourPoints += row.homePoints;
        current.opponentPoints += row.awayPoints;
        current.ourRebounds += row.homeRebounds;
        current.opponentRebounds += row.awayRebounds;
        current.ourTurnovers += row.homeTurnovers;
        current.opponentTurnovers += row.awayTurnovers;
        current.ourFouls += row.homeFouls;
        current.opponentFouls += row.awayFouls;
      } else {
        current.ourPoints += row.awayPoints;
        current.opponentPoints += row.homePoints;
        current.ourRebounds += row.awayRebounds;
        current.opponentRebounds += row.homeRebounds;
        current.ourTurnovers += row.awayTurnovers;
        current.opponentTurnovers += row.homeTurnovers;
        current.ourFouls += row.awayFouls;
        current.opponentFouls += row.homeFouls;
      }
      current.events += row.possessions;
      quarterRows.set(row.quarter, current);
    }
  }

  return {
    seasonGameCount: seasonGames.length,
    seasonRecord: { wins, losses },
    playerRows,
    opponentPlayerRows,
    ourTeamTotals,
    opponentTeamTotals,
    ourSecondChancePoints,
    opponentSecondChancePoints,
    ourPointsOffTurnovers,
    opponentPointsOffTurnovers,
    ourPaintPoints,
    opponentPaintPoints,
    playerUsage,
    playerPlusMinus,
    secondChancePoints,
    paintPoints,
    lineupAnalytics: [...lineupRows.values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed),
    lineupGroups: {
      2: [...groupRows[2].values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed),
      3: [...groupRows[3].values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed),
      4: [...groupRows[4].values()].sort((left, right) => right.plusMinus - left.plusMinus || right.secondsPlayed - left.secondsPlayed),
    },
    offensePlayAnalytics: [...offensePlayRows.values()].sort((left, right) => right.points - left.points || right.possessions - left.possessions),
    defensePlayAnalytics: [...defensePlayRows.values()].sort((left, right) => Number.parseFloat(left.pointsPerPossession) - Number.parseFloat(right.pointsPerPossession)),
    opponentOffensePlayAnalytics: [...opponentOffensePlayRows.values()].sort((left, right) => right.points - left.points || right.possessions - left.possessions),
    opponentDefensePlayAnalytics: [...opponentDefensePlayRows.values()].sort((left, right) => Number.parseFloat(left.pointsPerPossession) - Number.parseFloat(right.pointsPerPossession)),
    shotMarkers,
    quarterBreakdown: [...quarterRows.values()].sort((left, right) => left.quarter - right.quarter),
  };
}
