import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteGameEventAction,
  editGameEventAction,
} from "@/app/games/actions";
import { CoachGameDayTaskStrip } from "@/components/coach-game-day-task-strip";
import { LiveGameWithScoringControl } from "@/components/live-game-with-scoring-control";
import { LiveSyncControls } from "@/components/live-sync-controls";
import { ScorerDeviceIdInput } from "@/components/scorer-device-id";
import { StatsQuarterFilterControls } from "@/components/stats-quarter-filter-controls";
import { StatsOverlayTabNav } from "@/components/stats-overlay-tab-nav";
import { SubstitutionsPanelForm } from "@/components/substitutions-panel-form";
import { requireAccessRole } from "@/lib/access-control";
import {
  type BoxScoreRow,
  type GameEventFeedItem,
  buildLiveBoxScoreFromEvents,
  filterGameEventsByQuarter,
  getLiveScorerSnapshot,
  getScoringLock,
  listGameEventFeed,
} from "@/lib/admin-repository";

type StatsTab =
  | "player"
  | "player-advanced"
  | "team"
  | "team-advanced"
  | "lineup"
  | "lineup-groups"
  | "plays"
  | "quarter";

type TeamSide = "home" | "away";
type LineupGroupSize = 2 | 3 | 4;

interface LineupAnalyticsRow {
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

interface PlayAnalyticsRow {
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

const REGULATION_PERIOD_SECONDS = 480;
const OVERTIME_PERIOD_SECONDS = 240;

function formatClock(secondsRemaining: number) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function rosterOptionLabel(name: string, jersey: string, position: string) {
  return `${name} ${jersey} · ${position}`;
}

function parseQuarterFilter(value: string | string[] | undefined) {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];
  return rawValues
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 10);
}

function formatQuarterLabel(quarter: number) {
  if (quarter <= 4) {
    return `Q${quarter}`;
  }

  return quarter === 5 ? "OT" : `OT${quarter - 4}`;
}

function formatQuarterSummary(quarters: number[]) {
  return quarters.map(formatQuarterLabel).join(" + ");
}

function parseStatsTab(value: string | string[] | undefined) {
  const tabValue = Array.isArray(value) ? value[0] : value;
  return tabValue === "player-advanced" ||
    tabValue === "team" ||
    tabValue === "team-advanced" ||
    tabValue === "lineup" ||
    tabValue === "lineup-groups" ||
    tabValue === "plays" ||
    tabValue === "quarter"
    ? tabValue
    : "player";
}

function buildGameHref(gameId: string, options: {
  tab?: StatsTab;
  quarters?: number[];
}) {
  const params = new URLSearchParams();

  if (options.tab) {
    params.set("tab", options.tab);
  }

  for (const quarter of options.quarters ?? []) {
    params.append("quarter", String(quarter));
  }

  return `/games/${gameId}?${params.toString()}`;
}

function buildGameTabHref(
  gameId: string,
  tab: StatsTab,
  quarters: number[],
) {
  return buildGameHref(gameId, { tab, quarters });
}

function buildGameViewHref(gameId: string, tab: StatsTab) {
  return buildGameHref(gameId, { tab });
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
    {
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
    },
  );
}

function formatPercentage(makes: number, attempts: number) {
  if (attempts === 0) {
    return "-";
  }

  return `${((makes / attempts) * 100).toFixed(1)}%`;
}

function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits);
}

function formatMinutes(seconds: number) {
  return formatDecimal(seconds / 60, 1);
}

function formatRatio(numerator: number, denominator: number) {
  if (denominator === 0) {
    return numerator === 0 ? "-" : `${numerator}`;
  }

  return formatDecimal(numerator / denominator);
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
    ({
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
    } satisfies LineupAnalyticsRow);

  collection.set(key, existing);
  return existing;
}

function buildMinutesSnapshot(
  snapshot: Awaited<ReturnType<typeof getLiveScorerSnapshot>>,
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

  if (!snapshot) {
    return { playerUsage, lineupUsage, groupUsage };
  }

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
      const overlapEnd = Math.min(
        nextPoint?.elapsedSeconds ?? finalElapsedSeconds,
        window.end,
      );

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

  return {
    playerUsage,
    lineupUsage,
    groupUsage,
  };
}

