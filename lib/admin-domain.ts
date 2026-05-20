export type SeasonStatus = "upcoming" | "active" | "complete";
export type TeamType = "ours" | "opponent";
export type PlaySide = "offense" | "defense";
export type DevelopmentPlanHorizon = "short_term" | "long_term";
export type AuthAccessRole = "admin" | "coach" | "manager" | "player";
export type EventAttendanceMode = "mandatory" | "voluntary";
export type EventAttendanceResponseStatus = "coming" | "out" | "waitlist";
export type PracticePlanItemType =
  | "library_drill"
  | "custom_drill"
  | "instruction"
  | "circuit";
export type PracticePlanItemRating = "bad" | "ok" | "good" | "amazing";
export type DevelopmentGoalType =
  | "skill_focus"
  | "physical_development"
  | "behavioral_goals"
  | "tactical_or_team_goals";
export type WeekGoalAudienceRole = "admin" | "coach" | "manager" | "player";
export type ProgramAssignmentType =
  | "play_review"
  | "shooting_goal"
  | "read_scouting_report"
  | "watch_video"
  | "create_evaluation"
  | "create_development_plan"
  | "custom";

export interface CoachProfileRecord {
  id: string;
  fullName: string;
  displayName: string;
  staffRole?: string;
  bio?: string;
  photoUrl?: string;
}

export interface AdminProfileRecord {
  id: string;
  authUserId: string;
  authEmail?: string;
  fullName: string;
  displayName: string;
  staffRole?: string;
  bio?: string;
  photoUrl?: string;
}

export interface ManagerProfileRecord {
  id: string;
  fullName: string;
  displayName: string;
}

