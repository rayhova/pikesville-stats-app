import "server-only";

import type {
  AdminProfileRecord,
  CoachProfileRecord,
  CoachResponsibilityRecord,
  CoachResponsibilityTemplateRecord,
  DrillLibraryRecord,
  DevelopmentGoalType,
  DevelopmentPlanHorizon,
  EventAttendanceMode,
  EventAttendanceRecord,
  ManagerProfileRecord,
  ProgramAssignmentRecord,
  ProgramAssignmentCompletionRecord,
  ProgramAssignmentProofRecord,
  ProgramAssignmentType,
  PracticePlanItemRating,
  PracticePlanItemRecord,
  PracticePlanItemType,
  PracticePlanRecord,
  PlayerDevelopmentPlanRecord,
  PlayerEvaluationRecord,
  PlayerParentContactRecord,
  PlayerRecord,
  ProgramRecord,
  RosterMembershipRecord,
  SeasonRecord,
  TeamSeasonRecord,
  WeekGoalRecord,
  WeekGoalAudienceRole,
} from "@/lib/admin-domain";
import { formatCompactDate } from "@/lib/date-format";
import { getPersistenceMode, isSupabaseConfigured } from "@/lib/env";
import {
  coachProfiles,
  coachResponsibilityTemplates,
  drills,
  games,
  gameEventFeed,
  managerProfiles,
  playerRows,
  playerDevelopmentPlans,
  playerEvaluations,
  players,
  plays,
  practicePlans,
  programAssignments,
  programAssignmentCompletions,
  prepSnapshot,
  programs,
  programAssignmentProofs,
  eventAttendanceResponses,
  rosterMemberships,
  seasons,
  teamSeasonRows,
  teamSeasons,
  weekGoals,
} from "@/lib/admin-mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export interface SeasonSummary extends SeasonRecord {
  gameCount: number;
  teamSeasonCount: number;
  rosterEntryCount: number;
}

export interface TeamSeasonRow {
  id: string;
  name: string;
  shortName: string;
  label: string;
  season: string;
  type: string;
  activePlayers: number;
  lastGameDate: string;
  scoutingSummary: string;
  offense: string;
  defense: string;
  press: string;
  teamTendencies: string;
  scoutingVideos: string[];
  keysToWinning: string;
  actionsToWatch: string;
}

export interface PlayerRosterRow {
  id: string;
  playerId: string;
  teamSeasonId: string;
  name: string;
  jersey: string;
  position: string;
  height: string;
  team: string;
  teamType: string;
  season: string;
  isStarter: boolean;
  tendencies: string;
  strengths: string;
  weaknesses: string;
  matchupNotes: string;
  closeoutType?: string;
  speedType?: string;
  defenderTypes?: string[];
  drivePreference?: string;
  trapPreference?: string;
  playerNotes?: string;
  active: boolean;
}

interface GameRecord {
  id: string;
  seasonId: string;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
}

interface GameStateRecord {
  gameId: string;
  homeScore: number;
  awayScore: number;
}

interface GamePrepRecord {
  gameId: string;
  teamSummaryOverride: string;
  keysToWinningOverride: string;
  actionsToWatchOverride: string;
  matchupNotes: string;
  benchReminders: string;
  specialSituations: string;
  identity: string;
  defensePlan: string;
  defenseMatchups: string;
  pressPlan: string;
  offenseVsMan: string;
  offenseVsZone: string;
  offenseVsBigLineup: string;
  offenseActions: string;
  zoneThreeTwoPlan: string;
  zoneTwoThreePlan: string;
  blobPlan: string;
  needAThreePlan: string;
  slobPlan: string;
  subsPlan: string;
  keyMatchups: string;
  keyMetrics: string;
  coachingResponsibilities: string;
  coachingResponsibilityRows: CoachResponsibilityRecord[];
  timeoutDefenseChecklist: string;
  timeoutOffenseChecklist: string;
  timeoutPressPoiseChecklist: string;
  timeoutLineupQuestions: string;
  timeoutLateGameChecklist: string;
}

export interface GameRow {
  id: string;
  seasonId: string;
  startsAt?: string;
  date: string;
  opponent: string;
  season: string;
  status: string;
  score: string;
  prepStatus: string;
  location: string;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
  homeTeamSeasonId?: string;
  awayTeamSeasonId?: string;
}

export interface GamePrepSnapshot {
  gameId: string;
  title: string;
  opponentTeam: {
    name: string;
    offense: string;
    defense: string;
    press: string;
    scoutingSummary: string;
    scoutingVideos: string[];
  };
  overview: {
    opponentSummary: string;
    keysToWinning: string;
    actionsToWatch: string;
  };
  playerFocus: PlayerRosterRow[];
  overrides: {
    teamSummaryOverride: string;
    keysToWinningOverride: string;
    actionsToWatchOverride: string;
    matchupEmphasis: string;
    benchReminders: string;
    specialSituations: string;
  };
  gamePlanCard: {
    identity: string;
    defensePlan: string;
    defenseMatchups: string;
    pressPlan: string;
    offenseVsMan: string;
    offenseVsZone: string;
    offenseVsBigLineup: string;
    offenseActions: string;
    zoneThreeTwoPlan: string;
    zoneTwoThreePlan: string;
    blobPlan: string;
    needAThreePlan: string;
    slobPlan: string;
    subsPlan: string;
    keyMatchups: string;
    keyMetrics: string;
    specialSituations: string;
    coachingResponsibilities: string;
    coachingResponsibilityRows: CoachResponsibilityRecord[];
  };
  timeoutCard: {
    prompt: string;
    ourFullTimeouts: number;
    ourThirtyTimeouts: number;
    opponentFullTimeouts: number;
    opponentThirtyTimeouts: number;
    timeoutDefenseChecklist: string;
    timeoutOffenseChecklist: string;
    timeoutPressPoiseChecklist: string;
    timeoutLineupQuestions: string;
    timeoutLateGameChecklist: string;
  };
  plannedContext: {
    likelyOpponentActions: string[];
    plannedOffense: string[];
    plannedDefense: string[];
  };
}

export interface CoachingObservationRow {
  id: string;
  gameId: string;
  teamSide: "home" | "away";
  teamName: string;
  observationScope: "team" | "player" | "offense_play" | "defense_play";
  rosterMembershipId: string | null;
  playerName: string | null;
  jersey: string | null;
  playLibraryId: string | null;
  playName: string | null;
  quarter: number;
  secondsRemaining: number;
  tag: string;
  notes: string;
  scoreDelta: number;
  createdAt: string;
}

export interface PlayLibraryRow {
  id: string;
  name: string;
  family: string;
  side: string;
  owner: string;
  team: string;
  teamSeasonId: string;
  teamSeasonIds: string[];
  playScope: "team" | "global_opponent";
  tags: string[];
  notes: string;
  imageUrl?: string;
  embedCode?: string;
  isActive: boolean;
}

function getPlayTeamSeasonIds(play: { teamSeasonId: string; teamSeasonIds?: string[] }) {
  return play.teamSeasonIds?.length ? play.teamSeasonIds : [play.teamSeasonId];
}

function getPlayScope(play: object) {
  return (play as { playScope?: "team" | "global_opponent" }).playScope ?? "team";
}

function playMatchesTeamSeason(play: { teamSeasonId: string; teamSeasonIds?: string[] }, teamSeasonId?: string | null) {
  if (!teamSeasonId) {
    return false;
  }

  return getPlayTeamSeasonIds(play).includes(teamSeasonId);
}

function playAvailableForTeam(
  play: { teamSeasonId: string; teamSeasonIds?: string[]; playScope?: "team" | "global_opponent" },
  teamSeasonId: string | undefined | null,
  teamType: string | undefined | null,
) {
  if (getPlayScope(play) === "global_opponent") {
    return teamType === "opponent";
  }

  return playMatchesTeamSeason(play, teamSeasonId);
}

