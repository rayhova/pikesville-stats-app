"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAccessRole } from "@/lib/access-control";
import {
  createPracticePlan,
  createPracticePlanItem,
  bulkUpdateDrillLibraryEntries,
  bulkUpdatePlayerRosterEntries,
  bulkUpdatePlayLibraryEntries,
  createCoachProfile,
  createCoachResponsibilityTemplate,
  createDrillLibraryEntry,
  createManagerProfile,
  createProgramAssignment,
  createPlayerDevelopmentPlan,
  createPlayerEvaluation,
  createPlayLibraryEntry,
  createGame,
  createPlayerAndRosterMembership,
  createProgram,
  createRosterMembership,
  createSeason,
  createTeamSeason,
  createWeekGoal,
  deleteCoachProfile,
  deleteCoachResponsibilityTemplate,
  deleteProgramAssignment,
  deletePracticePlan,
  deletePracticePlanItem,
  deleteDrillLibraryEntry,
  deleteManagerProfile,
  deletePlayerDevelopmentPlan,
  deletePlayerEvaluation,
  deletePlayLibraryEntry,
  deleteRosterMembership,
  deleteTeamSeason,
  deleteWeekGoal,
  getProgramAssignmentById,
  importPracticePlanItems,
  listGameRows,
  listPlayerRosterRows,
  listPracticePlanRows,
  listProgramAssignmentProofRows,
  listRosterMemberships,
  updatePracticePlan,
  updatePracticePlanItem,
  updateCoachProfile,
  updateCoachResponsibilityTemplate,
  updateDrillLibraryEntry,
  updateManagerProfile,
  updateProgramAssignment,
  reviewProgramAssignmentProof,
  updatePlayLibraryEntry,
  updatePlayerDevelopmentPlan,
  updatePlayerEvaluation,
  updatePlayerAndRosterMembership,
  updatePlayerPhotoUrl,
  updateProgram,
  updateSeason,
  updateGameAttendanceMode,
  updateTeamSeason,
  upsertGamePrep,
} from "@/lib/admin-repository";
import { sendPushNotificationToAudience } from "@/lib/push-notifications";
import { createAndDispatchProgramAlert } from "@/lib/program-alerts";
import { getAssignmentPrimaryHref, getAssignmentSummaryMeta } from "@/lib/program-hub";
import { generatePlayerViewEvaluation } from "@/lib/player-evaluation-summary";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const optionalCapacitySchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}, z.coerce.number().int().min(1).optional());

const seasonSchema = z.object({
  name: z.string().min(2),
  schoolYear: z.string().min(4),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  status: z.enum(["upcoming", "active", "complete"]),
});

const updateSeasonSchema = seasonSchema.extend({
  seasonId: z.string().min(1),
});

const programSchema = z.object({
  name: z.string().min(2),
  shortName: z.string().min(1),
  isPikesville: z.boolean(),
});

const teamSeasonSchema = z.object({
  programId: z.string().min(1),
  seasonId: z.string().min(1),
  teamType: z.enum(["ours", "opponent"]),
  label: z.string().trim().optional().default("Varsity"),
  level: z.string().trim().optional().default(""),
  scoutingSummary: z.string().nullish().transform((value) => value ?? ""),
  offense: z.string().nullish().transform((value) => value ?? ""),
  defense: z.string().nullish().transform((value) => value ?? ""),
  press: z.string().nullish().transform((value) => value ?? ""),
  teamTendencies: z.string().optional().default(""),
  scoutingVideos: z.array(z.string()).default([]),
  keysToWinning: z.string().nullish().transform((value) => value ?? ""),
});

const playLibrarySchema = z.object({
  teamSeasonId: z.string().nullish().transform((value) => value ?? ""),
  teamSeasonIds: z.array(z.string()).default([]),
  playScope: z.enum(["team", "global_opponent"]).default("team"),
  playName: z.string().min(2),
  playFamily: z.string().optional().default(""),
  playSide: z.enum(["offense", "defense"]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  embedCode: z.string().optional().default(""),
  isActive: z.boolean(),
});

const drillLibrarySchema = z.object({
  title: z.string().min(2),
  legacyId: z.string().optional().default(""),
  drillType: z.string().optional().default(""),
  playType: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  description: z.string().optional().default(""),
  instructions: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  videoUrl: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  isActive: z.boolean(),
});

const practicePlanSchema = z.object({
  seasonId: z.string().min(1),
  teamSeasonId: z.string().nullish().transform((value) => value ?? ""),
  teamSeasonIds: z.array(z.string()).default([]),
  title: z.string().min(2),
  practiceDate: z.string().min(1),
  startTime: z.string().min(1),
  lengthMinutes: z.coerce.number().int().min(1),
  attendanceMode: z.enum(["mandatory", "voluntary"]).default("mandatory"),
  capacity: optionalCapacitySchema,
  practiceGoal: z.string().optional().default(""),
});

const updatePracticePlanSchema = practicePlanSchema.extend({
  practicePlanId: z.string().min(1),
});

const profileSchema = z.object({
  fullName: z.string().min(2),
  displayName: z.string().min(2),
  staffRole: z.string().optional().default(""),
  bio: z.string().optional().default(""),
});

const updateProfileSchema = profileSchema.extend({
  profileId: z.string().min(1),
});

const deleteProfileSchema = z.object({
  profileId: z.string().min(1),
});

const coachResponsibilityTemplateSchema = z.object({
  label: z.string().min(2),
  coachProfileId: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(1),
});

const updateCoachResponsibilityTemplateSchema = coachResponsibilityTemplateSchema.extend({
  templateId: z.string().min(1),
});

const deleteCoachResponsibilityTemplateSchema = z.object({
  templateId: z.string().min(1),
});

const weekGoalSchema = z.object({
  title: z.string().min(2),
  body: z.string().optional().default(""),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  targetRoles: z.array(z.enum(["admin", "coach", "manager", "player"])).default([]),
  isActive: z.boolean(),
});

const deleteWeekGoalSchema = z.object({
  weekGoalId: z.string().min(1),
});

const programAssignmentSchema = z.object({
  title: z.string().min(2),
  body: z.string().optional().default(""),
  assignmentType: z.enum([
    "play_review",
    "shooting_goal",
    "read_scouting_report",
    "watch_video",
    "create_evaluation",
    "create_development_plan",
    "custom",
  ]),
  dueAt: z.string().optional().default(""),
  isActive: z.boolean(),
  targetRoles: z.array(z.enum(["admin", "coach", "manager", "player"])).default([]),
  targetTeamSeasonIds: z.array(z.string()).default([]),
  targetRosterMembershipIds: z.array(z.string()).default([]),
  targetCoachProfileIds: z.array(z.string()).default([]),
  targetManagerProfileIds: z.array(z.string()).default([]),
  relatedPlayIds: z.array(z.string()).default([]),
  relatedGameId: z.string().nullish().transform((value) => value ?? ""),
  relatedPlayerIds: z.array(z.string()).default([]),
  relatedPlayerId: z.string().nullish().transform((value) => value ?? ""),
  videoEmbedCode: z.string().optional().default(""),
  shotsTarget: z.coerce.number().int().min(1).optional(),
  proofRequired: z.boolean(),
  customUrl: z.string().optional().default(""),
});

const deleteProgramAssignmentSchema = z.object({
  programAssignmentId: z.string().min(1),
});

const updateProgramAssignmentSchema = programAssignmentSchema.extend({
  programAssignmentId: z.string().min(1),
});

const practicePlanItemSchema = z.object({
  practicePlanId: z.string().min(1),
  order: z.coerce.number().int().min(1),
  itemType: z.enum(["library_drill", "custom_drill", "instruction", "circuit"]),
  drillLibraryId: z.string().nullish().transform((value) => value ?? ""),
  title: z.string().nullish().transform((value) => value ?? ""),
  durationMinutes: z.coerce.number().int().min(1),
  focusTags: z.array(z.string()).default([]),
  goal: z.string().nullish().transform((value) => value ?? ""),
  sets: z.string().nullish().transform((value) => value ?? ""),
  reps: z.string().nullish().transform((value) => value ?? ""),
  description: z.string().nullish().transform((value) => value ?? ""),
  instructions: z.string().nullish().transform((value) => value ?? ""),
  videoUrl: z.string().nullish().transform((value) => value ?? ""),
  imageUrls: z.array(z.string()).default([]),
  notes: z.string().nullish().transform((value) => value ?? ""),
  results: z.string().nullish().transform((value) => value ?? ""),
  rating: z.enum(["bad", "ok", "good", "amazing"]),
  isFinished: z.boolean(),
  waterBreak: z.boolean(),
  circuitItems: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        durationMinutes: z.coerce.number().int().min(1),
        focusTags: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

const updatePracticePlanItemSchema = practicePlanItemSchema.extend({
  itemId: z.string().min(1),
});

const deletePracticePlanSchema = z.object({
  practicePlanId: z.string().min(1),
});

const deletePracticePlanItemSchema = z.object({
  practicePlanId: z.string().min(1),
  itemId: z.string().min(1),
});

const importPracticePlanItemsSchema = z.object({
  targetPracticePlanId: z.string().min(1),
  sourcePracticePlanId: z.string().min(1),
  importMode: z.enum(["replace", "append"]).default("replace"),
});

const gameSchema = z.object({
  seasonId: z.string().min(1),
  homeTeamSeasonId: z.string().min(1),
  awayTeamSeasonId: z.string().min(1),
  startsAt: z.string().min(1),
  location: z.string().optional().default(""),
  status: z.enum(["scheduled", "live", "final"]),
  attendanceMode: z.enum(["mandatory", "voluntary"]).default("mandatory"),
  capacity: optionalCapacitySchema,
});

const updateGameAttendanceModeSchema = z.object({
  gameId: z.string().min(1),
  attendanceMode: z.enum(["mandatory", "voluntary"]),
  capacity: optionalCapacitySchema,
});

const reviewAssignmentProofSchema = z.object({
  proofId: z.string().min(1),
  assignmentId: z.string().min(1),
  reviewStatus: z.enum(["accepted", "rejected"]),
  reviewReason: z.string().optional().default(""),
});

const eventReminderSchema = z.object({
  eventKind: z.enum(["game", "practice"]),
  eventId: z.string().min(1),
  reminderType: z.enum(["attendance", "event"]),
});

const gamePrepSchema = z.object({
  gameId: z.string().min(1),
  teamSummaryOverride: z.string().optional(),
  keysToWinningOverride: z.string().optional(),
  actionsToWatchOverride: z.string().optional(),
  matchupNotes: z.string().optional(),
  benchReminders: z.string().optional(),
  specialSituations: z.string().optional(),
  identity: z.string().optional(),
  defensePlan: z.string().optional(),
  defenseMatchups: z.string().optional(),
  pressPlan: z.string().optional(),
  offenseVsMan: z.string().optional(),
  offenseVsZone: z.string().optional(),
  offenseVsBigLineup: z.string().optional(),
  offenseActions: z.string().optional(),
  zoneThreeTwoPlan: z.string().optional(),
  zoneTwoThreePlan: z.string().optional(),
  blobPlan: z.string().optional(),
  needAThreePlan: z.string().optional(),
  slobPlan: z.string().optional(),
  subsPlan: z.string().optional(),
  keyMatchups: z.string().optional(),
  keyMetrics: z.string().optional(),
  coachingResponsibilityRows: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        coachProfileId: z.string().optional(),
      }),
    )
    .default([]),
  timeoutDefenseChecklist: z.string().optional(),
  timeoutOffenseChecklist: z.string().optional(),
  timeoutPressPoiseChecklist: z.string().optional(),
  timeoutLineupQuestions: z.string().optional(),
  timeoutLateGameChecklist: z.string().optional(),
});

const playerWithRosterSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dominantHand: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  graduatingClass: z.string().optional().default(""),
  birthdate: z.string().optional().default(""),
  teamSeasonId: z.string().min(1),
  jerseyNumber: z.string().nullish().transform((value) => value ?? ""),
  position: z.string().min(1),
  height: z.string().nullish().transform((value) => value ?? ""),
  isActive: z.boolean(),
  isStarter: z.boolean(),
  closeoutType: z.enum(["curry", "kyrie", "ben"]).optional(),
  speedType: z.enum(["cheetah", "elephant", "sloth"]).optional(),
  defenderTypes: z.array(z.enum(["glove", "cone", "eraser"])).default([]),
  drivePreference: z.enum(["left", "right", "equal_driver"]).optional(),
  trapPreference: z.enum(["trap", "do_not_trap"]).optional(),
  playerNotes: z.string().optional().default(""),
  tendencies: z.string().optional().default(""),
});

const rosterMembershipSchema = z.object({
  playerId: z.string().min(1),
  teamSeasonId: z.string().min(1),
  jerseyNumber: z.string().min(1),
  position: z.string().min(1),
  height: z.string().min(1),
  isActive: z.boolean(),
  isStarter: z.boolean(),
  closeoutType: z.enum(["curry", "kyrie", "ben"]).optional(),
  speedType: z.enum(["cheetah", "elephant", "sloth"]).optional(),
  defenderTypes: z.array(z.enum(["glove", "cone", "eraser"])).default([]),
  drivePreference: z.enum(["left", "right", "equal_driver"]).optional(),
  trapPreference: z.enum(["trap", "do_not_trap"]).optional(),
  playerNotes: z.string().optional().default(""),
  tendencies: z.string().optional().default(""),
});

const updateTeamSeasonSchema = z.object({
  teamSeasonId: z.string().min(1),
  programId: z.string().min(1),
  name: z.string().min(2),
  shortName: z.string().min(1),
  isPikesville: z.boolean(),
  teamType: z.enum(["ours", "opponent"]),
  label: z.string().trim().min(1),
  level: z.string().trim().optional().default(""),
  scoutingSummary: z.string().optional().default(""),
  offense: z.string().optional().default(""),
  defense: z.string().optional().default(""),
  press: z.string().optional().default(""),
  teamTendencies: z.string().optional().default(""),
  scoutingVideos: z.array(z.string()).default([]),
  keysToWinning: z.string().optional().default(""),
});

const deleteTeamSeasonSchema = z.object({
  teamSeasonId: z.string().min(1),
});

const updateDrillLibrarySchema = z.object({
  drillId: z.string().min(1),
  title: z.string().min(2),
  legacyId: z.string().optional().default(""),
  drillType: z.string().optional().default(""),
  playType: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  description: z.string().optional().default(""),
  instructions: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  videoUrl: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  isActive: z.boolean(),
});

const deleteDrillLibrarySchema = z.object({
  drillId: z.string().min(1),
});

const updatePlayerRosterSchema = z.object({
  rosterMembershipId: z.string().min(1),
  playerId: z.string().min(1),
  firstName: z.string().trim().default(""),
  lastName: z.string().trim().default(""),
  dominantHand: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  graduatingClass: z.string().optional().default(""),
  birthdate: z.string().optional().default(""),
  teamSeasonId: z.string().min(1),
  jerseyNumber: z.string().min(1),
  position: z.string().min(1),
  height: z.string().min(1),
  isActive: z.boolean(),
  isStarter: z.boolean(),
  closeoutType: z.enum(["curry", "kyrie", "ben"]).optional(),
  speedType: z.enum(["cheetah", "elephant", "sloth"]).optional(),
  defenderTypes: z.array(z.enum(["glove", "cone", "eraser"])).default([]),
  drivePreference: z.enum(["left", "right", "equal_driver"]).optional(),
  trapPreference: z.enum(["trap", "do_not_trap"]).optional(),
  playerNotes: z.string().optional().default(""),
  tendencies: z.string().optional().default(""),
});

const deleteRosterMembershipSchema = z.object({
  rosterMembershipId: z.string().min(1),
});

const playerEvaluationSchema = z.object({
  playerId: z.string().min(1),
  coachName: z.string().min(1),
  evaluationDate: z.string().min(1),
  evaluation: z.string().min(1),
  playerViewEvaluation: z.string().optional().default(""),
});

const playerDevelopmentPlanSchema = z.object({
  playerId: z.string().min(1),
  horizon: z.enum(["short_term", "long_term"]),
  coachName: z.string().min(1),
  planDate: z.string().min(1),
  targetDate: z.string().optional().default(""),
  goalType: z.enum([
    "skill_focus",
    "physical_development",
    "behavioral_goals",
    "tactical_or_team_goals",
  ]),
  planBody: z.string().min(1),
});

const deletePlayerEvaluationSchema = z.object({
  evaluationId: z.string().min(1),
});

const updatePlayerEvaluationSchema = playerEvaluationSchema.extend({
  evaluationId: z.string().min(1),
});

const deletePlayerDevelopmentPlanSchema = z.object({
  planId: z.string().min(1),
});

const updatePlayerDevelopmentPlanSchema = playerDevelopmentPlanSchema.extend({
  planId: z.string().min(1),
});