function getEventLineupIds(event: GameEventFeedItem, teamSide: TeamSide) {
  return [...(teamSide === "home" ? event.activeHomeRosterIds : event.activeAwayRosterIds)]
    .filter(Boolean)
    .sort();
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

    const scoredPoints =
      event.eventType === "shot" && event.shotResult === "make" ? event.shotValue ?? 0 : 0;
    const pointsFor = event.teamSide === teamSide ? scoredPoints : 0;
    const pointsAgainst = event.teamSide === teamSide ? 0 : scoredPoints;
    const countScoringEvent = scoredPoints > 0;

    registerLineupImpact(
      rows,
      lineupIds,
      pointsFor,
      pointsAgainst,
      rosterLookup,
      countScoringEvent,
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
  groupSize: LineupGroupSize = 2,
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

    const scoredPoints =
      event.eventType === "shot" && event.shotResult === "make" ? event.shotValue ?? 0 : 0;
    const pointsFor = event.teamSide === teamSide ? scoredPoints : 0;
    const pointsAgainst = event.teamSide === teamSide ? 0 : scoredPoints;
    const countScoringEvent = scoredPoints > 0;

    for (const groupKey of buildGroupKeys(lineupIds, groupSize)) {
      registerLineupImpact(
        rows,
        groupKey.split("|").filter(Boolean),
        pointsFor,
        pointsAgainst,
        rosterLookup,
        countScoringEvent,
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

    if (
      currentTrip &&
      inferredOffenseSide &&
      inferredOffenseSide !== currentTrip.offenseSide &&
      currentTrip.hasTrackedAction
    ) {
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

function calculateEffectiveFieldGoalPercentage(row: Pick<BoxScoreRow, "fgm" | "threePm" | "fga">) {
  if (row.fga === 0) {
    return "-";
  }

  return `${(((row.fgm + 0.5 * row.threePm) / row.fga) * 100).toFixed(1)}%`;
}

function calculateTrueShootingPercentage(
  row: Pick<BoxScoreRow, "points" | "fga" | "fta">,
) {
  const denominator = 2 * (row.fga + 0.44 * row.fta);

  if (denominator === 0) {
    return "-";
  }

  return `${((row.points / denominator) * 100).toFixed(1)}%`;
}

function calculatePointsPerShot(row: Pick<BoxScoreRow, "points" | "fga">) {
  if (row.fga === 0) {
    return "-";
  }

  return formatDecimal(row.points / row.fga);
}

function calculateFreeThrowRate(row: Pick<BoxScoreRow, "fta" | "fga">) {
  if (row.fga === 0) {
    return "-";
  }

  return formatDecimal(row.fta / row.fga);
}

function calculateGameEfficiency(
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

export default async function LiveGamePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{
    quarter?: string | string[];
    tab?: string | string[];
  }>;
}>) {
  const session = await requireAccessRole(["admin", "coach"]);
  const { gameId } = await params;
  const query = await searchParams;
  const [snapshot, eventFeed, scoringLock] = await Promise.all([
    getLiveScorerSnapshot(gameId),
    listGameEventFeed(gameId),
    getScoringLock(gameId),
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
  const filteredEventFeed = filterGameEventsByQuarter(
    eventFeed,
    activeQuarters.length > 0 ? activeQuarters : availableQuarters,
  );
  const recentEventFeed = filteredEventFeed.slice(0, 12);
  const boxScore = buildLiveBoxScoreFromEvents(snapshot, filteredEventFeed);
  const homeTeamTotals = aggregateBoxScoreRows(boxScore.homeRows);
  const awayTeamTotals = aggregateBoxScoreRows(boxScore.awayRows);
  const homeBoxScoreLookup = new Map(
    boxScore.homeRows.map((row) => [row.rosterMembershipId, row] satisfies [string, BoxScoreRow]),
  );
  const awayBoxScoreLookup = new Map(
    boxScore.awayRows.map((row) => [row.rosterMembershipId, row] satisfies [string, BoxScoreRow]),
  );
  const quarterBreakdown = buildQuarterBreakdown(filteredEventFeed, activeQuarters);
  const needsMinutes =
    activeTab === "player" ||
    activeTab === "player-advanced" ||
    activeTab === "lineup" ||
    activeTab === "lineup-groups";
  const needsPlayerPlusMinus = activeTab === "player" || activeTab === "lineup" || activeTab === "lineup-groups";
  const needsSecondChance = activeTab === "player" || activeTab === "team-advanced" || activeTab === "plays";
  const needsPointsOffTurnovers = activeTab === "team-advanced";
  const needsPaintPoints = activeTab === "player-advanced" || activeTab === "team-advanced" || activeTab === "plays";
  const needsPossessionTrips = activeTab === "plays";
  const minutesSnapshot = needsMinutes
    ? buildMinutesSnapshot(snapshot, eventFeed, activeQuarters)
    : {
        playerUsage: new Map<string, UsageRow>(),
        lineupUsage: { home: new Map<string, UsageRow>(), away: new Map<string, UsageRow>() },
        groupUsage: {
          home: { 2: new Map<string, UsageRow>(), 3: new Map<string, UsageRow>(), 4: new Map<string, UsageRow>() },
          away: { 2: new Map<string, UsageRow>(), 3: new Map<string, UsageRow>(), 4: new Map<string, UsageRow>() },
        },
      };
  const playerPlusMinus = needsPlayerPlusMinus
    ? buildPlayerPlusMinus(filteredEventFeed)
    : { home: new Map<string, number>(), away: new Map<string, number>() };
  const secondChanceSnapshot = needsSecondChance
    ? buildSecondChanceSnapshot(filteredEventFeed)
    : {
        teamPoints: { home: 0, away: 0 },
        playerPoints: new Map<string, number>(),
        offensePlayPoints: new Map<string, number>(),
        defensePlayPoints: new Map<string, number>(),
      };
  const pointsOffTurnoversSnapshot = needsPointsOffTurnovers
    ? buildPointsOffTurnoversSnapshot(filteredEventFeed)
    : { teamPoints: { home: 0, away: 0 } };
  const paintPointsSnapshot = needsPaintPoints
    ? buildPaintPointsSnapshot(filteredEventFeed)
    : { teamPoints: { home: 0, away: 0 }, playerPoints: new Map<string, number>() };
  const possessionTrips = needsPossessionTrips ? buildPossessionTrips(filteredEventFeed) : [];
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
  const homeDisplayOnFloor =
    snapshot.homeTeam.roster.filter((player) => snapshot.homeTeam.onFloorIds.includes(player.id))
      .length > 0
      ? snapshot.homeTeam.roster.filter((player) => snapshot.homeTeam.onFloorIds.includes(player.id))
      : snapshot.homeTeam.roster.slice(0, 5);
  const awayDisplayOnFloor =
    snapshot.awayTeam.roster.filter((player) => snapshot.awayTeam.onFloorIds.includes(player.id))
      .length > 0
      ? snapshot.awayTeam.roster.filter((player) => snapshot.awayTeam.onFloorIds.includes(player.id))
      : snapshot.awayTeam.roster.slice(0, 5);
  const homeDisplayOnFloorWithStats = homeDisplayOnFloor.map((player) => {
    const boxScoreRow = homeBoxScoreLookup.get(player.id);

    return {
      ...player,
      points: boxScoreRow?.points ?? 0,
      fouls: boxScoreRow?.fouls ?? 0,
    };
  });
  const awayDisplayOnFloorWithStats = awayDisplayOnFloor.map((player) => {
    const boxScoreRow = awayBoxScoreLookup.get(player.id);

    return {
      ...player,
      points: boxScoreRow?.points ?? 0,
      fouls: boxScoreRow?.fouls ?? 0,
    };
  });
  const homeLineupAnalytics =
    activeTab === "lineup"
      ? getLineupAnalytics(
          filteredEventFeed,
          "home",
          homeRosterLookup,
          currentHomeLineupIds,
          minutesSnapshot.lineupUsage.home,
        )
      : [];
  const awayLineupAnalytics =
    activeTab === "lineup"
      ? getLineupAnalytics(
          filteredEventFeed,
          "away",
          awayRosterLookup,
          currentAwayLineupIds,
          minutesSnapshot.lineupUsage.away,
        )
      : [];
  const homeLineupGroups =
    activeTab === "lineup-groups"
      ? {
          2: getLineupGroupAnalytics(
            filteredEventFeed,
            "home",
            homeRosterLookup,
            currentHomeLineupIds,
            minutesSnapshot.groupUsage.home[2],
            2,
          ),
          3: getLineupGroupAnalytics(
            filteredEventFeed,
            "home",
            homeRosterLookup,
            currentHomeLineupIds,
            minutesSnapshot.groupUsage.home[3],
            3,
          ),
          4: getLineupGroupAnalytics(
            filteredEventFeed,
            "home",
            homeRosterLookup,
            currentHomeLineupIds,
            minutesSnapshot.groupUsage.home[4],
            4,
          ),
        }
      : { 2: [] as LineupAnalyticsRow[], 3: [] as LineupAnalyticsRow[], 4: [] as LineupAnalyticsRow[] };
  const awayLineupGroups =
    activeTab === "lineup-groups"
      ? {
          2: getLineupGroupAnalytics(
            filteredEventFeed,
            "away",
            awayRosterLookup,
            currentAwayLineupIds,
            minutesSnapshot.groupUsage.away[2],
            2,
          ),
          3: getLineupGroupAnalytics(
            filteredEventFeed,
            "away",
            awayRosterLookup,
            currentAwayLineupIds,
            minutesSnapshot.groupUsage.away[3],
            3,
          ),
          4: getLineupGroupAnalytics(
            filteredEventFeed,
            "away",
            awayRosterLookup,
            currentAwayLineupIds,
            minutesSnapshot.groupUsage.away[4],
            4,
          ),
        }
      : { 2: [] as LineupAnalyticsRow[], 3: [] as LineupAnalyticsRow[], 4: [] as LineupAnalyticsRow[] };
  const homeOffensePlayAnalytics =
    activeTab === "plays" ? buildOffensePlayAnalytics(possessionTrips, snapshot.homeTeam.offensePlays, "home") : [];
  const awayOffensePlayAnalytics =
    activeTab === "plays" ? buildOffensePlayAnalytics(possessionTrips, snapshot.awayTeam.offensePlays, "away") : [];
  const homeDefensePlayAnalytics =
    activeTab === "plays" ? buildDefensePlayAnalytics(possessionTrips, snapshot.homeTeam.defensePlays, "home") : [];
  const awayDefensePlayAnalytics =
    activeTab === "plays" ? buildDefensePlayAnalytics(possessionTrips, snapshot.awayTeam.defensePlays, "away") : [];

  const allRosterOptions = [
    ...snapshot.homeTeam.roster.map((player) => ({
      id: player.id,
      label: `${snapshot.homeTeam.name} · ${rosterOptionLabel(
        player.name,
        player.jersey,
        player.position,
      )}`,
      side: "home" as const,
    })),
    ...snapshot.awayTeam.roster.map((player) => ({
      id: player.id,
      label: `${snapshot.awayTeam.name} · ${rosterOptionLabel(
        player.name,
        player.jersey,
        player.position,
      )}`,
      side: "away" as const,
    })),
  ];
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
  const currentQuarterHomeFouls = eventFeed.filter(
    (event) =>
      event.quarter === snapshot.quarter &&
      event.teamSide === "home" &&
      event.eventType === "personal_foul",
  ).length;
  const currentQuarterAwayFouls = eventFeed.filter(
    (event) =>
      event.quarter === snapshot.quarter &&
      event.teamSide === "away" &&
      event.eventType === "personal_foul",
  ).length;
  const homeQuarterFoulMap = eventFeed.reduce<Record<number, number>>((totals, event) => {
    if (event.teamSide === "home" && event.eventType === "personal_foul") {
      totals[event.quarter] = (totals[event.quarter] ?? 0) + 1;
    }
    return totals;
  }, {});
  const awayQuarterFoulMap = eventFeed.reduce<Record<number, number>>((totals, event) => {
    if (event.teamSide === "away" && event.eventType === "personal_foul") {
      totals[event.quarter] = (totals[event.quarter] ?? 0) + 1;
    }
    return totals;
  }, {});
  const statEventOptions = [
    { value: "assist", label: "Assist" },
    { value: "rebound_off", label: "Off Rebound" },
    { value: "rebound_def", label: "Def Rebound" },
    { value: "steal", label: "Steal" },
    { value: "block", label: "Block" },
    { value: "turnover", label: "Turnover" },
    { value: "personal_foul", label: "Personal Foul" },
    { value: "timeout_full", label: "Full Timeout" },
    { value: "timeout_30", label: "30s Timeout" },
  ];
  const editableEventOptions = [
    { value: "lineup_change", label: "Lineup Change" },
    ...statEventOptions,
  ];
  const offensePlayOptions = [
    ...snapshot.homeTeam.offensePlays.map((play) => ({
      value: play.id,
      label: `${snapshot.homeTeam.name} · ${play.name}`,
    })),
    ...snapshot.awayTeam.offensePlays.map((play) => ({
      value: play.id,
      label: `${snapshot.awayTeam.name} · ${play.name}`,
    })),
  ];
  const defensePlayOptions = [
    ...snapshot.homeTeam.defensePlays.map((play) => ({
      value: play.id,
      label: `${snapshot.homeTeam.name} · ${play.name}`,
    })),
    ...snapshot.awayTeam.defensePlays.map((play) => ({
      value: play.id,
      label: `${snapshot.awayTeam.name} · ${play.name}`,
    })),
  ];

  return (
    <main className="live-game-page">
      <LiveGameWithScoringControl
        gameId={snapshot.gameId}
        quarter={snapshot.quarter}
        secondsRemaining={snapshot.secondsRemaining}
        teamOnOffense={snapshot.teamOnOffense}
        homeTeamName={snapshot.homeTeam.name}
        awayTeamName={snapshot.awayTeam.name}
        homeOnFloor={homeDisplayOnFloorWithStats}
        awayOnFloor={awayDisplayOnFloorWithStats}
        shotMarkers={shotMarkers}
        homeScore={snapshot.homeTeam.score}
        awayScore={snapshot.awayTeam.score}
        homeQuarterFouls={currentQuarterHomeFouls}
        awayQuarterFouls={currentQuarterAwayFouls}
        homeQuarterFoulMap={homeQuarterFoulMap}
        awayQuarterFoulMap={awayQuarterFoulMap}
        homeFullTimeouts={snapshot.homeTeam.fullTimeouts}
        awayFullTimeouts={snapshot.awayTeam.fullTimeouts}
        homeThirtyTimeouts={snapshot.homeTeam.thirtyTimeouts}
        awayThirtyTimeouts={snapshot.awayTeam.thirtyTimeouts}
        homeOffensePlayId={snapshot.homeOffensePlayId}
        homeDefensePlayId={snapshot.homeDefensePlayId}
        awayOffensePlayId={snapshot.awayOffensePlayId}
        awayDefensePlayId={snapshot.awayDefensePlayId}
        homeOffensePlays={snapshot.homeTeam.offensePlays.map((play) => ({ id: play.id, name: play.name }))}
        homeDefensePlays={snapshot.homeTeam.defensePlays.map((play) => ({ id: play.id, name: play.name }))}
        awayOffensePlays={snapshot.awayTeam.offensePlays.map((play) => ({ id: play.id, name: play.name }))}
        awayDefensePlays={snapshot.awayTeam.defensePlays.map((play) => ({ id: play.id, name: play.name }))}
        initialStatus={
          snapshot.status === "scheduled" || snapshot.status === "final" ? snapshot.status : "live"
        }
        initialScoringLock={scoringLock}
        utilityMiddle={
          <CoachGameDayTaskStrip
            gameId={snapshot.gameId}
            role={session.role}
            coachProfileId={session.coachProfileId}
            className="coach-task-strip-inline"
          />
        }
        utilityActions={
          <>
            <LiveSyncControls intervalMs={0} scopeLabel="Live" />
            <Link href="/" className="button-link ghost">
              Home
            </Link>
            <Link href={`/observations/${snapshot.gameId}`} className="button-link ghost">
              Notes
            </Link>
            {(session.role === "admin" || session.role === "coach") ? (
              <>
                <Link href={`/scouting/${snapshot.gameId}`} className="button-link ghost">
                  Scouting
                </Link>
                <Link href={`/scouting/${snapshot.gameId}/game-plan`} className="button-link ghost">
                  Plan
                </Link>
                <Link href={`/scouting/${snapshot.gameId}/timeout`} className="button-link ghost">
                  Timeout
                </Link>
              </>
            ) : null}
            {session.role === "admin" ? (
              <Link
                href={`/admin/games/${snapshot.gameId}/prep/scouting`}
                className="button-link secondary"
              >
                Open Prep
              </Link>
            ) : null}
            {session.role === "admin" ? (
              <Link href="/admin/games" className="button-link ghost">
                Back To Games
              </Link>
            ) : null}
          </>
        }
        statsPanel={
          <>
                <section className="panel-card quarter-filter-card">
                  <div>
                    <p className="eyebrow-label">Quarter Filter</p>
                    <h3>Show Stats By Segment</h3>
                    <p className="meta">
                      Everything below is currently filtered to {formatQuarterSummary(activeQuarters)}.
                    </p>
                  </div>
                  <StatsQuarterFilterControls
                    basePath={`/games/${snapshot.gameId}`}
                    activeTab={activeTab}
                    availableQuarters={availableQuarters}
                    activeQuarters={activeQuarters}
                  />
                </section>

                <section className="table-grid overlay-table-grid">
                  <article className="table-card">
                    <div className="section-heading-row">
                      <div>
                        <h3>Game Stats</h3>
                        <p className="meta">Filtered to {formatQuarterSummary(activeQuarters)}.</p>
                      </div>
                      <span className="pill alt">{formatQuarterSummary(activeQuarters)}</span>
                    </div>
                    <StatsOverlayTabNav
                      tabs={[
                        ["player", "Player Stats"],
                        ["player-advanced", "Player Efficiency"],
                        ["team", "Team Stats"],
                        ["team-advanced", "Team Efficiency"],
                        ["lineup", "Lineup +/-"],
                        ["lineup-groups", "Lineup Groups"],
                        ["plays", "Play Efficiency"],
                        ["quarter", "Quarter Breakdown"],
                      ].map(([tabValue, label]) => ({
                        value: tabValue,
                        label,
                        href: buildGameTabHref(
                          snapshot.gameId,
                          tabValue as StatsTab,
                          activeQuarters,
                        ),
                        active: activeTab === tabValue,
                      }))}
                    />
                    {activeTab === "player" ? (
                      <div className="box-score-stack">
                        <div>
                          <p className="eyebrow-label">{boxScore.homeTeamName}</p>
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
                              {boxScore.homeRows.map((row) => (
                                <tr key={row.rosterMembershipId}>
                                  <td>
                                    {row.playerName} {row.jersey}
                                  </td>
                                  <td>
                                    {formatMinutes(
                                      minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ??
                                        0,
                                    )}
                                  </td>
                                  <td>{row.points}</td>
                                  <td>
                                    {(() => {
                                      const value = playerPlusMinus.home.get(row.rosterMembershipId) ?? 0;
                                      return value > 0 ? `+${value}` : value;
                                    })()}
                                  </td>
                                  <td>{secondChanceSnapshot.playerPoints.get(row.rosterMembershipId) ?? 0}</td>
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
                        <div>
                          <p className="eyebrow-label">{boxScore.awayTeamName}</p>
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
                              {boxScore.awayRows.map((row) => (
                                <tr key={row.rosterMembershipId}>
                                  <td>
                                    {row.playerName} {row.jersey}
                                  </td>
                                  <td>
                                    {formatMinutes(
                                      minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ??
                                        0,
                                    )}
                                  </td>
                                  <td>{row.points}</td>
                                  <td>
                                    {(() => {
                                      const value = playerPlusMinus.away.get(row.rosterMembershipId) ?? 0;
                                      return value > 0 ? `+${value}` : value;
                                    })()}
                                  </td>
                                  <td>{secondChanceSnapshot.playerPoints.get(row.rosterMembershipId) ?? 0}</td>
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
                      </div>
                    ) : null}
                    {activeTab === "player-advanced" ? (
                      <div className="box-score-stack">
                        <div>
                          <p className="eyebrow-label">{boxScore.homeTeamName}</p>
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
                              {boxScore.homeRows.map((row) => (
                                <tr key={row.rosterMembershipId}>
                                  <td>{row.playerName} {row.jersey}</td>
                                  <td>{formatMinutes(minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0)}</td>
                                  <td>{minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.stintCount ?? 0}</td>
                                  <td>
                                    {(() => {
                                      const value = playerPlusMinus.home.get(row.rosterMembershipId) ?? 0;
                                      return value > 0 ? `+${value}` : value;
                                    })()}
                                  </td>
                                  <td>{calculateGameEfficiency(row)}</td>
                                  <td>{calculateEffectiveFieldGoalPercentage(row)}</td>
                                  <td>{calculateTrueShootingPercentage(row)}</td>
                                  <td>{calculatePointsPerShot(row)}</td>
                                  <td>{paintPointsSnapshot.playerPoints.get(row.rosterMembershipId) ?? 0}</td>
                                  <td>{calculateFreeThrowRate(row)}</td>
                                  <td>{formatRatio(row.ast, row.turnovers)}</td>
                                  <td>{row.stl + row.blk}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <p className="eyebrow-label">{boxScore.awayTeamName}</p>
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
                              {boxScore.awayRows.map((row) => (
                                <tr key={row.rosterMembershipId}>
                                  <td>{row.playerName} {row.jersey}</td>
                                  <td>{formatMinutes(minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.secondsPlayed ?? 0)}</td>
                                  <td>{minutesSnapshot.playerUsage.get(row.rosterMembershipId)?.stintCount ?? 0}</td>
                                  <td>
                                    {(() => {
                                      const value = playerPlusMinus.away.get(row.rosterMembershipId) ?? 0;
                                      return value > 0 ? `+${value}` : value;
                                    })()}
                                  </td>
                                  <td>{calculateGameEfficiency(row)}</td>
                                  <td>{calculateEffectiveFieldGoalPercentage(row)}</td>
                                  <td>{calculateTrueShootingPercentage(row)}</td>
                                  <td>{calculatePointsPerShot(row)}</td>
                                  <td>{paintPointsSnapshot.playerPoints.get(row.rosterMembershipId) ?? 0}</td>
                                  <td>{calculateFreeThrowRate(row)}</td>
                                  <td>{formatRatio(row.ast, row.turnovers)}</td>
                                  <td>{row.stl + row.blk}</td>
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
                          <p className="eyebrow-label">{boxScore.homeTeamName}</p>
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
                                <td>{homeTeamTotals.points}</td>
                                <td>{secondChanceSnapshot.teamPoints.home}</td>
                                <td>{homeTeamTotals.fgm}/{homeTeamTotals.fga}</td>
                                <td>{formatPercentage(homeTeamTotals.fgm, homeTeamTotals.fga)}</td>
                                <td>{homeTeamTotals.threePm}/{homeTeamTotals.threePa}</td>
                                <td>{formatPercentage(homeTeamTotals.threePm, homeTeamTotals.threePa)}</td>
                                <td>{homeTeamTotals.ftm}/{homeTeamTotals.fta}</td>
                                <td>{formatPercentage(homeTeamTotals.ftm, homeTeamTotals.fta)}</td>
                                <td>{homeTeamTotals.oreb}</td>
                                <td>{homeTeamTotals.dreb}</td>
                                <td>{homeTeamTotals.reb}</td>
                                <td>{homeTeamTotals.ast}</td>
                                <td>{homeTeamTotals.stl}</td>
                                <td>{homeTeamTotals.blk}</td>
                                <td>{homeTeamTotals.turnovers}</td>
                                <td>{homeTeamTotals.fouls}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <p className="eyebrow-label">{boxScore.awayTeamName}</p>
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
                                <td>{awayTeamTotals.points}</td>
                                <td>{secondChanceSnapshot.teamPoints.away}</td>
                                <td>{awayTeamTotals.fgm}/{awayTeamTotals.fga}</td>
                                <td>{formatPercentage(awayTeamTotals.fgm, awayTeamTotals.fga)}</td>
                                <td>{awayTeamTotals.threePm}/{awayTeamTotals.threePa}</td>
                                <td>{formatPercentage(awayTeamTotals.threePm, awayTeamTotals.threePa)}</td>
                                <td>{awayTeamTotals.ftm}/{awayTeamTotals.fta}</td>
                                <td>{formatPercentage(awayTeamTotals.ftm, awayTeamTotals.fta)}</td>
                                <td>{awayTeamTotals.oreb}</td>
                                <td>{awayTeamTotals.dreb}</td>
                                <td>{awayTeamTotals.reb}</td>
                                <td>{awayTeamTotals.ast}</td>
                                <td>{awayTeamTotals.stl}</td>
                                <td>{awayTeamTotals.blk}</td>
                                <td>{awayTeamTotals.turnovers}</td>
                                <td>{awayTeamTotals.fouls}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                    {activeTab === "team-advanced" ? (
                      <div className="box-score-stack">
                        <div>
                          <p className="eyebrow-label">{boxScore.homeTeamName}</p>
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
                                <td>{calculateEffectiveFieldGoalPercentage(homeTeamTotals)}</td>
                                <td>{calculateTrueShootingPercentage(homeTeamTotals)}</td>
                                <td>{calculatePointsPerShot(homeTeamTotals)}</td>
                                <td>{paintPointsSnapshot.teamPoints.home}</td>
                                <td>{pointsOffTurnoversSnapshot.teamPoints.home}</td>
                                <td>{calculateFreeThrowRate(homeTeamTotals)}</td>
                                <td>{formatRatio(homeTeamTotals.ast, homeTeamTotals.turnovers)}</td>
                                <td>{formatPercentage(homeTeamTotals.threePa, homeTeamTotals.fga)}</td>
                                <td>{homeTeamTotals.stl + homeTeamTotals.blk}</td>
                                <td>{calculateGameEfficiency(homeTeamTotals)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <p className="eyebrow-label">{boxScore.awayTeamName}</p>
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
                                <td>{calculateEffectiveFieldGoalPercentage(awayTeamTotals)}</td>
                                <td>{calculateTrueShootingPercentage(awayTeamTotals)}</td>
                                <td>{calculatePointsPerShot(awayTeamTotals)}</td>
                                <td>{paintPointsSnapshot.teamPoints.away}</td>
                                <td>{pointsOffTurnoversSnapshot.teamPoints.away}</td>
                                <td>{calculateFreeThrowRate(awayTeamTotals)}</td>
                                <td>{formatRatio(awayTeamTotals.ast, awayTeamTotals.turnovers)}</td>
                                <td>{formatPercentage(awayTeamTotals.threePa, awayTeamTotals.fga)}</td>
                                <td>{awayTeamTotals.stl + awayTeamTotals.blk}</td>
                                <td>{calculateGameEfficiency(awayTeamTotals)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                    {activeTab === "lineup" ? (
                      <div className="box-score-stack">
                        <div>
                          <p className="eyebrow-label">{snapshot.homeTeam.name}</p>
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
                              {homeLineupAnalytics.length > 0 ? (
                                homeLineupAnalytics.slice(0, 12).map((row) => (
                                  <tr
                                    key={row.key}
                                    className={row.key === currentHomeLineupKey ? "current-lineup-row" : ""}
                                  >
                                    <td>
                                      <div className="lineup-label-cell">
                                        <span>{row.label}</span>
                                        {row.key === currentHomeLineupKey ? <span className="pill alt">Current</span> : null}
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
                                <tr><td colSpan={9}>No lineup data yet for the selected quarter filter.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <p className="eyebrow-label">{snapshot.awayTeam.name}</p>
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
                              {awayLineupAnalytics.length > 0 ? (
                                awayLineupAnalytics.slice(0, 12).map((row) => (
                                  <tr
                                    key={row.key}
                                    className={row.key === currentAwayLineupKey ? "current-lineup-row" : ""}
                                  >
                                    <td>
                                      <div className="lineup-label-cell">
                                        <span>{row.label}</span>
                                        {row.key === currentAwayLineupKey ? <span className="pill alt">Current</span> : null}
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
                                <tr><td colSpan={9}>No lineup data yet for the selected quarter filter.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                    {activeTab === "lineup-groups" ? (
                      <div className="box-score-stack">
                        <div>
                          {[2, 3, 4].map((groupSize) => (
                            <details key={groupSize} className="lineup-group-section" open={groupSize === 2}>
                              <summary>{snapshot.homeTeam.name} {groupSize}-Player Groups</summary>
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
                                  {homeLineupGroups[groupSize as LineupGroupSize].length > 0 ? (
                                    homeLineupGroups[groupSize as LineupGroupSize].map((row) => (
                                      <tr
                                        key={row.key}
                                        className={
                                          currentHomeGroupKeys[groupSize as LineupGroupSize].has(row.key)
                                            ? "current-lineup-row"
                                            : ""
                                        }
                                      >
                                        <td>
                                          <div className="lineup-label-cell">
                                            <span>{row.label}</span>
                                            {currentHomeGroupKeys[groupSize as LineupGroupSize].has(row.key) ? (
                                              <span className="pill alt">Current</span>
                                            ) : null}
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
                        <div>
                          {[2, 3, 4].map((groupSize) => (
                            <details key={groupSize} className="lineup-group-section" open={groupSize === 2}>
                              <summary>{snapshot.awayTeam.name} {groupSize}-Player Groups</summary>
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
                                  {awayLineupGroups[groupSize as LineupGroupSize].length > 0 ? (
                                    awayLineupGroups[groupSize as LineupGroupSize].map((row) => (
                                      <tr
                                        key={row.key}
                                        className={
                                          currentAwayGroupKeys[groupSize as LineupGroupSize].has(row.key)
                                            ? "current-lineup-row"
                                            : ""
                                        }
                                      >
                                        <td>
                                          <div className="lineup-label-cell">
                                            <span>{row.label}</span>
                                            {currentAwayGroupKeys[groupSize as LineupGroupSize].has(row.key) ? (
                                              <span className="pill alt">Current</span>
                                            ) : null}
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
                      </div>
                    ) : null}
                    {activeTab === "plays" ? (
                      <div className="box-score-stack">
                        <div>
                          <p className="eyebrow-label">{snapshot.homeTeam.name} Offense</p>
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
                                <th>Fouls Drawn</th>
                                <th>Poss</th>
                                <th>PPP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {homeOffensePlayAnalytics.map((row) => (
                                <tr key={row.id}>
                                  <td>
                                    <div className="play-cell">
                                      <span>{row.name}</span>
                                      {row.imageUrl ? (
                                        <a href={row.imageUrl} target="_blank" rel="noreferrer">
                                          View image
                                        </a>
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
                        <div>
                          <p className="eyebrow-label">{snapshot.homeTeam.name} Defense</p>
                          <table>
                            <thead>
                              <tr>
                                <th>Coverage</th>
                                <th>FG Against</th>
                                <th>3PT Against</th>
                                <th>FT Against</th>
                                <th>PITP Against</th>
                                <th>2CP Allowed</th>
                                <th>TO Forced</th>
                                <th>OREB Allowed</th>
                                <th>Fouls</th>
                                <th>Poss</th>
                                <th>PPP Allowed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {homeDefensePlayAnalytics.map((row) => (
                                <tr key={row.id}>
                                  <td>
                                    <div className="play-cell">
                                      <span>{row.name}</span>
                                      {row.imageUrl ? (
                                        <a href={row.imageUrl} target="_blank" rel="noreferrer">
                                          View image
                                        </a>
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
                        <div>
                          <p className="eyebrow-label">{snapshot.awayTeam.name} Offense</p>
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
                                <th>Fouls Drawn</th>
                                <th>Poss</th>
                                <th>PPP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {awayOffensePlayAnalytics.map((row) => (
                                <tr key={row.id}>
                                  <td>
                                    <div className="play-cell">
                                      <span>{row.name}</span>
                                      {row.imageUrl ? (
                                        <a href={row.imageUrl} target="_blank" rel="noreferrer">
                                          View image
                                        </a>
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
                        <div>
                          <p className="eyebrow-label">{snapshot.awayTeam.name} Defense</p>
                          <table>
                            <thead>
                              <tr>
                                <th>Coverage</th>
                                <th>FG Against</th>
                                <th>3PT Against</th>
                                <th>FT Against</th>
                                <th>PITP Against</th>
                                <th>2CP Allowed</th>
                                <th>TO Forced</th>
                                <th>OREB Allowed</th>
                                <th>Fouls</th>
                                <th>Poss</th>
                                <th>PPP Allowed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {awayDefensePlayAnalytics.map((row) => (
                                <tr key={row.id}>
                                  <td>
                                    <div className="play-cell">
                                      <span>{row.name}</span>
                                      {row.imageUrl ? (
                                        <a href={row.imageUrl} target="_blank" rel="noreferrer">
                                          View image
                                        </a>
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
                      </div>
                    ) : null}
                    {activeTab === "quarter" ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Quarter</th>
                            <th>{boxScore.homeTeamName} PTS</th>
                            <th>{boxScore.awayTeamName} PTS</th>
                            <th>{boxScore.homeTeamName} REB</th>
                            <th>{boxScore.awayTeamName} REB</th>
                            <th>{boxScore.homeTeamName} TO</th>
                            <th>{boxScore.awayTeamName} TO</th>
                            <th>{boxScore.homeTeamName} PF</th>
                            <th>{boxScore.awayTeamName} PF</th>
                            <th>Events</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quarterBreakdown.map((row) => (
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
                  </article>
                </section>
          </>
        }
        substitutionsPanel={
          <>
                <SubstitutionsPanelForm
                  gameId={snapshot.gameId}
                  homeTeamName={snapshot.homeTeam.name}
                  awayTeamName={snapshot.awayTeam.name}
                  homeRoster={snapshot.homeTeam.roster.map((player) => ({
                    id: player.id,
                    label: rosterOptionLabel(player.name, player.jersey, player.position),
                    checked: snapshot.homeTeam.onFloorIds.includes(player.id),
                    minutes: formatMinutes(minutesSnapshot.playerUsage.get(player.id)?.secondsPlayed ?? 0),
                  }))}
                  awayRoster={snapshot.awayTeam.roster.map((player) => ({
                    id: player.id,
                    label: rosterOptionLabel(player.name, player.jersey, player.position),
                    checked: snapshot.awayTeam.onFloorIds.includes(player.id),
                    minutes: formatMinutes(minutesSnapshot.playerUsage.get(player.id)?.secondsPlayed ?? 0),
                  }))}
                  status={snapshot.status as "scheduled" | "live" | "final"}
                  quarter={snapshot.quarter}
                  secondsRemaining={formatClock(snapshot.secondsRemaining)}
                  teamOnOffense={snapshot.teamOnOffense ?? "home"}
                />
          </>
        }
        eventsPanel={
          <>
                <section className="live-game-grid">
                  <article className="panel-card">
                    <p className="eyebrow-label">Live Feed</p>
                    <h3>Recent Event Stream</h3>
                    <div className="event-feed">
                      {recentEventFeed.length > 0 ? (
                        recentEventFeed.map((event) => (
                          <article key={event.id} className={`event-feed-item ${event.teamSide}`}>
                            <div className="event-feed-meta">
                              <span className="pill alt">{event.teamName}</span>
                              <span>Q{event.quarter} · {formatClock(event.secondsRemaining)}</span>
                            </div>
                            <p>{event.summary}</p>
                          </article>
                        ))
                      ) : (
                        <p className="meta">No events logged yet for the selected quarter filter.</p>
                      )}
                    </div>
                  </article>
                </section>

                <section className="table-grid overlay-table-grid">
                  <article className="table-card">
                    <h3>Event Log Editor</h3>
                    <div className="event-editor-stack">
                      {filteredEventFeed.length > 0 ? (
                        filteredEventFeed.map((event, index) => (
                          <details
                            key={event.id}
                            className="event-editor-card"
                            open={index < 2}
                          >
                            <summary className="event-editor-summary">
                              <div className="event-editor-summary-main">
                                <span className={`pill ${event.teamSide === "away" ? "" : "alt"}`}>
                                  {event.teamName}
                                </span>
                                <strong>
                                  {formatQuarterLabel(event.quarter)} · {formatClock(event.secondsRemaining)}
                                </strong>
                                <span>{event.summary}</span>
                              </div>
                              <span className="meta">Edit</span>
                            </summary>
                            <div className="event-editor-body">
                              <form action={editGameEventAction} className="form-grid">
                                <input type="hidden" name="gameId" value={snapshot.gameId} />
                                <ScorerDeviceIdInput />
                                <input type="hidden" name="eventId" value={event.id} />
                                <div className="field-group">
                                  <label>Team</label>
                                  <select name="teamSide" defaultValue={event.teamSide}>
                                    <option value="home">{snapshot.homeTeam.name}</option>
                                    <option value="away">{snapshot.awayTeam.name}</option>
                                  </select>
                                </div>
                                <div className="field-group">
                                  <label>Type</label>
                                  <select name="eventType" defaultValue={event.eventType}>
                                    <option value="shot">Shot</option>
                                    {editableEventOptions.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="field-group">
                                  <label>Player</label>
                                  <select name="rosterMembershipId" defaultValue={event.rosterMembershipId ?? ""}>
                                    <option value="">No player</option>
                                    {allRosterOptions.map((option) => (
                                      <option key={option.id} value={option.id}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="field-group">
                                  <label>Related Player</label>
                                  <select name="relatedRosterMembershipId" defaultValue={event.relatedRosterMembershipId ?? ""}>
                                    <option value="">No related player</option>
                                    {allRosterOptions.map((option) => (
                                      <option key={option.id} value={option.id}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="field-group">
                                  <label>Quarter</label>
                                  <input name="quarter" type="number" min="1" max="10" defaultValue={event.quarter} />
                                </div>
                                <div className="field-group">
                                  <label>Clock</label>
                                  <input name="secondsRemaining" type="text" inputMode="numeric" defaultValue={formatClock(event.secondsRemaining)} />
                                </div>
                                <div className="field-group">
                                  <label>Shot Result</label>
                                  <select name="shotResult" defaultValue={event.shotResult ?? "make"}>
                                    <option value="make">Make</option>
                                    <option value="miss">Miss</option>
                                  </select>
                                </div>
                                <div className="field-group">
                                  <label>Shot Value</label>
                                  <select name="shotValue" defaultValue={event.shotValue ?? 2}>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                  </select>
                                </div>
                                <div className="field-group">
                                  <label>Offense Play</label>
                                  <select name="offensePlayId" defaultValue={event.offensePlayId ?? ""}>
                                    <option value="">No tagged offense</option>
                                    {offensePlayOptions.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="field-group">
                                  <label>Defense Play</label>
                                  <select name="defensePlayId" defaultValue={event.defensePlayId ?? ""}>
                                    <option value="">No tagged defense</option>
                                    {defensePlayOptions.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="field-group field-span-2">
                                  <label>Notes</label>
                                  <input name="notes" defaultValue={event.notes} />
                                </div>
                                <div className="event-editor-actions field-span-2">
                                  <span className="meta">{event.summary}</span>
                                  <button className="button-link secondary" type="submit">Save Changes</button>
                                </div>
                              </form>
                              <form action={deleteGameEventAction} className="event-delete-form">
                                <input type="hidden" name="gameId" value={snapshot.gameId} />
                                <ScorerDeviceIdInput />
                                <input type="hidden" name="eventId" value={event.id} />
                                <button className="button-link ghost" type="submit">Delete Event</button>
                              </form>
                            </div>
                          </details>
                        ))
                      ) : (
                        <p className="meta">No events logged yet for the selected quarter filter.</p>
                      )}
                    </div>
                  </article>
                </section>
          </>
        }
      />
    </main>
  );
}