export interface AppUserMembershipRecord {
  id: string;
  email?: string;
  authUserId?: string;
  role: AuthAccessRole;
  playerRosterMembershipId?: string;
  coachProfileId?: string;
  managerProfileId?: string;
  isActive: boolean;
  inviteLink?: string;
  inviteGeneratedAt?: string;
  inviteExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonRecord {
  id: string;
  name: string;
  schoolYear: string;
  status: SeasonStatus;
  startDate: string;
  endDate: string;
}

export interface ProgramRecord {
  id: string;
  name: string;
  shortName: string;
  isPikesville: boolean;
}

export interface TeamSeasonRecord {
  id: string;
  seasonId: string;
  programId: string;
  label: string;
  teamType: TeamType;
  level?: string;
  scoutingSummary?: string;
  offense?: string;
  defense?: string;
  press?: string;
  teamTendencies?: string;
  scoutingVideos?: string[];
  keysToWinning?: string;
  actionsToWatch?: string;
  scoutingNotes?: string;
}

export interface PlayerRecord {
  id: string;
  firstName: string;
  lastName: string;
  dominantHand?: string;
  photoUrl?: string;
  graduatingClass?: string;
  birthdate?: string;
  notes?: string;
}

export interface PlayerParentContactRecord {
  id: string;
  playerId: string;
  fullName: string;
  email?: string;
  phone?: string;
  sortOrder: number;
  createdAt?: string;
}

export interface RosterMembershipRecord {
  id: string;
  teamSeasonId: string;
  playerId: string;
  jerseyNumber: string;
  position: string;
  height: string;
  isActive: boolean;
  isStarter?: boolean;
  closeoutType?: "curry" | "kyrie" | "ben";
  speedType?: "cheetah" | "elephant" | "sloth";
  defenderTypes?: Array<"glove" | "cone" | "eraser">;
  drivePreference?: "left" | "right" | "equal_driver";
  trapPreference?: "trap" | "do_not_trap";
  playerNotes?: string;
  scoutingNotes?: string;
  tendencies?: string;
  strengths?: string;
  weaknesses?: string;
  matchupNotes?: string;
  shootingNotes?: string;
  effortNotes?: string;
}

export interface PlayerEvaluationRecord {
  id: string;
  playerId: string;
  coachName: string;
  evaluationDate: string;
  evaluation: string;
  playerViewEvaluation?: string;
  createdAt?: string;
}

export interface PlayerDevelopmentPlanRecord {
  id: string;
  playerId: string;
  horizon: DevelopmentPlanHorizon;
  coachName: string;
  planDate: string;
  targetDate?: string;
  goalType: DevelopmentGoalType;
  planBody: string;
  createdAt?: string;
}

export interface PlayLibraryRecord {
  id: string;
  teamSeasonId: string;
  teamSeasonIds: string[];
  playScope: "team" | "global_opponent";
  playName: string;
  playFamily: string;
  playSide: PlaySide;
  tags: string[];
  notes?: string;
  imageUrl?: string;
  embedCode?: string;
  isActive: boolean;
}

export interface DrillLibraryRecord {
  id: string;
  legacyId?: string;
  title: string;
  drillType?: string;
  playType?: string;
  tags: string[];
  description?: string;
  instructions?: string;
  notes?: string;
  videoUrl?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface PracticePlanCircuitItemRecord {
  id: string;
  title: string;
  durationMinutes: number;
  focusTags: string[];
}

export interface PracticePlanItemRecord {
  id: string;
  order: number;
  itemType: PracticePlanItemType;
  drillLibraryId?: string;
  title?: string;
  durationMinutes: number;
  focusTags: string[];
  goal?: string;
  sets?: string;
  reps?: string;
  description?: string;
  instructions?: string;
  videoUrl?: string;
  imageUrls: string[];
  notes?: string;
  results?: string;
  rating: PracticePlanItemRating;
  isFinished: boolean;
  waterBreak: boolean;
  circuitItems: PracticePlanCircuitItemRecord[];
}

export interface PracticePlanRecord {
  id: string;
  seasonId: string;
  teamSeasonId: string;
  teamSeasonIds: string[];
  title: string;
  practiceDate: string;
  startTime: string;
  lengthMinutes: number;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
  practiceGoal?: string;
  items: PracticePlanItemRecord[];
}

export interface WeekGoalRecord {
  id: string;
  title: string;
  body?: string;
  startDate: string;
  endDate: string;
  targetRoles: WeekGoalAudienceRole[];
  isActive: boolean;
}

export interface CoachResponsibilityTemplateRecord {
  id: string;
  label: string;
  coachProfileId?: string;
  sortOrder: number;
}

export interface CoachResponsibilityRecord {
  id: string;
  label: string;
  coachProfileId?: string;
}

export interface ProgramAssignmentRecord {
  id: string;
  title: string;
  body?: string;
  assignmentType: ProgramAssignmentType;
  dueAt?: string;
  isActive: boolean;
  targetRoles: WeekGoalAudienceRole[];
  targetRosterMembershipIds: string[];
  targetCoachProfileIds: string[];
  targetManagerProfileIds: string[];
  relatedPlayIds: string[];
  relatedGameId?: string;
  relatedPlayerIds: string[];
  relatedPlayerId?: string;
  videoEmbedCode?: string;
  shotsTarget?: number;
  proofRequired: boolean;
  customUrl?: string;
}

export interface ProgramAssignmentCompletionRecord {
  id: string;
  assignmentId: string;
  completedByRole: WeekGoalAudienceRole;
  completedByRosterMembershipId?: string;
  completedByCoachProfileId?: string;
  completedByManagerProfileId?: string;
  completedByAdminAuthUserId?: string;
  completedAt: string;
}

export interface ProgramAssignmentProofRecord {
  id: string;
  assignmentId: string;
  submittedByRole: WeekGoalAudienceRole;
  submittedByRosterMembershipId?: string;
  submittedByCoachProfileId?: string;
  submittedByManagerProfileId?: string;
  imageUrls: string[];
  notes?: string;
  reviewStatus: "pending" | "accepted" | "rejected";
  reviewReason?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface EventAttendanceRecord {
  id: string;
  eventKind: "game" | "practice";
  eventId: string;
  attendeeRole: "player" | "coach" | "manager";
  rosterMembershipId?: string;
  coachProfileId?: string;
  managerProfileId?: string;
  responseStatus: EventAttendanceResponseStatus;
  note?: string;
  updatedAt: string;
}
