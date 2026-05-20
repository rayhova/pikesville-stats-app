export type TeamSide = "home" | "away";

export type ShotResult = "make" | "miss";
export type ShotValue = 1 | 2 | 3;

export type StatEventType =
  | "shot"
  | "rebound_off"
  | "rebound_def"
  | "assist"
  | "steal"
  | "block"
  | "turnover"
  | "personal_foul"
  | "timeout_full"
  | "timeout_30"
  | "sub_in"
  | "sub_out"
  | "clock_adjustment"
  | "note";

export interface GameClockSnapshot {
  quarter: number;
  secondsRemaining: number;
}

export interface LivePlayContext {
  offensePlayId: string | null;
  defensePlayId: string | null;
}

export interface GameContextSnapshot {
  teamOnOffense: TeamSide | null;
  homePlayContext: LivePlayContext;
  awayPlayContext: LivePlayContext;
  activeHomePlayerIds: string[];
  activeAwayPlayerIds: string[];
}

export interface BaseGameEvent {
  id: string;
  gameId: string;
  sequenceNumber: number;
  teamSide: TeamSide;
  type: StatEventType;
  clock: GameClockSnapshot;
  context: GameContextSnapshot;
  createdAt: string;
  createdByUserId: string;
  editedAt?: string | null;
  editedByUserId?: string | null;
  deletedAt?: string | null;
}

export interface ShotEvent extends BaseGameEvent {
  type: "shot";
  playerId: string;
  x: number;
  y: number;
  shotValue: ShotValue;
  result: ShotResult;
  assistedByPlayerId?: string | null;
  reboundPlayerId?: string | null;
  reboundType?: "off" | "def" | null;
}

export interface SimplePlayerEvent extends BaseGameEvent {
  type:
    | "rebound_off"
    | "rebound_def"
    | "assist"
    | "steal"
    | "block"
    | "turnover"
    | "personal_foul"
    | "sub_in"
    | "sub_out";
  playerId: string;
  relatedPlayerId?: string | null;
}

export interface TimeoutEvent extends BaseGameEvent {
  type: "timeout_full" | "timeout_30";
}

export interface NoteEvent extends BaseGameEvent {
  type: "note";
  text: string;
}

export type GameEvent =
  | ShotEvent
  | SimplePlayerEvent
  | TimeoutEvent
  | NoteEvent;