const updatePlayLibrarySchema = z.object({
  playId: z.string().min(1),
  teamSeasonId: z.string().nullish().transform((value) => value ?? ""),
  teamSeasonIds: z.array(z.string()).default([]),
  playScope: z.enum(["team", "global_opponent"]).default("team"),
  playName: z.string().min(2),
  playFamily: z.string().optional().default(""),
  playSide: z.enum(["offense", "defense"]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  embedCode: z.string().optional().default(""),
  isActive: z.boolean(),
});

const deletePlayLibrarySchema = z.object({
  playId: z.string().min(1),
});

const bulkPlayLibrarySchema = z.object({
  playIds: z.array(z.string()).min(1),
  playFamily: z.string().optional(),
  tags: z.array(z.string()).optional(),
  teamSeasonIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const bulkDrillLibrarySchema = z.object({
  drillIds: z.array(z.string()).min(1),
  drillType: z.string().optional(),
  playType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const bulkPlayerRosterSchema = z.object({
  rosterMembershipIds: z.array(z.string()).min(1),
  graduatingClass: z.string().optional(),
  teamSeasonIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isStarter: z.boolean().optional(),
  position: z.string().optional(),
});

function booleanFromFormData(value: FormDataEntryValue | null) {
  return value === "true" || value === "on" || value === "active";
}

function optionalBooleanFromFormData(value: FormDataEntryValue | null) {
  if (value !== "true" && value !== "false") {
    return undefined;
  }

  return value === "true";
}

function tagListFromFormData(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formStringOrUndefined(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTeamSeasonLevel(label: string, explicitLevel?: string) {
  const trimmedLevel = explicitLevel?.trim();
  if (trimmedLevel) {
    return trimmedLevel;
  }

  const normalizedLabel = label.trim().toLowerCase();
  if (normalizedLabel === "jv") {
    return "JV";
  }
  if (normalizedLabel === "varsity") {
    return "Varsity";
  }
  if (normalizedLabel === "freshman") {
    return "Freshman";
  }

  return label.trim();
}

async function uploadPlayerPhotoFile(playerId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Player photo must be an image file.");
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    : "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${playerId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
  const supabase = getSupabaseAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("player-photos")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("player-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadStaffPhotoFile(staffId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Staff photo must be an image file.");
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    : "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${staffId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
  const supabase = getSupabaseAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("staff-photos")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("staff-photos").getPublicUrl(path);
  return data.publicUrl;
}

function formStringField(
  formData: FormData,
  key: string,
): string | undefined {
  if (!formData.has(key)) {
    return undefined;
  }

  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdminAccess() {
  await requireAccessRole(["admin"]);
}

function stringListFromFormData(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function resolvePlayerAudience(input: {
  explicitRosterMembershipIds: string[];
  teamSeasonIds: string[];
}) {
  if (input.teamSeasonIds.length === 0) {
    return input.explicitRosterMembershipIds;
  }

  const selectedTeamSeasonIds = new Set(input.teamSeasonIds);
  const playerRows = await listPlayerRosterRows();
  return Array.from(
    new Set([
      ...input.explicitRosterMembershipIds,
      ...playerRows
        .filter(
          (player) =>
            player.teamType === "ours" &&
            player.active &&
            selectedTeamSeasonIds.has(player.teamSeasonId),
        )
        .map((player) => player.id),
    ]),
  );
}

async function resolveRelatedPlayerAudience(input: {
  explicitPlayerIds: string[];
  teamSeasonIds: string[];
}) {
  if (input.explicitPlayerIds.length > 0) {
    return input.explicitPlayerIds;
  }

  const selectedTeamSeasonIds = new Set(input.teamSeasonIds);
  const playerRows = await listPlayerRosterRows();
  return playerRows
    .filter(
      (player) =>
        player.teamType === "ours" &&
        player.active &&
        (selectedTeamSeasonIds.size === 0 || selectedTeamSeasonIds.has(player.teamSeasonId)),
    )
    .map((player) => player.playerId);
}

function parsePipeSeparatedList(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseImageUrlList(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCircuitItems(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [titlePart, durationPart, tagsPart] = line.split("|").map((item) => item.trim());
      return {
        id: crypto.randomUUID(),
        title: titlePart || `Station ${index + 1}`,
        durationMinutes: Number.parseInt(durationPart || "5", 10) || 5,
        focusTags: tagsPart
          ? tagsPart
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      };
    });
}

function parseCoachingResponsibilityRows(formData: FormData) {
  const ids = stringListFromFormData(formData, "coachingResponsibilityIds");
  const keyedRows = ids
    .map((id) => {
      const rawLabel = formData.get(`coachingResponsibilityLabel:${id}`);
      const rawCoachProfileId = formData.get(`coachingResponsibilityCoachProfileId:${id}`);
      const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
      const coachProfileId = typeof rawCoachProfileId === "string" ? rawCoachProfileId.trim() : "";

      return {
        id,
        label,
        coachProfileId: coachProfileId || undefined,
      };
    })
    .filter((row) => row.label.length > 0);

  if (keyedRows.length > 0) {
    return keyedRows;
  }

  const labels = stringListFromFormData(formData, "coachingResponsibilityLabels");
  const coachProfileIds = formData
    .getAll("coachingResponsibilityCoachProfileIds")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());

  return labels
    .map((label, index) => ({
      id: ids[index] || crypto.randomUUID(),
      label,
      coachProfileId: coachProfileIds[index] || undefined,
    }))
    .filter((row) => row.label.trim().length > 0);
}

function withSavedQuery(path: string, value = "1") {
  const target = new URL(path, "https://app.pikesvillembb.com");
  target.searchParams.set("saved", value);
  return `${target.pathname}${target.search}${target.hash}`;
}

function redirectToPlayersEditor(formData: FormData, fallbackTeamSeasonId?: string, fallbackEditId?: string) {
  const teamSeasonId =
    typeof formData.get("returnTeamSeasonId") === "string"
      ? String(formData.get("returnTeamSeasonId"))
      : fallbackTeamSeasonId;
  const editId =
    typeof formData.get("returnEditId") === "string"
      ? String(formData.get("returnEditId"))
      : fallbackEditId;

  const params = new URLSearchParams();
  if (teamSeasonId) {
    params.set("teamSeason", teamSeasonId);
  }
  if (editId) {
    params.set("edit", editId);
  }

  redirect(`/admin/players${params.toString() ? `?${params.toString()}` : ""}#edit-roster-entry`);
}

function redirectToPlayersWithError(formData: FormData, message: string, fallbackTeamSeasonId?: string) {
  const teamSeasonId =
    typeof formData.get("returnTeamSeasonId") === "string"
      ? String(formData.get("returnTeamSeasonId"))
      : fallbackTeamSeasonId;

  const params = new URLSearchParams();
  if (teamSeasonId) {
    params.set("teamSeason", teamSeasonId);
  }
  params.set("error", message);

  redirect(`/admin/players${params.toString() ? `?${params.toString()}` : ""}`);
}

function getActionErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function redirectToTeamsEditor(formData: FormData, fallbackTeamSeasonId?: string) {
  const teamSeasonId =
    typeof formData.get("returnTeamSeasonId") === "string"
      ? String(formData.get("returnTeamSeasonId"))
      : fallbackTeamSeasonId;

  const params = new URLSearchParams();
  if (teamSeasonId) {
    params.set("teamSeason", teamSeasonId);
  }

  redirect(`/admin/teams${params.toString() ? `?${params.toString()}` : ""}#edit-team-season`);
}

function redirectToPracticeEditor(practicePlanId: string) {
  redirect(`/admin/practices/${practicePlanId}`);
}

export async function createSeasonAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = seasonSchema.parse({
    name: formData.get("name"),
    schoolYear: formData.get("schoolYear"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
  });

  await createSeason(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/seasons");
}

export async function updateSeasonAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updateSeasonSchema.parse({
    seasonId: formData.get("seasonId"),
    name: formData.get("name"),
    schoolYear: formData.get("schoolYear"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
  });

  await updateSeason({
    id: parsed.seasonId,
    name: parsed.name,
    schoolYear: parsed.schoolYear,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    status: parsed.status,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/seasons");
}

export async function createProgramAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = programSchema.parse({
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    isPikesville: booleanFromFormData(formData.get("isPikesville")),
  });

  await createProgram(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/teams");
}

export async function createTeamSeasonAction(formData: FormData) {
  await requireAdminAccess();
  try {
    const parsed = teamSeasonSchema.parse({
      programId: formData.get("programId"),
      seasonId: formData.get("seasonId"),
      teamType: formData.get("teamType"),
      label: String(formData.get("label") ?? "").trim() || "Varsity",
      level: String(formData.get("level") ?? "").trim(),
      scoutingSummary: formData.get("scoutingSummary"),
      offense: formData.get("offense"),
      defense: formData.get("defense"),
      press: formData.get("press"),
      teamTendencies: formStringOrUndefined(formData.get("teamTendencies")),
      scoutingVideos: stringListFromFormData(formData, "scoutingVideos"),
      keysToWinning: formData.get("keysToWinning"),
    });

    await createTeamSeason({
      ...parsed,
      level: parsed.teamType === "ours" ? normalizeTeamSeasonLevel(parsed.label, parsed.level) : parsed.level,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/teams");
    revalidatePath("/admin/players");
  } catch (error) {
    redirect(
      `/admin/teams?error=${encodeURIComponent(
        getActionErrorMessage(error, "Couldn't save that team season. Please try again."),
      )}`,
    );
  }
}

export async function updateTeamSeasonAction(formData: FormData) {
  await requireAdminAccess();
  try {
    const parsed = updateTeamSeasonSchema.parse({
      teamSeasonId: formData.get("teamSeasonId"),
      programId: formData.get("programId"),
      name: formData.get("name"),
      shortName: formData.get("shortName"),
      isPikesville: booleanFromFormData(formData.get("isPikesville")),
      teamType: formData.get("teamType"),
      label: String(formData.get("label") ?? "").trim() || "Varsity",
      level: String(formData.get("level") ?? "").trim(),
      scoutingSummary: formData.get("scoutingSummary"),
      offense: formData.get("offense"),
      defense: formData.get("defense"),
      press: formData.get("press"),
      teamTendencies: formStringOrUndefined(formData.get("teamTendencies")),
      scoutingVideos: stringListFromFormData(formData, "scoutingVideos"),
      keysToWinning: formData.get("keysToWinning"),
    });

    await updateProgram({
      id: parsed.programId,
      name: parsed.name,
      shortName: parsed.shortName,
      isPikesville: parsed.isPikesville,
    });
    await updateTeamSeason({
      id: parsed.teamSeasonId,
      teamType: parsed.teamType,
      label: parsed.label,
      level: parsed.teamType === "ours" ? normalizeTeamSeasonLevel(parsed.label, parsed.level) : parsed.level,
      scoutingSummary: parsed.scoutingSummary,
      offense: parsed.offense,
      defense: parsed.defense,
      press: parsed.press,
      teamTendencies: parsed.teamTendencies,
      scoutingVideos: parsed.scoutingVideos,
      keysToWinning: parsed.keysToWinning,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/teams");
    revalidatePath("/admin/players");
    revalidatePath("/admin/games");
    redirectToTeamsEditor(formData, parsed.teamSeasonId);
  } catch (error) {
    redirect(
      `/admin/teams?error=${encodeURIComponent(
        getActionErrorMessage(error, "Couldn't save that team season. Please try again."),
      )}`,
    );
  }
}

export async function deleteTeamSeasonAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteTeamSeasonSchema.parse({
    teamSeasonId: formData.get("teamSeasonId"),
  });

  await deleteTeamSeason(parsed.teamSeasonId);
  revalidatePath("/admin");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/players");
  revalidatePath("/admin/games");
  redirect("/admin/teams");
}

export async function createPlayLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = playLibrarySchema.parse({
    teamSeasonId: formData.get("teamSeasonId"),
    teamSeasonIds: stringListFromFormData(formData, "teamSeasonIds"),
    playScope: formData.get("playScope"),
    playName: formData.get("playName"),
    playFamily: formData.get("playFamily"),
    playSide: formData.get("playSide"),
    tags: tagListFromFormData(formData.get("tags")),
    notes: formData.get("notes"),
    imageUrl: formData.get("imageUrl"),
    embedCode: formData.get("embedCode"),
    isActive: booleanFromFormData(formData.get("isActive")),
  });
  const teamSeasonIds =
    parsed.playScope === "global_opponent"
      ? []
      : parsed.teamSeasonIds.length
        ? parsed.teamSeasonIds
        : parsed.teamSeasonId
          ? [parsed.teamSeasonId]
          : [];

  if (parsed.playScope === "team" && teamSeasonIds.length === 0) {
    redirect("/admin/plays?error=season-team#edit-play");
  }

  await createPlayLibraryEntry({
    ...parsed,
    teamSeasonId: teamSeasonIds[0] ?? "",
    teamSeasonIds,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/plays");
  revalidatePath("/admin/games");
  revalidatePath("/playbook");
}

export async function updatePlayLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updatePlayLibrarySchema.parse({
    playId: formData.get("playId"),
    teamSeasonId: formData.get("teamSeasonId"),
    teamSeasonIds: stringListFromFormData(formData, "teamSeasonIds"),
    playScope: formData.get("playScope"),
    playName: formData.get("playName"),
    playFamily: formData.get("playFamily"),
    playSide: formData.get("playSide"),
    tags: tagListFromFormData(formData.get("tags")),
    notes: formData.get("notes"),
    imageUrl: formData.get("imageUrl"),
    embedCode: formData.get("embedCode"),
    isActive: booleanFromFormData(formData.get("isActive")),
  });
  const teamSeasonIds =
    parsed.playScope === "global_opponent"
      ? []
      : parsed.teamSeasonIds.length
        ? parsed.teamSeasonIds
        : parsed.teamSeasonId
          ? [parsed.teamSeasonId]
          : [];

  if (parsed.playScope === "team" && teamSeasonIds.length === 0) {
    redirect(`/admin/plays?edit=${parsed.playId}&error=season-team#edit-play`);
  }

  try {
    await updatePlayLibraryEntry({
      id: parsed.playId,
      teamSeasonId: teamSeasonIds[0] ?? "",
      teamSeasonIds,
      playScope: parsed.playScope,
      playName: parsed.playName,
      playFamily: parsed.playFamily,
      playSide: parsed.playSide,
      tags: parsed.tags,
      notes: parsed.notes,
      imageUrl: parsed.imageUrl,
      embedCode: parsed.embedCode,
      isActive: parsed.isActive,
    });
  } catch (error) {
    console.error("Unable to update play library entry", error);
    redirect(`/admin/plays?edit=${parsed.playId}&error=save#edit-play`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/plays");
  revalidatePath("/admin/games");
  revalidatePath("/playbook");
  redirect(`/admin/plays?edit=${parsed.playId}&saved=1#edit-play`);
}

export async function deletePlayLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deletePlayLibrarySchema.parse({
    playId: formData.get("playId"),
  });

  await deletePlayLibraryEntry(parsed.playId);
  revalidatePath("/admin");
  revalidatePath("/admin/plays");
  revalidatePath("/admin/games");
  revalidatePath("/playbook");
}

export async function bulkUpdatePlayLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = bulkPlayLibrarySchema.parse({
    playIds: stringListFromFormData(formData, "playIds"),
    playFamily: formStringOrUndefined(formData.get("bulkPlayFamily")),
    tags: formData.has("bulkTags") ? stringListFromFormData(formData, "bulkTags") : undefined,
    teamSeasonIds: formData.has("bulkTeamSeasonIds")
      ? stringListFromFormData(formData, "bulkTeamSeasonIds")
      : undefined,
    isActive: optionalBooleanFromFormData(formData.get("bulkIsActive")),
  });

  await bulkUpdatePlayLibraryEntries({
    ids: parsed.playIds,
    playFamily: parsed.playFamily,
    tags: parsed.tags,
    teamSeasonIds: parsed.teamSeasonIds,
    isActive: parsed.isActive,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/plays");
  revalidatePath("/admin/games");
  revalidatePath("/playbook");
  redirect("/admin/plays?saved=bulk");
}

export async function createDrillLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = drillLibrarySchema.parse({
    title: formData.get("title"),
    legacyId: formData.get("legacyId"),
    drillType: formData.get("drillType"),
    playType: formData.get("playType"),
    tags: tagListFromFormData(formData.get("tags")),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    notes: formData.get("notes"),
    videoUrl: formData.get("videoUrl"),
    imageUrl: formData.get("imageUrl"),
    isActive: booleanFromFormData(formData.get("isActive")),
  });

  await createDrillLibraryEntry(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/drills");
  revalidatePath("/drills");
}

export async function updateDrillLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updateDrillLibrarySchema.parse({
    drillId: formData.get("drillId"),
    title: formData.get("title"),
    legacyId: formData.get("legacyId"),
    drillType: formData.get("drillType"),
    playType: formData.get("playType"),
    tags: tagListFromFormData(formData.get("tags")),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    notes: formData.get("notes"),
    videoUrl: formData.get("videoUrl"),
    imageUrl: formData.get("imageUrl"),
    isActive: booleanFromFormData(formData.get("isActive")),
  });

  await updateDrillLibraryEntry({
    id: parsed.drillId,
    title: parsed.title,
    legacyId: parsed.legacyId,
    drillType: parsed.drillType,
    playType: parsed.playType,
    tags: parsed.tags,
    description: parsed.description,
    instructions: parsed.instructions,
    notes: parsed.notes,
    videoUrl: parsed.videoUrl,
    imageUrl: parsed.imageUrl,
    isActive: parsed.isActive,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/drills");
  revalidatePath("/drills");
}

export async function deleteDrillLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteDrillLibrarySchema.parse({
    drillId: formData.get("drillId"),
  });

  await deleteDrillLibraryEntry(parsed.drillId);
  revalidatePath("/admin");
  revalidatePath("/admin/drills");
  revalidatePath("/drills");
}

export async function bulkUpdateDrillLibraryAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = bulkDrillLibrarySchema.parse({
    drillIds: stringListFromFormData(formData, "drillIds"),
    drillType: formStringOrUndefined(formData.get("bulkDrillType")),
    playType: formStringOrUndefined(formData.get("bulkPlayType")),
    tags: formData.has("bulkTags") ? stringListFromFormData(formData, "bulkTags") : undefined,
    isActive: optionalBooleanFromFormData(formData.get("bulkIsActive")),
  });

  await bulkUpdateDrillLibraryEntries({
    ids: parsed.drillIds,
    drillType: parsed.drillType,
    playType: parsed.playType,
    tags: parsed.tags,
    isActive: parsed.isActive,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/drills");
  revalidatePath("/drills");
  revalidatePath("/practices");
  redirect("/admin/drills?saved=bulk");
}

export async function createPracticePlanAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = practicePlanSchema.parse({
    seasonId: formData.get("seasonId"),
    teamSeasonId: formData.get("teamSeasonId"),
    teamSeasonIds: stringListFromFormData(formData, "teamSeasonIds"),
    title: formData.get("title"),
    practiceDate: formData.get("practiceDate"),
    startTime: formData.get("startTime"),
    lengthMinutes: formData.get("lengthMinutes"),
    attendanceMode: formData.get("attendanceMode"),
    capacity: formData.get("capacity"),
    practiceGoal: formData.get("practiceGoal"),
  });
  const teamSeasonIds = parsed.teamSeasonIds.length
    ? parsed.teamSeasonIds
    : parsed.teamSeasonId
      ? [parsed.teamSeasonId]
      : [];

  if (teamSeasonIds.length === 0) {
    throw new Error("Select at least one practice team.");
  }

  await createPracticePlan({
    ...parsed,
    teamSeasonId: teamSeasonIds[0],
    teamSeasonIds,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/practices");
  revalidatePath("/practices");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updatePracticePlanAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updatePracticePlanSchema.parse({
    practicePlanId: formData.get("practicePlanId"),
    seasonId: formData.get("seasonId"),
    teamSeasonId: formData.get("teamSeasonId"),
    teamSeasonIds: stringListFromFormData(formData, "teamSeasonIds"),
    title: formData.get("title"),
    practiceDate: formData.get("practiceDate"),
    startTime: formData.get("startTime"),
    lengthMinutes: formData.get("lengthMinutes"),
    attendanceMode: formData.get("attendanceMode"),
    capacity: formData.get("capacity"),
    practiceGoal: formData.get("practiceGoal"),
  });
  const teamSeasonIds = parsed.teamSeasonIds.length
    ? parsed.teamSeasonIds
    : parsed.teamSeasonId
      ? [parsed.teamSeasonId]
      : [];

  if (teamSeasonIds.length === 0) {
    throw new Error("Select at least one practice team.");
  }

  await updatePracticePlan({
    id: parsed.practicePlanId,
    seasonId: parsed.seasonId,
    teamSeasonId: teamSeasonIds[0],
    teamSeasonIds,
    title: parsed.title,
    practiceDate: parsed.practiceDate,
    startTime: parsed.startTime,
    lengthMinutes: parsed.lengthMinutes,
    attendanceMode: parsed.attendanceMode,
    capacity: parsed.capacity,
    practiceGoal: parsed.practiceGoal,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/practices");
  revalidatePath(`/admin/practices/${parsed.practicePlanId}`);
  revalidatePath("/practices");
  revalidatePath(`/practices/${parsed.practicePlanId}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  redirectToPracticeEditor(parsed.practicePlanId);
}

export async function deletePracticePlanAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deletePracticePlanSchema.parse({
    practicePlanId: formData.get("practicePlanId"),
  });

  await deletePracticePlan(parsed.practicePlanId);
  revalidatePath("/admin");
  revalidatePath("/admin/practices");
  revalidatePath("/practices");
  redirect("/admin/practices");
}

export async function createWeekGoalAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = weekGoalSchema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    targetRoles: stringListFromFormData(formData, "targetRoles"),
    isActive: booleanFromFormData(formData.get("isActive")),
  });

  await createWeekGoal(parsed);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
}

export async function deleteWeekGoalAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteWeekGoalSchema.parse({
    weekGoalId: formData.get("weekGoalId"),
  });

  await deleteWeekGoal(parsed.weekGoalId);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
}

export async function createProgramAssignmentAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = programAssignmentSchema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
    assignmentType: formData.get("assignmentType"),
    dueAt: formData.get("dueAt"),
    isActive: booleanFromFormData(formData.get("isActive")),
    targetRoles: stringListFromFormData(formData, "targetRoles"),
    targetTeamSeasonIds: stringListFromFormData(formData, "targetTeamSeasonIds"),
    targetRosterMembershipIds: stringListFromFormData(formData, "targetRosterMembershipIds"),
    targetCoachProfileIds: stringListFromFormData(formData, "targetCoachProfileIds"),
    targetManagerProfileIds: stringListFromFormData(formData, "targetManagerProfileIds"),
    relatedPlayIds: stringListFromFormData(formData, "relatedPlayIds"),
    relatedGameId: formData.get("relatedGameId"),
    relatedPlayerIds: stringListFromFormData(formData, "relatedPlayerIds"),
    relatedPlayerId: formData.get("relatedPlayerId"),
    videoEmbedCode: formData.get("videoEmbedCode"),
    shotsTarget: formData.get("shotsTarget") ? formData.get("shotsTarget") : undefined,
    proofRequired: booleanFromFormData(formData.get("proofRequired")),
    customUrl: formData.get("customUrl"),
  });

  const targetRosterMembershipIds = await resolvePlayerAudience({
    explicitRosterMembershipIds: parsed.targetRosterMembershipIds,
    teamSeasonIds: parsed.targetTeamSeasonIds,
  });
  let relatedPlayerIds = parsed.relatedPlayerIds;
  if (
    (parsed.assignmentType === "create_evaluation" ||
      parsed.assignmentType === "create_development_plan") &&
    relatedPlayerIds.length === 0
  ) {
    relatedPlayerIds = await resolveRelatedPlayerAudience({
      explicitPlayerIds: relatedPlayerIds,
      teamSeasonIds: parsed.targetTeamSeasonIds,
    });
  }

  const assignmentId = crypto.randomUUID();
  await createProgramAssignment({
    id: assignmentId,
    title: parsed.title,
    body: formStringOrUndefined(formData.get("body")),
    assignmentType: parsed.assignmentType,
    dueAt: formStringOrUndefined(formData.get("dueAt")),
    isActive: parsed.isActive,
    targetRoles: parsed.targetRoles,
    targetRosterMembershipIds,
    targetCoachProfileIds: parsed.targetCoachProfileIds,
    targetManagerProfileIds: parsed.targetManagerProfileIds,
    relatedPlayIds: parsed.relatedPlayIds,
    relatedGameId: formStringOrUndefined(formData.get("relatedGameId")),
    relatedPlayerIds,
    relatedPlayerId: relatedPlayerIds[0] ?? formStringOrUndefined(formData.get("relatedPlayerId")),
    videoEmbedCode: formStringOrUndefined(formData.get("videoEmbedCode")),
    shotsTarget: parsed.shotsTarget,
    proofRequired: parsed.proofRequired,
    customUrl: formStringOrUndefined(formData.get("customUrl")),
  });

  try {
    const createdAssignment = await getProgramAssignmentById(assignmentId);
    if (createdAssignment?.isActive) {
      await createAndDispatchProgramAlert({
        title: `New Assignment: ${createdAssignment.title}`,
        body: createdAssignment.body ?? getAssignmentSummaryMeta(createdAssignment),
        href: getAssignmentPrimaryHref(createdAssignment),
        tag: `assignment-${createdAssignment.id}`,
        category: "assignment",
        sourceRole: "admin",
        sourceLabel: "Admin",
        targetRoles: createdAssignment.targetRoles,
        targetRosterMembershipIds: createdAssignment.targetRosterMembershipIds,
        targetCoachProfileIds: createdAssignment.targetCoachProfileIds,
        targetManagerProfileIds: createdAssignment.targetManagerProfileIds,
      });
    }
  } catch (error) {
    console.error("createProgramAssignmentAction: alert dispatch failed", {
      assignmentId,
      error,
    });
  }
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
}

export async function deleteProgramAssignmentAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteProgramAssignmentSchema.parse({
    programAssignmentId: formData.get("programAssignmentId"),
  });

  await deleteProgramAssignment(parsed.programAssignmentId);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
}

export async function updateProgramAssignmentAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updateProgramAssignmentSchema.parse({
    programAssignmentId: formData.get("programAssignmentId"),
    title: formData.get("title"),
    body: formData.get("body"),
    assignmentType: formData.get("assignmentType"),
    dueAt: formData.get("dueAt"),
    isActive: booleanFromFormData(formData.get("isActive")),
    targetRoles: stringListFromFormData(formData, "targetRoles"),
    targetTeamSeasonIds: stringListFromFormData(formData, "targetTeamSeasonIds"),
    targetRosterMembershipIds: stringListFromFormData(formData, "targetRosterMembershipIds"),
    targetCoachProfileIds: stringListFromFormData(formData, "targetCoachProfileIds"),
    targetManagerProfileIds: stringListFromFormData(formData, "targetManagerProfileIds"),
    relatedPlayIds: stringListFromFormData(formData, "relatedPlayIds"),
    relatedGameId: formData.get("relatedGameId"),
    relatedPlayerIds: stringListFromFormData(formData, "relatedPlayerIds"),
    relatedPlayerId: formData.get("relatedPlayerId"),
    videoEmbedCode: formData.get("videoEmbedCode"),
    shotsTarget: formData.get("shotsTarget") ? formData.get("shotsTarget") : undefined,
    proofRequired: booleanFromFormData(formData.get("proofRequired")),
    customUrl: formData.get("customUrl"),
  });

  const targetRosterMembershipIds = await resolvePlayerAudience({
    explicitRosterMembershipIds: parsed.targetRosterMembershipIds,
    teamSeasonIds: parsed.targetTeamSeasonIds,
  });
  let relatedPlayerIds = parsed.relatedPlayerIds;
  if (
    (parsed.assignmentType === "create_evaluation" ||
      parsed.assignmentType === "create_development_plan") &&
    relatedPlayerIds.length === 0
  ) {
    relatedPlayerIds = await resolveRelatedPlayerAudience({
      explicitPlayerIds: relatedPlayerIds,
      teamSeasonIds: parsed.targetTeamSeasonIds,
    });
  }

  await updateProgramAssignment({
    id: parsed.programAssignmentId,
    title: parsed.title,
    body: formStringOrUndefined(formData.get("body")),
    assignmentType: parsed.assignmentType,
    dueAt: formStringOrUndefined(formData.get("dueAt")),
    isActive: parsed.isActive,
    targetRoles: parsed.targetRoles,
    targetRosterMembershipIds,
    targetCoachProfileIds: parsed.targetCoachProfileIds,
    targetManagerProfileIds: parsed.targetManagerProfileIds,
    relatedPlayIds: parsed.relatedPlayIds,
    relatedGameId: formStringOrUndefined(formData.get("relatedGameId")),
    relatedPlayerIds,
    relatedPlayerId: relatedPlayerIds[0] ?? formStringOrUndefined(formData.get("relatedPlayerId")),
    videoEmbedCode: formStringOrUndefined(formData.get("videoEmbedCode")),
    shotsTarget: parsed.shotsTarget,
    proofRequired: parsed.proofRequired,
    customUrl: formStringOrUndefined(formData.get("customUrl")),
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
  redirect(withSavedQuery("/admin/assignments", "assignment-updated"));
}

export async function createCoachProfileAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = profileSchema.parse({
    fullName: formData.get("fullName"),
    displayName: formData.get("displayName"),
    staffRole: formData.get("staffRole"),
    bio: formData.get("bio"),
  });

  const draftId = crypto.randomUUID();
  const photoUrl = await uploadStaffPhotoFile(draftId, formData.get("photoFile"));
  await createCoachProfile({
    id: draftId,
    ...parsed,
    photoUrl,
  });
  revalidatePath("/");
  revalidatePath("/scouting");
  revalidatePath("/admin");
  revalidatePath("/admin/coaches");
  revalidatePath("/staff-profile");
  redirect(withSavedQuery("/admin/coaches", "coach-created"));
}

export async function updateCoachProfileAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updateProfileSchema.parse({
    profileId: formData.get("profileId"),
    fullName: formData.get("fullName"),
    displayName: formData.get("displayName"),
    staffRole: formData.get("staffRole"),
    bio: formData.get("bio"),
  });

  const photoUrl =
    (await uploadStaffPhotoFile(parsed.profileId, formData.get("photoFile"))) ??
    formStringOrUndefined(formData.get("currentPhotoUrl"));

  await updateCoachProfile({
    id: parsed.profileId,
    fullName: parsed.fullName,
    displayName: parsed.displayName,
    staffRole: parsed.staffRole,
    bio: parsed.bio,
    photoUrl,
  });
  revalidatePath("/");
  revalidatePath("/scouting");
  revalidatePath("/admin");
  revalidatePath("/admin/coaches");
  revalidatePath("/staff-profile");
  redirect(withSavedQuery(`/admin/coaches?edit=${parsed.profileId}#edit-coach`, "coach-saved"));
}

export async function deleteCoachProfileAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteProfileSchema.parse({
    profileId: formData.get("profileId"),
  });

  await deleteCoachProfile(parsed.profileId);
  revalidatePath("/");
  revalidatePath("/scouting");
  revalidatePath("/admin");
  revalidatePath("/admin/coaches");
}

export async function createCoachResponsibilityTemplateAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = coachResponsibilityTemplateSchema.parse({
    label: formData.get("label"),
    coachProfileId: formStringOrUndefined(formData.get("coachProfileId")),
    sortOrder: formData.get("sortOrder"),
  });

  await createCoachResponsibilityTemplate({
    label: parsed.label,
    coachProfileId: parsed.coachProfileId || undefined,
    sortOrder: parsed.sortOrder,
  });
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/admin");
  revalidatePath("/admin/coaches");
  redirect(withSavedQuery("/admin/coaches#coach-responsibility-baseline", "responsibility-created"));
}

export async function updateCoachResponsibilityTemplateAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updateCoachResponsibilityTemplateSchema.parse({
    templateId: formData.get("templateId"),
    label: formData.get("label"),
    coachProfileId: formStringOrUndefined(formData.get("coachProfileId")),
    sortOrder: formData.get("sortOrder"),
  });

  await updateCoachResponsibilityTemplate({
    id: parsed.templateId,
    label: parsed.label,
    coachProfileId: parsed.coachProfileId || undefined,
    sortOrder: parsed.sortOrder,
  });
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/admin");
  revalidatePath("/admin/coaches");
  redirect(withSavedQuery("/admin/coaches#coach-responsibility-baseline", "responsibility-saved"));
}

export async function deleteCoachResponsibilityTemplateAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteCoachResponsibilityTemplateSchema.parse({
    templateId: formData.get("templateId"),
  });

  await deleteCoachResponsibilityTemplate(parsed.templateId);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/admin");
  revalidatePath("/admin/coaches");
}

export async function createManagerProfileAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = profileSchema.parse({
    fullName: formData.get("fullName"),
    displayName: formData.get("displayName"),
  });

  await createManagerProfile(parsed);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/admin/managers");
}

export async function updateManagerProfileAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updateProfileSchema.parse({
    profileId: formData.get("profileId"),
    fullName: formData.get("fullName"),
    displayName: formData.get("displayName"),
  });

  await updateManagerProfile({
    id: parsed.profileId,
    fullName: parsed.fullName,
    displayName: parsed.displayName,
  });
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/admin/managers");
}

export async function deleteManagerProfileAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteProfileSchema.parse({
    profileId: formData.get("profileId"),
  });

  await deleteManagerProfile(parsed.profileId);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/admin/managers");
}

export async function createPracticePlanItemAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = practicePlanItemSchema.parse({
    practicePlanId: formData.get("practicePlanId"),
    order: formData.get("order"),
    itemType: formData.get("itemType"),
    drillLibraryId: formData.get("drillLibraryId"),
    title: formData.get("title"),
    durationMinutes: formData.get("durationMinutes"),
    focusTags: parsePipeSeparatedList(formData.get("focusTags")),
    goal: formData.get("goal"),
    sets: formData.get("sets"),
    reps: formData.get("reps"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    videoUrl: formData.get("videoUrl"),
    imageUrls: parseImageUrlList(formData.get("imageUrls")),
    notes: formData.get("notes"),
    results: formData.get("results"),
    rating: formData.get("rating"),
    isFinished: booleanFromFormData(formData.get("isFinished")),
    waterBreak: booleanFromFormData(formData.get("waterBreak")),
    circuitItems: parseCircuitItems(formData.get("circuitItems")),
  });

  await createPracticePlanItem({
    practicePlanId: parsed.practicePlanId,
    item: {
      order: parsed.order,
      itemType: parsed.itemType,
      drillLibraryId: formStringOrUndefined(formData.get("drillLibraryId")),
      title: formStringOrUndefined(formData.get("title")),
      durationMinutes: parsed.durationMinutes,
      focusTags: parsed.focusTags,
      goal: formStringOrUndefined(formData.get("goal")),
      sets: formStringOrUndefined(formData.get("sets")),
      reps: formStringOrUndefined(formData.get("reps")),
      description: formStringOrUndefined(formData.get("description")),
      instructions: formStringOrUndefined(formData.get("instructions")),
      videoUrl: formStringOrUndefined(formData.get("videoUrl")),
      imageUrls: parsed.imageUrls,
      notes: formStringOrUndefined(formData.get("notes")),
      results: formStringOrUndefined(formData.get("results")),
      rating: parsed.rating,
      isFinished: parsed.isFinished,
      waterBreak: parsed.waterBreak,
      circuitItems: parsed.circuitItems,
    },
  });
  revalidatePath("/admin/practices");
  revalidatePath(`/admin/practices/${parsed.practicePlanId}`);
  revalidatePath("/practices");
  revalidatePath(`/practices/${parsed.practicePlanId}`);
  redirectToPracticeEditor(parsed.practicePlanId);
}

export async function updatePracticePlanItemAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updatePracticePlanItemSchema.parse({
    practicePlanId: formData.get("practicePlanId"),
    itemId: formData.get("itemId"),
    order: formData.get("order"),
    itemType: formData.get("itemType"),
    drillLibraryId: formData.get("drillLibraryId"),
    title: formData.get("title"),
    durationMinutes: formData.get("durationMinutes"),
    focusTags: parsePipeSeparatedList(formData.get("focusTags")),
    goal: formData.get("goal"),
    sets: formData.get("sets"),
    reps: formData.get("reps"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    videoUrl: formData.get("videoUrl"),
    imageUrls: parseImageUrlList(formData.get("imageUrls")),
    notes: formData.get("notes"),
    results: formData.get("results"),
    rating: formData.get("rating"),
    isFinished: booleanFromFormData(formData.get("isFinished")),
    waterBreak: booleanFromFormData(formData.get("waterBreak")),
    circuitItems: parseCircuitItems(formData.get("circuitItems")),
  });

  await updatePracticePlanItem({
    practicePlanId: parsed.practicePlanId,
    itemId: parsed.itemId,
    item: {
      order: parsed.order,
      itemType: parsed.itemType,
      drillLibraryId: formStringOrUndefined(formData.get("drillLibraryId")),
      title: formStringOrUndefined(formData.get("title")),
      durationMinutes: parsed.durationMinutes,
      focusTags: parsed.focusTags,
      goal: formStringOrUndefined(formData.get("goal")),
      sets: formStringOrUndefined(formData.get("sets")),
      reps: formStringOrUndefined(formData.get("reps")),
      description: formStringOrUndefined(formData.get("description")),
      instructions: formStringOrUndefined(formData.get("instructions")),
      videoUrl: formStringOrUndefined(formData.get("videoUrl")),
      imageUrls: parsed.imageUrls,
      notes: formStringOrUndefined(formData.get("notes")),
      results: formStringOrUndefined(formData.get("results")),
      rating: parsed.rating,
      isFinished: parsed.isFinished,
      waterBreak: parsed.waterBreak,
      circuitItems: parsed.circuitItems,
    },
  });
  revalidatePath("/admin/practices");
  revalidatePath(`/admin/practices/${parsed.practicePlanId}`);
  revalidatePath("/practices");
  revalidatePath(`/practices/${parsed.practicePlanId}`);
  redirectToPracticeEditor(parsed.practicePlanId);
}

export async function deletePracticePlanItemAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deletePracticePlanItemSchema.parse({
    practicePlanId: formData.get("practicePlanId"),
    itemId: formData.get("itemId"),
  });

  await deletePracticePlanItem(parsed);
  revalidatePath("/admin/practices");
  revalidatePath(`/admin/practices/${parsed.practicePlanId}`);
  revalidatePath("/practices");
  revalidatePath(`/practices/${parsed.practicePlanId}`);
  redirectToPracticeEditor(parsed.practicePlanId);
}

export async function importPracticePlanItemsAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = importPracticePlanItemsSchema.parse({
    targetPracticePlanId: formData.get("targetPracticePlanId"),
    sourcePracticePlanId: formData.get("sourcePracticePlanId"),
    importMode: formData.get("importMode"),
  });

  await importPracticePlanItems({
    targetPracticePlanId: parsed.targetPracticePlanId,
    sourcePracticePlanId: parsed.sourcePracticePlanId,
    mode: parsed.importMode,
  });
  revalidatePath("/admin/practices");
  revalidatePath(`/admin/practices/${parsed.targetPracticePlanId}`);
  revalidatePath("/practices");
  revalidatePath(`/practices/${parsed.targetPracticePlanId}`);
  redirect(`/admin/practices/${parsed.targetPracticePlanId}?saved=imported`);
}

export async function createGameAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = gameSchema.parse({
    seasonId: formData.get("seasonId"),
    homeTeamSeasonId: formData.get("homeTeamSeasonId"),
    awayTeamSeasonId: formData.get("awayTeamSeasonId"),
    startsAt: formData.get("startsAt"),
    location: formData.get("location"),
    status: formData.get("status"),
    attendanceMode: formData.get("attendanceMode"),
    capacity: formData.get("capacity"),
  });

  await createGame(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateGameAttendanceModeAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updateGameAttendanceModeSchema.parse({
    gameId: formData.get("gameId"),
    attendanceMode: formData.get("attendanceMode"),
    capacity: formData.get("capacity"),
  });

  await updateGameAttendanceMode(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function reviewProgramAssignmentProofAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = reviewAssignmentProofSchema.parse({
    proofId: formData.get("proofId"),
    assignmentId: formData.get("assignmentId"),
    reviewStatus: formData.get("reviewStatus"),
    reviewReason: formData.get("reviewReason"),
  });

  if (parsed.reviewStatus === "rejected" && !parsed.reviewReason.trim()) {
    throw new Error("Please provide a reason when rejecting proof.");
  }

  const [assignment, proof] = await Promise.all([
    getProgramAssignmentById(parsed.assignmentId),
    listProgramAssignmentProofRows().then((rows) => rows.find((row) => row.id === parsed.proofId) ?? null),
  ]);

  await reviewProgramAssignmentProof({
    proofId: parsed.proofId,
    reviewStatus: parsed.reviewStatus,
    reviewReason: parsed.reviewStatus === "rejected" ? parsed.reviewReason.trim() : undefined,
  });

  if (assignment && proof) {
    await createAndDispatchProgramAlert({
      title:
        parsed.reviewStatus === "accepted"
          ? `Proof Accepted: ${assignment.title}`
          : `Proof Rejected: ${assignment.title}`,
      body:
        parsed.reviewStatus === "accepted"
          ? "Your proof was accepted."
          : parsed.reviewReason.trim() || "Please review the feedback and resubmit.",
      href: `/tasks/${parsed.assignmentId}`,
      tag: `proof-review-${parsed.proofId}`,
      category: parsed.reviewStatus === "accepted" ? "proof-accepted" : "proof-rejected",
      sourceRole: "admin",
      sourceLabel: "Admin",
      targetRoles: [proof.submittedByRole],
      targetRosterMembershipIds: proof.submittedByRosterMembershipId ? [proof.submittedByRosterMembershipId] : [],
      targetCoachProfileIds: proof.submittedByCoachProfileId ? [proof.submittedByCoachProfileId] : [],
      targetManagerProfileIds: proof.submittedByManagerProfileId ? [proof.submittedByManagerProfileId] : [],
    });
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${parsed.assignmentId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/assignments");
}

export async function sendEventReminderAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = eventReminderSchema.parse({
    eventKind: formData.get("eventKind"),
    eventId: formData.get("eventId"),
    reminderType: formData.get("reminderType"),
  });

  if (parsed.eventKind === "game") {
    const game = (await listGameRows()).find((row) => row.id === parsed.eventId);
    if (!game) {
      throw new Error("Game not found.");
    }

    if (parsed.reminderType === "attendance") {
      await createAndDispatchProgramAlert({
        title: `RSVP Reminder: vs ${game.opponent}`,
        body:
          game.attendanceMode === "voluntary"
            ? "Please mark if you are coming for the upcoming game."
            : "Please mark if you are out for the upcoming game.",
        href: "/calendar",
        tag: `attendance-reminder-game-${game.id}`,
        category: "attendance-reminder",
        sourceRole: "admin",
        sourceLabel: "Admin",
        targetRoles: ["player", "coach", "manager"],
        onlyPendingAttendanceFor: {
          eventKind: "game",
          eventId: game.id,
        },
      });
    } else {
      await createAndDispatchProgramAlert({
        title: `Game Reminder: vs ${game.opponent}`,
        body: `Upcoming game on ${game.date}. Check the calendar and scouting report.`,
        href: "/calendar",
        tag: `game-reminder-${game.id}`,
        category: "game-reminder",
        sourceRole: "admin",
        sourceLabel: "Admin",
        targetRoles: ["player", "coach", "manager"],
      });
    }
  } else {
    const practice = (await listPracticePlanRows()).find((row) => row.id === parsed.eventId);
    if (!practice) {
      throw new Error("Practice not found.");
    }
    const practiceTargetRosterMembershipIds = await resolvePlayerAudience({
      explicitRosterMembershipIds: [],
      teamSeasonIds: practice.teamSeasonIds.length ? practice.teamSeasonIds : [practice.teamSeasonId],
    });

    if (parsed.reminderType === "attendance") {
      await createAndDispatchProgramAlert({
        title: `RSVP Reminder: ${practice.title}`,
        body:
          practice.attendanceMode === "voluntary"
            ? "Please mark if you are coming to the upcoming practice."
            : "Please mark if you are out for the upcoming practice.",
        href: "/calendar",
        tag: `attendance-reminder-practice-${practice.id}`,
        category: "attendance-reminder",
        sourceRole: "admin",
        sourceLabel: "Admin",
        targetRoles: ["player", "coach", "manager"],
        targetRosterMembershipIds: practiceTargetRosterMembershipIds,
        onlyPendingAttendanceFor: {
          eventKind: "practice",
          eventId: practice.id,
        },
      });
    } else {
      await createAndDispatchProgramAlert({
        title: `Practice Reminder: ${practice.title}`,
        body: `Upcoming practice on ${practice.practiceDate}. Check the calendar for details.`,
        href: "/calendar",
        tag: `practice-reminder-${practice.id}`,
        category: "practice-reminder",
        sourceRole: "admin",
        sourceLabel: "Admin",
        targetRoles: ["player", "coach", "manager"],
        targetRosterMembershipIds: practiceTargetRosterMembershipIds,
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  revalidatePath("/admin/practices");
}

export async function saveGamePrepAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = gamePrepSchema.parse({
    gameId: formData.get("gameId"),
    teamSummaryOverride: formStringField(formData, "teamSummaryOverride"),
    keysToWinningOverride: formStringField(formData, "keysToWinningOverride"),
    actionsToWatchOverride: formStringField(formData, "actionsToWatchOverride"),
    matchupNotes: formStringField(formData, "matchupNotes"),
    benchReminders: formStringField(formData, "benchReminders"),
    specialSituations: formStringField(formData, "specialSituations"),
    identity: formStringField(formData, "identity"),
    defensePlan: formStringField(formData, "defensePlan"),
    defenseMatchups: formStringField(formData, "defenseMatchups"),
    pressPlan: formStringField(formData, "pressPlan"),
    offenseVsMan: formStringField(formData, "offenseVsMan"),
    offenseVsZone: formStringField(formData, "offenseVsZone"),
    offenseVsBigLineup: formStringField(formData, "offenseVsBigLineup"),
    offenseActions: formStringField(formData, "offenseActions"),
    zoneThreeTwoPlan: formStringField(formData, "zoneThreeTwoPlan"),
    zoneTwoThreePlan: formStringField(formData, "zoneTwoThreePlan"),
    blobPlan: formStringField(formData, "blobPlan"),
    needAThreePlan: formStringField(formData, "needAThreePlan"),
    slobPlan: formStringField(formData, "slobPlan"),
    subsPlan: formStringField(formData, "subsPlan"),
    keyMatchups: formStringField(formData, "keyMatchups"),
    keyMetrics: formStringField(formData, "keyMetrics"),
    coachingResponsibilityRows: parseCoachingResponsibilityRows(formData),
    timeoutDefenseChecklist: formStringField(formData, "timeoutDefenseChecklist"),
    timeoutOffenseChecklist: formStringField(formData, "timeoutOffenseChecklist"),
    timeoutPressPoiseChecklist: formStringField(formData, "timeoutPressPoiseChecklist"),
    timeoutLineupQuestions: formStringField(formData, "timeoutLineupQuestions"),
    timeoutLateGameChecklist: formStringField(formData, "timeoutLateGameChecklist"),
  });

  await upsertGamePrep(parsed);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${parsed.gameId}/prep`);
  revalidatePath(`/admin/games/${parsed.gameId}/prep/scouting`);
  revalidatePath(`/admin/games/${parsed.gameId}/prep/game-plan`);
  revalidatePath(`/admin/games/${parsed.gameId}/prep/timeout`);
  revalidatePath(`/scouting/${parsed.gameId}`);
  revalidatePath(`/scouting/${parsed.gameId}/game-plan`);
  revalidatePath(`/scouting/${parsed.gameId}/timeout`);

  const returnTo = formStringOrUndefined(formData.get("returnTo"));
  if (returnTo) {
    redirect(withSavedQuery(returnTo, "1"));
  }
}

export async function createPlayerWithRosterAction(formData: FormData) {
  await requireAdminAccess();
  try {
    const uploadedPhoto = formData.get("photoFile");
    const selectedTeamSeasonIds = stringListFromFormData(formData, "teamSeasonIds");
    const fallbackTeamSeasonId = formStringOrUndefined(formData.get("teamSeasonId"));
    const effectiveTeamSeasonIds =
      selectedTeamSeasonIds.length > 0
        ? selectedTeamSeasonIds
        : fallbackTeamSeasonId
          ? [fallbackTeamSeasonId]
          : [];

    if (effectiveTeamSeasonIds.length === 0) {
      redirectToPlayersWithError(formData, "Select at least one season team.");
    }

    const parsed = playerWithRosterSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      dominantHand: formData.get("dominantHand"),
      photoUrl: formStringOrUndefined(formData.get("photoUrl")),
      graduatingClass: formStringOrUndefined(formData.get("graduatingClass")),
      birthdate: formStringOrUndefined(formData.get("birthdate")),
      teamSeasonId: effectiveTeamSeasonIds[0],
      jerseyNumber: formData.get("jerseyNumber"),
      position: formData.get("position"),
      height: formData.get("height"),
      isActive: booleanFromFormData(formData.get("isActive")),
      isStarter: booleanFromFormData(formData.get("isStarter")),
      closeoutType: formStringOrUndefined(formData.get("closeoutType")),
      speedType: formStringOrUndefined(formData.get("speedType")),
      defenderTypes: stringListFromFormData(formData, "defenderTypes"),
      drivePreference: formStringOrUndefined(formData.get("drivePreference")),
      trapPreference: formStringOrUndefined(formData.get("trapPreference")),
      playerNotes: formStringOrUndefined(formData.get("playerNotes")),
      tendencies: formStringOrUndefined(formData.get("tendencies")),
    });

    const playerId = await createPlayerAndRosterMembership(parsed);
    if (playerId) {
      for (const teamSeasonId of effectiveTeamSeasonIds.slice(1)) {
        await createRosterMembership({
          playerId,
          teamSeasonId,
          jerseyNumber: parsed.jerseyNumber,
          position: parsed.position,
          height: parsed.height,
          isActive: parsed.isActive,
          isStarter: parsed.isStarter,
          closeoutType: parsed.closeoutType,
          speedType: parsed.speedType,
          defenderTypes: parsed.defenderTypes,
          drivePreference: parsed.drivePreference,
          trapPreference: parsed.trapPreference,
          playerNotes: parsed.playerNotes,
          tendencies: parsed.tendencies,
        });
      }

      const uploadedPhotoUrl = await uploadPlayerPhotoFile(playerId, uploadedPhoto);
      if (uploadedPhotoUrl) {
        await updatePlayerPhotoUrl({ playerId, photoUrl: uploadedPhotoUrl });
      }
    }
    revalidatePath("/admin");
    revalidatePath("/admin/players");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save player.";
    redirectToPlayersWithError(formData, message);
  }
}

export async function createRosterMembershipAction(formData: FormData) {
  await requireAdminAccess();
  try {
    const selectedTeamSeasonIds = stringListFromFormData(formData, "teamSeasonIds");
    const fallbackTeamSeasonId = formStringOrUndefined(formData.get("teamSeasonId"));
    const effectiveTeamSeasonIds =
      selectedTeamSeasonIds.length > 0
        ? selectedTeamSeasonIds
        : fallbackTeamSeasonId
          ? [fallbackTeamSeasonId]
          : [];

    if (effectiveTeamSeasonIds.length === 0) {
      redirectToPlayersWithError(formData, "Select at least one season team.");
    }

    const parsed = rosterMembershipSchema.parse({
      playerId: formData.get("playerId"),
      teamSeasonId: effectiveTeamSeasonIds[0],
      jerseyNumber: formData.get("jerseyNumber"),
      position: formData.get("position"),
      height: formData.get("height"),
      isActive: booleanFromFormData(formData.get("isActive")),
      isStarter: booleanFromFormData(formData.get("isStarter")),
      closeoutType: formStringOrUndefined(formData.get("closeoutType")),
      speedType: formStringOrUndefined(formData.get("speedType")),
      defenderTypes: stringListFromFormData(formData, "defenderTypes"),
      drivePreference: formStringOrUndefined(formData.get("drivePreference")),
      trapPreference: formStringOrUndefined(formData.get("trapPreference")),
      playerNotes: formStringOrUndefined(formData.get("playerNotes")),
      tendencies: formStringOrUndefined(formData.get("tendencies")),
    });

    const existingMemberships = await listRosterMemberships();
    const existingTeamSeasonIds = new Set(
      existingMemberships
        .filter((membership) => membership.playerId === parsed.playerId)
        .map((membership) => membership.teamSeasonId),
    );

    for (const teamSeasonId of effectiveTeamSeasonIds) {
      if (existingTeamSeasonIds.has(teamSeasonId)) {
        continue;
      }

      await createRosterMembership({
        ...parsed,
        teamSeasonId,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/players");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save roster entry.";
    redirectToPlayersWithError(formData, message);
  }
}

export async function updatePlayerRosterEntryAction(formData: FormData) {
  await requireAdminAccess();
  const uploadedPhoto = formData.get("photoFile");
  const parsed = updatePlayerRosterSchema.parse({
    rosterMembershipId: formData.get("rosterMembershipId"),
    playerId: formData.get("playerId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dominantHand: formData.get("dominantHand"),
    photoUrl: formStringOrUndefined(formData.get("photoUrl")),
    graduatingClass: formStringOrUndefined(formData.get("graduatingClass")),
    birthdate: formStringOrUndefined(formData.get("birthdate")),
    teamSeasonId: formData.get("teamSeasonId"),
    jerseyNumber: formData.get("jerseyNumber"),
    position: formData.get("position"),
    height: formData.get("height"),
    isActive: booleanFromFormData(formData.get("isActive")),
    isStarter: booleanFromFormData(formData.get("isStarter")),
    closeoutType: formStringOrUndefined(formData.get("closeoutType")),
    speedType: formStringOrUndefined(formData.get("speedType")),
    defenderTypes: stringListFromFormData(formData, "defenderTypes"),
    drivePreference: formStringOrUndefined(formData.get("drivePreference")),
    trapPreference: formStringOrUndefined(formData.get("trapPreference")),
    playerNotes: formStringOrUndefined(formData.get("playerNotes")),
    tendencies: formStringOrUndefined(formData.get("tendencies")),
  });

  const uploadedPhotoUrl = await uploadPlayerPhotoFile(parsed.playerId, uploadedPhoto);
  await updatePlayerAndRosterMembership({
    ...parsed,
    photoUrl: uploadedPhotoUrl ?? parsed.photoUrl,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath("/stats/players");
  revalidatePath(`/stats/players/${parsed.playerId}`);
  revalidatePath("/admin/games");
  redirectToPlayersEditor(formData, parsed.teamSeasonId, parsed.rosterMembershipId);
}

export async function deleteRosterMembershipAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deleteRosterMembershipSchema.parse({
    rosterMembershipId: formData.get("rosterMembershipId"),
  });

  await deleteRosterMembership(parsed.rosterMembershipId);
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath("/admin/games");
  redirectToPlayersEditor(formData);
}

export async function bulkUpdatePlayerRosterAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = bulkPlayerRosterSchema.parse({
    rosterMembershipIds: stringListFromFormData(formData, "rosterMembershipIds"),
    graduatingClass: formStringOrUndefined(formData.get("bulkGraduatingClass")),
    teamSeasonIds: formData.has("bulkTeamSeasonIds")
      ? stringListFromFormData(formData, "bulkTeamSeasonIds")
      : undefined,
    isActive: optionalBooleanFromFormData(formData.get("bulkIsActive")),
    isStarter: optionalBooleanFromFormData(formData.get("bulkIsStarter")),
    position: formStringOrUndefined(formData.get("bulkPosition")),
  });

  await bulkUpdatePlayerRosterEntries(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath("/stats/players");
  revalidatePath("/admin/games");
  const returnTeamSeasonId = formStringOrUndefined(formData.get("returnTeamSeasonId"));
  redirect(`/admin/players${returnTeamSeasonId ? `?teamSeason=${returnTeamSeasonId}&saved=bulk` : "?saved=bulk"}`);
}

export async function createPlayerEvaluationAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = playerEvaluationSchema.parse({
    playerId: formData.get("playerId"),
    coachName: formData.get("coachName"),
    evaluationDate: formData.get("evaluationDate"),
    evaluation: formData.get("evaluation"),
    playerViewEvaluation: formData.get("playerViewEvaluation"),
  });

  const playerViewEvaluation =
    parsed.playerViewEvaluation.trim().length > 0
      ? parsed.playerViewEvaluation.trim()
      : await generatePlayerViewEvaluation(parsed.evaluation);
  await createPlayerEvaluation({
    ...parsed,
    playerViewEvaluation,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath(`/stats/players/${parsed.playerId}`);
  redirectToPlayersEditor(formData);
}

export async function createPlayerDevelopmentPlanAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = playerDevelopmentPlanSchema.parse({
    playerId: formData.get("playerId"),
    horizon: formData.get("horizon"),
    coachName: formData.get("coachName"),
    planDate: formData.get("planDate"),
    targetDate: formData.get("targetDate"),
    goalType: formData.get("goalType"),
    planBody: formData.get("planBody"),
  });

  await createPlayerDevelopmentPlan(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  redirectToPlayersEditor(formData);
}

export async function deletePlayerEvaluationAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deletePlayerEvaluationSchema.parse({
    evaluationId: formData.get("evaluationId"),
  });

  await deletePlayerEvaluation(parsed.evaluationId);
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  redirectToPlayersEditor(formData);
}

export async function updatePlayerEvaluationAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updatePlayerEvaluationSchema.parse({
    evaluationId: formData.get("evaluationId"),
    playerId: formData.get("playerId"),
    coachName: formData.get("coachName"),
    evaluationDate: formData.get("evaluationDate"),
    evaluation: formData.get("evaluation"),
    playerViewEvaluation: formData.get("playerViewEvaluation"),
  });

  const playerViewEvaluation =
    parsed.playerViewEvaluation.trim().length > 0
      ? parsed.playerViewEvaluation.trim()
      : await generatePlayerViewEvaluation(parsed.evaluation);
  await updatePlayerEvaluation({
    id: parsed.evaluationId,
    playerId: parsed.playerId,
    coachName: parsed.coachName,
    evaluationDate: parsed.evaluationDate,
    evaluation: parsed.evaluation,
    playerViewEvaluation,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath(`/stats/players/${parsed.playerId}`);
  redirectToPlayersEditor(formData);
}

export async function deletePlayerDevelopmentPlanAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = deletePlayerDevelopmentPlanSchema.parse({
    planId: formData.get("planId"),
  });

  await deletePlayerDevelopmentPlan(parsed.planId);
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  redirectToPlayersEditor(formData);
}

export async function updatePlayerDevelopmentPlanAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = updatePlayerDevelopmentPlanSchema.parse({
    planId: formData.get("planId"),
    playerId: formData.get("playerId"),
    horizon: formData.get("horizon"),
    coachName: formData.get("coachName"),
    planDate: formData.get("planDate"),
    targetDate: formData.get("targetDate"),
    goalType: formData.get("goalType"),
    planBody: formData.get("planBody"),
  });

  await updatePlayerDevelopmentPlan({
    id: parsed.planId,
    playerId: parsed.playerId,
    horizon: parsed.horizon,
    coachName: parsed.coachName,
    planDate: parsed.planDate,
    targetDate: parsed.targetDate || undefined,
    goalType: parsed.goalType,
    planBody: parsed.planBody,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath(`/stats/players/${parsed.playerId}`);
  redirectToPlayersEditor(formData);
}