export interface DrillLibraryRow {
  id: string;
  legacyId?: string;
  title: string;
  drillType: string;
  playType: string;
  tags: string[];
  description: string;
  instructions: string;
  notes: string;
  videoUrl?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface PracticePlanRow {
  id: string;
  title: string;
  practiceDate: string;
  startTimeValue: string;
  startTime: string;
  endTime: string;
  lengthMinutes: number;
  blockCount: number;
  team: string;
  teamSeasonId: string;
  teamSeasonIds: string[];
  teamSeasonLabel: string;
  season: string;
  seasonId: string;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
}

export interface PracticePlanDetail extends PracticePlanRecord {
  team: string;
  teamSeasonLabel: string;
  teamSeasonLabels: string[];
  season: string;
}

export interface CoachProfileRow extends CoachProfileRecord {}
export interface AdminProfileRow extends AdminProfileRecord {}
export interface ManagerProfileRow extends ManagerProfileRecord {}
export interface CoachResponsibilityTemplateRow extends CoachResponsibilityTemplateRecord {
  coachDisplayName?: string;
}

export interface WeekGoalRow extends WeekGoalRecord {}

export interface ProgramAssignmentRow extends ProgramAssignmentRecord {
  relatedPlayNames: string[];
  relatedGameTitle?: string;
  relatedPlayerNames: string[];
  relatedPlayerName?: string;
  targetCoachNames: string[];
  targetManagerNames: string[];
}

export interface ProgramAssignmentProofRow extends ProgramAssignmentProofRecord {
  submittedByLabel: string;
}

export interface ProgramAssignmentCompletionRow extends ProgramAssignmentCompletionRecord {
  completedByLabel: string;
}

export interface EventAttendanceRow extends EventAttendanceRecord {
  attendeeLabel: string;
}

export interface GameDayCoachAssignmentRow {
  id: string;
  gameId: string;
  gameTitle: string;
  startsAt?: string;
  responsibilityId: string;
  responsibilityLabel: string;
  coachProfileId?: string;
  coachDisplayName?: string;
  href: string;
}

interface GameLineupRecord {
  gameId: string;
  teamSide: "home" | "away";
  rosterMembershipId: string;
  isOnFloor: boolean;
}

interface GameStateSnapshot {
  teamOnOffense: "home" | "away" | null;
  homeOffensePlayId: string | null;
  homeDefensePlayId: string | null;
  awayOffensePlayId: string | null;
  awayDefensePlayId: string | null;
  homeScore: number;
  awayScore: number;
  homeFouls: number;
  awayFouls: number;
  homeFullTimeouts: number;
  homeThirtyTimeouts: number;
  awayFullTimeouts: number;
  awayThirtyTimeouts: number;
}

function getOpposingTeamSide(teamSide: "home" | "away") {
  return teamSide === "home" ? "away" : "home";
}

type QuickGameEventType =
  | "shot"
  | "lineup_change"
  | "rebound_off"
  | "rebound_def"
  | "assist"
  | "steal"
  | "block"
  | "turnover"
  | "personal_foul"
  | "timeout_full"
  | "timeout_30";

function deriveEventPossessionContext(
  state: GameStateSnapshot,
  lastEvent:
    | {
        eventType: QuickGameEventType;
        teamSide: "home" | "away";
        shotResult?: "make" | "miss" | null;
        shotValue?: number | null;
      }
    | null,
  input: {
    teamSide: "home" | "away";
    eventType: QuickGameEventType;
    shotResult?: "make" | "miss";
    shotValue?: 1 | 2 | 3;
  },
): {
  offenseSideForEvent: "home" | "away" | null;
  nextTeamOnOffense: "home" | "away" | null;
} {
  const currentOffenseSide = state.teamOnOffense ?? input.teamSide;
  const continuationOffenseSide =
    lastEvent?.eventType === "shot" &&
    lastEvent.shotResult === "make" &&
    lastEvent.shotValue !== 1
      ? lastEvent.teamSide
      : null;

  switch (input.eventType) {
    case "shot":
      return {
        offenseSideForEvent: input.teamSide,
        nextTeamOnOffense:
          input.shotResult === "make" && input.shotValue !== 1
            ? getOpposingTeamSide(input.teamSide)
            : input.teamSide,
      };
    case "rebound_off":
    case "assist":
      return {
        offenseSideForEvent: input.teamSide,
        nextTeamOnOffense: input.teamSide,
      };
    case "turnover":
      return {
        offenseSideForEvent: input.teamSide,
        nextTeamOnOffense: getOpposingTeamSide(input.teamSide),
      };
    case "rebound_def":
    case "steal":
      return {
        offenseSideForEvent: getOpposingTeamSide(input.teamSide),
        nextTeamOnOffense: input.teamSide,
      };
    case "block":
      return {
        offenseSideForEvent: getOpposingTeamSide(input.teamSide),
        nextTeamOnOffense: getOpposingTeamSide(input.teamSide),
      };
    case "personal_foul":
      {
        const foulOffenseSide = continuationOffenseSide ?? currentOffenseSide;

      return {
        offenseSideForEvent: foulOffenseSide,
        nextTeamOnOffense: foulOffenseSide,
      };
      }
    case "timeout_full":
    case "timeout_30":
    case "lineup_change":
    default:
      return {
        offenseSideForEvent: state.teamOnOffense,
        nextTeamOnOffense: state.teamOnOffense,
      };
  }
}

export interface LiveScorerTeam {
  side: "home" | "away";
  teamSeasonId: string;
  name: string;
  label: string;
  teamType: string;
  score: number;
  fouls: number;
  fullTimeouts: number;
  thirtyTimeouts: number;
  roster: PlayerRosterRow[];
  onFloorIds: string[];
  offensePlays: PlayLibraryRow[];
  defensePlays: PlayLibraryRow[];
}

export interface LiveScorerSnapshot {
  gameId: string;
  title: string;
  dateLabel: string;
  location: string;
  status: string;
  quarter: number;
  secondsRemaining: number;
  teamOnOffense: "home" | "away" | null;
  homeOffensePlayId: string | null;
  homeDefensePlayId: string | null;
  awayOffensePlayId: string | null;
  awayDefensePlayId: string | null;
  homeTeam: LiveScorerTeam;
  awayTeam: LiveScorerTeam;
}

export interface ScoringLockRecord {
  gameId: string;
  scorerRole: "admin" | "coach";
  scorerUserId: string | null;
  scorerProfileId: string | null;
  scorerLabel: string;
  deviceId: string;
  status: "active" | "released";
  lockStartedAt: string;
  lastHeartbeatAt: string;
  releasedAt: string | null;
}

export interface GameEventFeedItem {
  id: string;
  sequenceNumber: number;
  teamSide: "home" | "away";
  teamName: string;
  eventType: string;
  summary: string;
  quarter: number;
  secondsRemaining: number;
  teamOnOffense: "home" | "away" | null;
  rosterMembershipId: string | null;
  relatedRosterMembershipId: string | null;
  notes: string;
  shotX: number | null;
  shotY: number | null;
  shotResult: "make" | "miss" | null;
  shotValue: number | null;
  offensePlayId: string | null;
  defensePlayId: string | null;
  activeHomeRosterIds: string[];
  activeAwayRosterIds: string[];
}

export interface BoxScoreRow {
  rosterMembershipId: string;
  playerName: string;
  jersey: string;
  position: string;
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

export interface LiveBoxScore {
  homeTeamName: string;
  awayTeamName: string;
  homeRows: BoxScoreRow[];
  awayRows: BoxScoreRow[];
}

export function filterGameEventsByQuarter(
  eventFeed: GameEventFeedItem[],
  quarters?: number[],
) {
  if (!quarters || quarters.length === 0) {
    return eventFeed;
  }

  const quarterSet = new Set(quarters);
  return eventFeed.filter((event) => quarterSet.has(event.quarter));
}

const ADMIN_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";
type MockGameStatus = "scheduled" | "live" | "final";

interface MockGameRuntime {
  quarter: number;
  secondsRemaining: number;
  status: MockGameStatus;
}

const mockGameStateById = new Map<string, GameStateSnapshot>();
const mockGameRuntimeById = new Map<string, MockGameRuntime>();
const mockGameLineupsById = new Map<string, GameLineupRecord[]>();
const mockGameEventsById = new Map<string, GameEventFeedItem[]>();
const mockCoachingObservationsByGameId = new Map<string, CoachingObservationRow[]>();
const mockScoringLocksByGameId = new Map<string, ScoringLockRecord>();

function getMockGameRecord(gameId: string) {
  return games.find((game) => game.id === gameId);
}

function createDefaultMockState(gameId: string): GameStateSnapshot {
  const liveGame = getMockGameRecord(gameId);
  const [homeScore, awayScore] =
    typeof liveGame?.score === "string" && liveGame.score.includes("-")
      ? liveGame.score.split("-").map((value) => Number.parseInt(value, 10) || 0)
      : [0, 0];

  return {
    teamOnOffense: "home",
    homeOffensePlayId: "horns",
    homeDefensePlayId: "man-to-man",
    awayOffensePlayId: "pistol",
    awayDefensePlayId: "2-3-zone",
    homeScore,
    awayScore,
    homeFouls: 0,
    awayFouls: 0,
    homeFullTimeouts: 3,
    homeThirtyTimeouts: 2,
    awayFullTimeouts: 3,
    awayThirtyTimeouts: 2,
  };
}

function getMockState(gameId: string): GameStateSnapshot {
  const existing = mockGameStateById.get(gameId);

  if (existing) {
    return existing;
  }

  const created = createDefaultMockState(gameId);
  mockGameStateById.set(gameId, created);
  return created;
}

function getMockRuntime(gameId: string): MockGameRuntime {
  const existing = mockGameRuntimeById.get(gameId);

  if (existing) {
    return existing;
  }

  const liveGame = getMockGameRecord(gameId);
  const created: MockGameRuntime = {
    quarter: 1,
    secondsRemaining: 480,
    status:
      liveGame?.status === "final" || liveGame?.status === "live"
        ? liveGame.status
        : "scheduled",
  };
  mockGameRuntimeById.set(gameId, created);
  return created;
}

function getMockEvents(gameId: string): GameEventFeedItem[] {
  const existing = mockGameEventsById.get(gameId);

  if (existing) {
    return existing;
  }

  const seeded = gameEventFeed
    .filter((event) => event.gameId === gameId)
    .map((event) => ({
      id: event.id,
      sequenceNumber: event.sequenceNumber,
      teamSide: (event.teamSide === "away" ? "away" : "home") as "home" | "away",
      teamName: event.teamName,
      eventType: event.eventType,
      summary: event.summary,
      quarter: event.quarter,
      secondsRemaining: event.secondsRemaining,
      teamOnOffense: null,
      rosterMembershipId: null,
      relatedRosterMembershipId: null,
      notes: "",
      shotX: event.shotX,
      shotY: event.shotY,
      shotResult:
        event.shotResult === "make" || event.shotResult === "miss"
          ? (event.shotResult as "make" | "miss")
          : null,
      shotValue: event.shotValue,
      offensePlayId: null,
      defensePlayId: null,
      activeHomeRosterIds: [],
      activeAwayRosterIds: [],
    }))
    .sort((left, right) => right.sequenceNumber - left.sequenceNumber);

  mockGameEventsById.set(gameId, seeded);
  return seeded;
}

function getMockLineups(
  gameId: string,
  homeRosterIds: string[],
  awayRosterIds: string[],
): GameLineupRecord[] {
  const existing = mockGameLineupsById.get(gameId);

  if (existing) {
    return existing;
  }

  const seeded = [
    ...homeRosterIds.slice(0, 5).map((rosterMembershipId) => ({
      gameId,
      teamSide: "home" as const,
      rosterMembershipId,
      isOnFloor: true,
    })),
    ...awayRosterIds.slice(0, 5).map((rosterMembershipId) => ({
      gameId,
      teamSide: "away" as const,
      rosterMembershipId,
      isOnFloor: true,
    })),
  ];

  mockGameLineupsById.set(gameId, seeded);
  return seeded;
}

function getPreferredStarterIds(
  roster: Array<{ id: string; active: boolean; isStarter?: boolean }>,
) {
  const activeRoster = roster.filter((player) => player.active);
  const starters = activeRoster.filter((player) => player.isStarter);

  return (starters.length > 0 ? starters : activeRoster).slice(0, 5).map((player) => player.id);
}

function getMockActiveLineupIds(gameId: string, teamSide: "home" | "away") {
  return (mockGameLineupsById.get(gameId) ?? [])
    .filter((lineup) => lineup.teamSide === teamSide && lineup.isOnFloor)
    .map((lineup) => lineup.rosterMembershipId);
}

function recalculateMockGameState(gameId: string) {
  const state = getMockState(gameId);
  const events = getMockEvents(gameId);
  let homeScore = 0;
  let awayScore = 0;
  let homeFouls = 0;
  let awayFouls = 0;
  let homeFullTimeouts = 3;
  let awayFullTimeouts = 3;
  let homeThirtyTimeouts = 2;
  let awayThirtyTimeouts = 2;

  for (const event of events) {
    if (event.eventType === "shot" && event.shotResult === "make") {
      if (event.teamSide === "home") {
        homeScore += event.shotValue ?? 0;
      } else {
        awayScore += event.shotValue ?? 0;
      }
    }

    if (event.eventType === "personal_foul") {
      if (event.teamSide === "home") {
        homeFouls += 1;
      } else {
        awayFouls += 1;
      }
    }

    if (event.eventType === "timeout_full") {
      if (event.teamSide === "home") {
        homeFullTimeouts = Math.max(0, homeFullTimeouts - 1);
      } else {
        awayFullTimeouts = Math.max(0, awayFullTimeouts - 1);
      }
    }

    if (event.eventType === "timeout_30") {
      if (event.teamSide === "home") {
        homeThirtyTimeouts = Math.max(0, homeThirtyTimeouts - 1);
      } else {
        awayThirtyTimeouts = Math.max(0, awayThirtyTimeouts - 1);
      }
    }
  }

  state.homeScore = homeScore;
  state.awayScore = awayScore;
  state.homeFouls = homeFouls;
  state.awayFouls = awayFouls;
  state.homeFullTimeouts = homeFullTimeouts;
  state.awayFullTimeouts = awayFullTimeouts;
  state.homeThirtyTimeouts = homeThirtyTimeouts;
  state.awayThirtyTimeouts = awayThirtyTimeouts;
}

export function getAdminPersistenceMode() {
  return getPersistenceMode();
}

export async function listSeasons(): Promise<SeasonRecord[]> {
  if (!isSupabaseConfigured()) {
    return seasons;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, school_year, starts_on, ends_on, status")
    .order("starts_on", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((season) => ({
    id: season.id,
    name: season.name,
    schoolYear: season.school_year,
    status: season.status,
    startDate: season.starts_on ?? "",
    endDate: season.ends_on ?? "",
  }));
}

async function listGames(): Promise<GameRecord[]> {
  if (!isSupabaseConfigured()) {
    return games.map((game) => ({
      id: game.id,
      seasonId: game.seasonId ?? game.season,
      attendanceMode: normalizeEventAttendanceMode(game.attendanceMode),
      capacity:
        typeof game.capacity === "number" && Number.isFinite(game.capacity) && game.capacity > 0
          ? Math.max(1, Math.round(game.capacity))
          : undefined,
    }));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("games").select("id, season_id, attendance_mode, capacity");

  if (error) {
    throw error;
  }

  return (data ?? []).map((game) => ({
    id: game.id,
    seasonId: game.season_id,
    attendanceMode: normalizeEventAttendanceMode(game.attendance_mode ?? undefined),
    capacity:
      typeof game.capacity === "number" && Number.isFinite(game.capacity) && game.capacity > 0
        ? Math.max(1, Math.round(game.capacity))
        : undefined,
  }));
}

async function listGameStates(): Promise<GameStateRecord[]> {
  if (!isSupabaseConfigured()) {
    return games.map((game) => {
      const state = getMockState(game.id);

      return {
        gameId: game.id,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
      };
    });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_state")
    .select("game_id, home_score, away_score");

  if (error) {
    throw error;
  }

  return (data ?? []).map((gameState) => ({
    gameId: gameState.game_id,
    homeScore: gameState.home_score,
    awayScore: gameState.away_score,
  }));
}

async function listGamePreps(): Promise<GamePrepRecord[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("game_prep").select(
    "game_id, team_summary_override, keys_to_winning_override, actions_to_watch_override, matchup_notes, bench_reminders, special_situations, identity, defense_plan, defense_matchups, press_plan, offense_vs_man, offense_vs_zone, offense_vs_big_lineup, offense_actions, zone_three_two_plan, zone_two_three_plan, blob_plan, need_a_three_plan, slob_plan, subs_plan, key_matchups, key_metrics, coaching_responsibilities, coaching_responsibility_rows, timeout_defense_checklist, timeout_offense_checklist, timeout_press_poise_checklist, timeout_lineup_questions, timeout_late_game_checklist",
  );

  if (error) {
    throw error;
  }

  return (data ?? []).map((gamePrep) => ({
    gameId: gamePrep.game_id,
    teamSummaryOverride: gamePrep.team_summary_override ?? "",
    keysToWinningOverride: gamePrep.keys_to_winning_override ?? "",
    actionsToWatchOverride: gamePrep.actions_to_watch_override ?? "",
    matchupNotes: gamePrep.matchup_notes ?? "",
    benchReminders: gamePrep.bench_reminders ?? "",
    specialSituations: gamePrep.special_situations ?? "",
    identity: gamePrep.identity ?? "",
    defensePlan: gamePrep.defense_plan ?? "",
    defenseMatchups: gamePrep.defense_matchups ?? "",
    pressPlan: gamePrep.press_plan ?? "",
    offenseVsMan: gamePrep.offense_vs_man ?? "",
    offenseVsZone: gamePrep.offense_vs_zone ?? "",
    offenseVsBigLineup: gamePrep.offense_vs_big_lineup ?? "",
    offenseActions: gamePrep.offense_actions ?? "",
    zoneThreeTwoPlan: gamePrep.zone_three_two_plan ?? "",
    zoneTwoThreePlan: gamePrep.zone_two_three_plan ?? "",
    blobPlan: gamePrep.blob_plan ?? "",
    needAThreePlan: gamePrep.need_a_three_plan ?? "",
    slobPlan: gamePrep.slob_plan ?? "",
    subsPlan: gamePrep.subs_plan ?? "",
    keyMatchups: gamePrep.key_matchups ?? "",
    keyMetrics: gamePrep.key_metrics ?? "",
    coachingResponsibilities: gamePrep.coaching_responsibilities ?? "",
    coachingResponsibilityRows: Array.isArray(gamePrep.coaching_responsibility_rows)
      ? (gamePrep.coaching_responsibility_rows as Partial<CoachResponsibilityRecord>[])
          .map((item) => normalizeCoachResponsibilityRecord(item))
      : [],
    timeoutDefenseChecklist: gamePrep.timeout_defense_checklist ?? "",
    timeoutOffenseChecklist: gamePrep.timeout_offense_checklist ?? "",
    timeoutPressPoiseChecklist: gamePrep.timeout_press_poise_checklist ?? "",
    timeoutLineupQuestions: gamePrep.timeout_lineup_questions ?? "",
    timeoutLateGameChecklist: gamePrep.timeout_late_game_checklist ?? "",
  }));
}

async function listGameLineups(gameId: string): Promise<GameLineupRecord[]> {
  if (!isSupabaseConfigured()) {
    return mockGameLineupsById.get(gameId) ?? [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_lineups")
    .select("game_id, team_side, roster_membership_id, is_on_floor")
    .eq("game_id", gameId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((lineup) => ({
    gameId: lineup.game_id,
    teamSide: lineup.team_side,
    rosterMembershipId: lineup.roster_membership_id,
    isOnFloor: lineup.is_on_floor,
  }));
}

async function getGameStateSnapshot(gameId: string): Promise<GameStateSnapshot> {
  if (!isSupabaseConfigured()) {
    return getMockState(gameId);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_state")
    .select(
      "team_on_offense, home_offense_play_id, home_defense_play_id, away_offense_play_id, away_defense_play_id, home_score, away_score, home_fouls, away_fouls, home_full_timeouts, home_30_timeouts, away_full_timeouts, away_30_timeouts",
    )
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    teamOnOffense: data?.team_on_offense ?? null,
    homeOffensePlayId: data?.home_offense_play_id ?? null,
    homeDefensePlayId: data?.home_defense_play_id ?? null,
    awayOffensePlayId: data?.away_offense_play_id ?? null,
    awayDefensePlayId: data?.away_defense_play_id ?? null,
    homeScore: data?.home_score ?? 0,
    awayScore: data?.away_score ?? 0,
    homeFouls: data?.home_fouls ?? 0,
    awayFouls: data?.away_fouls ?? 0,
    homeFullTimeouts: data?.home_full_timeouts ?? 3,
    homeThirtyTimeouts: data?.home_30_timeouts ?? 2,
    awayFullTimeouts: data?.away_full_timeouts ?? 3,
    awayThirtyTimeouts: data?.away_30_timeouts ?? 2,
  };
}

export async function listSeasonSummaries(): Promise<SeasonSummary[]> {
  if (!isSupabaseConfigured()) {
    return seasons.map((season) => ({
      ...season,
      gameCount: games.filter((game) => (game.seasonId ?? game.season) === season.id).length,
      teamSeasonCount: teamSeasons.filter(
        (teamSeason) => teamSeason.seasonId === season.id,
      ).length,
      rosterEntryCount: rosterMemberships.filter((membership) =>
        teamSeasons
          .filter((teamSeason) => teamSeason.seasonId === season.id)
          .some((teamSeason) => teamSeason.id === membership.teamSeasonId),
      ).length,
    }));
  }

  const [seasonRecords, teamSeasonRecords, rosterRecords, gameRecords] =
    await Promise.all([
      listSeasons(),
      listTeamSeasons(),
      listRosterMemberships(),
      listGames(),
    ]);

  return seasonRecords.map((season) => ({
    ...season,
    gameCount: gameRecords.filter((game) => game.seasonId === season.id).length,
    teamSeasonCount: teamSeasonRecords.filter(
      (teamSeason) => teamSeason.seasonId === season.id,
    ).length,
    rosterEntryCount: rosterRecords.filter((membership) =>
      teamSeasonRecords
        .filter((teamSeason) => teamSeason.seasonId === season.id)
        .some((teamSeason) => teamSeason.id === membership.teamSeasonId),
    ).length,
  }));
}

export async function listGameRows(): Promise<GameRow[]> {
  if (!isSupabaseConfigured()) {
    return games.map((game) => ({
      ...game,
      attendanceMode: normalizeEventAttendanceMode(game.attendanceMode),
      capacity:
        typeof game.capacity === "number" && Number.isFinite(game.capacity) && game.capacity > 0
          ? Math.max(1, Math.round(game.capacity))
          : undefined,
    }));
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: gameRows, error }, teamSeasonRecords, programRecords, seasonRecords, gameStates, gamePreps] =
    await Promise.all([
      supabase
        .from("games")
        .select(
          "id, season_id, home_team_season_id, away_team_season_id, starts_at, location, status, attendance_mode, capacity",
        )
        .order("starts_at", { ascending: true }),
      listTeamSeasons(),
      listPrograms(),
      listSeasons(),
      listGameStates(),
      listGamePreps(),
    ]);

  if (error) {
    throw error;
  }

  return (gameRows ?? []).map((game) => {
    const season = seasonRecords.find((item) => item.id === game.season_id);
    const homeTeamSeason = teamSeasonRecords.find(
      (item) => item.id === game.home_team_season_id,
    );
    const awayTeamSeason = teamSeasonRecords.find(
      (item) => item.id === game.away_team_season_id,
    );
    const homeProgram = programRecords.find(
      (item) => item.id === homeTeamSeason?.programId,
    );
    const awayProgram = programRecords.find(
      (item) => item.id === awayTeamSeason?.programId,
    );
    const state = gameStates.find((item) => item.gameId === game.id);
    const prep = gamePreps.find((item) => item.gameId === game.id);
    const ourProgram = homeProgram?.isPikesville
      ? homeProgram
      : awayProgram?.isPikesville
        ? awayProgram
        : undefined;
    const opponentProgram =
      ourProgram?.id === homeProgram?.id ? awayProgram : homeProgram;
    const score =
      state && game.status !== "scheduled"
        ? `${state.homeScore}-${state.awayScore}`
        : "-";

    return {
      id: game.id,
      seasonId: game.season_id,
      startsAt: game.starts_at ?? undefined,
      date: game.starts_at ? new Date(game.starts_at).toLocaleString("en-US") : "",
      opponent: opponentProgram?.name ?? `${homeProgram?.name ?? "Home"} vs ${awayProgram?.name ?? "Away"}`,
      season: season?.name ?? season?.schoolYear ?? game.season_id,
      status: game.status,
      score,
      prepStatus: prep ? "ready" : "not started",
      location: game.location ?? "",
      attendanceMode: normalizeEventAttendanceMode(game.attendance_mode ?? undefined),
      capacity:
        typeof game.capacity === "number" && Number.isFinite(game.capacity) && game.capacity > 0
          ? Math.max(1, Math.round(game.capacity))
          : undefined,
      homeTeamSeasonId: game.home_team_season_id,
      awayTeamSeasonId: game.away_team_season_id,
    };
  });
}

export async function listPlayLibraryRows(): Promise<PlayLibraryRow[]> {
  if (!isSupabaseConfigured()) {
    return plays.map((play) => ({
      id: play.id,
      name: play.name,
      family: play.family,
      side: play.side,
      owner: play.owner,
      team: play.team,
      teamSeasonId: play.teamSeasonId,
      teamSeasonIds: getPlayTeamSeasonIds(play),
      playScope: getPlayScope(play),
      tags: play.tags,
      notes: play.notes,
      imageUrl: play.imageUrl,
      embedCode: play.embedCode,
      isActive: true,
    }));
  }

  const supabase = getSupabaseAdminClient();
  const [{ data, error }, teamSeasonRecords, programRecords] = await Promise.all([
    supabase
      .from("play_libraries")
      .select(
        "id, team_season_id, team_season_ids, play_scope, play_name, play_family, play_side, notes, tags, image_url, embed_code, is_active",
      )
      .order("play_name"),
    listTeamSeasons(),
    listPrograms(),
  ]);

  if (error) {
    throw error;
  }

  return (data ?? []).map((play) => {
    const teamSeasonIds =
      Array.isArray(play.team_season_ids) && play.team_season_ids.length > 0
        ? play.team_season_ids
        : play.team_season_id
          ? [play.team_season_id]
          : [];
    const playScope = play.play_scope === "global_opponent" ? "global_opponent" : "team";
    const teamSeason = teamSeasonRecords.find(
      (item) => item.id === play.team_season_id,
    );
    const program = programRecords.find(
      (item) => item.id === teamSeason?.programId,
    );

    return {
      id: play.id,
      name: play.play_name,
      family: play.play_family ?? "",
      side: play.play_side,
      owner: playScope === "global_opponent" || teamSeason?.teamType !== "ours" ? "opponent" : "ours",
      team: playScope === "global_opponent" ? "Global Opponent" : program?.name ?? "",
      teamSeasonId: play.team_season_id ?? "",
      teamSeasonIds,
      playScope,
      tags: play.tags ?? [],
      notes: play.notes ?? "",
      imageUrl: play.image_url ?? undefined,
      embedCode: play.embed_code ?? undefined,
      isActive: play.is_active,
    };
  });
}

export async function listDrillLibraryRows(): Promise<DrillLibraryRow[]> {
  if (!isSupabaseConfigured()) {
    return drills.map((drill) => ({
      id: drill.id,
      legacyId: drill.legacyId,
      title: drill.title,
      drillType: drill.drillType ?? "",
      playType: drill.playType ?? "",
      tags: drill.tags,
      description: drill.description ?? "",
      instructions: drill.instructions ?? "",
      notes: drill.notes ?? "",
      videoUrl: drill.videoUrl,
      imageUrl: drill.imageUrl,
      isActive: drill.isActive,
    }));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("drill_libraries")
    .select(
      "id, legacy_id, title, drill_type, play_type, tags, description, instructions, notes, video_url, image_url, is_active",
    )
    .order("title");

  if (error) {
    throw error;
  }

  return (data ?? []).map((drill) => ({
    id: drill.id,
    legacyId: drill.legacy_id ?? undefined,
    title: drill.title,
    drillType: drill.drill_type ?? "",
    playType: drill.play_type ?? "",
    tags: drill.tags ?? [],
    description: drill.description ?? "",
    instructions: drill.instructions ?? "",
    notes: drill.notes ?? "",
    videoUrl: drill.video_url ?? undefined,
    imageUrl: drill.image_url ?? undefined,
    isActive: drill.is_active,
  }));
}

function normalizePracticePlanRating(value?: string): PracticePlanItemRating {
  return value === "ok" || value === "good" || value === "amazing" ? value : "bad";
}

function normalizePracticePlanItemType(value?: string): PracticePlanItemType {
  return value === "custom_drill" || value === "instruction" || value === "circuit"
    ? value
    : "library_drill";
}

function normalizeEventAttendanceMode(value?: string): EventAttendanceMode {
  return value === "voluntary" ? "voluntary" : "mandatory";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAudienceRoles(value: unknown): WeekGoalAudienceRole[] {
  return normalizeStringArray(value).filter(
    (item): item is WeekGoalAudienceRole =>
      item === "admin" || item === "coach" || item === "manager" || item === "player",
  );
}

function normalizeProgramAssignmentType(value?: string): ProgramAssignmentType {
  return value === "play_review" ||
    value === "shooting_goal" ||
    value === "read_scouting_report" ||
    value === "watch_video" ||
    value === "create_evaluation" ||
    value === "create_development_plan"
    ? value
    : "custom";
}

function normalizeWeekGoalRecord(record: Partial<WeekGoalRecord>): WeekGoalRecord {
  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    title: typeof record.title === "string" && record.title.trim().length > 0 ? record.title.trim() : "Week Goal",
    body: typeof record.body === "string" && record.body.trim().length > 0 ? record.body : undefined,
    startDate: typeof record.startDate === "string" ? record.startDate : "",
    endDate: typeof record.endDate === "string" ? record.endDate : "",
    targetRoles: normalizeAudienceRoles(record.targetRoles),
    isActive: record.isActive !== false,
  };
}

function normalizeCoachResponsibilityRecord(
  record: Partial<CoachResponsibilityRecord>,
): CoachResponsibilityRecord {
  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    label:
      typeof record.label === "string" && record.label.trim().length > 0
        ? record.label.trim()
        : "Game Day Responsibility",
    coachProfileId:
      typeof record.coachProfileId === "string" && record.coachProfileId.trim().length > 0
        ? record.coachProfileId
        : undefined,
  };
}

function normalizeCoachResponsibilityTemplateRecord(
  record: Partial<CoachResponsibilityTemplateRecord>,
  index = 0,
): CoachResponsibilityTemplateRecord {
  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    label:
      typeof record.label === "string" && record.label.trim().length > 0
        ? record.label.trim()
        : `Responsibility ${index + 1}`,
    coachProfileId:
      typeof record.coachProfileId === "string" && record.coachProfileId.trim().length > 0
        ? record.coachProfileId
        : undefined,
    sortOrder:
      typeof record.sortOrder === "number" && Number.isFinite(record.sortOrder)
        ? Math.max(1, Math.round(record.sortOrder))
        : index + 1,
  };
}

function normalizeProgramAssignmentProofRecord(
  record: Partial<ProgramAssignmentProofRecord>,
): ProgramAssignmentProofRecord {
  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    assignmentId: typeof record.assignmentId === "string" ? record.assignmentId : "",
    submittedByRole:
      record.submittedByRole === "admin" ||
      record.submittedByRole === "coach" ||
      record.submittedByRole === "manager"
        ? record.submittedByRole
        : "player",
    submittedByRosterMembershipId:
      typeof record.submittedByRosterMembershipId === "string" &&
      record.submittedByRosterMembershipId.trim().length > 0
        ? record.submittedByRosterMembershipId
        : undefined,
    submittedByCoachProfileId:
      typeof record.submittedByCoachProfileId === "string" && record.submittedByCoachProfileId.trim().length > 0
        ? record.submittedByCoachProfileId
        : undefined,
    submittedByManagerProfileId:
      typeof record.submittedByManagerProfileId === "string" && record.submittedByManagerProfileId.trim().length > 0
        ? record.submittedByManagerProfileId
        : undefined,
    imageUrls: normalizeStringArray(record.imageUrls),
    notes: typeof record.notes === "string" && record.notes.trim().length > 0 ? record.notes.trim() : undefined,
    reviewStatus:
      record.reviewStatus === "accepted" || record.reviewStatus === "rejected"
        ? record.reviewStatus
        : "pending",
    reviewReason:
      typeof record.reviewReason === "string" && record.reviewReason.trim().length > 0
        ? record.reviewReason.trim()
        : undefined,
    reviewedAt:
      typeof record.reviewedAt === "string" && record.reviewedAt.trim().length > 0
        ? record.reviewedAt
        : undefined,
    createdAt:
      typeof record.createdAt === "string" && record.createdAt.trim().length > 0
        ? record.createdAt
        : new Date().toISOString(),
  };
}

function normalizeProgramAssignmentCompletionRecord(
  record: Partial<ProgramAssignmentCompletionRecord>,
): ProgramAssignmentCompletionRecord {
  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    assignmentId: typeof record.assignmentId === "string" ? record.assignmentId : "",
    completedByRole:
      record.completedByRole === "coach" ||
      record.completedByRole === "manager" ||
      record.completedByRole === "admin"
        ? record.completedByRole
        : "player",
    completedByRosterMembershipId:
      typeof record.completedByRosterMembershipId === "string" && record.completedByRosterMembershipId.trim().length > 0
        ? record.completedByRosterMembershipId
        : undefined,
    completedByCoachProfileId:
      typeof record.completedByCoachProfileId === "string" && record.completedByCoachProfileId.trim().length > 0
        ? record.completedByCoachProfileId
        : undefined,
    completedByManagerProfileId:
      typeof record.completedByManagerProfileId === "string" && record.completedByManagerProfileId.trim().length > 0
        ? record.completedByManagerProfileId
        : undefined,
    completedByAdminAuthUserId:
      typeof record.completedByAdminAuthUserId === "string" && record.completedByAdminAuthUserId.trim().length > 0
        ? record.completedByAdminAuthUserId
        : undefined,
    completedAt:
      typeof record.completedAt === "string" && record.completedAt.trim().length > 0
        ? record.completedAt
        : new Date().toISOString(),
  };
}

function normalizeEventAttendanceRecord(record: Partial<EventAttendanceRecord>): EventAttendanceRecord {
  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    eventKind: record.eventKind === "practice" ? "practice" : "game",
    eventId: typeof record.eventId === "string" ? record.eventId : "",
    attendeeRole:
      record.attendeeRole === "coach" || record.attendeeRole === "manager" ? record.attendeeRole : "player",
    rosterMembershipId:
      typeof record.rosterMembershipId === "string" && record.rosterMembershipId.trim().length > 0
        ? record.rosterMembershipId
        : undefined,
    coachProfileId:
      typeof record.coachProfileId === "string" && record.coachProfileId.trim().length > 0
        ? record.coachProfileId
        : undefined,
    managerProfileId:
      typeof record.managerProfileId === "string" && record.managerProfileId.trim().length > 0
        ? record.managerProfileId
        : undefined,
    responseStatus:
      record.responseStatus === "out"
        ? "out"
        : record.responseStatus === "waitlist"
          ? "waitlist"
          : "coming",
    note: typeof record.note === "string" && record.note.trim().length > 0 ? record.note.trim() : undefined,
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt.trim().length > 0
        ? record.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeProgramAssignmentRecord(
  record: Partial<ProgramAssignmentRecord> & { relatedPlayId?: string },
): ProgramAssignmentRecord {
  const legacyRelatedPlayId =
    typeof (record as { relatedPlayId?: string }).relatedPlayId === "string"
      ? (record as { relatedPlayId?: string }).relatedPlayId
      : undefined;

  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    title:
      typeof record.title === "string" && record.title.trim().length > 0 ? record.title.trim() : "Program Assignment",
    body: typeof record.body === "string" && record.body.trim().length > 0 ? record.body : undefined,
    assignmentType: normalizeProgramAssignmentType(record.assignmentType),
    dueAt: typeof record.dueAt === "string" && record.dueAt.trim().length > 0 ? record.dueAt : undefined,
    isActive: record.isActive !== false,
    targetRoles: normalizeAudienceRoles(record.targetRoles),
    targetRosterMembershipIds: normalizeStringArray(record.targetRosterMembershipIds),
    targetCoachProfileIds: normalizeStringArray(record.targetCoachProfileIds),
    targetManagerProfileIds: normalizeStringArray(record.targetManagerProfileIds),
    relatedPlayIds: Array.from(
      new Set([
        ...normalizeStringArray(record.relatedPlayIds),
        ...(legacyRelatedPlayId && legacyRelatedPlayId.trim().length > 0 ? [legacyRelatedPlayId.trim()] : []),
      ]),
    ),
    relatedGameId:
      typeof record.relatedGameId === "string" && record.relatedGameId.trim().length > 0
        ? record.relatedGameId
        : undefined,
    relatedPlayerIds: Array.from(
      new Set([
        ...normalizeStringArray(record.relatedPlayerIds),
        ...(typeof record.relatedPlayerId === "string" && record.relatedPlayerId.trim().length > 0
          ? [record.relatedPlayerId.trim()]
          : []),
      ]),
    ),
    relatedPlayerId:
      typeof record.relatedPlayerId === "string" && record.relatedPlayerId.trim().length > 0
        ? record.relatedPlayerId
        : normalizeStringArray(record.relatedPlayerIds)[0] ?? undefined,
    videoEmbedCode:
      typeof record.videoEmbedCode === "string" && record.videoEmbedCode.trim().length > 0
        ? record.videoEmbedCode
        : undefined,
    shotsTarget:
      typeof record.shotsTarget === "number" && Number.isFinite(record.shotsTarget)
        ? Math.max(1, Math.round(record.shotsTarget))
        : undefined,
    proofRequired: Boolean(record.proofRequired),
    customUrl:
      typeof record.customUrl === "string" && record.customUrl.trim().length > 0 ? record.customUrl.trim() : undefined,
  };
}

function normalizePracticePlanItem(item: Partial<PracticePlanItemRecord>, index: number): PracticePlanItemRecord {
  const circuitItems = Array.isArray(item.circuitItems)
    ? item.circuitItems.map((circuitItem, circuitIndex) => ({
        id:
          typeof circuitItem?.id === "string" && circuitItem.id.trim().length > 0
            ? circuitItem.id
            : crypto.randomUUID(),
        title:
          typeof circuitItem?.title === "string" && circuitItem.title.trim().length > 0
            ? circuitItem.title.trim()
            : `Station ${circuitIndex + 1}`,
        durationMinutes:
          typeof circuitItem?.durationMinutes === "number" && Number.isFinite(circuitItem.durationMinutes)
            ? Math.max(1, Math.round(circuitItem.durationMinutes))
            : 5,
        focusTags: normalizeStringArray(circuitItem?.focusTags),
      }))
    : [];

  return {
    id: typeof item.id === "string" && item.id.trim().length > 0 ? item.id : crypto.randomUUID(),
    order:
      typeof item.order === "number" && Number.isFinite(item.order)
        ? Math.max(1, Math.round(item.order))
        : index + 1,
    itemType: normalizePracticePlanItemType(item.itemType),
    drillLibraryId:
      typeof item.drillLibraryId === "string" && item.drillLibraryId.trim().length > 0
        ? item.drillLibraryId
        : undefined,
    title: typeof item.title === "string" && item.title.trim().length > 0 ? item.title.trim() : undefined,
    durationMinutes:
      typeof item.durationMinutes === "number" && Number.isFinite(item.durationMinutes)
        ? Math.max(1, Math.round(item.durationMinutes))
        : 5,
    focusTags: normalizeStringArray(item.focusTags),
    goal: typeof item.goal === "string" ? item.goal : undefined,
    sets: typeof item.sets === "string" ? item.sets : undefined,
    reps: typeof item.reps === "string" ? item.reps : undefined,
    description: typeof item.description === "string" ? item.description : undefined,
    instructions: typeof item.instructions === "string" ? item.instructions : undefined,
    videoUrl: typeof item.videoUrl === "string" && item.videoUrl.trim().length > 0 ? item.videoUrl.trim() : undefined,
    imageUrls: normalizeStringArray(item.imageUrls),
    notes: typeof item.notes === "string" ? item.notes : undefined,
    results: typeof item.results === "string" ? item.results : undefined,
    rating: normalizePracticePlanRating(item.rating),
    isFinished: Boolean(item.isFinished),
    waterBreak: Boolean(item.waterBreak),
    circuitItems,
  };
}

function normalizePracticePlanRecord(
  record: Omit<Partial<PracticePlanRecord>, "items"> & {
    items?: Array<Partial<PracticePlanItemRecord>>;
  },
): PracticePlanRecord {
  const items = Array.isArray(record.items)
    ? record.items
        .map((item, index) => normalizePracticePlanItem(item, index))
        .sort((left, right) => left.order - right.order)
        .map((item, index) => ({ ...item, order: index + 1 }))
    : [];

  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : crypto.randomUUID(),
    seasonId: typeof record.seasonId === "string" ? record.seasonId : "",
    teamSeasonId: typeof record.teamSeasonId === "string" ? record.teamSeasonId : "",
    teamSeasonIds:
      Array.isArray(record.teamSeasonIds) && record.teamSeasonIds.length > 0
        ? record.teamSeasonIds.filter((teamSeasonId): teamSeasonId is string => typeof teamSeasonId === "string" && teamSeasonId.length > 0)
        : typeof record.teamSeasonId === "string" && record.teamSeasonId.length > 0
          ? [record.teamSeasonId]
          : [],
    title:
      typeof record.title === "string" && record.title.trim().length > 0
        ? record.title.trim()
        : "Practice Plan",
    practiceDate: typeof record.practiceDate === "string" ? record.practiceDate : "",
    startTime: typeof record.startTime === "string" && record.startTime.trim().length > 0 ? record.startTime : "15:00",
    lengthMinutes:
      typeof record.lengthMinutes === "number" && Number.isFinite(record.lengthMinutes)
        ? Math.max(1, Math.round(record.lengthMinutes))
        : 90,
    attendanceMode: normalizeEventAttendanceMode(record.attendanceMode),
    capacity:
      typeof record.capacity === "number" && Number.isFinite(record.capacity) && record.capacity > 0
        ? Math.max(1, Math.round(record.capacity))
        : undefined,
    practiceGoal: typeof record.practiceGoal === "string" ? record.practiceGoal : undefined,
    items,
  };
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hoursString = "0", minutesString = "0"] = time.split(":");
  const hours = Number.parseInt(hoursString, 10) || 0;
  const minutes = Number.parseInt(minutesString, 10) || 0;
  const total = hours * 60 + minutes + minutesToAdd;
  const normalizedHours = Math.floor(total / 60) % 24;
  const normalizedMinutes = total % 60;
  const period = normalizedHours >= 12 ? "PM" : "AM";
  const displayHours = normalizedHours % 12 || 12;
  return `${displayHours}:${normalizedMinutes.toString().padStart(2, "0")} ${period}`;
}

function formatCoachingResponsibilityLines(
  rows: CoachResponsibilityRecord[],
  coachRows: CoachProfileRow[],
) {
  return rows
    .map((row) => {
      const coachName = coachRows.find((coach) => coach.id === row.coachProfileId)?.displayName;
      return coachName ? `${row.label} - ${coachName}` : row.label;
    })
    .join("\n");
}

export async function listPracticePlans(): Promise<PracticePlanRecord[]> {
  if (!isSupabaseConfigured()) {
    return practicePlans.map((plan) => normalizePracticePlanRecord(plan));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("practice_plans")
    .select("id, season_id, team_season_id, team_season_ids, title, practice_date, start_time, length_minutes, attendance_mode, capacity, practice_goal, items")
    .order("practice_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((plan) =>
    normalizePracticePlanRecord({
      id: plan.id,
      seasonId: plan.season_id,
      teamSeasonId: plan.team_season_id,
      teamSeasonIds: Array.isArray(plan.team_season_ids) ? plan.team_season_ids.filter(Boolean) : [],
      title: plan.title,
      practiceDate: plan.practice_date,
      startTime: plan.start_time,
      lengthMinutes: plan.length_minutes,
      attendanceMode: normalizeEventAttendanceMode(plan.attendance_mode ?? undefined),
      capacity:
        typeof plan.capacity === "number" && Number.isFinite(plan.capacity) && plan.capacity > 0
          ? Math.max(1, Math.round(plan.capacity))
          : undefined,
      practiceGoal: plan.practice_goal ?? undefined,
      items: Array.isArray(plan.items) ? (plan.items as Partial<PracticePlanItemRecord>[]) : [],
    }),
  );
}

export async function listPracticePlanRows(): Promise<PracticePlanRow[]> {
  const [plans, teamSeasonRecords, seasonRecords, programRecords] = await Promise.all([
    listPracticePlans(),
    listTeamSeasons(),
    listSeasons(),
    listPrograms(),
  ]);

  return plans.map((plan) => {
    const planTeamSeasonIds = plan.teamSeasonIds.length ? plan.teamSeasonIds : [plan.teamSeasonId].filter(Boolean);
    const planTeamSeasons = planTeamSeasonIds
      .map((teamSeasonId) => teamSeasonRecords.find((team) => team.id === teamSeasonId))
      .filter((teamSeason): teamSeason is NonNullable<typeof teamSeason> => Boolean(teamSeason));
    const teamSeason = planTeamSeasons[0] ?? teamSeasonRecords.find((team) => team.id === plan.teamSeasonId);
    const season = seasonRecords.find((item) => item.id === plan.seasonId);
    const program = programRecords.find((item) => item.id === teamSeason?.programId);
    const teamSeasonLabel = planTeamSeasons.length > 1
      ? planTeamSeasons.map((team) => team.label).join(" / ")
      : teamSeason?.label ?? "";

    return {
      id: plan.id,
      title: plan.title,
      practiceDate: plan.practiceDate,
      startTimeValue: plan.startTime,
      startTime: addMinutesToTime(plan.startTime, 0),
      endTime: addMinutesToTime(plan.startTime, plan.lengthMinutes),
      lengthMinutes: plan.lengthMinutes,
      blockCount: plan.items.length,
      team: program?.name ?? "Unknown Team",
      teamSeasonId: plan.teamSeasonId,
      teamSeasonIds: planTeamSeasonIds,
      teamSeasonLabel,
      season: season?.name ?? plan.seasonId,
      seasonId: plan.seasonId,
      attendanceMode: plan.attendanceMode,
      capacity: plan.capacity,
    };
  });
}

export async function listCoachProfiles(): Promise<CoachProfileRecord[]> {
  if (!isSupabaseConfigured()) {
    return coachProfiles.map((profile) => ({ ...profile }));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("id, full_name, display_name, staff_role, bio, photo_url")
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    displayName: profile.display_name,
    staffRole: profile.staff_role ?? undefined,
    bio: profile.bio ?? undefined,
    photoUrl: profile.photo_url ?? undefined,
  }));
}

export async function listCoachProfileRows(): Promise<CoachProfileRow[]> {
  return listCoachProfiles();
}

export async function getAdminProfileByAuthUser(input: {
  authUserId: string;
  authEmail?: string | null;
}): Promise<AdminProfileRow | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: crypto.randomUUID(),
      authUserId: input.authUserId,
      authEmail: input.authEmail ?? undefined,
      displayName: input.authEmail?.split("@")[0] ?? "Admin",
      fullName: input.authEmail?.split("@")[0] ?? "Admin",
      staffRole: "Administrator",
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, auth_user_id, auth_email, full_name, display_name, staff_role, bio, photo_url")
    .eq("auth_user_id", input.authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      id: crypto.randomUUID(),
      authUserId: input.authUserId,
      authEmail: input.authEmail ?? undefined,
      displayName: input.authEmail?.split("@")[0] ?? "Admin",
      fullName: input.authEmail?.split("@")[0] ?? "Admin",
      staffRole: "Administrator",
    };
  }

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    authEmail: data.auth_email ?? undefined,
    fullName: data.full_name,
    displayName: data.display_name,
    staffRole: data.staff_role ?? undefined,
    bio: data.bio ?? undefined,
    photoUrl: data.photo_url ?? undefined,
  };
}

export async function listAdminProfiles(): Promise<AdminProfileRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, auth_user_id, auth_email, full_name, display_name, staff_role, bio, photo_url")
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    authUserId: profile.auth_user_id,
    authEmail: profile.auth_email ?? undefined,
    fullName: profile.full_name,
    displayName: profile.display_name,
    staffRole: profile.staff_role ?? undefined,
    bio: profile.bio ?? undefined,
    photoUrl: profile.photo_url ?? undefined,
  }));
}

export async function listManagerProfiles(): Promise<ManagerProfileRecord[]> {
  if (!isSupabaseConfigured()) {
    return managerProfiles.map((profile) => ({ ...profile }));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("manager_profiles")
    .select("id, full_name, display_name")
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    displayName: profile.display_name,
  }));
}

export async function listManagerProfileRows(): Promise<ManagerProfileRow[]> {
  return listManagerProfiles();
}

export async function listCoachResponsibilityTemplates(): Promise<CoachResponsibilityTemplateRecord[]> {
  if (!isSupabaseConfigured()) {
    return coachResponsibilityTemplates
      .map((template, index) => normalizeCoachResponsibilityTemplateRecord(template, index))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coach_responsibility_templates")
    .select("id, label, coach_profile_id, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((template, index) =>
    normalizeCoachResponsibilityTemplateRecord(
      {
        id: template.id,
        label: template.label,
        coachProfileId: template.coach_profile_id ?? undefined,
        sortOrder: template.sort_order,
      },
      index,
    ),
  );
}

export async function listCoachResponsibilityTemplateRows(): Promise<CoachResponsibilityTemplateRow[]> {
  const [templates, coachRows] = await Promise.all([
    listCoachResponsibilityTemplates(),
    listCoachProfileRows(),
  ]);

  return templates.map((template) => ({
    ...template,
    coachDisplayName: coachRows.find((coach) => coach.id === template.coachProfileId)?.displayName,
  }));
}

export async function listWeekGoals(): Promise<WeekGoalRecord[]> {
  if (!isSupabaseConfigured()) {
    return weekGoals.map((goal) => normalizeWeekGoalRecord(goal));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("week_goals")
    .select("id, title, body, start_date, end_date, target_roles, is_active")
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((goal) =>
    normalizeWeekGoalRecord({
      id: goal.id,
      title: goal.title,
      body: goal.body ?? undefined,
      startDate: goal.start_date,
      endDate: goal.end_date,
      targetRoles: goal.target_roles ?? [],
      isActive: goal.is_active,
    }),
  );
}

export async function listWeekGoalRows(): Promise<WeekGoalRow[]> {
  return listWeekGoals();
}

export async function listProgramAssignments(): Promise<ProgramAssignmentRecord[]> {
  if (!isSupabaseConfigured()) {
    return programAssignments.map((assignment) => normalizeProgramAssignmentRecord(assignment));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_assignments")
    .select(
      "id, title, body, assignment_type, due_at, is_active, target_roles, target_roster_membership_ids, target_coach_profile_ids, target_manager_profile_ids, related_play_id, related_play_ids, related_game_id, related_player_id, related_player_ids, video_embed_code, shots_target, proof_required, custom_url",
    )
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((assignment) =>
    normalizeProgramAssignmentRecord({
      id: assignment.id,
      title: assignment.title,
      body: assignment.body ?? undefined,
      assignmentType: assignment.assignment_type,
      dueAt: assignment.due_at ?? undefined,
      isActive: assignment.is_active,
      targetRoles: assignment.target_roles ?? [],
      targetRosterMembershipIds: assignment.target_roster_membership_ids ?? [],
      targetCoachProfileIds: assignment.target_coach_profile_ids ?? [],
      targetManagerProfileIds: assignment.target_manager_profile_ids ?? [],
      relatedPlayIds: assignment.related_play_ids ?? [],
      relatedPlayId: assignment.related_play_id ?? undefined,
      relatedGameId: assignment.related_game_id ?? undefined,
      relatedPlayerIds: assignment.related_player_ids ?? [],
      relatedPlayerId: assignment.related_player_id ?? undefined,
      videoEmbedCode: assignment.video_embed_code ?? undefined,
      shotsTarget: assignment.shots_target ?? undefined,
      proofRequired: assignment.proof_required,
      customUrl: assignment.custom_url ?? undefined,
    }),
  );
}

export async function listProgramAssignmentRows(): Promise<ProgramAssignmentRow[]> {
  const [assignments, playRows, gameRows, playerRows, coachRows, managerRows] = await Promise.all([
    listProgramAssignments(),
    listPlayLibraryRows(),
    listGameRows(),
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
  ]);

  return assignments.map((assignment) => ({
    ...assignment,
    relatedPlayNames: playRows
      .filter((play) => assignment.relatedPlayIds.includes(play.id))
      .map((play) => play.name),
    relatedGameTitle: gameRows.find((game) => game.id === assignment.relatedGameId)?.opponent,
    relatedPlayerNames: playerRows
      .filter((player) => assignment.relatedPlayerIds.includes(player.playerId))
      .map((player) => player.name),
    relatedPlayerName: playerRows.find((player) => player.playerId === assignment.relatedPlayerId)?.name,
    targetCoachNames: coachRows
      .filter((coach) => assignment.targetCoachProfileIds.includes(coach.id))
      .map((coach) => coach.displayName),
    targetManagerNames: managerRows
      .filter((manager) => assignment.targetManagerProfileIds.includes(manager.id))
      .map((manager) => manager.displayName),
  }));
}

export async function listProgramAssignmentCompletions(): Promise<ProgramAssignmentCompletionRecord[]> {
  if (!isSupabaseConfigured()) {
    return programAssignmentCompletions.map((completion) => normalizeProgramAssignmentCompletionRecord(completion));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_assignment_completions")
    .select("id, assignment_id, completed_by_role, completed_by_roster_membership_id, completed_by_coach_profile_id, completed_by_manager_profile_id, completed_by_admin_auth_user_id, completed_at")
    .order("completed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((completion) =>
    normalizeProgramAssignmentCompletionRecord({
      id: completion.id,
      assignmentId: completion.assignment_id,
      completedByRole: completion.completed_by_role,
      completedByRosterMembershipId: completion.completed_by_roster_membership_id ?? undefined,
      completedByCoachProfileId: completion.completed_by_coach_profile_id ?? undefined,
      completedByManagerProfileId: completion.completed_by_manager_profile_id ?? undefined,
      completedByAdminAuthUserId: completion.completed_by_admin_auth_user_id ?? undefined,
      completedAt: completion.completed_at,
    }),
  );
}

export async function listProgramAssignmentCompletionRows(): Promise<ProgramAssignmentCompletionRow[]> {
  const [completions, playerRows, coachRows, managerRows] = await Promise.all([
    listProgramAssignmentCompletions(),
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
  ]);

  return completions.map((completion) => ({
    ...completion,
    completedByLabel:
      completion.completedByRole === "player"
        ? playerRows.find((player) => player.id === completion.completedByRosterMembershipId)?.name ?? "Player"
        : completion.completedByRole === "coach"
          ? coachRows.find((coach) => coach.id === completion.completedByCoachProfileId)?.displayName ?? "Coach"
          : completion.completedByRole === "manager"
            ? managerRows.find((manager) => manager.id === completion.completedByManagerProfileId)?.displayName ?? "Manager"
            : "Admin",
  }));
}

export async function createProgramAssignmentCompletion(
  input: Omit<ProgramAssignmentCompletionRecord, "id" | "completedAt"> & { id?: string; completedAt?: string },
) {
  const record = normalizeProgramAssignmentCompletionRecord({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    completedAt: input.completedAt ?? new Date().toISOString(),
  });

  if (!isSupabaseConfigured()) {
    const existingIndex = programAssignmentCompletions.findIndex(
      (completion) =>
        completion.assignmentId === record.assignmentId &&
        completion.completedByRole === record.completedByRole &&
        completion.completedByRosterMembershipId === record.completedByRosterMembershipId &&
        completion.completedByCoachProfileId === record.completedByCoachProfileId &&
        completion.completedByManagerProfileId === record.completedByManagerProfileId &&
        completion.completedByAdminAuthUserId === record.completedByAdminAuthUserId,
    );
    if (existingIndex >= 0) {
      programAssignmentCompletions[existingIndex] = record;
    } else {
      programAssignmentCompletions.unshift(record);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("program_assignment_completions").upsert(
    {
      id: record.id,
      assignment_id: record.assignmentId,
      completed_by_role: record.completedByRole,
      completed_by_roster_membership_id: record.completedByRosterMembershipId ?? null,
      completed_by_coach_profile_id: record.completedByCoachProfileId ?? null,
      completed_by_manager_profile_id: record.completedByManagerProfileId ?? null,
      completed_by_admin_auth_user_id: record.completedByAdminAuthUserId ?? null,
      completed_at: record.completedAt,
    },
    {
      onConflict:
        "assignment_id,completed_by_role,completed_by_roster_membership_id,completed_by_coach_profile_id,completed_by_manager_profile_id,completed_by_admin_auth_user_id",
    },
  );

  if (error) {
    throw error;
  }
}

export async function deleteProgramAssignmentCompletion(input: {
  assignmentId: string;
  completedByRole: ProgramAssignmentCompletionRecord["completedByRole"];
  completedByRosterMembershipId?: string;
  completedByCoachProfileId?: string;
  completedByManagerProfileId?: string;
  completedByAdminAuthUserId?: string;
}) {
  if (!isSupabaseConfigured()) {
    const index = programAssignmentCompletions.findIndex(
      (completion) =>
        completion.assignmentId === input.assignmentId &&
        completion.completedByRole === input.completedByRole &&
        completion.completedByRosterMembershipId === input.completedByRosterMembershipId &&
        completion.completedByCoachProfileId === input.completedByCoachProfileId &&
        completion.completedByManagerProfileId === input.completedByManagerProfileId &&
        completion.completedByAdminAuthUserId === input.completedByAdminAuthUserId,
    );

    if (index >= 0) {
      programAssignmentCompletions.splice(index, 1);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("program_assignment_completions")
    .delete()
    .eq("assignment_id", input.assignmentId)
    .eq("completed_by_role", input.completedByRole);

  query =
    input.completedByRole === "player"
      ? query.eq("completed_by_roster_membership_id", input.completedByRosterMembershipId ?? "")
      : input.completedByRole === "coach"
        ? query.eq("completed_by_coach_profile_id", input.completedByCoachProfileId ?? "")
        : input.completedByRole === "manager"
          ? query.eq("completed_by_manager_profile_id", input.completedByManagerProfileId ?? "")
          : query.eq("completed_by_admin_auth_user_id", input.completedByAdminAuthUserId ?? "");

  const { error } = await query;
  if (error) {
    throw error;
  }
}

export async function getProgramAssignmentById(assignmentId: string): Promise<ProgramAssignmentRow | null> {
  const rows = await listProgramAssignmentRows();
  return rows.find((assignment) => assignment.id === assignmentId) ?? null;
}

export async function listProgramAssignmentProofs(assignmentId: string): Promise<ProgramAssignmentProofRow[]> {
  const [playerRows, coachRows, managerRows] = await Promise.all([
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
  ]);

  const resolveSubmittedByLabel = (record: ProgramAssignmentProofRecord) => {
    if (record.submittedByRole === "coach") {
      return (
        coachRows.find((coach) => coach.id === record.submittedByCoachProfileId)?.displayName ?? "Coach"
      );
    }

    if (record.submittedByRole === "manager") {
      return (
        managerRows.find((manager) => manager.id === record.submittedByManagerProfileId)?.displayName ?? "Manager"
      );
    }

    if (record.submittedByRole === "admin") {
      return "Admin";
    }

    return (
      playerRows.find((player) => player.id === record.submittedByRosterMembershipId)?.name ?? "Player"
    );
  };

  if (!isSupabaseConfigured()) {
    return programAssignmentProofs
      .filter((proof) => proof.assignmentId === assignmentId)
      .map((proof) => normalizeProgramAssignmentProofRecord(proof))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((proof) => ({
        ...proof,
        submittedByLabel: resolveSubmittedByLabel(proof),
      }));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_assignment_proofs")
    .select(
      "id, assignment_id, submitted_by_role, submitted_by_roster_membership_id, submitted_by_coach_profile_id, submitted_by_manager_profile_id, image_urls, notes, review_status, review_reason, reviewed_at, created_at",
    )
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((proof) => {
    const normalized = normalizeProgramAssignmentProofRecord({
      id: proof.id,
      assignmentId: proof.assignment_id,
      submittedByRole: proof.submitted_by_role,
      submittedByRosterMembershipId: proof.submitted_by_roster_membership_id ?? undefined,
      submittedByCoachProfileId: proof.submitted_by_coach_profile_id ?? undefined,
      submittedByManagerProfileId: proof.submitted_by_manager_profile_id ?? undefined,
      imageUrls: proof.image_urls ?? [],
      notes: proof.notes ?? undefined,
      reviewStatus: proof.review_status ?? undefined,
      reviewReason: proof.review_reason ?? undefined,
      reviewedAt: proof.reviewed_at ?? undefined,
      createdAt: proof.created_at,
    });

    return {
      ...normalized,
      submittedByLabel: resolveSubmittedByLabel(normalized),
    };
  });
}

export async function listProgramAssignmentProofRows(): Promise<ProgramAssignmentProofRow[]> {
  const assignments = await listProgramAssignmentRows();
  const allProofRows = await Promise.all(
    assignments.map((assignment) => listProgramAssignmentProofs(assignment.id)),
  );
  return allProofRows.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function reviewProgramAssignmentProof(input: {
  proofId: string;
  reviewStatus: "accepted" | "rejected";
  reviewReason?: string;
}) {
  const reviewedAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const target = programAssignmentProofs.find((proof) => proof.id === input.proofId);
    if (!target) {
      throw new Error("Proof submission not found.");
    }

    target.reviewStatus = input.reviewStatus;
    target.reviewReason = input.reviewStatus === "rejected" ? input.reviewReason : undefined;
    target.reviewedAt = reviewedAt;
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("program_assignment_proofs")
    .update({
      review_status: input.reviewStatus,
      review_reason: input.reviewStatus === "rejected" ? input.reviewReason ?? null : null,
      reviewed_at: reviewedAt,
    })
    .eq("id", input.proofId);

  if (error) {
    throw error;
  }
}

export async function listEventAttendanceRows(): Promise<EventAttendanceRow[]> {
  const [playerRows, coachRows, managerRows] = await Promise.all([
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
  ]);

  const resolveAttendeeLabel = (record: EventAttendanceRecord) => {
    if (record.attendeeRole === "coach") {
      return coachRows.find((coach) => coach.id === record.coachProfileId)?.displayName ?? "Coach";
    }

    if (record.attendeeRole === "manager") {
      return managerRows.find((manager) => manager.id === record.managerProfileId)?.displayName ?? "Manager";
    }

    return playerRows.find((player) => player.id === record.rosterMembershipId)?.name ?? "Player";
  };

  if (!isSupabaseConfigured()) {
    return eventAttendanceResponses
      .map((record) => normalizeEventAttendanceRecord(record))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({
        ...record,
        attendeeLabel: resolveAttendeeLabel(record),
      }));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_attendance_responses")
    .select(
      "id, event_kind, event_id, attendee_role, roster_membership_id, coach_profile_id, manager_profile_id, response_status, note, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((record) => {
    const normalized = normalizeEventAttendanceRecord({
      id: record.id,
      eventKind: record.event_kind,
      eventId: record.event_id,
      attendeeRole: record.attendee_role,
      rosterMembershipId: record.roster_membership_id ?? undefined,
      coachProfileId: record.coach_profile_id ?? undefined,
      managerProfileId: record.manager_profile_id ?? undefined,
      responseStatus: record.response_status,
      note: record.note ?? undefined,
      updatedAt: record.updated_at,
    });

    return {
      ...normalized,
      attendeeLabel: resolveAttendeeLabel(normalized),
    };
  });
}

export async function upsertEventAttendanceResponse(input: Omit<EventAttendanceRecord, "id" | "updatedAt">) {
  const record = normalizeEventAttendanceRecord({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  if (!isSupabaseConfigured()) {
    const existingIndex = eventAttendanceResponses.findIndex((response) => {
      if (response.eventKind !== record.eventKind || response.eventId !== record.eventId) {
        return false;
      }

      if (record.attendeeRole !== response.attendeeRole) {
        return false;
      }

      return (
        response.rosterMembershipId === record.rosterMembershipId &&
        response.coachProfileId === record.coachProfileId &&
        response.managerProfileId === record.managerProfileId
      );
    });

    if (existingIndex >= 0) {
      eventAttendanceResponses[existingIndex] = {
        ...eventAttendanceResponses[existingIndex],
        ...record,
        id: eventAttendanceResponses[existingIndex].id,
      };
    } else {
      eventAttendanceResponses.unshift(record);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const identityColumn =
    record.attendeeRole === "coach"
      ? "coach_profile_id"
      : record.attendeeRole === "manager"
        ? "manager_profile_id"
        : "roster_membership_id";
  const identityValue =
    record.attendeeRole === "coach"
      ? record.coachProfileId
      : record.attendeeRole === "manager"
        ? record.managerProfileId
        : record.rosterMembershipId;

  const { data: existing, error: existingError } = await supabase
    .from("event_attendance_responses")
    .select("id")
    .eq("event_kind", record.eventKind)
    .eq("event_id", record.eventId)
    .eq("attendee_role", record.attendeeRole)
    .eq(identityColumn, identityValue ?? "")
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const payload = {
    event_kind: record.eventKind,
    event_id: record.eventId,
    attendee_role: record.attendeeRole,
    roster_membership_id: record.rosterMembershipId ?? null,
    coach_profile_id: record.coachProfileId ?? null,
    manager_profile_id: record.managerProfileId ?? null,
    response_status: record.responseStatus,
    note: record.note ?? null,
    updated_at: record.updatedAt,
  };

  if (existing?.id) {
    const { error } = await supabase.from("event_attendance_responses").update(payload).eq("id", existing.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from("event_attendance_responses").insert({
    id: record.id,
    ...payload,
  });

  if (error) {
    throw error;
  }
}

export async function listGameDayCoachAssignmentRows(input?: {
  role?: "admin" | "coach" | "manager" | "player" | null;
  coachProfileId?: string | null;
}): Promise<GameDayCoachAssignmentRow[]> {
  const [games, prepRows, coachRows, templateRows] = await Promise.all([
    listGameRows(),
    listGamePreps(),
    listCoachProfileRows(),
    listCoachResponsibilityTemplates(),
  ]);

  const now = Date.now();
  const upcomingGames = games
    .map((game) => ({
      ...game,
      startsAtMs: Number.isNaN(new Date(game.startsAt ?? game.date).getTime())
        ? null
        : new Date(game.startsAt ?? game.date).getTime(),
    }))
    .filter((game) => game.startsAtMs !== null && game.startsAtMs >= now)
    .sort((left, right) => (left.startsAtMs ?? 0) - (right.startsAtMs ?? 0));

  const templateFallbackRows = templateRows.map((template) =>
    normalizeCoachResponsibilityRecord({
      id: template.id,
      label: template.label,
      coachProfileId: template.coachProfileId,
    }),
  );

  const allRows = upcomingGames.flatMap((game) => {
    const prep = prepRows.find((item) => item.gameId === game.id);
    const responsibilityRows = prep?.coachingResponsibilityRows.length
      ? prep.coachingResponsibilityRows
      : templateFallbackRows;

    return responsibilityRows.map((responsibility) => ({
      id: `${game.id}-${responsibility.id}`,
      gameId: game.id,
      gameTitle: `vs ${game.opponent}`,
      startsAt: game.startsAt ?? game.date,
      responsibilityId: responsibility.id,
      responsibilityLabel: responsibility.label,
      coachProfileId: responsibility.coachProfileId,
      coachDisplayName: coachRows.find((coach) => coach.id === responsibility.coachProfileId)?.displayName,
      href: `/scouting/${game.id}/game-plan`,
    }));
  });

  if (input?.role === "coach") {
    if (input.coachProfileId) {
      return allRows.filter((row) => row.coachProfileId === input.coachProfileId);
    }
    return allRows.filter((row) => Boolean(row.coachProfileId));
  }

  if (input?.role !== "admin") {
    return [];
  }

  return allRows;
}

export async function getPracticePlanById(practicePlanId: string): Promise<PracticePlanDetail | null> {
  const [plans, teamSeasonRecords, seasonRecords, programRecords] = await Promise.all([
    listPracticePlans(),
    listTeamSeasons(),
    listSeasons(),
    listPrograms(),
  ]);
  const practicePlan = plans.find((plan) => plan.id === practicePlanId);

  if (!practicePlan) {
    return null;
  }

  const planTeamSeasonIds = practicePlan.teamSeasonIds.length
    ? practicePlan.teamSeasonIds
    : [practicePlan.teamSeasonId].filter(Boolean);
  const planTeamSeasons = planTeamSeasonIds
    .map((teamSeasonId) => teamSeasonRecords.find((team) => team.id === teamSeasonId))
    .filter((teamSeason): teamSeason is NonNullable<typeof teamSeason> => Boolean(teamSeason));
  const teamSeason = planTeamSeasons[0] ?? teamSeasonRecords.find((team) => team.id === practicePlan.teamSeasonId);
  const season = seasonRecords.find((item) => item.id === practicePlan.seasonId);
  const program = programRecords.find((item) => item.id === teamSeason?.programId);

  return {
    ...practicePlan,
    team: program?.name ?? "Unknown Team",
    teamSeasonLabel: planTeamSeasons.length > 1
      ? planTeamSeasons.map((team) => team.label).join(" / ")
      : teamSeason?.label ?? "",
    teamSeasonLabels: planTeamSeasons.map((team) => team.label),
    season: season?.name ?? practicePlan.seasonId,
  };
}

export async function listPrograms(): Promise<ProgramRecord[]> {
  if (!isSupabaseConfigured()) {
    return programs;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, short_name, is_pikesville")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((program) => ({
    id: program.id,
    name: program.name,
    shortName: program.short_name ?? "",
    isPikesville: program.is_pikesville,
  }));
}

export async function listTeamSeasons(): Promise<TeamSeasonRecord[]> {
  if (!isSupabaseConfigured()) {
    return teamSeasons;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("team_seasons")
    .select(
      "id, season_id, program_id, label, team_type, level, scouting_summary, offense, defense, press, team_tendencies, scouting_videos, keys_to_winning, actions_to_watch, scouting_notes",
    )
    .order("season_id", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((teamSeason) => ({
    id: teamSeason.id,
    seasonId: teamSeason.season_id,
    programId: teamSeason.program_id,
    label: teamSeason.label,
    teamType: teamSeason.team_type,
    level: teamSeason.level ?? undefined,
    scoutingSummary: teamSeason.scouting_summary ?? undefined,
    offense: teamSeason.offense ?? undefined,
    defense: teamSeason.defense ?? undefined,
    press: teamSeason.press ?? undefined,
    teamTendencies: teamSeason.team_tendencies ?? undefined,
    scoutingVideos: teamSeason.scouting_videos ?? undefined,
    keysToWinning: teamSeason.keys_to_winning ?? undefined,
    actionsToWatch: teamSeason.actions_to_watch ?? undefined,
    scoutingNotes: teamSeason.scouting_notes ?? undefined,
  }));
}

export async function listTeamSeasonRows(): Promise<TeamSeasonRow[]> {
  if (!isSupabaseConfigured()) {
    return teamSeasonRows;
  }

  const [teamSeasonRecords, programRecords, rosterRecords, seasonRecords] =
    await Promise.all([
      listTeamSeasons(),
      listPrograms(),
      listRosterMemberships(),
      listSeasons(),
    ]);

  return teamSeasonRecords.map((teamSeason) => {
    const program = programRecords.find(
      (programItem) => programItem.id === teamSeason.programId,
    );
    const season = seasonRecords.find(
      (seasonItem) => seasonItem.id === teamSeason.seasonId,
    );
    const activePlayers = rosterRecords.filter(
      (membership) =>
        membership.teamSeasonId === teamSeason.id && membership.isActive,
    ).length;

    return {
      id: teamSeason.id,
      name: program?.name ?? teamSeason.id,
      shortName: program?.shortName ?? "",
      label: teamSeason.label,
      season: season?.name ?? season?.schoolYear ?? teamSeason.seasonId,
      type: teamSeason.teamType,
      activePlayers,
      lastGameDate: "",
      scoutingSummary: teamSeason.scoutingSummary ?? "",
      offense: teamSeason.offense ?? "",
      defense: teamSeason.defense ?? "",
      press: teamSeason.press ?? "",
      teamTendencies: teamSeason.teamTendencies ?? "",
      scoutingVideos: teamSeason.scoutingVideos ?? [],
      keysToWinning: teamSeason.keysToWinning ?? "",
      actionsToWatch: teamSeason.actionsToWatch ?? "",
    };
  });
}

export async function listPlayers(): Promise<PlayerRecord[]> {
  if (!isSupabaseConfigured()) {
    return players;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, first_name, last_name, dominant_hand, photo_url, graduating_class, birthdate, notes")
    .order("last_name")
    .order("first_name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((player) => ({
    id: player.id,
    firstName: player.first_name,
    lastName: player.last_name,
    dominantHand: player.dominant_hand ?? undefined,
    photoUrl: player.photo_url ?? undefined,
    graduatingClass: player.graduating_class ?? undefined,
    birthdate: player.birthdate ?? undefined,
    notes: player.notes ?? undefined,
  }));
}

export async function listPlayerEvaluations(): Promise<PlayerEvaluationRecord[]> {
  if (!isSupabaseConfigured()) {
    return playerEvaluations;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("player_evaluations")
    .select("id, player_id, coach_name, evaluation_date, evaluation, player_view_evaluation, created_at")
    .order("evaluation_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((evaluation) => ({
    id: evaluation.id,
    playerId: evaluation.player_id,
    coachName: evaluation.coach_name,
    evaluationDate: evaluation.evaluation_date,
    evaluation: evaluation.evaluation,
    playerViewEvaluation: evaluation.player_view_evaluation ?? undefined,
    createdAt: evaluation.created_at ?? undefined,
  }));
}

export async function listPlayerParentContacts(): Promise<PlayerParentContactRecord[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("player_parent_contacts")
    .select("id, player_id, full_name, email, phone, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((contact) => ({
    id: contact.id,
    playerId: contact.player_id,
    fullName: contact.full_name,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    sortOrder: contact.sort_order ?? 1,
    createdAt: contact.created_at ?? undefined,
  }));
}

export async function listPlayerDevelopmentPlans(): Promise<PlayerDevelopmentPlanRecord[]> {
  if (!isSupabaseConfigured()) {
    return playerDevelopmentPlans;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("player_development_plans")
    .select(
      "id, player_id, plan_horizon, coach_name, plan_date, target_date, goal_type, plan_body, created_at",
    )
    .order("plan_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((plan) => ({
    id: plan.id,
    playerId: plan.player_id,
    horizon: plan.plan_horizon,
    coachName: plan.coach_name,
    planDate: plan.plan_date,
    targetDate: plan.target_date ?? undefined,
    goalType: plan.goal_type,
    planBody: plan.plan_body,
    createdAt: plan.created_at ?? undefined,
  }));
}

export async function listRosterMemberships(): Promise<RosterMembershipRecord[]> {
  if (!isSupabaseConfigured()) {
    return rosterMemberships;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("roster_memberships")
    .select(
      "id, team_season_id, player_id, jersey_number, position, height, is_active, is_starter, closeout_type, speed_type, defender_types, drive_preference, trap_preference, player_notes, scouting_notes, tendencies, strengths, weaknesses, matchup_notes, shooting_notes, effort_notes",
    )
    .order("jersey_number");

  if (error) {
    throw error;
  }

  return (data ?? []).map((membership) => ({
    id: membership.id,
    teamSeasonId: membership.team_season_id,
    playerId: membership.player_id,
    jerseyNumber: membership.jersey_number ?? "",
    position: membership.position ?? "",
    height: membership.height ?? "",
    isActive: membership.is_active,
    isStarter: membership.is_starter ?? false,
    closeoutType: membership.closeout_type ?? undefined,
    speedType: membership.speed_type ?? undefined,
    defenderTypes: membership.defender_types ?? undefined,
    drivePreference: membership.drive_preference ?? undefined,
    trapPreference: membership.trap_preference ?? undefined,
    playerNotes: membership.player_notes ?? undefined,
    scoutingNotes: membership.scouting_notes ?? undefined,
    tendencies: membership.tendencies ?? undefined,
    strengths: membership.strengths ?? undefined,
    weaknesses: membership.weaknesses ?? undefined,
    matchupNotes: membership.matchup_notes ?? undefined,
    shootingNotes: membership.shooting_notes ?? undefined,
    effortNotes: membership.effort_notes ?? undefined,
  }));
}

export async function listPlayerRosterRows(): Promise<PlayerRosterRow[]> {
  if (!isSupabaseConfigured()) {
    return playerRows;
  }

  const [
    playerRecords,
    teamSeasonRecords,
    programRecords,
    rosterRecords,
    seasonRecords,
  ] = await Promise.all([
    listPlayers(),
    listTeamSeasons(),
    listPrograms(),
    listRosterMemberships(),
    listSeasons(),
  ]);

  return rosterRecords.map((membership) => {
    const player = playerRecords.find(
      (playerItem) => playerItem.id === membership.playerId,
    );
    const teamSeason = teamSeasonRecords.find(
      (teamSeasonItem) => teamSeasonItem.id === membership.teamSeasonId,
    );
    const program = programRecords.find(
      (programItem) => programItem.id === teamSeason?.programId,
    );
    const season = seasonRecords.find(
      (seasonItem) => seasonItem.id === teamSeason?.seasonId,
    );

    const resolvedName = `${player?.firstName ?? ""} ${player?.lastName ?? ""}`.trim();
    const fallbackOpponentName = [
      program?.name ?? "Opponent",
      membership.position || "Player",
      membership.jerseyNumber || "#?",
    ].join(" - ");

    return {
      id: membership.id,
      playerId: membership.playerId,
      teamSeasonId: membership.teamSeasonId,
      name:
        resolvedName ||
        (teamSeason?.teamType === "opponent"
          ? fallbackOpponentName
          : membership.jerseyNumber || "Unnamed Player"),
      jersey: membership.jerseyNumber,
      position: membership.position,
      height: membership.height,
      team: program?.name ?? "",
      teamType: teamSeason?.teamType ?? "opponent",
      season: season?.name ?? season?.schoolYear ?? teamSeason?.seasonId ?? "",
      isStarter: membership.isStarter ?? false,
      tendencies: membership.tendencies ?? "",
      strengths: membership.strengths ?? "",
      weaknesses: membership.weaknesses ?? "",
      matchupNotes: membership.matchupNotes ?? "",
      closeoutType: membership.closeoutType ?? undefined,
      speedType: membership.speedType ?? undefined,
      defenderTypes: membership.defenderTypes ?? undefined,
      drivePreference: membership.drivePreference ?? undefined,
      trapPreference: membership.trapPreference ?? undefined,
      playerNotes: membership.playerNotes ?? undefined,
      active: membership.isActive,
    };
  });
}

export async function getGamePrepSnapshot(
  gameId: string,
): Promise<GamePrepSnapshot | null> {
  const defaultTimeoutPrompt =
    "Why did they call timeout? Why did we call timeout?";
  const defaultCoachingResponsibilityRows: CoachResponsibilityRecord[] = [
    {
      id: "coach-responsibility-timeout-bench",
      label: "Timeout (Card Check) & Bench Setup",
      coachProfileId: "coach-mike",
    },
    {
      id: "coach-responsibility-defensive-execution",
      label: "Defensive Execution",
      coachProfileId: "coach-tyra",
    },
    {
      id: "coach-responsibility-possession-value-subs",
      label: "Possession Value/Subs",
      coachProfileId: "coach-mike",
    },
    {
      id: "coach-responsibility-offball-movement",
      label: "Offball Movement",
    },
    {
      id: "coach-responsibility-scout-adjustment",
      label: "Scout/Adjustment",
      coachProfileId: "coach-tyra",
    },
    {
      id: "coach-responsibility-managers-table",
      label: "Managers/Table",
      coachProfileId: "coach-craig",
    },
    {
      id: "coach-responsibility-between-quarter-possession",
      label: "In Between Quarter Possession",
    },
    {
      id: "coach-responsibility-bench-energy",
      label: "Bench & Energy",
    },
    {
      id: "coach-responsibility-late-game-to-strategy",
      label: "Late Game TO/Strategy",
      coachProfileId: "coach-craig",
    },
  ];

  if (!isSupabaseConfigured()) {
    if (prepSnapshot.gameId !== gameId) {
      return null;
    }

    const coachRows = await listCoachProfileRows();
    const defaultCoachingResponsibilities = formatCoachingResponsibilityLines(
      defaultCoachingResponsibilityRows,
      coachRows,
    );

    return {
      gameId: prepSnapshot.gameId,
      title: "Dulaney Prep",
      opponentTeam: {
        name: "Dulaney",
        offense:
          "Heavy Pistol and middle pick-and-roll. Looks for paint collapse before kick-outs.",
        defense: "Primary 2-3 zone with late-clock matchup principles.",
        press: "Occasional three-quarter pressure after free throws.",
        scoutingSummary:
          "Deliberate half-court group that prefers guard-led actions and zone coverages after stoppages.",
        scoutingVideos: [
          "<iframe src=\"https://example.com/dulaney-zone\"></iframe>",
          "<iframe src=\"https://example.com/dulaney-pistol\"></iframe>",
        ],
      },
      overview: prepSnapshot.overview,
      playerFocus: prepSnapshot.playerFocus,
      overrides: {
        teamSummaryOverride: "",
        keysToWinningOverride: "",
        actionsToWatchOverride: "",
        matchupEmphasis: prepSnapshot.overrides.matchupEmphasis,
        benchReminders: prepSnapshot.overrides.benchReminders,
        specialSituations: prepSnapshot.overrides.specialSituations,
      },
      gamePlanCard: {
        identity: "Outwork them | Execution",
        defensePlan:
          "Primary: Panther -> pack paint\nSecondary FLAT -> 3rd Spades\nTertiary Spades\nClose gaps on #12 and #1\nMake them shooters\nWall up, no reach\nBox out EVERY shot",
        defenseMatchups: "Who guards #12: Jamison, Tyler\nWho Guards #2: Darian",
        pressPlan:
          "LION from the jump\nTake away inbound return\nSprint to second trap\nIf broken -> sprint back They will still miss the layup\nBear will be change of pace\nCub to throw them off",
        offenseVsMan: "Man to Man #10 in the game: 5 Out let Jonah Work",
        offenseVsZone: "Vs Zone: Round | Triangle | short corner flash",
        offenseVsBigLineup: "VS big Lineup: 5 or 4 out, Jonah can work Short Corner",
        offenseActions: "Scram | Split | Zaga | Deuce | Lift | Reverse | Zoom",
        zoneThreeTwoPlan: "Zone: 3-2 Triangle | over",
        zoneTwoThreePlan: "2-3: Round | Triangle | 5 out rotating middle",
        blobPlan:
          "BLOB: against 2-3: Killer | Strike | LA | Baltimore\nMan: LA | Baltimore | Kansas | Top 1-3",
        needAThreePlan: "Need a 3: Texas",
        slobPlan: "SLOB: Denver",
        subsPlan: "",
        keyMatchups:
          "Wall up on #12 - Has to be forced to shoot\nMake this team attempt 15 CONTESTED 3s\nMake this team defend multiple actions\nBeat them to the punch, be faster and more intense",
        keyMetrics:
          "Turnovers ≤ 15\nAssists < 14\nZero transition layups\nRebound margin +\nForce Franklin into 15+ Turnovers",
        specialSituations:
          "ATO: Texas into Zoom\nAfter make: Bear if they get stagnant\nEnd of quarter: hold for last shot",
        coachingResponsibilities: defaultCoachingResponsibilities,
        coachingResponsibilityRows: defaultCoachingResponsibilityRows,
      },
      timeoutCard: {
        prompt: defaultTimeoutPrompt,
        ourFullTimeouts: 3,
        ourThirtyTimeouts: 2,
        opponentFullTimeouts: 3,
        opponentThirtyTimeouts: 2,
        timeoutDefenseChecklist:
          "Do we need to change our defense?\nAre we sprinting back?\nAre we loading early on drives?\nAre we closing gaps?\nAre we boxing out?\nWho is hurting us right now?\nAre we trapping DHO/Screens\nIs #2 bothered?",
        timeoutOffenseChecklist:
          "Do we need to call a play?\nAre we moving or standing still?\nAre we getting paint touches\nAre we strong with the ball?\nAre we turning over the ball?\nAre we attacking gaps, not crowds?\nAre we moving after the pass?",
        timeoutPressPoiseChecklist:
          "Is LION bothering them?\nAre they getting frantic?\nAre we reaching or staying solid?\nDo we need to change/pull/run Press?",
        timeoutLineupQuestions:
          "Who is defending?\nWho is rebounding?\nWho is calm with the ball?",
        timeoutLateGameChecklist:
          "Do NOT foul #12\nFoul anyone else (try to avoid #1 if possible, but not a deal breaker)\nValue every possession\nTexas For a Late 3",
      },
      plannedContext: prepSnapshot.plannedContext,
    };
  }

  const supabase = getSupabaseAdminClient();
  const [
    { data: game, error: gameError },
    { data: gameState, error: gameStateError },
    teamSeasonRecords,
    programRecords,
    playerRows,
    prepRecords,
    coachRows,
    templateRows,
  ] =
    await Promise.all([
      supabase
        .from("games")
        .select(
          "id, season_id, home_team_season_id, away_team_season_id, location, status",
        )
        .eq("id", gameId)
        .maybeSingle(),
      supabase
        .from("game_state")
        .select(
          "game_id, home_full_timeouts, home_30_timeouts, away_full_timeouts, away_30_timeouts",
        )
        .eq("game_id", gameId)
        .maybeSingle(),
      listTeamSeasons(),
      listPrograms(),
      listPlayerRosterRows(),
      listGamePreps(),
      listCoachProfileRows(),
      listCoachResponsibilityTemplates(),
    ]);

  if (gameError) {
    throw gameError;
  }

  if (gameStateError) {
    throw gameStateError;
  }

  if (!game) {
    return null;
  }

  const homeTeamSeason = teamSeasonRecords.find(
    (item) => item.id === game.home_team_season_id,
  );
  const awayTeamSeason = teamSeasonRecords.find(
    (item) => item.id === game.away_team_season_id,
  );
  const homeProgram = programRecords.find(
    (item) => item.id === homeTeamSeason?.programId,
  );
  const awayProgram = programRecords.find(
    (item) => item.id === awayTeamSeason?.programId,
  );
  const ourTeamSeason = homeProgram?.isPikesville
    ? homeTeamSeason
    : awayProgram?.isPikesville
      ? awayTeamSeason
      : homeTeamSeason;
  const opponentTeamSeason =
    ourTeamSeason?.id === homeTeamSeason?.id ? awayTeamSeason : homeTeamSeason;
  const opponentProgram = programRecords.find(
    (item) => item.id === opponentTeamSeason?.programId,
  );
  const prep = prepRecords.find((item) => item.gameId === gameId);
  const ourTeamSide = ourTeamSeason?.id === homeTeamSeason?.id ? "home" : "away";
  const coachingResponsibilityRows =
    prep?.coachingResponsibilityRows.length ? prep.coachingResponsibilityRows : templateRows;
  const coachingResponsibilities = formatCoachingResponsibilityLines(coachingResponsibilityRows, coachRows);

  const playerFocus = playerRows
    .filter((player) => player.teamSeasonId === opponentTeamSeason?.id)
    .sort((left, right) => Number(right.isStarter) - Number(left.isStarter));

  const playLibraries = await listPlayLibraryRows();
  const likelyOpponentActions = playLibraries
    .filter(
      (play) =>
        playAvailableForTeam(play, opponentTeamSeason?.id, "opponent") &&
        play.side === "offense" &&
        play.isActive,
    )
    .slice(0, 6)
    .map((play) => play.name);
  const plannedOffense = playLibraries
    .filter(
      (play) =>
        playMatchesTeamSeason(play, ourTeamSeason?.id) &&
        play.owner === "ours" &&
        play.side === "offense" &&
        play.isActive,
    )
    .slice(0, 6)
    .map((play) => play.name);
  const plannedDefense = playLibraries
    .filter(
      (play) =>
        playMatchesTeamSeason(play, ourTeamSeason?.id) &&
        play.owner === "ours" &&
        play.side === "defense" &&
        play.isActive,
    )
    .slice(0, 6)
    .map((play) => play.name);

  return {
    gameId,
    title: `${opponentProgram?.name ?? "Opponent"} Prep`,
    opponentTeam: {
      name: opponentProgram?.name ?? "Opponent",
      offense: opponentTeamSeason?.offense ?? "",
      defense: opponentTeamSeason?.defense ?? "",
      press: opponentTeamSeason?.press ?? "",
      scoutingSummary: opponentTeamSeason?.scoutingSummary ?? "",
      scoutingVideos: opponentTeamSeason?.scoutingVideos ?? [],
    },
    overview: {
      opponentSummary:
        prep?.teamSummaryOverride ||
        opponentTeamSeason?.scoutingSummary ||
        "No opponent summary added yet.",
      keysToWinning:
        prep?.keysToWinningOverride ||
        opponentTeamSeason?.keysToWinning ||
        "No keys to winning added yet.",
      actionsToWatch:
        prep?.actionsToWatchOverride ||
        opponentTeamSeason?.actionsToWatch ||
        "No actions to watch added yet.",
    },
    playerFocus,
    overrides: {
      teamSummaryOverride: prep?.teamSummaryOverride ?? "",
      keysToWinningOverride: prep?.keysToWinningOverride ?? "",
      actionsToWatchOverride: prep?.actionsToWatchOverride ?? "",
      matchupEmphasis: prep?.matchupNotes ?? "",
      benchReminders: prep?.benchReminders ?? "",
      specialSituations: prep?.specialSituations ?? "",
    },
      gamePlanCard: {
        identity: prep?.identity ?? "",
        defensePlan: prep?.defensePlan ?? "",
        defenseMatchups: prep?.defenseMatchups ?? "",
        pressPlan: prep?.pressPlan ?? "",
        offenseVsMan: prep?.offenseVsMan ?? "",
        offenseVsZone: prep?.offenseVsZone ?? "",
        offenseVsBigLineup: prep?.offenseVsBigLineup ?? "",
        offenseActions: prep?.offenseActions ?? "",
        zoneThreeTwoPlan: prep?.zoneThreeTwoPlan ?? "",
        zoneTwoThreePlan: prep?.zoneTwoThreePlan ?? "",
        blobPlan: prep?.blobPlan ?? "",
        needAThreePlan: prep?.needAThreePlan ?? "",
        slobPlan: prep?.slobPlan ?? "",
        subsPlan: prep?.subsPlan ?? "",
        keyMatchups: prep?.keyMatchups ?? "",
        keyMetrics: prep?.keyMetrics ?? "",
        specialSituations: prep?.specialSituations ?? "",
        coachingResponsibilities,
        coachingResponsibilityRows,
      },
      timeoutCard: {
        prompt: defaultTimeoutPrompt,
        ourFullTimeouts:
          ourTeamSide === "home"
            ? gameState?.home_full_timeouts ?? 3
            : gameState?.away_full_timeouts ?? 3,
        ourThirtyTimeouts:
          ourTeamSide === "home"
            ? gameState?.home_30_timeouts ?? 2
            : gameState?.away_30_timeouts ?? 2,
        opponentFullTimeouts:
          ourTeamSide === "home"
            ? gameState?.away_full_timeouts ?? 3
            : gameState?.home_full_timeouts ?? 3,
        opponentThirtyTimeouts:
          ourTeamSide === "home"
            ? gameState?.away_30_timeouts ?? 2
            : gameState?.home_30_timeouts ?? 2,
        timeoutDefenseChecklist: prep?.timeoutDefenseChecklist ?? "",
        timeoutOffenseChecklist: prep?.timeoutOffenseChecklist ?? "",
        timeoutPressPoiseChecklist: prep?.timeoutPressPoiseChecklist ?? "",
        timeoutLineupQuestions: prep?.timeoutLineupQuestions ?? "",
      timeoutLateGameChecklist: prep?.timeoutLateGameChecklist ?? "",
    },
    plannedContext: {
      likelyOpponentActions,
      plannedOffense,
      plannedDefense,
    },
  };
}

export async function getLiveScorerSnapshot(
  gameId: string,
): Promise<LiveScorerSnapshot | null> {
  if (!isSupabaseConfigured()) {
    const game = games.find((item) => item.id === gameId);

    if (!game) {
      return null;
    }

    const seasonLabel =
      seasons.find((season) => season.id === (game.seasonId ?? game.season))?.schoolYear ??
      game.season;
    const homeTeamRow =
      teamSeasonRows.find((team) => team.id === game.homeTeamSeasonId) ??
      teamSeasonRows.find((team) => team.type === "ours" && team.season === seasonLabel);
    const awayTeamRow =
      teamSeasonRows.find((team) => team.id === game.awayTeamSeasonId) ??
      teamSeasonRows.find((team) => team.type === "opponent" && team.name === game.opponent);
    const state = await getGameStateSnapshot(gameId);
    const runtime = getMockRuntime(gameId);
    const homeRoster = playerRows.filter(
      (player) =>
        player.teamSeasonId === homeTeamRow?.id ||
        (player.team === homeTeamRow?.name && player.season === seasonLabel),
    );
    const awayRoster = playerRows.filter(
      (player) =>
        player.teamSeasonId === awayTeamRow?.id ||
        (player.team === awayTeamRow?.name && player.season === seasonLabel),
    );
    const lineups = getMockLineups(
      gameId,
      getPreferredStarterIds(homeRoster),
      getPreferredStarterIds(awayRoster),
    );
    const homeOnFloor = lineups
      .filter((lineup) => lineup.teamSide === "home" && lineup.isOnFloor)
      .map((lineup) => lineup.rosterMembershipId);
    const awayOnFloor = lineups
      .filter((lineup) => lineup.teamSide === "away" && lineup.isOnFloor)
      .map((lineup) => lineup.rosterMembershipId);

    return {
      gameId: game.id,
      title: `${homeTeamRow?.name ?? "Home"} vs ${awayTeamRow?.name ?? "Away"}`,
      dateLabel: formatCompactDate(game.date),
      location: game.location,
      status: runtime.status,
      quarter: runtime.quarter,
      secondsRemaining: runtime.secondsRemaining,
      teamOnOffense: state.teamOnOffense,
      homeOffensePlayId: state.homeOffensePlayId,
      homeDefensePlayId: state.homeDefensePlayId,
      awayOffensePlayId: state.awayOffensePlayId,
      awayDefensePlayId: state.awayDefensePlayId,
      homeTeam: {
        side: "home",
        teamSeasonId: homeTeamRow?.id ?? "",
        name: homeTeamRow?.name ?? "Home",
        label: homeTeamRow?.label ?? "Varsity",
        teamType: homeTeamRow?.type ?? "ours",
        score: state.homeScore,
        fouls: state.homeFouls,
        fullTimeouts: state.homeFullTimeouts,
        thirtyTimeouts: state.homeThirtyTimeouts,
        roster: homeRoster,
        onFloorIds: homeOnFloor,
        offensePlays: plays.filter(
          (play) =>
            playAvailableForTeam(play, homeTeamRow?.id, homeTeamRow?.type) && play.side === "offense",
        ).map((play) => ({
          id: play.id,
          name: play.name,
          family: play.family,
          side: play.side,
          owner: play.owner,
          team: play.team,
          teamSeasonId: play.teamSeasonId,
          teamSeasonIds: getPlayTeamSeasonIds(play),
          playScope: getPlayScope(play),
          tags: play.tags,
          notes: play.notes,
          imageUrl: play.imageUrl,
          isActive: true,
        })),
        defensePlays: plays.filter(
          (play) =>
            playAvailableForTeam(play, homeTeamRow?.id, homeTeamRow?.type) && play.side === "defense",
        ).map((play) => ({
          id: play.id,
          name: play.name,
          family: play.family,
          side: play.side,
          owner: play.owner,
          team: play.team,
          teamSeasonId: play.teamSeasonId,
          teamSeasonIds: getPlayTeamSeasonIds(play),
          playScope: getPlayScope(play),
          tags: play.tags,
          notes: play.notes,
          imageUrl: play.imageUrl,
          isActive: true,
        })),
      },
      awayTeam: {
        side: "away",
        teamSeasonId: awayTeamRow?.id ?? "",
        name: awayTeamRow?.name ?? "Away",
        label: awayTeamRow?.label ?? "Varsity",
        teamType: awayTeamRow?.type ?? "opponent",
        score: state.awayScore,
        fouls: state.awayFouls,
        fullTimeouts: state.awayFullTimeouts,
        thirtyTimeouts: state.awayThirtyTimeouts,
        roster: awayRoster,
        onFloorIds: awayOnFloor,
        offensePlays: plays.filter(
          (play) =>
            playAvailableForTeam(play, awayTeamRow?.id, awayTeamRow?.type) && play.side === "offense",
        ).map((play) => ({
          id: play.id,
          name: play.name,
          family: play.family,
          side: play.side,
          owner: play.owner,
          team: play.team,
          teamSeasonId: play.teamSeasonId,
          teamSeasonIds: getPlayTeamSeasonIds(play),
          playScope: getPlayScope(play),
          tags: play.tags,
          notes: play.notes,
          imageUrl: play.imageUrl,
          isActive: true,
        })),
        defensePlays: plays.filter(
          (play) =>
            playAvailableForTeam(play, awayTeamRow?.id, awayTeamRow?.type) && play.side === "defense",
        ).map((play) => ({
          id: play.id,
          name: play.name,
          family: play.family,
          side: play.side,
          owner: play.owner,
          team: play.team,
          teamSeasonId: play.teamSeasonId,
          teamSeasonIds: getPlayTeamSeasonIds(play),
          playScope: getPlayScope(play),
          tags: play.tags,
          notes: play.notes,
          imageUrl: play.imageUrl,
          isActive: true,
        })),
      },
    };
  }

  const supabase = getSupabaseAdminClient();
  const [
    { data: game, error: gameError },
    teamSeasonRecords,
    programRecords,
    seasonRecords,
    rosterRows,
    playRows,
    lineups,
    state,
  ] = await Promise.all([
    supabase
      .from("games")
      .select(
        "id, season_id, home_team_season_id, away_team_season_id, starts_at, location, status, current_quarter, current_seconds_remaining",
      )
      .eq("id", gameId)
      .maybeSingle(),
    listTeamSeasons(),
    listPrograms(),
    listSeasons(),
    listPlayerRosterRows(),
    listPlayLibraryRows(),
    listGameLineups(gameId),
    getGameStateSnapshot(gameId),
  ]);

  if (gameError) {
    throw gameError;
  }

  if (!game) {
    return null;
  }

  const season = seasonRecords.find((item) => item.id === game.season_id);
  const homeTeamSeason = teamSeasonRecords.find(
    (item) => item.id === game.home_team_season_id,
  );
  const awayTeamSeason = teamSeasonRecords.find(
    (item) => item.id === game.away_team_season_id,
  );
  const homeProgram = programRecords.find(
    (item) => item.id === homeTeamSeason?.programId,
  );
  const awayProgram = programRecords.find(
    (item) => item.id === awayTeamSeason?.programId,
  );
  const homeRoster = rosterRows.filter(
    (player) => player.teamSeasonId === game.home_team_season_id,
  );
  const awayRoster = rosterRows.filter(
    (player) => player.teamSeasonId === game.away_team_season_id,
  );
  const homeOnFloor = lineups.some(
    (lineup) => lineup.teamSide === "home" && lineup.isOnFloor,
  )
    ? lineups
        .filter((lineup) => lineup.teamSide === "home" && lineup.isOnFloor)
        .map((lineup) => lineup.rosterMembershipId)
    : getPreferredStarterIds(homeRoster);
  const awayOnFloor = lineups.some(
    (lineup) => lineup.teamSide === "away" && lineup.isOnFloor,
  )
    ? lineups
        .filter((lineup) => lineup.teamSide === "away" && lineup.isOnFloor)
        .map((lineup) => lineup.rosterMembershipId)
    : getPreferredStarterIds(awayRoster);

  return {
    gameId,
    title: `${homeProgram?.name ?? "Home"} vs ${awayProgram?.name ?? "Away"}`,
    dateLabel: game.starts_at
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(game.starts_at))
      : "Date TBD",
    location: game.location ?? "",
    status: game.status,
    quarter: game.current_quarter,
    secondsRemaining: game.current_seconds_remaining,
    teamOnOffense: state.teamOnOffense,
    homeOffensePlayId: state.homeOffensePlayId,
    homeDefensePlayId: state.homeDefensePlayId,
    awayOffensePlayId: state.awayOffensePlayId,
    awayDefensePlayId: state.awayDefensePlayId,
    homeTeam: {
      side: "home",
      teamSeasonId: game.home_team_season_id,
      name: homeProgram?.name ?? "Home",
      label: homeTeamSeason?.label ?? "",
      teamType: homeTeamSeason?.teamType ?? "ours",
      score: state.homeScore,
      fouls: state.homeFouls,
      fullTimeouts: state.homeFullTimeouts,
      thirtyTimeouts: state.homeThirtyTimeouts,
      roster: homeRoster,
      onFloorIds: homeOnFloor,
      offensePlays: playRows.filter(
        (play) =>
          playAvailableForTeam(play, game.home_team_season_id, homeTeamSeason?.teamType) &&
          play.side === "offense" &&
          play.isActive,
      ),
      defensePlays: playRows.filter(
        (play) =>
          playAvailableForTeam(play, game.home_team_season_id, homeTeamSeason?.teamType) &&
          play.side === "defense" &&
          play.isActive,
      ),
    },
    awayTeam: {
      side: "away",
      teamSeasonId: game.away_team_season_id,
      name: awayProgram?.name ?? "Away",
      label: awayTeamSeason?.label ?? "",
      teamType: awayTeamSeason?.teamType ?? "opponent",
      score: state.awayScore,
      fouls: state.awayFouls,
      fullTimeouts: state.awayFullTimeouts,
      thirtyTimeouts: state.awayThirtyTimeouts,
      roster: awayRoster,
      onFloorIds: awayOnFloor,
      offensePlays: playRows.filter(
        (play) =>
          playAvailableForTeam(play, game.away_team_season_id, awayTeamSeason?.teamType) &&
          play.side === "offense" &&
          play.isActive,
      ),
      defensePlays: playRows.filter(
        (play) =>
          playAvailableForTeam(play, game.away_team_season_id, awayTeamSeason?.teamType) &&
          play.side === "defense" &&
          play.isActive,
      ),
    },
  };
}

function formatEventSummary(input: {
  eventType: string;
  playerName?: string;
  relatedPlayerName?: string;
  shotValue?: number | null;
  shotResult?: "make" | "miss" | null;
  notes?: string | null;
}) {
  const player = input.playerName || "Team";
  const noteSuffix = input.notes ? ` (${input.notes})` : "";

  switch (input.eventType) {
    case "shot":
      return `${player} ${input.shotResult === "make" ? "made" : "missed"} ${
        input.shotValue ?? ""
      }PT shot${noteSuffix}`.trim();
    case "assist":
      return `${player} recorded an assist${noteSuffix}`;
    case "rebound_off":
      return `${player} grabbed an offensive rebound${noteSuffix}`;
    case "rebound_def":
      return `${player} grabbed a defensive rebound${noteSuffix}`;
    case "steal":
      return `${player} recorded a steal${noteSuffix}`;
    case "block":
      return `${player} recorded a block${noteSuffix}`;
    case "turnover":
      return `${player} committed a turnover${noteSuffix}`;
    case "personal_foul":
      return `${player} was called for a foul${noteSuffix}`;
    case "timeout_full":
      return `Full timeout${noteSuffix}`;
    case "timeout_30":
      return `30-second timeout${noteSuffix}`;
    case "lineup_change":
      return `Lineup updated${noteSuffix}`;
    default:
      return `${player} ${input.eventType.replaceAll("_", " ")}${noteSuffix}`;
  }
}

function createEmptyBoxScoreRow(player: PlayerRosterRow): BoxScoreRow {
  return {
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
  };
}

function applyEventToBoxScoreRow(
  row: BoxScoreRow,
  event: {
    eventType: string;
    shotResult?: "make" | "miss" | null;
    shotValue?: number | null;
  },
) {
  switch (event.eventType) {
    case "shot":
      row.fga += event.shotValue === 1 ? 0 : 1;
      row.fgm += event.shotResult === "make" && event.shotValue !== 1 ? 1 : 0;
      row.threePa += event.shotValue === 3 ? 1 : 0;
      row.threePm +=
        event.shotValue === 3 && event.shotResult === "make" ? 1 : 0;
      row.fta += event.shotValue === 1 ? 1 : 0;
      row.ftm += event.shotValue === 1 && event.shotResult === "make" ? 1 : 0;
      row.points += event.shotResult === "make" ? event.shotValue ?? 0 : 0;
      break;
    case "rebound_off":
      row.oreb += 1;
      row.reb += 1;
      break;
    case "rebound_def":
      row.dreb += 1;
      row.reb += 1;
      break;
    case "assist":
      row.ast += 1;
      break;
    case "steal":
      row.stl += 1;
      break;
    case "block":
      row.blk += 1;
      break;
    case "turnover":
      row.turnovers += 1;
      break;
    case "personal_foul":
      row.fouls += 1;
      break;
    default:
      break;
  }
}

export function buildLiveBoxScoreFromEvents(
  snapshot: LiveScorerSnapshot,
  eventFeed: GameEventFeedItem[],
): LiveBoxScore {
  const homeRows = snapshot.homeTeam.roster.map(createEmptyBoxScoreRow);
  const awayRows = snapshot.awayTeam.roster.map(createEmptyBoxScoreRow);
  const rowMap = new Map<string, BoxScoreRow>();

  for (const row of [...homeRows, ...awayRows]) {
    rowMap.set(row.rosterMembershipId, row);
  }

  for (const event of eventFeed) {
    if (!event.rosterMembershipId) {
      continue;
    }

    const row = rowMap.get(event.rosterMembershipId);

    if (!row) {
      continue;
    }

    applyEventToBoxScoreRow(row, {
      eventType: event.eventType,
      shotResult: event.shotResult,
      shotValue: event.shotValue,
    });
  }

  return {
    homeTeamName: snapshot.homeTeam.name,
    awayTeamName: snapshot.awayTeam.name,
    homeRows,
    awayRows,
  };
}

async function recalculateGameStateTotals(gameId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: events, error: eventsError }, state] = await Promise.all([
    supabase
      .from("game_events")
      .select("team_side, event_type, shot_result, shot_value")
      .eq("game_id", gameId)
      .is("deleted_at", null),
    getGameStateSnapshot(gameId),
  ]);

  if (eventsError) {
    throw eventsError;
  }

  let homeScore = 0;
  let awayScore = 0;
  let homeFouls = 0;
  let awayFouls = 0;
  let homeFullTimeouts = 3;
  let awayFullTimeouts = 3;
  let homeThirtyTimeouts = 2;
  let awayThirtyTimeouts = 2;

  for (const event of events ?? []) {
    if (event.event_type === "shot" && event.shot_result === "make") {
      if (event.team_side === "home") {
        homeScore += event.shot_value ?? 0;
      } else {
        awayScore += event.shot_value ?? 0;
      }
    }

    if (event.event_type === "personal_foul") {
      if (event.team_side === "home") {
        homeFouls += 1;
      } else {
        awayFouls += 1;
      }
    }

    if (event.event_type === "timeout_full") {
      if (event.team_side === "home") {
        homeFullTimeouts = Math.max(0, homeFullTimeouts - 1);
      } else {
        awayFullTimeouts = Math.max(0, awayFullTimeouts - 1);
      }
    }

    if (event.event_type === "timeout_30") {
      if (event.team_side === "home") {
        homeThirtyTimeouts = Math.max(0, homeThirtyTimeouts - 1);
      } else {
        awayThirtyTimeouts = Math.max(0, awayThirtyTimeouts - 1);
      }
    }
  }

  const { error: stateError } = await supabase
    .from("game_state")
    .update({
      team_on_offense: state.teamOnOffense,
      home_offense_play_id: state.homeOffensePlayId,
      home_defense_play_id: state.homeDefensePlayId,
      away_offense_play_id: state.awayOffensePlayId,
      away_defense_play_id: state.awayDefensePlayId,
      home_score: homeScore,
      away_score: awayScore,
      home_fouls: homeFouls,
      away_fouls: awayFouls,
      home_full_timeouts: homeFullTimeouts,
      away_full_timeouts: awayFullTimeouts,
      home_30_timeouts: homeThirtyTimeouts,
      away_30_timeouts: awayThirtyTimeouts,
    })
    .eq("game_id", gameId);

  if (stateError) {
    throw stateError;
  }
}

export async function listGameEventFeed(
  gameId: string,
): Promise<GameEventFeedItem[]> {
  if (!isSupabaseConfigured()) {
    return [...getMockEvents(gameId)].sort(
      (left, right) => right.sequenceNumber - left.sequenceNumber,
    );
  }

  const supabase = getSupabaseAdminClient();
  const [
    { data: game, error: gameError },
    { data: events, error: eventsError },
    rosterRows,
    teamSeasonRecords,
    programRecords,
  ] = await Promise.all([
    supabase
      .from("games")
      .select("home_team_season_id, away_team_season_id")
      .eq("id", gameId)
      .maybeSingle(),
    supabase
      .from("game_events")
      .select(
        "id, sequence_number, team_side, event_type, quarter, seconds_remaining, team_on_offense, roster_membership_id, related_roster_membership_id, shot_result, shot_value, shot_x, shot_y, offense_play_id, defense_play_id, notes, active_home_roster_ids, active_away_roster_ids",
      )
      .eq("game_id", gameId)
      .is("deleted_at", null)
      .order("sequence_number", { ascending: false }),
    listPlayerRosterRows(),
    listTeamSeasons(),
    listPrograms(),
  ]);

  if (gameError) {
    throw gameError;
  }

  if (eventsError) {
    throw eventsError;
  }

  const homeTeamSeason = teamSeasonRecords.find(
    (item) => item.id === game?.home_team_season_id,
  );
  const awayTeamSeason = teamSeasonRecords.find(
    (item) => item.id === game?.away_team_season_id,
  );
  const homeProgram = programRecords.find(
    (item) => item.id === homeTeamSeason?.programId,
  );
  const awayProgram = programRecords.find(
    (item) => item.id === awayTeamSeason?.programId,
  );

  return (events ?? []).map((event) => {
    const player = rosterRows.find(
      (item) => item.id === event.roster_membership_id,
    );
    const relatedPlayer = rosterRows.find(
      (item) => item.id === event.related_roster_membership_id,
    );
    const teamName =
      event.team_side === "home"
        ? homeProgram?.name ?? "Home"
        : awayProgram?.name ?? "Away";

    return {
      id: event.id,
      sequenceNumber: event.sequence_number,
      teamSide: event.team_side,
      teamName,
      eventType: event.event_type,
      summary: formatEventSummary({
        eventType: event.event_type,
        playerName: player?.name,
        relatedPlayerName: relatedPlayer?.name,
        shotValue: event.shot_value,
        shotResult: event.shot_result,
        notes: event.notes,
      }),
      quarter: event.quarter,
      secondsRemaining: event.seconds_remaining,
      teamOnOffense: event.team_on_offense,
      rosterMembershipId: event.roster_membership_id,
      relatedRosterMembershipId: event.related_roster_membership_id,
      notes: event.notes ?? "",
      shotX: event.shot_x,
      shotY: event.shot_y,
      shotResult: event.shot_result,
      shotValue: event.shot_value,
      offensePlayId: event.offense_play_id,
      defensePlayId: event.defense_play_id,
      activeHomeRosterIds: event.active_home_roster_ids ?? [],
      activeAwayRosterIds: event.active_away_roster_ids ?? [],
    };
  });
}

export async function listCoachingObservations(
  gameId: string,
): Promise<CoachingObservationRow[]> {
  if (!isSupabaseConfigured()) {
    return [...(mockCoachingObservationsByGameId.get(gameId) ?? [])].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  const supabase = getSupabaseAdminClient();
  const [
    { data: rows, error },
    rosterRows,
    teamSeasonRecords,
    programRecords,
    playRows,
    { data: game, error: gameError },
  ] = await Promise.all([
    supabase
      .from("coaching_observations")
      .select(
        "id, game_id, team_side, observation_scope, roster_membership_id, play_library_id, quarter, seconds_remaining, tag, notes, score_delta, created_at",
      )
      .eq("game_id", gameId)
      .order("created_at", { ascending: false }),
    listPlayerRosterRows(),
    listTeamSeasons(),
    listPrograms(),
    listPlayLibraryRows(),
    supabase
      .from("games")
      .select("home_team_season_id, away_team_season_id")
      .eq("id", gameId)
      .maybeSingle(),
  ]);

  if (error) {
    throw error;
  }

  if (gameError) {
    throw gameError;
  }

  const homeTeamSeason = teamSeasonRecords.find((item) => item.id === game?.home_team_season_id);
  const awayTeamSeason = teamSeasonRecords.find((item) => item.id === game?.away_team_season_id);
  const homeProgram = programRecords.find((item) => item.id === homeTeamSeason?.programId);
  const awayProgram = programRecords.find((item) => item.id === awayTeamSeason?.programId);

  return (rows ?? []).map((row) => {
    const player = rosterRows.find((item) => item.id === row.roster_membership_id);
    const play = playRows.find((item) => item.id === row.play_library_id);

    return {
      id: row.id,
      gameId: row.game_id,
      teamSide: row.team_side,
      teamName: row.team_side === "home" ? homeProgram?.name ?? "Home" : awayProgram?.name ?? "Away",
      observationScope: row.observation_scope,
      rosterMembershipId: row.roster_membership_id,
      playerName: player?.name ?? null,
      jersey: player?.jersey ?? null,
      playLibraryId: row.play_library_id,
      playName: play?.name ?? null,
      quarter: row.quarter,
      secondsRemaining: row.seconds_remaining,
      tag: row.tag,
      notes: row.notes ?? "",
      scoreDelta: row.score_delta ?? 0,
      createdAt: row.created_at,
    };
  });
}

export async function listLiveBoxScore(gameId: string): Promise<LiveBoxScore | null> {
  const [snapshot, eventFeed] = await Promise.all([
    getLiveScorerSnapshot(gameId),
    listGameEventFeed(gameId),
  ]);

  if (!snapshot) {
    return null;
  }

  return buildLiveBoxScoreFromEvents(snapshot, eventFeed);
}

export async function createSeason(input: {
  name: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "complete";
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (input.status === "active") {
    await supabase
      .from("seasons")
      .update({ status: "complete" })
      .eq("status", "active");
  }

  const { error } = await supabase.from("seasons").insert({
    name: input.name,
    school_year: input.schoolYear,
    starts_on: input.startDate || null,
    ends_on: input.endDate || null,
    status: input.status,
  });

  if (error) {
    throw error;
  }
}

export async function updateSeason(input: {
  id: string;
  name: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "complete";
}) {
  if (!isSupabaseConfigured()) {
    const target = seasons.find((season) => season.id === input.id);
    if (!target) {
      throw new Error("Season not found.");
    }

    if (input.status === "active") {
      seasons.forEach((season) => {
        if (season.id !== input.id && season.status === "active") {
          season.status = "complete";
        }
      });
    }

    target.name = input.name;
    target.schoolYear = input.schoolYear;
    target.startDate = input.startDate;
    target.endDate = input.endDate;
    target.status = input.status;
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (input.status === "active") {
    const { error: deactivateError } = await supabase
      .from("seasons")
      .update({ status: "complete" })
      .eq("status", "active")
      .neq("id", input.id);

    if (deactivateError) {
      throw deactivateError;
    }
  }

  const { error } = await supabase
    .from("seasons")
    .update({
      name: input.name,
      school_year: input.schoolYear,
      starts_on: input.startDate || null,
      ends_on: input.endDate || null,
      status: input.status,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function createProgram(input: {
  name: string;
  shortName: string;
  isPikesville: boolean;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("programs").insert({
    name: input.name,
    short_name: input.shortName || null,
    is_pikesville: input.isPikesville,
  });

  if (error) {
    throw error;
  }
}

export async function updateProgram(input: {
  id: string;
  name: string;
  shortName: string;
  isPikesville: boolean;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("programs")
    .update({
      name: input.name,
      short_name: input.shortName || null,
      is_pikesville: input.isPikesville,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function createTeamSeason(input: {
  programId: string;
  seasonId: string;
  teamType: "ours" | "opponent";
  label: string;
  level?: string;
  scoutingSummary?: string;
  offense?: string;
  defense?: string;
  press?: string;
  teamTendencies?: string;
  scoutingVideos?: string[];
  keysToWinning?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("team_seasons").insert({
    program_id: input.programId,
    season_id: input.seasonId,
    team_type: input.teamType,
    label: input.label,
    level: input.level || null,
    scouting_summary: input.scoutingSummary || null,
    offense: input.offense || null,
    defense: input.defense || null,
    press: input.press || null,
    team_tendencies: input.teamTendencies || null,
    scouting_videos: input.scoutingVideos?.length ? input.scoutingVideos : null,
    keys_to_winning: input.keysToWinning || null,
  });

  if (error) {
    if ("code" in error && error.code === "23505") {
      throw new Error("That season team already exists for this program and season.");
    }
    throw error;
  }
}

export async function updateTeamSeason(input: {
  id: string;
  teamType: "ours" | "opponent";
  label: string;
  level?: string;
  scoutingSummary?: string;
  offense?: string;
  defense?: string;
  press?: string;
  teamTendencies?: string;
  scoutingVideos?: string[];
  keysToWinning?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("team_seasons")
    .update({
      team_type: input.teamType,
      label: input.label,
      level: input.level || null,
      scouting_summary: input.scoutingSummary || null,
      offense: input.offense || null,
      defense: input.defense || null,
      press: input.press || null,
      team_tendencies: input.teamTendencies || null,
      scouting_videos: input.scoutingVideos?.length ? input.scoutingVideos : null,
      keys_to_winning: input.keysToWinning || null,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function deleteTeamSeason(teamSeasonId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const [{ count: homeCount, error: homeError }, { count: awayCount, error: awayError }] =
    await Promise.all([
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("home_team_season_id", teamSeasonId),
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("away_team_season_id", teamSeasonId),
    ]);

  if (homeError) {
    throw homeError;
  }

  if (awayError) {
    throw awayError;
  }

  if ((homeCount ?? 0) + (awayCount ?? 0) > 0) {
    throw new Error("This team is attached to one or more games. Remove those games first.");
  }

  const { error } = await supabase.from("team_seasons").delete().eq("id", teamSeasonId);

  if (error) {
    throw error;
  }
}

export async function createPlayLibraryEntry(input: {
  teamSeasonId?: string;
  teamSeasonIds?: string[];
  playScope?: "team" | "global_opponent";
  playName: string;
  playFamily: string;
  playSide: "offense" | "defense";
  tags: string[];
  notes?: string;
  imageUrl?: string;
  embedCode?: string;
  isActive: boolean;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const playScope = input.playScope ?? "team";
  const teamSeasonIds =
    playScope === "global_opponent" ? [] : input.teamSeasonIds?.length ? input.teamSeasonIds : input.teamSeasonId ? [input.teamSeasonId] : [];
  const { error } = await supabase.from("play_libraries").insert({
    team_season_id: playScope === "global_opponent" ? null : input.teamSeasonId || teamSeasonIds[0],
    team_season_ids: teamSeasonIds,
    play_scope: playScope,
    play_name: input.playName,
    play_family: input.playFamily || null,
    play_side: input.playSide,
    tags: input.tags,
    notes: input.notes || null,
    image_url: input.imageUrl || null,
    embed_code: input.embedCode || null,
    is_active: input.isActive,
  });

  if (error) {
    throw error;
  }
}

export async function createDrillLibraryEntry(input: {
  title: string;
  legacyId?: string;
  drillType?: string;
  playType?: string;
  tags: string[];
  description?: string;
  instructions?: string;
  notes?: string;
  videoUrl?: string;
  imageUrl?: string;
  isActive: boolean;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("drill_libraries").insert({
    legacy_id: input.legacyId || null,
    title: input.title,
    drill_type: input.drillType || null,
    play_type: input.playType || null,
    tags: input.tags,
    description: input.description || null,
    instructions: input.instructions || null,
    notes: input.notes || null,
    video_url: input.videoUrl || null,
    image_url: input.imageUrl || null,
    is_active: input.isActive,
  });

  if (error) {
    throw error;
  }
}

export async function updatePlayLibraryEntry(input: {
  id: string;
  teamSeasonId?: string;
  teamSeasonIds?: string[];
  playScope?: "team" | "global_opponent";
  playName: string;
  playFamily: string;
  playSide: "offense" | "defense";
  tags: string[];
  notes?: string;
  imageUrl?: string;
  embedCode?: string;
  isActive: boolean;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const playScope = input.playScope ?? "team";
  const teamSeasonIds =
    playScope === "global_opponent" ? [] : input.teamSeasonIds?.length ? input.teamSeasonIds : input.teamSeasonId ? [input.teamSeasonId] : [];
  const { error } = await supabase
    .from("play_libraries")
    .update({
      team_season_id: playScope === "global_opponent" ? null : input.teamSeasonId || teamSeasonIds[0],
      team_season_ids: teamSeasonIds,
      play_scope: playScope,
      play_name: input.playName,
      play_family: input.playFamily || null,
      play_side: input.playSide,
      tags: input.tags,
      notes: input.notes || null,
      image_url: input.imageUrl || null,
      embed_code: input.embedCode || null,
      is_active: input.isActive,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function bulkUpdatePlayLibraryEntries(input: {
  ids: string[];
  playFamily?: string;
  tags?: string[];
  teamSeasonIds?: string[];
  isActive?: boolean;
}) {
  const ids = [...new Set(input.ids)].filter(Boolean);
  if (ids.length === 0 || !isSupabaseConfigured()) {
    return;
  }

  const updates: Record<string, unknown> = {};
  if (input.playFamily !== undefined) {
    updates.play_family = input.playFamily || null;
  }
  if (input.tags !== undefined) {
    updates.tags = input.tags;
  }
  if (input.teamSeasonIds !== undefined) {
    updates.team_season_id = input.teamSeasonIds[0] ?? null;
    updates.team_season_ids = input.teamSeasonIds;
    updates.play_scope = input.teamSeasonIds.length > 0 ? "team" : "global_opponent";
  }
  if (input.isActive !== undefined) {
    updates.is_active = input.isActive;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("play_libraries").update(updates).in("id", ids);
  if (error) {
    throw error;
  }
}

export async function updateDrillLibraryEntry(input: {
  id: string;
  title: string;
  legacyId?: string;
  drillType?: string;
  playType?: string;
  tags: string[];
  description?: string;
  instructions?: string;
  notes?: string;
  videoUrl?: string;
  imageUrl?: string;
  isActive: boolean;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("drill_libraries")
    .update({
      legacy_id: input.legacyId || null,
      title: input.title,
      drill_type: input.drillType || null,
      play_type: input.playType || null,
      tags: input.tags,
      description: input.description || null,
      instructions: input.instructions || null,
      notes: input.notes || null,
      video_url: input.videoUrl || null,
      image_url: input.imageUrl || null,
      is_active: input.isActive,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function bulkUpdateDrillLibraryEntries(input: {
  ids: string[];
  drillType?: string;
  playType?: string;
  tags?: string[];
  isActive?: boolean;
}) {
  const ids = [...new Set(input.ids)].filter(Boolean);
  if (ids.length === 0 || !isSupabaseConfigured()) {
    return;
  }

  const updates: Record<string, unknown> = {};
  if (input.drillType !== undefined) {
    updates.drill_type = input.drillType || null;
  }
  if (input.playType !== undefined) {
    updates.play_type = input.playType || null;
  }
  if (input.tags !== undefined) {
    updates.tags = input.tags;
  }
  if (input.isActive !== undefined) {
    updates.is_active = input.isActive;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("drill_libraries").update(updates).in("id", ids);
  if (error) {
    throw error;
  }
}

export async function deletePlayLibraryEntry(playId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const [
    { count: eventOffenseCount, error: eventOffenseError },
    { count: eventDefenseCount, error: eventDefenseError },
    { count: stateHomeOffenseCount, error: stateHomeOffenseError },
    { count: stateHomeDefenseCount, error: stateHomeDefenseError },
    { count: stateAwayOffenseCount, error: stateAwayOffenseError },
    { count: stateAwayDefenseCount, error: stateAwayDefenseError },
  ] = await Promise.all([
    supabase
      .from("game_events")
      .select("id", { count: "exact", head: true })
      .eq("offense_play_id", playId),
    supabase
      .from("game_events")
      .select("id", { count: "exact", head: true })
      .eq("defense_play_id", playId),
    supabase
      .from("game_state")
      .select("game_id", { count: "exact", head: true })
      .eq("home_offense_play_id", playId),
    supabase
      .from("game_state")
      .select("game_id", { count: "exact", head: true })
      .eq("home_defense_play_id", playId),
    supabase
      .from("game_state")
      .select("game_id", { count: "exact", head: true })
      .eq("away_offense_play_id", playId),
    supabase
      .from("game_state")
      .select("game_id", { count: "exact", head: true })
      .eq("away_defense_play_id", playId),
  ]);

  for (const error of [
    eventOffenseError,
    eventDefenseError,
    stateHomeOffenseError,
    stateHomeDefenseError,
    stateAwayOffenseError,
    stateAwayDefenseError,
  ]) {
    if (error) {
      throw error;
    }
  }

  const totalReferences =
    (eventOffenseCount ?? 0) +
    (eventDefenseCount ?? 0) +
    (stateHomeOffenseCount ?? 0) +
    (stateHomeDefenseCount ?? 0) +
    (stateAwayOffenseCount ?? 0) +
    (stateAwayDefenseCount ?? 0);

  if (totalReferences > 0) {
    throw new Error("This play is already attached to game data. Remove those references first.");
  }

  const { error } = await supabase.from("play_libraries").delete().eq("id", playId);

  if (error) {
    throw error;
  }
}

export async function deleteDrillLibraryEntry(drillId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("drill_libraries").delete().eq("id", drillId);

  if (error) {
    throw error;
  }
}

export async function createPracticePlan(input: {
  seasonId: string;
  teamSeasonId: string;
  teamSeasonIds?: string[];
  title: string;
  practiceDate: string;
  startTime: string;
  lengthMinutes: number;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
  practiceGoal?: string;
}) {
  const teamSeasonIds = input.teamSeasonIds?.length ? [...new Set(input.teamSeasonIds)] : [input.teamSeasonId];
  if (!isSupabaseConfigured()) {
    practicePlans.unshift(
      normalizePracticePlanRecord({
        id: crypto.randomUUID(),
        seasonId: input.seasonId,
        teamSeasonId: teamSeasonIds[0] ?? input.teamSeasonId,
        teamSeasonIds,
        title: input.title,
        practiceDate: input.practiceDate,
        startTime: input.startTime,
        lengthMinutes: input.lengthMinutes,
        attendanceMode: input.attendanceMode,
        capacity: input.capacity,
        practiceGoal: input.practiceGoal,
        items: [],
      }),
    );
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("practice_plans").insert({
    season_id: input.seasonId,
    team_season_id: teamSeasonIds[0] ?? input.teamSeasonId,
    team_season_ids: teamSeasonIds,
    title: input.title,
    practice_date: input.practiceDate,
    start_time: input.startTime,
    length_minutes: input.lengthMinutes,
    attendance_mode: input.attendanceMode,
    capacity: input.capacity ?? null,
    practice_goal: input.practiceGoal || null,
    items: [],
  });

  if (error) {
    throw error;
  }
}

export async function updatePracticePlan(input: {
  id: string;
  seasonId: string;
  teamSeasonId: string;
  teamSeasonIds?: string[];
  title: string;
  practiceDate: string;
  startTime: string;
  lengthMinutes: number;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
  practiceGoal?: string;
}) {
  const teamSeasonIds = input.teamSeasonIds?.length ? [...new Set(input.teamSeasonIds)] : [input.teamSeasonId];
  if (!isSupabaseConfigured()) {
    const target = practicePlans.find((plan) => plan.id === input.id);
    if (!target) {
      throw new Error("Practice plan not found.");
    }

    target.seasonId = input.seasonId;
    target.teamSeasonId = teamSeasonIds[0] ?? input.teamSeasonId;
    target.teamSeasonIds = teamSeasonIds;
    target.title = input.title;
    target.practiceDate = input.practiceDate;
    target.startTime = input.startTime;
    target.lengthMinutes = input.lengthMinutes;
    target.attendanceMode = input.attendanceMode;
    target.capacity = input.capacity;
    target.practiceGoal = input.practiceGoal;
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("practice_plans")
    .update({
      season_id: input.seasonId,
      team_season_id: teamSeasonIds[0] ?? input.teamSeasonId,
      team_season_ids: teamSeasonIds,
      title: input.title,
      practice_date: input.practiceDate,
      start_time: input.startTime,
      length_minutes: input.lengthMinutes,
      attendance_mode: input.attendanceMode,
      capacity: input.capacity ?? null,
      practice_goal: input.practiceGoal || null,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function deletePracticePlan(practicePlanId: string) {
  if (!isSupabaseConfigured()) {
    const index = practicePlans.findIndex((plan) => plan.id === practicePlanId);
    if (index >= 0) {
      practicePlans.splice(index, 1);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("practice_plans").delete().eq("id", practicePlanId);

  if (error) {
    throw error;
  }
}

function clonePracticePlanItemForImport(item: PracticePlanItemRecord, index: number): PracticePlanItemRecord {
  return normalizePracticePlanItem(
    {
      ...item,
      id: crypto.randomUUID(),
      order: index + 1,
      notes: undefined,
      results: undefined,
      rating: "bad",
      isFinished: false,
      circuitItems: item.circuitItems.map((circuitItem) => ({
        ...circuitItem,
        id: crypto.randomUUID(),
      })),
    },
    index,
  );
}

async function persistPracticePlanItems(practicePlanId: string, items: PracticePlanItemRecord[]) {
  if (!isSupabaseConfigured()) {
    const target = practicePlans.find((plan) => plan.id === practicePlanId);
    if (!target) {
      throw new Error("Practice plan not found.");
    }

    target.items = items;
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("practice_plans")
    .update({
      items: items as unknown as Record<string, unknown>[],
    })
    .eq("id", practicePlanId);

  if (error) {
    throw error;
  }
}

export async function importPracticePlanItems(input: {
  targetPracticePlanId: string;
  sourcePracticePlanId: string;
  mode: "replace" | "append";
}) {
  if (input.targetPracticePlanId === input.sourcePracticePlanId) {
    throw new Error("Choose a different practice plan to import.");
  }

  const [targetPracticePlan, sourcePracticePlan] = await Promise.all([
    getPracticePlanById(input.targetPracticePlanId),
    getPracticePlanById(input.sourcePracticePlanId),
  ]);

  if (!targetPracticePlan) {
    throw new Error("Target practice plan not found.");
  }

  if (!sourcePracticePlan) {
    throw new Error("Source practice plan not found.");
  }

  const orderOffset = input.mode === "append" ? targetPracticePlan.items.length : 0;
  const importedItems = sourcePracticePlan.items.map((item, index) => ({
    ...clonePracticePlanItemForImport(item, index),
    order: orderOffset + index + 1,
  }));
  const nextItems =
    input.mode === "append"
      ? [...targetPracticePlan.items, ...importedItems]
      : importedItems;

  await persistPracticePlanItems(
    input.targetPracticePlanId,
    nextItems
      .sort((left, right) => left.order - right.order)
      .map((item, index) => ({ ...item, order: index + 1 })),
  );
}

export async function createPracticePlanItem(input: {
  practicePlanId: string;
  item: Omit<PracticePlanItemRecord, "id"> & { id?: string };
}) {
  const practicePlan = await getPracticePlanById(input.practicePlanId);
  if (!practicePlan) {
    throw new Error("Practice plan not found.");
  }

  const nextItem = normalizePracticePlanItem(
    {
      ...input.item,
      id: input.item.id ?? crypto.randomUUID(),
      order: practicePlan.items.length + 1,
    },
    practicePlan.items.length,
  );
  const items = [...practicePlan.items, nextItem]
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({ ...item, order: index + 1 }));

  await persistPracticePlanItems(input.practicePlanId, items);
}

export async function updatePracticePlanItem(input: {
  practicePlanId: string;
  itemId: string;
  item: Omit<PracticePlanItemRecord, "id">;
}) {
  const practicePlan = await getPracticePlanById(input.practicePlanId);
  if (!practicePlan) {
    throw new Error("Practice plan not found.");
  }

  const items = practicePlan.items.map((item, index) =>
    item.id === input.itemId
      ? normalizePracticePlanItem(
          {
            ...input.item,
            id: input.itemId,
          },
          index,
        )
      : item,
  );

  await persistPracticePlanItems(
    input.practicePlanId,
    items
      .sort((left, right) => left.order - right.order)
      .map((item, index) => ({ ...item, order: index + 1 })),
  );
}

export async function deletePracticePlanItem(input: { practicePlanId: string; itemId: string }) {
  const practicePlan = await getPracticePlanById(input.practicePlanId);
  if (!practicePlan) {
    throw new Error("Practice plan not found.");
  }

  const items = practicePlan.items
    .filter((item) => item.id !== input.itemId)
    .map((item, index) => ({ ...item, order: index + 1 }));

  await persistPracticePlanItems(input.practicePlanId, items);
}

export async function createWeekGoal(input: Omit<WeekGoalRecord, "id"> & { id?: string }) {
  const record = normalizeWeekGoalRecord({
    ...input,
    id: input.id ?? crypto.randomUUID(),
  });

  if (!isSupabaseConfigured()) {
    weekGoals.unshift(record);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("week_goals").insert({
    id: record.id,
    title: record.title,
    body: record.body ?? null,
    start_date: record.startDate,
    end_date: record.endDate,
    target_roles: record.targetRoles,
    is_active: record.isActive,
  });

  if (error) {
    throw error;
  }
}

export async function deleteWeekGoal(weekGoalId: string) {
  if (!isSupabaseConfigured()) {
    const index = weekGoals.findIndex((goal) => goal.id === weekGoalId);
    if (index >= 0) {
      weekGoals.splice(index, 1);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("week_goals").delete().eq("id", weekGoalId);

  if (error) {
    throw error;
  }
}

export async function createCoachProfile(input: Omit<CoachProfileRecord, "id"> & { id?: string }) {
  const record = {
    id: input.id ?? crypto.randomUUID(),
    fullName: input.fullName.trim(),
    displayName: input.displayName.trim(),
    staffRole: input.staffRole?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    photoUrl: input.photoUrl?.trim() || undefined,
  };

  if (!isSupabaseConfigured()) {
    coachProfiles.unshift(record);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("coach_profiles").insert({
    id: record.id,
    full_name: record.fullName,
    display_name: record.displayName,
    staff_role: record.staffRole ?? null,
    bio: record.bio ?? null,
    photo_url: record.photoUrl ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function updateCoachProfile(input: CoachProfileRecord) {
  const record = {
    id: input.id,
    fullName: input.fullName.trim(),
    displayName: input.displayName.trim(),
    staffRole: input.staffRole?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    photoUrl: input.photoUrl?.trim() || undefined,
  };

  if (!isSupabaseConfigured()) {
    const index = coachProfiles.findIndex((profile) => profile.id === record.id);
    if (index >= 0) {
      coachProfiles[index] = record;
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("coach_profiles")
    .update({
      full_name: record.fullName,
      display_name: record.displayName,
      staff_role: record.staffRole ?? null,
      bio: record.bio ?? null,
      photo_url: record.photoUrl ?? null,
    })
    .eq("id", record.id);

  if (error) {
    throw error;
  }
}

export async function upsertAdminProfile(input: AdminProfileRecord) {
  const record = {
    id: input.id,
    authUserId: input.authUserId,
    authEmail: input.authEmail?.trim() || undefined,
    fullName: input.fullName.trim(),
    displayName: input.displayName.trim(),
    staffRole: input.staffRole?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    photoUrl: input.photoUrl?.trim() || undefined,
  };

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const payload = {
    id: record.id,
    auth_user_id: record.authUserId,
    auth_email: record.authEmail ?? null,
    full_name: record.fullName,
    display_name: record.displayName,
    staff_role: record.staffRole ?? null,
    bio: record.bio ?? null,
    photo_url: record.photoUrl ?? null,
  };
  const { data: existing, error: lookupError } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("auth_user_id", record.authUserId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const { error } = existing
    ? await supabase.from("admin_profiles").update(payload).eq("auth_user_id", record.authUserId)
    : await supabase.from("admin_profiles").insert(payload);

  if (error) {
    throw error;
  }
}

export async function deleteCoachProfile(coachProfileId: string) {
  if (!isSupabaseConfigured()) {
    const index = coachProfiles.findIndex((profile) => profile.id === coachProfileId);
    if (index >= 0) {
      coachProfiles.splice(index, 1);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("coach_profiles").delete().eq("id", coachProfileId);

  if (error) {
    throw error;
  }
}

export async function createManagerProfile(input: Omit<ManagerProfileRecord, "id"> & { id?: string }) {
  const record = {
    id: input.id ?? crypto.randomUUID(),
    fullName: input.fullName.trim(),
    displayName: input.displayName.trim(),
  };

  if (!isSupabaseConfigured()) {
    managerProfiles.unshift(record);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("manager_profiles").insert({
    id: record.id,
    full_name: record.fullName,
    display_name: record.displayName,
  });

  if (error) {
    throw error;
  }
}

export async function updateManagerProfile(input: ManagerProfileRecord) {
  const record = {
    id: input.id,
    fullName: input.fullName.trim(),
    displayName: input.displayName.trim(),
  };

  if (!isSupabaseConfigured()) {
    const index = managerProfiles.findIndex((profile) => profile.id === record.id);
    if (index >= 0) {
      managerProfiles[index] = record;
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("manager_profiles")
    .update({
      full_name: record.fullName,
      display_name: record.displayName,
    })
    .eq("id", record.id);

  if (error) {
    throw error;
  }
}

export async function deleteManagerProfile(managerProfileId: string) {
  if (!isSupabaseConfigured()) {
    const index = managerProfiles.findIndex((profile) => profile.id === managerProfileId);
    if (index >= 0) {
      managerProfiles.splice(index, 1);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("manager_profiles").delete().eq("id", managerProfileId);

  if (error) {
    throw error;
  }
}

export async function createCoachResponsibilityTemplate(
  input: Omit<CoachResponsibilityTemplateRecord, "id"> & { id?: string },
) {
  const record = normalizeCoachResponsibilityTemplateRecord(
    {
      ...input,
      id: input.id ?? crypto.randomUUID(),
    },
    Math.max(0, input.sortOrder - 1),
  );

  if (!isSupabaseConfigured()) {
    coachResponsibilityTemplates.push(record);
    coachResponsibilityTemplates.sort((left, right) => left.sortOrder - right.sortOrder);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("coach_responsibility_templates").insert({
    id: record.id,
    label: record.label,
    coach_profile_id: record.coachProfileId ?? null,
    sort_order: record.sortOrder,
  });

  if (error) {
    throw error;
  }
}

export async function updateCoachResponsibilityTemplate(input: CoachResponsibilityTemplateRecord) {
  const record = normalizeCoachResponsibilityTemplateRecord(input, Math.max(0, input.sortOrder - 1));

  if (!isSupabaseConfigured()) {
    const index = coachResponsibilityTemplates.findIndex((template) => template.id === record.id);
    if (index >= 0) {
      coachResponsibilityTemplates[index] = record;
      coachResponsibilityTemplates.sort((left, right) => left.sortOrder - right.sortOrder);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("coach_responsibility_templates")
    .update({
      label: record.label,
      coach_profile_id: record.coachProfileId ?? null,
      sort_order: record.sortOrder,
    })
    .eq("id", record.id);

  if (error) {
    throw error;
  }
}

export async function deleteCoachResponsibilityTemplate(templateId: string) {
  if (!isSupabaseConfigured()) {
    const index = coachResponsibilityTemplates.findIndex((template) => template.id === templateId);
    if (index >= 0) {
      coachResponsibilityTemplates.splice(index, 1);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("coach_responsibility_templates").delete().eq("id", templateId);

  if (error) {
    throw error;
  }
}

export async function createProgramAssignment(input: Omit<ProgramAssignmentRecord, "id"> & { id?: string }) {
  const record = normalizeProgramAssignmentRecord({
    ...input,
    id: input.id ?? crypto.randomUUID(),
  });

  if (!isSupabaseConfigured()) {
    programAssignments.unshift(record);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("program_assignments").insert({
    id: record.id,
    title: record.title,
    body: record.body ?? null,
    assignment_type: record.assignmentType,
    due_at: record.dueAt ?? null,
    is_active: record.isActive,
    target_roles: record.targetRoles,
    target_roster_membership_ids: record.targetRosterMembershipIds,
    target_coach_profile_ids: record.targetCoachProfileIds,
    target_manager_profile_ids: record.targetManagerProfileIds,
    related_play_id: record.relatedPlayIds[0] ?? null,
    related_play_ids: record.relatedPlayIds,
    related_game_id: record.relatedGameId ?? null,
    related_player_id: record.relatedPlayerId ?? null,
    related_player_ids: record.relatedPlayerIds,
    video_embed_code: record.videoEmbedCode ?? null,
    shots_target: record.shotsTarget ?? null,
    proof_required: record.proofRequired,
    custom_url: record.customUrl ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function updateProgramAssignment(input: ProgramAssignmentRecord) {
  const record = normalizeProgramAssignmentRecord(input);

  if (!isSupabaseConfigured()) {
    const index = programAssignments.findIndex((assignment) => assignment.id === record.id);
    if (index >= 0) {
      programAssignments[index] = record;
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("program_assignments")
    .update({
      title: record.title,
      body: record.body ?? null,
      assignment_type: record.assignmentType,
      due_at: record.dueAt ?? null,
      is_active: record.isActive,
      target_roles: record.targetRoles,
      target_roster_membership_ids: record.targetRosterMembershipIds,
      target_coach_profile_ids: record.targetCoachProfileIds,
      target_manager_profile_ids: record.targetManagerProfileIds,
      related_play_id: record.relatedPlayIds[0] ?? null,
      related_play_ids: record.relatedPlayIds,
      related_game_id: record.relatedGameId ?? null,
      related_player_id: record.relatedPlayerId ?? null,
      related_player_ids: record.relatedPlayerIds,
      video_embed_code: record.videoEmbedCode ?? null,
      shots_target: record.shotsTarget ?? null,
      proof_required: record.proofRequired,
      custom_url: record.customUrl ?? null,
    })
    .eq("id", record.id);

  if (error) {
    throw error;
  }
}

export async function createProgramAssignmentProof(
  input: Omit<
    ProgramAssignmentProofRecord,
    "id" | "createdAt" | "reviewStatus" | "reviewReason" | "reviewedAt"
  > & { id?: string; createdAt?: string },
) {
  const record = normalizeProgramAssignmentProofRecord({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
  });

  if (!isSupabaseConfigured()) {
    programAssignmentProofs.unshift(record);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("program_assignment_proofs").insert({
    id: record.id,
    assignment_id: record.assignmentId,
    submitted_by_role: record.submittedByRole,
    submitted_by_roster_membership_id: record.submittedByRosterMembershipId ?? null,
    submitted_by_coach_profile_id: record.submittedByCoachProfileId ?? null,
    submitted_by_manager_profile_id: record.submittedByManagerProfileId ?? null,
    image_urls: record.imageUrls,
    notes: record.notes ?? null,
    review_status: record.reviewStatus,
    review_reason: record.reviewReason ?? null,
    reviewed_at: record.reviewedAt ?? null,
    created_at: record.createdAt,
  });

  if (error) {
    throw error;
  }
}

export async function deleteProgramAssignment(programAssignmentId: string) {
  if (!isSupabaseConfigured()) {
    const index = programAssignments.findIndex((assignment) => assignment.id === programAssignmentId);
    if (index >= 0) {
      programAssignments.splice(index, 1);
    }
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("program_assignments").delete().eq("id", programAssignmentId);

  if (error) {
    throw error;
  }
}

export async function updatePracticePlanItemCoachingLog(input: {
  practicePlanId: string;
  itemId: string;
  notes?: string;
  results?: string;
  rating: PracticePlanItemRating;
  isFinished: boolean;
}) {
  const practicePlan = await getPracticePlanById(input.practicePlanId);
  if (!practicePlan) {
    throw new Error("Practice plan not found.");
  }

  const items = practicePlan.items.map((item) =>
    item.id === input.itemId
      ? {
          ...item,
          notes: input.notes,
          results: input.results,
          rating: normalizePracticePlanRating(input.rating),
          isFinished: input.isFinished,
        }
      : item,
  );

  await persistPracticePlanItems(input.practicePlanId, items);
}

function normalizeScoringLockRecord(record: {
  gameId?: string;
  game_id?: string;
  scorerRole?: string;
  scorer_role?: string;
  scorerUserId?: string | null;
  scorer_user_id?: string | null;
  scorerProfileId?: string | null;
  scorer_profile_id?: string | null;
  scorerLabel?: string;
  scorer_label?: string;
  deviceId?: string;
  device_id?: string;
  status?: string;
  lockStartedAt?: string;
  lock_started_at?: string;
  lastHeartbeatAt?: string;
  last_heartbeat_at?: string;
  releasedAt?: string | null;
  released_at?: string | null;
}): ScoringLockRecord {
  const status = record.status === "released" ? "released" : "active";
  const scorerRole = record.scorerRole ?? record.scorer_role;
  const now = new Date().toISOString();

  return {
    gameId: record.gameId ?? record.game_id ?? "",
    scorerRole: scorerRole === "coach" ? "coach" : "admin",
    scorerUserId: record.scorerUserId ?? record.scorer_user_id ?? null,
    scorerProfileId: record.scorerProfileId ?? record.scorer_profile_id ?? null,
    scorerLabel: record.scorerLabel ?? record.scorer_label ?? "Scorer",
    deviceId: record.deviceId ?? record.device_id ?? "",
    status,
    lockStartedAt: record.lockStartedAt ?? record.lock_started_at ?? now,
    lastHeartbeatAt: record.lastHeartbeatAt ?? record.last_heartbeat_at ?? now,
    releasedAt: record.releasedAt ?? record.released_at ?? null,
  };
}

export async function getScoringLock(gameId: string): Promise<ScoringLockRecord | null> {
  if (!isSupabaseConfigured()) {
    const lock = mockScoringLocksByGameId.get(gameId);
    return lock && lock.status === "active" ? { ...lock } : null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scoring_locks")
    .select(
      "game_id, scorer_role, scorer_user_id, scorer_profile_id, scorer_label, device_id, status, lock_started_at, last_heartbeat_at, released_at",
    )
    .eq("game_id", gameId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeScoringLockRecord(data) : null;
}

export async function takeScoringLock(input: {
  gameId: string;
  deviceId: string;
  scorerRole: "admin" | "coach";
  scorerUserId?: string | null;
  scorerProfileId?: string | null;
  scorerLabel: string;
  force?: boolean;
}): Promise<ScoringLockRecord> {
  const deviceId = input.deviceId.trim();

  if (!deviceId) {
    throw new Error("This device could not be identified. Refresh and try again.");
  }

  const existing = await getScoringLock(input.gameId);

  if (existing && existing.deviceId !== deviceId && !input.force) {
    throw new Error(`${existing.scorerLabel} already has scoring control.`);
  }

  const now = new Date().toISOString();
  const record = normalizeScoringLockRecord({
    gameId: input.gameId,
    scorerRole: input.scorerRole,
    scorerUserId: input.scorerUserId ?? null,
    scorerProfileId: input.scorerProfileId ?? null,
    scorerLabel: input.scorerLabel,
    deviceId,
    status: "active",
    lockStartedAt: existing?.deviceId === deviceId ? existing.lockStartedAt : now,
    lastHeartbeatAt: now,
    releasedAt: null,
  });

  if (!isSupabaseConfigured()) {
    mockScoringLocksByGameId.set(input.gameId, record);
    return { ...record };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scoring_locks")
    .upsert({
      game_id: record.gameId,
      scorer_role: record.scorerRole,
      scorer_user_id: record.scorerUserId,
      scorer_profile_id: record.scorerProfileId,
      scorer_label: record.scorerLabel,
      device_id: record.deviceId,
      status: "active",
      lock_started_at: record.lockStartedAt,
      last_heartbeat_at: record.lastHeartbeatAt,
      released_at: null,
      updated_at: now,
    })
    .select(
      "game_id, scorer_role, scorer_user_id, scorer_profile_id, scorer_label, device_id, status, lock_started_at, last_heartbeat_at, released_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeScoringLockRecord(data);
}

export async function releaseScoringLock(input: {
  gameId: string;
  deviceId: string;
  force?: boolean;
}): Promise<ScoringLockRecord | null> {
  const existing = await getScoringLock(input.gameId);

  if (!existing) {
    return null;
  }

  if (existing.deviceId !== input.deviceId && !input.force) {
    throw new Error(`${existing.scorerLabel} has scoring control on another device.`);
  }

  const now = new Date().toISOString();
  const released = {
    ...existing,
    status: "released" as const,
    releasedAt: now,
    lastHeartbeatAt: now,
  };

  if (!isSupabaseConfigured()) {
    mockScoringLocksByGameId.set(input.gameId, released);
    return { ...released };
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("scoring_locks")
    .update({
      status: "released",
      released_at: now,
      last_heartbeat_at: now,
      updated_at: now,
    })
    .eq("game_id", input.gameId);

  if (error) {
    throw error;
  }

  return released;
}

export async function heartbeatScoringLock(input: {
  gameId: string;
  deviceId: string;
}): Promise<ScoringLockRecord | null> {
  const existing = await getScoringLock(input.gameId);

  if (!existing) {
    return null;
  }

  if (existing.deviceId !== input.deviceId) {
    throw new Error(`${existing.scorerLabel} has scoring control on another device.`);
  }

  const now = new Date().toISOString();
  const next = {
    ...existing,
    lastHeartbeatAt: now,
  };

  if (!isSupabaseConfigured()) {
    mockScoringLocksByGameId.set(input.gameId, next);
    return { ...next };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scoring_locks")
    .update({
      last_heartbeat_at: now,
      updated_at: now,
    })
    .eq("game_id", input.gameId)
    .eq("device_id", input.deviceId)
    .eq("status", "active")
    .select(
      "game_id, scorer_role, scorer_user_id, scorer_profile_id, scorer_label, device_id, status, lock_started_at, last_heartbeat_at, released_at",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeScoringLockRecord(data) : null;
}

export async function assertActiveScoringLock(input: {
  gameId: string;
  deviceId?: string | null;
}) {
  const deviceId = input.deviceId?.trim();

  if (!deviceId) {
    throw new Error("Take scoring control before making live scorer changes.");
  }

  const existing = await getScoringLock(input.gameId);

  if (!existing) {
    throw new Error("Take scoring control before making live scorer changes.");
  }

  if (existing.deviceId !== deviceId) {
    throw new Error(`${existing.scorerLabel} has scoring control. You are in view-only mode.`);
  }
}

export async function updateLiveGameState(input: {
  gameId: string;
  quarter: number;
  secondsRemaining: number;
  teamOnOffense: "home" | "away";
  homeOffensePlayId?: string;
  homeDefensePlayId?: string;
  awayOffensePlayId?: string;
  awayDefensePlayId?: string;
  status: "scheduled" | "live" | "final";
}) {
  if (!isSupabaseConfigured()) {
    const runtime = getMockRuntime(input.gameId);
    const state = getMockState(input.gameId);
    runtime.quarter = input.quarter;
    runtime.secondsRemaining = input.secondsRemaining;
    runtime.status = input.status;
    state.teamOnOffense = input.teamOnOffense;
    state.homeOffensePlayId = input.homeOffensePlayId ?? null;
    state.homeDefensePlayId = input.homeDefensePlayId ?? null;
    state.awayOffensePlayId = input.awayOffensePlayId ?? null;
    state.awayDefensePlayId = input.awayDefensePlayId ?? null;
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error: gameError } = await supabase
    .from("games")
    .update({
      current_quarter: input.quarter,
      current_seconds_remaining: input.secondsRemaining,
      status: input.status,
    })
    .eq("id", input.gameId);

  if (gameError) {
    throw gameError;
  }

  const { error: stateError } = await supabase.from("game_state").upsert({
    game_id: input.gameId,
    team_on_offense: input.teamOnOffense,
    home_offense_play_id: input.homeOffensePlayId || null,
    home_defense_play_id: input.homeDefensePlayId || null,
    away_offense_play_id: input.awayOffensePlayId || null,
    away_defense_play_id: input.awayDefensePlayId || null,
  });

  if (stateError) {
    throw stateError;
  }
}

export async function saveGameLineupSelection(input: {
  gameId: string;
  teamSide: "home" | "away";
  rosterMembershipIds: string[];
}) {
  if (!isSupabaseConfigured()) {
    const snapshot = await getLiveScorerSnapshot(input.gameId);

    if (!snapshot) {
      return;
    }

    const normalizedRosterIds = [...new Set(input.rosterMembershipIds)].slice(0, 5).sort();
    const existing = getMockLineups(
      input.gameId,
      snapshot.homeTeam.roster.filter((player) => player.active).map((player) => player.id),
      snapshot.awayTeam.roster.filter((player) => player.active).map((player) => player.id),
    );
    const currentTeamIds = existing
      .filter((lineup) => lineup.teamSide === input.teamSide && lineup.isOnFloor)
      .map((lineup) => lineup.rosterMembershipId)
      .sort();

    if (currentTeamIds.join("|") === normalizedRosterIds.join("|")) {
      return;
    }

    const nextLineups = existing.filter((lineup) => lineup.teamSide !== input.teamSide);
    nextLineups.push(
      ...normalizedRosterIds.map((rosterMembershipId) => ({
        gameId: input.gameId,
        teamSide: input.teamSide,
        rosterMembershipId,
        isOnFloor: true,
      })),
    );
    mockGameLineupsById.set(input.gameId, nextLineups);

    const state = getMockState(input.gameId);
    const runtime = getMockRuntime(input.gameId);
    const events = getMockEvents(input.gameId);
    const nextSequence = (events[0]?.sequenceNumber ?? 0) + 1;
    const activeHomeRosterIds =
      input.teamSide === "home"
        ? normalizedRosterIds
        : getMockActiveLineupIds(input.gameId, "home");
    const activeAwayRosterIds =
      input.teamSide === "away"
        ? normalizedRosterIds
        : getMockActiveLineupIds(input.gameId, "away");

    events.unshift({
      id: `mock-event-${nextSequence}`,
      sequenceNumber: nextSequence,
      teamSide: input.teamSide,
      teamName: input.teamSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name,
      eventType: "lineup_change",
      summary: "Lineup updated",
      quarter: runtime.quarter,
      secondsRemaining: runtime.secondsRemaining,
      teamOnOffense: state.teamOnOffense,
      rosterMembershipId: null,
      relatedRosterMembershipId: null,
      notes: input.teamSide === "home" ? "Home lineup updated" : "Away lineup updated",
      shotX: null,
      shotY: null,
      shotResult: null,
      shotValue: null,
      offensePlayId:
        state.teamOnOffense === "home" ? state.homeOffensePlayId : state.awayOffensePlayId,
      defensePlayId:
        state.teamOnOffense === "home" ? state.awayDefensePlayId : state.homeDefensePlayId,
      activeHomeRosterIds,
      activeAwayRosterIds,
    });
    return;
  }

  const supabase = getSupabaseAdminClient();
  const normalizedRosterIds = [...new Set(input.rosterMembershipIds)].slice(0, 5);
  const [currentLineups, state, latestEventResult, gameResult] = await Promise.all([
    listGameLineups(input.gameId),
    getGameStateSnapshot(input.gameId),
    supabase
      .from("game_events")
      .select("sequence_number")
      .eq("game_id", input.gameId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("games")
      .select("current_quarter, current_seconds_remaining")
      .eq("id", input.gameId)
      .maybeSingle(),
  ]);
  const currentTeamIds = currentLineups
    .filter((lineup) => lineup.teamSide === input.teamSide && lineup.isOnFloor)
    .map((lineup) => lineup.rosterMembershipId)
    .sort();
  const otherTeamSide = input.teamSide === "home" ? "away" : "home";
  const otherTeamIds = currentLineups
    .filter((lineup) => lineup.teamSide === otherTeamSide && lineup.isOnFloor)
    .map((lineup) => lineup.rosterMembershipId)
    .sort();
  const normalizedSortedIds = [...normalizedRosterIds].sort();
  const lineupChanged =
    currentTeamIds.join("|") !== normalizedSortedIds.join("|");

  const { error: clearError } = await supabase
    .from("game_lineups")
    .update({ is_on_floor: false })
    .eq("game_id", input.gameId)
    .eq("team_side", input.teamSide);

  if (clearError) {
    throw clearError;
  }

  if (normalizedRosterIds.length === 0) {
    return;
  }

  const { error: lineupError } = await supabase.from("game_lineups").upsert(
    normalizedRosterIds.map((rosterMembershipId, index) => ({
      game_id: input.gameId,
      team_side: input.teamSide,
      roster_membership_id: rosterMembershipId,
      is_on_floor: true,
      entered_at_sequence: index + 1,
    })),
  );

  if (lineupError) {
    throw lineupError;
  }

  if (!lineupChanged) {
    return;
  }

  if (latestEventResult.error) {
    throw latestEventResult.error;
  }

  if (gameResult.error) {
    throw gameResult.error;
  }

  const nextSequence = (latestEventResult.data?.sequence_number ?? 0) + 1;
  const activeHomeRosterIds =
    input.teamSide === "home" ? normalizedSortedIds : otherTeamIds;
  const activeAwayRosterIds =
    input.teamSide === "away" ? normalizedSortedIds : otherTeamIds;
  const { error: lineupEventError } = await supabase.from("game_events").insert({
    game_id: input.gameId,
    sequence_number: nextSequence,
    team_side: input.teamSide,
    event_type: "lineup_change",
    quarter: gameResult.data?.current_quarter ?? 1,
    seconds_remaining: gameResult.data?.current_seconds_remaining ?? 480,
    team_on_offense: state.teamOnOffense,
    active_home_roster_ids: activeHomeRosterIds,
    active_away_roster_ids: activeAwayRosterIds,
    notes: input.teamSide === "home" ? "Home lineup updated" : "Away lineup updated",
    payload: {
      previousRosterIds: currentTeamIds,
      nextRosterIds: normalizedSortedIds,
    },
    created_by: ADMIN_SYSTEM_USER_ID,
  });

  if (lineupEventError) {
    throw lineupEventError;
  }
}

export async function createQuickGameEvent(input: {
  gameId: string;
  teamSide: "home" | "away";
  eventType:
    | "shot"
    | "lineup_change"
    | "rebound_off"
    | "rebound_def"
    | "assist"
    | "steal"
    | "block"
    | "turnover"
    | "personal_foul"
    | "timeout_full"
    | "timeout_30";
  rosterMembershipId?: string;
  relatedRosterMembershipId?: string;
  quarter: number;
  secondsRemaining: number;
  shotX?: number;
  shotY?: number;
  shotResult?: "make" | "miss";
  shotValue?: 1 | 2 | 3;
  notes?: string;
}) {
  if (!isSupabaseConfigured()) {
    const snapshot = await getLiveScorerSnapshot(input.gameId);

    if (!snapshot) {
      return;
    }

    const state = getMockState(input.gameId);
    const runtime = getMockRuntime(input.gameId);
    const events = getMockEvents(input.gameId);
    const nextSequence = (events[0]?.sequenceNumber ?? 0) + 1;
    const rosterRows = [...snapshot.homeTeam.roster, ...snapshot.awayTeam.roster];
    const player = rosterRows.find((row) => row.id === input.rosterMembershipId);
    const relatedPlayer = rosterRows.find((row) => row.id === input.relatedRosterMembershipId);
    const activeHomeRosterIds = getMockActiveLineupIds(input.gameId, "home");
    const activeAwayRosterIds = getMockActiveLineupIds(input.gameId, "away");
    const lastEvent = events[0]
      ? {
          eventType: events[0].eventType as QuickGameEventType,
          teamSide: events[0].teamSide,
          shotResult: events[0].shotResult,
          shotValue: events[0].shotValue,
        }
      : null;
    const { offenseSideForEvent, nextTeamOnOffense } = deriveEventPossessionContext(
      state,
      lastEvent,
      input,
    );
    const offensePlayId =
      offenseSideForEvent === "home"
        ? state.homeOffensePlayId
        : offenseSideForEvent === "away"
          ? state.awayOffensePlayId
          : null;
    const defensePlayId =
      offenseSideForEvent === "home"
        ? state.awayDefensePlayId
        : offenseSideForEvent === "away"
          ? state.homeDefensePlayId
          : null;

    events.unshift({
      id: `mock-event-${nextSequence}`,
      sequenceNumber: nextSequence,
      teamSide: input.teamSide,
      teamName: input.teamSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name,
      eventType: input.eventType,
      summary: formatEventSummary({
        eventType: input.eventType,
        playerName: player?.name,
        relatedPlayerName: relatedPlayer?.name,
        shotValue: input.shotValue,
        shotResult: input.shotResult,
        notes: input.notes,
      }),
      quarter: input.quarter,
      secondsRemaining: input.secondsRemaining,
      teamOnOffense: offenseSideForEvent,
      rosterMembershipId: input.rosterMembershipId ?? null,
      relatedRosterMembershipId: input.relatedRosterMembershipId ?? null,
      notes: input.notes ?? "",
      shotX: input.eventType === "shot" ? input.shotX ?? null : null,
      shotY: input.eventType === "shot" ? input.shotY ?? null : null,
      shotResult: input.eventType === "shot" ? input.shotResult ?? null : null,
      shotValue: input.eventType === "shot" ? input.shotValue ?? null : null,
      offensePlayId,
      defensePlayId,
      activeHomeRosterIds,
      activeAwayRosterIds,
    });

    state.teamOnOffense = nextTeamOnOffense;
    runtime.quarter = input.quarter;
    runtime.secondsRemaining = input.secondsRemaining;
    runtime.status = "live";
    recalculateMockGameState(input.gameId);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const [state, lineups, latestEventResult] = await Promise.all([
    getGameStateSnapshot(input.gameId),
    listGameLineups(input.gameId),
    supabase
      .from("game_events")
      .select("sequence_number, event_type, team_side, shot_result, shot_value")
      .eq("game_id", input.gameId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (latestEventResult.error) {
    throw latestEventResult.error;
  }

  const nextSequence = (latestEventResult.data?.sequence_number ?? 0) + 1;
  const lastEvent = latestEventResult.data
    ? {
        eventType: latestEventResult.data.event_type as QuickGameEventType,
        teamSide: latestEventResult.data.team_side,
        shotResult: latestEventResult.data.shot_result,
        shotValue: latestEventResult.data.shot_value,
      }
    : null;
  const activeHomeRosterIds = lineups
    .filter((lineup) => lineup.teamSide === "home" && lineup.isOnFloor)
    .map((lineup) => lineup.rosterMembershipId);
  const activeAwayRosterIds = lineups
    .filter((lineup) => lineup.teamSide === "away" && lineup.isOnFloor)
    .map((lineup) => lineup.rosterMembershipId);
  const { offenseSideForEvent, nextTeamOnOffense } = deriveEventPossessionContext(
    state,
    lastEvent,
    input,
  );
  const offensePlayId =
    offenseSideForEvent === "home"
      ? state.homeOffensePlayId
      : offenseSideForEvent === "away"
        ? state.awayOffensePlayId
        : null;
  const defensePlayId =
    offenseSideForEvent === "home"
      ? state.awayDefensePlayId
      : offenseSideForEvent === "away"
        ? state.homeDefensePlayId
        : null;

  const { error: eventError } = await supabase.from("game_events").insert({
    game_id: input.gameId,
    sequence_number: nextSequence,
    team_side: input.teamSide,
    event_type: input.eventType,
    quarter: input.quarter,
    seconds_remaining: input.secondsRemaining,
    roster_membership_id: input.rosterMembershipId || null,
    related_roster_membership_id: input.relatedRosterMembershipId || null,
    shot_result: input.eventType === "shot" ? input.shotResult || null : null,
    shot_value: input.eventType === "shot" ? input.shotValue || null : null,
    shot_x: input.eventType === "shot" ? input.shotX ?? null : null,
    shot_y: input.eventType === "shot" ? input.shotY ?? null : null,
    offense_play_id: offensePlayId,
    defense_play_id: defensePlayId,
    team_on_offense: offenseSideForEvent,
    active_home_roster_ids: activeHomeRosterIds,
    active_away_roster_ids: activeAwayRosterIds,
    notes: input.notes || null,
    created_by: ADMIN_SYSTEM_USER_ID,
  });

  if (eventError) {
    throw eventError;
  }

  const statePatch: Record<string, number | string | null> = {};
  if (input.eventType === "shot" && input.shotResult === "make" && input.shotValue) {
    const scoreField = input.teamSide === "home" ? "home_score" : "away_score";
    statePatch[scoreField] =
      (input.teamSide === "home" ? state.homeScore : state.awayScore) +
      input.shotValue;
  }
  if (input.eventType === "personal_foul") {
    const foulField = input.teamSide === "home" ? "home_fouls" : "away_fouls";
    statePatch[foulField] =
      (input.teamSide === "home" ? state.homeFouls : state.awayFouls) + 1;
  }
  if (input.eventType === "timeout_full") {
    const timeoutField =
      input.teamSide === "home" ? "home_full_timeouts" : "away_full_timeouts";
    statePatch[timeoutField] = Math.max(
      0,
      (input.teamSide === "home" ? state.homeFullTimeouts : state.awayFullTimeouts) -
        1,
    );
  }
  if (input.eventType === "timeout_30") {
    const timeoutField =
      input.teamSide === "home" ? "home_30_timeouts" : "away_30_timeouts";
    statePatch[timeoutField] = Math.max(
      0,
      (input.teamSide === "home" ? state.homeThirtyTimeouts : state.awayThirtyTimeouts) -
        1,
    );
  }
  statePatch.team_on_offense = nextTeamOnOffense;

  if (Object.keys(statePatch).length > 0) {
    const { error: stateError } = await supabase
      .from("game_state")
      .update(statePatch)
      .eq("game_id", input.gameId);

    if (stateError) {
      throw stateError;
    }
  }

  const { error: gameError } = await supabase
    .from("games")
    .update({
      current_quarter: input.quarter,
      current_seconds_remaining: input.secondsRemaining,
      status: "live",
    })
    .eq("id", input.gameId);

  if (gameError) {
    throw gameError;
  }
}

export async function updateGameEvent(input: {
  gameId: string;
  eventId: string;
  teamSide: "home" | "away";
  eventType:
    | "shot"
    | "lineup_change"
    | "rebound_off"
    | "rebound_def"
    | "assist"
    | "steal"
    | "block"
    | "turnover"
    | "personal_foul"
    | "timeout_full"
    | "timeout_30";
  rosterMembershipId?: string;
  relatedRosterMembershipId?: string;
  quarter: number;
  secondsRemaining: number;
  shotResult?: "make" | "miss";
  shotValue?: 1 | 2 | 3;
  offensePlayId?: string;
  defensePlayId?: string;
  notes?: string;
}) {
  if (!isSupabaseConfigured()) {
    const events = getMockEvents(input.gameId);
    const event = events.find((item) => item.id === input.eventId);
    const snapshot = await getLiveScorerSnapshot(input.gameId);

    if (!event || !snapshot) {
      return;
    }

    const rosterRows = [...snapshot.homeTeam.roster, ...snapshot.awayTeam.roster];
    const player = rosterRows.find((row) => row.id === input.rosterMembershipId);
    const relatedPlayer = rosterRows.find((row) => row.id === input.relatedRosterMembershipId);

    event.teamSide = input.teamSide;
    event.teamName = input.teamSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name;
    event.eventType = input.eventType;
    event.rosterMembershipId = input.rosterMembershipId ?? null;
    event.relatedRosterMembershipId = input.relatedRosterMembershipId ?? null;
    event.quarter = input.quarter;
    event.secondsRemaining = input.secondsRemaining;
    event.shotResult = input.eventType === "shot" ? input.shotResult ?? null : null;
    event.shotValue = input.eventType === "shot" ? input.shotValue ?? null : null;
    event.offensePlayId = input.offensePlayId ?? null;
    event.defensePlayId = input.defensePlayId ?? null;
    event.notes = input.notes ?? "";
    event.summary = formatEventSummary({
      eventType: input.eventType,
      playerName: player?.name,
      relatedPlayerName: relatedPlayer?.name,
      shotValue: input.shotValue,
      shotResult: input.shotResult,
      notes: input.notes,
    });
    recalculateMockGameState(input.gameId);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("game_events")
    .update({
      team_side: input.teamSide,
      event_type: input.eventType,
      roster_membership_id: input.rosterMembershipId || null,
      related_roster_membership_id: input.relatedRosterMembershipId || null,
      quarter: input.quarter,
      seconds_remaining: input.secondsRemaining,
      shot_result: input.eventType === "shot" ? input.shotResult || null : null,
      shot_value: input.eventType === "shot" ? input.shotValue || null : null,
      offense_play_id: input.offensePlayId || null,
      defense_play_id: input.defensePlayId || null,
      notes: input.notes || null,
      edited_by: ADMIN_SYSTEM_USER_ID,
      edited_at: new Date().toISOString(),
    })
    .eq("id", input.eventId)
    .eq("game_id", input.gameId);

  if (error) {
    throw error;
  }

  await recalculateGameStateTotals(input.gameId);
}

export async function softDeleteGameEvent(input: {
  gameId: string;
  eventId: string;
}) {
  if (!isSupabaseConfigured()) {
    const events = getMockEvents(input.gameId);
    const nextEvents = events.filter((event) => event.id !== input.eventId);
    mockGameEventsById.set(input.gameId, nextEvents);
    recalculateMockGameState(input.gameId);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("game_events")
    .update({
      deleted_at: new Date().toISOString(),
      edited_by: ADMIN_SYSTEM_USER_ID,
      edited_at: new Date().toISOString(),
    })
    .eq("id", input.eventId)
    .eq("game_id", input.gameId);

  if (error) {
    throw error;
  }

  await recalculateGameStateTotals(input.gameId);
}

export async function createCoachingObservation(input: {
  gameId: string;
  teamSide: "home" | "away";
  observationScope: "team" | "player" | "offense_play" | "defense_play";
  rosterMembershipId?: string;
  playLibraryId?: string;
  quarter: number;
  secondsRemaining: number;
  tag: string;
  scoreDelta?: number;
  notes?: string;
}) {
  if (!isSupabaseConfigured()) {
    const snapshot = await getLiveScorerSnapshot(input.gameId);

    if (!snapshot) {
      return;
    }

    const rosterRows = [...snapshot.homeTeam.roster, ...snapshot.awayTeam.roster];
    const player = rosterRows.find((row) => row.id === input.rosterMembershipId);
    const existing = mockCoachingObservationsByGameId.get(input.gameId) ?? [];
    const nextObservation: CoachingObservationRow = {
      id: `mock-observation-${Date.now()}`,
      gameId: input.gameId,
      teamSide: input.teamSide,
      teamName: input.teamSide === "home" ? snapshot.homeTeam.name : snapshot.awayTeam.name,
      observationScope: input.observationScope,
      rosterMembershipId: input.rosterMembershipId ?? null,
      playerName: player?.name ?? null,
      jersey: player?.jersey ?? null,
      playLibraryId: input.playLibraryId ?? null,
      playName:
        snapshot.homeTeam.offensePlays
          .concat(snapshot.homeTeam.defensePlays, snapshot.awayTeam.offensePlays, snapshot.awayTeam.defensePlays)
          .find((play) => play.id === input.playLibraryId)?.name ?? null,
      quarter: input.quarter,
      secondsRemaining: input.secondsRemaining,
      tag: input.tag,
      notes: input.notes ?? "",
      scoreDelta: input.scoreDelta ?? 0,
      createdAt: new Date().toISOString(),
    };
    mockCoachingObservationsByGameId.set(input.gameId, [nextObservation, ...existing]);
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("coaching_observations").insert({
    game_id: input.gameId,
    team_side: input.teamSide,
    observation_scope: input.observationScope,
    roster_membership_id: input.rosterMembershipId || null,
    play_library_id: input.playLibraryId || null,
    quarter: input.quarter,
    seconds_remaining: input.secondsRemaining,
    tag: input.tag,
    notes: input.notes || null,
    score_delta: input.scoreDelta ?? 0,
    created_by: ADMIN_SYSTEM_USER_ID,
  });

  if (error) {
    throw error;
  }
}

export async function deleteCoachingObservation(input: {
  gameId: string;
  observationId: string;
}) {
  if (!isSupabaseConfigured()) {
    const existing = mockCoachingObservationsByGameId.get(input.gameId) ?? [];
    mockCoachingObservationsByGameId.set(
      input.gameId,
      existing.filter((item) => item.id !== input.observationId),
    );
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("coaching_observations")
    .delete()
    .eq("game_id", input.gameId)
    .eq("id", input.observationId);

  if (error) {
    throw error;
  }
}

export async function createGame(input: {
  seasonId: string;
  homeTeamSeasonId: string;
  awayTeamSeasonId: string;
  startsAt: string;
  location?: string;
  status: "scheduled" | "live" | "final";
  attendanceMode: EventAttendanceMode;
  capacity?: number;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data: game, error } = await supabase
    .from("games")
    .insert({
      season_id: input.seasonId,
      home_team_season_id: input.homeTeamSeasonId,
      away_team_season_id: input.awayTeamSeasonId,
      starts_at: input.startsAt || null,
      location: input.location || null,
      status: input.status,
      attendance_mode: input.attendanceMode,
      capacity: input.capacity ?? null,
      created_by: ADMIN_SYSTEM_USER_ID,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const { error: prepError } = await supabase.from("game_prep").upsert({
    game_id: game.id,
  });

  if (prepError) {
    throw prepError;
  }

  const { error: stateError } = await supabase.from("game_state").upsert({
    game_id: game.id,
  });

  if (stateError) {
    throw stateError;
  }
}

export async function updateGameAttendanceMode(input: {
  gameId: string;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
}) {
  if (!isSupabaseConfigured()) {
    const target = games.find((game) => game.id === input.gameId);
    if (!target) {
      throw new Error("Game not found.");
    }
    target.attendanceMode = input.attendanceMode;
    target.capacity = input.capacity;
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("games")
    .update({
      attendance_mode: input.attendanceMode,
      capacity: input.capacity ?? null,
    })
    .eq("id", input.gameId);

  if (error) {
    throw error;
  }
}

export async function upsertGamePrep(input: {
  gameId: string;
  teamSummaryOverride?: string;
  keysToWinningOverride?: string;
  actionsToWatchOverride?: string;
  matchupNotes?: string;
  benchReminders?: string;
  specialSituations?: string;
  identity?: string;
  defensePlan?: string;
  defenseMatchups?: string;
  pressPlan?: string;
  offenseVsMan?: string;
  offenseVsZone?: string;
  offenseVsBigLineup?: string;
  offenseActions?: string;
  zoneThreeTwoPlan?: string;
  zoneTwoThreePlan?: string;
  blobPlan?: string;
  needAThreePlan?: string;
  slobPlan?: string;
  subsPlan?: string;
  keyMatchups?: string;
  keyMetrics?: string;
  coachingResponsibilities?: string;
  coachingResponsibilityRows?: CoachResponsibilityRecord[];
  timeoutDefenseChecklist?: string;
  timeoutOffenseChecklist?: string;
  timeoutPressPoiseChecklist?: string;
  timeoutLineupQuestions?: string;
  timeoutLateGameChecklist?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const coachRows =
    input.coachingResponsibilityRows !== undefined ? await listCoachProfileRows() : [];
  const normalizedCoachingResponsibilityRows =
    input.coachingResponsibilityRows !== undefined
      ? input.coachingResponsibilityRows.map((row) => normalizeCoachResponsibilityRecord(row))
      : undefined;
  const coachingResponsibilityText =
    normalizedCoachingResponsibilityRows !== undefined
      ? formatCoachingResponsibilityLines(normalizedCoachingResponsibilityRows, coachRows)
      : input.coachingResponsibilities;

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("game_prep")
    .select(
      "team_summary_override, keys_to_winning_override, actions_to_watch_override, matchup_notes, bench_reminders, special_situations, identity, defense_plan, defense_matchups, press_plan, offense_vs_man, offense_vs_zone, offense_vs_big_lineup, offense_actions, zone_three_two_plan, zone_two_three_plan, blob_plan, need_a_three_plan, slob_plan, subs_plan, key_matchups, key_metrics, coaching_responsibilities, coaching_responsibility_rows, timeout_defense_checklist, timeout_offense_checklist, timeout_press_poise_checklist, timeout_lineup_questions, timeout_late_game_checklist",
    )
    .eq("game_id", input.gameId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const merged = {
    game_id: input.gameId,
    team_summary_override:
      input.teamSummaryOverride !== undefined
        ? input.teamSummaryOverride || null
        : existing?.team_summary_override ?? null,
    keys_to_winning_override:
      input.keysToWinningOverride !== undefined
        ? input.keysToWinningOverride || null
        : existing?.keys_to_winning_override ?? null,
    actions_to_watch_override:
      input.actionsToWatchOverride !== undefined
        ? input.actionsToWatchOverride || null
        : existing?.actions_to_watch_override ?? null,
    matchup_notes:
      input.matchupNotes !== undefined
        ? input.matchupNotes || null
        : existing?.matchup_notes ?? null,
    bench_reminders:
      input.benchReminders !== undefined
        ? input.benchReminders || null
        : existing?.bench_reminders ?? null,
    special_situations:
      input.specialSituations !== undefined
        ? input.specialSituations || null
        : existing?.special_situations ?? null,
    identity:
      input.identity !== undefined ? input.identity || null : existing?.identity ?? null,
    defense_plan:
      input.defensePlan !== undefined
        ? input.defensePlan || null
        : existing?.defense_plan ?? null,
    defense_matchups:
      input.defenseMatchups !== undefined
        ? input.defenseMatchups || null
        : existing?.defense_matchups ?? null,
    press_plan:
      input.pressPlan !== undefined ? input.pressPlan || null : existing?.press_plan ?? null,
    offense_vs_man:
      input.offenseVsMan !== undefined
        ? input.offenseVsMan || null
        : existing?.offense_vs_man ?? null,
    offense_vs_zone:
      input.offenseVsZone !== undefined
        ? input.offenseVsZone || null
        : existing?.offense_vs_zone ?? null,
    offense_vs_big_lineup:
      input.offenseVsBigLineup !== undefined
        ? input.offenseVsBigLineup || null
        : existing?.offense_vs_big_lineup ?? null,
    offense_actions:
      input.offenseActions !== undefined
        ? input.offenseActions || null
        : existing?.offense_actions ?? null,
    zone_three_two_plan:
      input.zoneThreeTwoPlan !== undefined
        ? input.zoneThreeTwoPlan || null
        : existing?.zone_three_two_plan ?? null,
    zone_two_three_plan:
      input.zoneTwoThreePlan !== undefined
        ? input.zoneTwoThreePlan || null
        : existing?.zone_two_three_plan ?? null,
    blob_plan:
      input.blobPlan !== undefined ? input.blobPlan || null : existing?.blob_plan ?? null,
    need_a_three_plan:
      input.needAThreePlan !== undefined
        ? input.needAThreePlan || null
        : existing?.need_a_three_plan ?? null,
    slob_plan:
      input.slobPlan !== undefined ? input.slobPlan || null : existing?.slob_plan ?? null,
    subs_plan:
      input.subsPlan !== undefined ? input.subsPlan || null : existing?.subs_plan ?? null,
    key_matchups:
      input.keyMatchups !== undefined
        ? input.keyMatchups || null
        : existing?.key_matchups ?? null,
    key_metrics:
      input.keyMetrics !== undefined
        ? input.keyMetrics || null
        : existing?.key_metrics ?? null,
    coaching_responsibilities:
      coachingResponsibilityText !== undefined
        ? coachingResponsibilityText || null
        : existing?.coaching_responsibilities ?? null,
    coaching_responsibility_rows:
      normalizedCoachingResponsibilityRows !== undefined
        ? normalizedCoachingResponsibilityRows
        : existing?.coaching_responsibility_rows ?? null,
    timeout_defense_checklist:
      input.timeoutDefenseChecklist !== undefined
        ? input.timeoutDefenseChecklist || null
        : existing?.timeout_defense_checklist ?? null,
    timeout_offense_checklist:
      input.timeoutOffenseChecklist !== undefined
        ? input.timeoutOffenseChecklist || null
        : existing?.timeout_offense_checklist ?? null,
    timeout_press_poise_checklist:
      input.timeoutPressPoiseChecklist !== undefined
        ? input.timeoutPressPoiseChecklist || null
        : existing?.timeout_press_poise_checklist ?? null,
    timeout_lineup_questions:
      input.timeoutLineupQuestions !== undefined
        ? input.timeoutLineupQuestions || null
        : existing?.timeout_lineup_questions ?? null,
    timeout_late_game_checklist:
      input.timeoutLateGameChecklist !== undefined
        ? input.timeoutLateGameChecklist || null
        : existing?.timeout_late_game_checklist ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("game_prep").upsert(merged);

  if (error) {
    throw error;
  }
}

export async function createPlayerAndRosterMembership(input: {
  firstName: string;
  lastName: string;
  dominantHand?: string;
  photoUrl?: string;
  graduatingClass?: string;
  birthdate?: string;
  teamSeasonId: string;
  jerseyNumber: string;
  position: string;
  height: string;
  isActive: boolean;
  isStarter: boolean;
  closeoutType?: "curry" | "kyrie" | "ben";
  speedType?: "cheetah" | "elephant" | "sloth";
  defenderTypes?: Array<"glove" | "cone" | "eraser">;
  drivePreference?: "left" | "right" | "equal_driver";
  trapPreference?: "trap" | "do_not_trap";
  playerNotes?: string;
  tendencies?: string;
}) {
  if (!isSupabaseConfigured()) {
    return undefined;
  }

  const supabase = getSupabaseAdminClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      dominant_hand: input.dominantHand || null,
      photo_url: input.photoUrl || null,
      graduating_class: input.graduatingClass || null,
      birthdate: input.birthdate || null,
    })
    .select("id")
    .single();

  if (playerError) {
    throw playerError;
  }

  const { error: membershipError } = await supabase.from("roster_memberships").insert({
    player_id: player.id,
    team_season_id: input.teamSeasonId,
    jersey_number: input.jerseyNumber,
    position: input.position,
    height: input.height,
    is_active: input.isActive,
    is_starter: input.isStarter,
    closeout_type: input.closeoutType || null,
    speed_type: input.speedType || null,
    defender_types: input.defenderTypes?.length ? input.defenderTypes : null,
    drive_preference: input.drivePreference || null,
    trap_preference: input.trapPreference || null,
    player_notes: input.playerNotes || null,
    tendencies: input.tendencies || null,
  });

  if (membershipError) {
    throw membershipError;
  }

  return player.id as string;
}

export async function updatePlayerAndRosterMembership(input: {
  rosterMembershipId: string;
  playerId: string;
  firstName: string;
  lastName: string;
  dominantHand?: string;
  photoUrl?: string;
  graduatingClass?: string;
  birthdate?: string;
  teamSeasonId: string;
  jerseyNumber: string;
  position: string;
  height: string;
  isActive: boolean;
  isStarter: boolean;
  closeoutType?: "curry" | "kyrie" | "ben";
  speedType?: "cheetah" | "elephant" | "sloth";
  defenderTypes?: Array<"glove" | "cone" | "eraser">;
  drivePreference?: "left" | "right" | "equal_driver";
  trapPreference?: "trap" | "do_not_trap";
  playerNotes?: string;
  tendencies?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error: playerError } = await supabase
    .from("players")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      dominant_hand: input.dominantHand || null,
      photo_url: input.photoUrl || null,
      graduating_class: input.graduatingClass || null,
      birthdate: input.birthdate || null,
    })
    .eq("id", input.playerId);

  if (playerError) {
    throw playerError;
  }

  const { error: membershipError } = await supabase
    .from("roster_memberships")
    .update({
      team_season_id: input.teamSeasonId,
      jersey_number: input.jerseyNumber,
      position: input.position,
      height: input.height,
      is_active: input.isActive,
      is_starter: input.isStarter,
      closeout_type: input.closeoutType || null,
      speed_type: input.speedType || null,
      defender_types: input.defenderTypes?.length ? input.defenderTypes : null,
      drive_preference: input.drivePreference || null,
      trap_preference: input.trapPreference || null,
      player_notes: input.playerNotes || null,
      tendencies: input.tendencies || null,
    })
    .eq("id", input.rosterMembershipId);

  if (membershipError) {
    throw membershipError;
  }
}

export async function bulkUpdatePlayerRosterEntries(input: {
  rosterMembershipIds: string[];
  graduatingClass?: string;
  teamSeasonIds?: string[];
  isActive?: boolean;
  isStarter?: boolean;
  position?: string;
}) {
  const rosterMembershipIds = [...new Set(input.rosterMembershipIds)].filter(Boolean);
  if (rosterMembershipIds.length === 0 || !isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const allMemberships = await listRosterMemberships();
  const selectedMemberships = allMemberships.filter((membership) => rosterMembershipIds.includes(membership.id));
  const playerIds = [...new Set(selectedMemberships.map((membership) => membership.playerId))];

  if (input.graduatingClass !== undefined && playerIds.length > 0) {
    const { error } = await supabase
      .from("players")
      .update({ graduating_class: input.graduatingClass || null })
      .in("id", playerIds);

    if (error) {
      throw error;
    }
  }

  const rosterUpdates: Record<string, unknown> = {};
  if (input.isActive !== undefined) {
    rosterUpdates.is_active = input.isActive;
  }
  if (input.isStarter !== undefined) {
    rosterUpdates.is_starter = input.isStarter;
  }
  if (input.position !== undefined) {
    rosterUpdates.position = input.position;
  }

  if (Object.keys(rosterUpdates).length > 0) {
    const { error } = await supabase
      .from("roster_memberships")
      .update(rosterUpdates)
      .in("id", rosterMembershipIds);

    if (error) {
      throw error;
    }
  }

  if (input.teamSeasonIds?.length) {
    const targetTeamSeasonIds = [...new Set(input.teamSeasonIds)].filter(Boolean);

    for (const sourceMembership of selectedMemberships) {
      const playerMemberships = allMemberships.filter(
        (membership) => membership.playerId === sourceMembership.playerId,
      );

      for (const teamSeasonId of targetTeamSeasonIds) {
        const existingMembership = playerMemberships.find(
          (membership) => membership.teamSeasonId === teamSeasonId,
        );
        const targetPayload = {
          jersey_number: sourceMembership.jerseyNumber,
          position: input.position ?? sourceMembership.position,
          height: sourceMembership.height,
          is_active: input.isActive ?? sourceMembership.isActive,
          is_starter: input.isStarter ?? sourceMembership.isStarter ?? false,
          closeout_type: sourceMembership.closeoutType || null,
          speed_type: sourceMembership.speedType || null,
          defender_types: sourceMembership.defenderTypes?.length ? sourceMembership.defenderTypes : null,
          drive_preference: sourceMembership.drivePreference || null,
          trap_preference: sourceMembership.trapPreference || null,
          player_notes: sourceMembership.playerNotes || null,
          tendencies: sourceMembership.tendencies || null,
        };

        if (existingMembership) {
          const { error } = await supabase
            .from("roster_memberships")
            .update(targetPayload)
            .eq("id", existingMembership.id);

          if (error) {
            throw error;
          }
          continue;
        }

        const { error } = await supabase.from("roster_memberships").insert({
          player_id: sourceMembership.playerId,
          team_season_id: teamSeasonId,
          ...targetPayload,
        });

        if (error) {
          throw error;
        }
      }
    }
  }
}

export async function updatePlayerPhotoUrl(input: {
  playerId: string;
  photoUrl?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("players")
    .update({
      photo_url: input.photoUrl || null,
    })
    .eq("id", input.playerId);

  if (error) {
    throw error;
  }
}

export async function updatePlayerSelfServiceProfile(input: {
  playerId: string;
  rosterMembershipId: string;
  height: string;
  birthdate?: string;
  photoUrl?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error: playerError } = await supabase
    .from("players")
    .update({
      birthdate: input.birthdate || null,
      ...(input.photoUrl !== undefined ? { photo_url: input.photoUrl || null } : {}),
    })
    .eq("id", input.playerId);

  if (playerError) {
    throw playerError;
  }

  const { error: membershipError } = await supabase
    .from("roster_memberships")
    .update({
      height: input.height,
    })
    .eq("id", input.rosterMembershipId);

  if (membershipError) {
    throw membershipError;
  }
}

export async function replacePlayerParentContacts(input: {
  playerId: string;
  contacts: Array<{
    fullName: string;
    email?: string;
    phone?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("player_parent_contacts")
    .delete()
    .eq("player_id", input.playerId);

  if (deleteError) {
    throw deleteError;
  }

  if (input.contacts.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("player_parent_contacts").insert(
    input.contacts.map((contact, index) => ({
      player_id: input.playerId,
      full_name: contact.fullName,
      email: contact.email || null,
      phone: contact.phone || null,
      sort_order: index + 1,
    })),
  );

  if (insertError) {
    throw insertError;
  }
}

export async function createRosterMembership(input: {
  playerId: string;
  teamSeasonId: string;
  jerseyNumber: string;
  position: string;
  height: string;
  isActive: boolean;
  isStarter: boolean;
  closeoutType?: "curry" | "kyrie" | "ben";
  speedType?: "cheetah" | "elephant" | "sloth";
  defenderTypes?: Array<"glove" | "cone" | "eraser">;
  drivePreference?: "left" | "right" | "equal_driver";
  trapPreference?: "trap" | "do_not_trap";
  playerNotes?: string;
  tendencies?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("roster_memberships").insert({
    player_id: input.playerId,
    team_season_id: input.teamSeasonId,
    jersey_number: input.jerseyNumber,
    position: input.position,
    height: input.height,
    is_active: input.isActive,
    is_starter: input.isStarter,
    closeout_type: input.closeoutType || null,
    speed_type: input.speedType || null,
    defender_types: input.defenderTypes?.length ? input.defenderTypes : null,
    drive_preference: input.drivePreference || null,
    trap_preference: input.trapPreference || null,
    player_notes: input.playerNotes || null,
    tendencies: input.tendencies || null,
  });

  if (error) {
    throw error;
  }
}

export async function createPlayerEvaluation(input: {
  playerId: string;
  coachName: string;
  evaluationDate: string;
  evaluation: string;
  playerViewEvaluation?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("player_evaluations").insert({
    player_id: input.playerId,
    coach_name: input.coachName,
    evaluation_date: input.evaluationDate,
    evaluation: input.evaluation,
    player_view_evaluation: input.playerViewEvaluation || null,
  });

  if (error) {
    throw error;
  }
}

export async function updatePlayerEvaluation(input: {
  id: string;
  playerId: string;
  coachName: string;
  evaluationDate: string;
  evaluation: string;
  playerViewEvaluation?: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("player_evaluations")
    .update({
      player_id: input.playerId,
      coach_name: input.coachName,
      evaluation_date: input.evaluationDate,
      evaluation: input.evaluation,
      player_view_evaluation: input.playerViewEvaluation || null,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function createPlayerDevelopmentPlan(input: {
  playerId: string;
  horizon: DevelopmentPlanHorizon;
  coachName: string;
  planDate: string;
  targetDate?: string;
  goalType: DevelopmentGoalType;
  planBody: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("player_development_plans").insert({
    player_id: input.playerId,
    plan_horizon: input.horizon,
    coach_name: input.coachName,
    plan_date: input.planDate,
    target_date: input.targetDate || null,
    goal_type: input.goalType,
    plan_body: input.planBody,
  });

  if (error) {
    throw error;
  }
}

export async function updatePlayerDevelopmentPlan(input: {
  id: string;
  playerId: string;
  horizon: DevelopmentPlanHorizon;
  coachName: string;
  planDate: string;
  targetDate?: string;
  goalType: DevelopmentGoalType;
  planBody: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("player_development_plans")
    .update({
      player_id: input.playerId,
      plan_horizon: input.horizon,
      coach_name: input.coachName,
      plan_date: input.planDate,
      target_date: input.targetDate || null,
      goal_type: input.goalType,
      plan_body: input.planBody,
    })
    .eq("id", input.id);

  if (error) {
    throw error;
  }
}

export async function deletePlayerEvaluation(evaluationId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("player_evaluations").delete().eq("id", evaluationId);

  if (error) {
    throw error;
  }
}

export async function deletePlayerDevelopmentPlan(planId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("player_development_plans")
    .delete()
    .eq("id", planId);

  if (error) {
    throw error;
  }
}

export async function deleteRosterMembership(rosterMembershipId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const [{ count: lineupCount, error: lineupError }, { count: eventCount, error: eventError }] =
    await Promise.all([
      supabase
        .from("game_lineups")
        .select("game_id", { count: "exact", head: true })
        .eq("roster_membership_id", rosterMembershipId),
      supabase
        .from("game_events")
        .select("id", { count: "exact", head: true })
        .or(
          `roster_membership_id.eq.${rosterMembershipId},related_roster_membership_id.eq.${rosterMembershipId}`,
        ),
    ]);

  if (lineupError) {
    throw lineupError;
  }

  if (eventError) {
    throw eventError;
  }

  if ((lineupCount ?? 0) + (eventCount ?? 0) > 0) {
    throw new Error("This roster entry is already attached to game data. Remove those references first.");
  }

  const { error } = await supabase
    .from("roster_memberships")
    .delete()
    .eq("id", rosterMembershipId);

  if (error) {
    throw error;
  }
}

export async function getRosterMembershipsBySeason(
  seasonId: string,
): Promise<RosterMembershipRecord[]> {
  const allTeamSeasons = await listTeamSeasons();
  const allRosterMemberships = await listRosterMemberships();
  const seasonTeamIds = allTeamSeasons
    .filter((teamSeason) => teamSeason.seasonId === seasonId)
    .map((teamSeason) => teamSeason.id);

  return allRosterMemberships.filter((membership) =>
    seasonTeamIds.includes(membership.teamSeasonId),
  );
}
