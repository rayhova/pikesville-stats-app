"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccessRole } from "@/lib/access-control";
import {
  assertActiveScoringLock,
  createQuickGameEvent,
  getAdminProfileByAuthUser,
  getLiveScorerSnapshot,
  heartbeatScoringLock,
  listCoachProfiles,
  releaseScoringLock,
  saveGameLineupSelection,
  softDeleteGameEvent,
  takeScoringLock,
  updateGameEvent,
  updateLiveGameState,
} from "@/lib/admin-repository";

const scorerStateSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  quarter: z.coerce.number().int().min(1).max(10),
  secondsRemaining: z.coerce.number().int().min(0).max(900),
  teamOnOffense: z.enum(["home", "away"]),
  homeOffensePlayId: z.string().optional().default(""),
  homeDefensePlayId: z.string().optional().default(""),
  awayOffensePlayId: z.string().optional().default(""),
  awayDefensePlayId: z.string().optional().default(""),
  status: z.enum(["scheduled", "live", "final"]),
});

const lineupSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  teamSide: z.enum(["home", "away"]),
  rosterMembershipIds: z.array(z.string()).max(5),
});

const quickEventSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  teamSide: z.enum(["home", "away"]),
  eventType: z.enum([
    "shot",
    "lineup_change",
    "rebound_off",
    "rebound_def",
    "assist",
    "steal",
    "block",
    "turnover",
    "personal_foul",
    "timeout_full",
    "timeout_30",
  ]),
  rosterMembershipId: z.string().optional().default(""),
  relatedRosterMembershipId: z.string().optional().default(""),
  quarter: z.coerce.number().int().min(1).max(10),
  secondsRemaining: z.coerce.number().int().min(0).max(900),
  shotX: z.coerce.number().min(0).max(100).optional(),
  shotY: z.coerce.number().min(0).max(100).optional(),
  shotResult: z.enum(["make", "miss"]).optional(),
  shotValue: z.coerce.number().int().optional(),
  shotAction: z
    .enum(["1_make", "1_miss", "2_make", "2_miss", "3_make", "3_miss"])
    .optional(),
  notes: z.string().optional().default(""),
});

const editEventSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  eventId: z.string().min(1),
  teamSide: z.enum(["home", "away"]),
  eventType: z.enum([
    "shot",
    "lineup_change",
    "rebound_off",
    "rebound_def",
    "assist",
    "steal",
    "block",
    "turnover",
    "personal_foul",
    "timeout_full",
    "timeout_30",
  ]),
  rosterMembershipId: z.string().optional().default(""),
  relatedRosterMembershipId: z.string().optional().default(""),
  quarter: z.coerce.number().int().min(1).max(10),
  secondsRemaining: z.coerce.number().int().min(0).max(900),
  shotResult: z.enum(["make", "miss"]).optional(),
  shotValue: z.coerce.number().int().optional(),
  offensePlayId: z.string().optional().default(""),
  defensePlayId: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const deleteEventSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  eventId: z.string().min(1),
});

const playSelectionSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  teamSide: z.enum(["home", "away"]),
  playSide: z.enum(["offense", "defense"]),
  playId: z.string().optional().default(""),
});

const substitutionsPanelSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  quarter: z.coerce.number().int().min(1).max(10),
  secondsRemaining: z.coerce.number().int().min(0).max(900),
  teamOnOffense: z.enum(["home", "away"]),
  status: z.enum(["scheduled", "live", "final"]),
  homeRosterMembershipIds: z.array(z.string()).max(5),
  awayRosterMembershipIds: z.array(z.string()).max(5),
});

const scoringControlSchema = z.object({
  gameId: z.string().min(1),
  deviceId: z.string().min(1),
  force: z.boolean().optional().default(false),
});

function parseSecondsInput(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return 0;
  }

  if (rawValue.includes(":")) {
    const [minutesPart, secondsPart] = rawValue.split(":");
    const minutes = Number.parseInt(minutesPart ?? "0", 10) || 0;
    const seconds = Number.parseInt(secondsPart ?? "0", 10) || 0;
    return Math.max(0, minutes * 60 + Math.min(seconds, 59));
  }

  return Number.parseInt(rawValue, 10) || 0;
}

async function requireScorerAccess() {
  return requireAccessRole(["admin", "coach"]);
}

async function resolveScorerLabel(session: Awaited<ReturnType<typeof requireScorerAccess>>) {
  if (session.role === "coach" && session.coachProfileId) {
    const coachRows = await listCoachProfiles();
    return coachRows.find((coach) => coach.id === session.coachProfileId)?.displayName ?? "Coach";
  }

  if (session.role === "admin" && session.authUserId) {
    const adminProfile = await getAdminProfileByAuthUser({
      authUserId: session.authUserId,
      authEmail: session.authEmail,
    });
    return adminProfile?.displayName ?? "Admin";
  }

  return session.authEmail ?? "Scorer";
}

async function requireScoringControl(gameId: string, deviceId: string) {
  await requireScorerAccess();
  await assertActiveScoringLock({ gameId, deviceId });
}

function revalidateLiveGameSurfaces(gameId: string) {
  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/observations/${gameId}`);
  revalidatePath(`/scouting/${gameId}`);
}

function revalidateAdminGameViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/games");
}

export async function saveScorerStateAction(formData: FormData) {
  await requireScorerAccess();
  const parsed = scorerStateSchema.parse({
    gameId: formData.get("gameId"),
    deviceId: formData.get("deviceId"),
    quarter: formData.get("quarter"),
    secondsRemaining: parseSecondsInput(formData.get("secondsRemaining")),
    teamOnOffense: formData.get("teamOnOffense"),
    homeOffensePlayId: formData.get("homeOffensePlayId"),
    homeDefensePlayId: formData.get("homeDefensePlayId"),
    awayOffensePlayId: formData.get("awayOffensePlayId"),
    awayDefensePlayId: formData.get("awayDefensePlayId"),
    status: formData.get("status"),
  });

  await requireScoringControl(parsed.gameId, parsed.deviceId);
  await updateLiveGameState(parsed);
  revalidateLiveGameSurfaces(parsed.gameId);
  revalidateAdminGameViews();
}

export async function saveClockStateAction(input: {
  gameId: string;
  deviceId: string;
  quarter: number;
  secondsRemaining: number;
  status: "scheduled" | "live" | "final";
  teamOnOffense: "home" | "away";
}) {
  await requireScoringControl(input.gameId, input.deviceId);
  const snapshot = await getLiveScorerSnapshot(input.gameId);

  if (!snapshot) {
    return;
  }

  await updateLiveGameState({
    gameId: input.gameId,
    quarter: input.quarter,
    secondsRemaining: input.secondsRemaining,
    status: input.status,
    teamOnOffense: input.teamOnOffense,
    homeOffensePlayId: snapshot.homeOffensePlayId ?? undefined,
    homeDefensePlayId: snapshot.homeDefensePlayId ?? undefined,
    awayOffensePlayId: snapshot.awayOffensePlayId ?? undefined,
    awayDefensePlayId: snapshot.awayDefensePlayId ?? undefined,
  });

  revalidateLiveGameSurfaces(input.gameId);
}

export async function saveLineupAction(formData: FormData) {
  await requireScorerAccess();
  const parsed = lineupSchema.parse({
    gameId: formData.get("gameId"),
    deviceId: formData.get("deviceId"),
    teamSide: formData.get("teamSide"),
    rosterMembershipIds: formData.getAll("rosterMembershipIds"),
  });

  await requireScoringControl(parsed.gameId, parsed.deviceId);
  await saveGameLineupSelection(parsed);
  revalidateLiveGameSurfaces(parsed.gameId);
}

export async function saveSubstitutionsPanelAction(formData: FormData) {
  await requireScorerAccess();
  const parsed = substitutionsPanelSchema.parse({
    gameId: formData.get("gameId"),
    deviceId: formData.get("deviceId"),
    quarter: formData.get("quarter"),
    secondsRemaining: parseSecondsInput(formData.get("secondsRemaining")),
    teamOnOffense: formData.get("teamOnOffense"),
    status: formData.get("status"),
    homeRosterMembershipIds: formData.getAll("homeRosterMembershipIds"),
    awayRosterMembershipIds: formData.getAll("awayRosterMembershipIds"),
  });
  await requireScoringControl(parsed.gameId, parsed.deviceId);
  const snapshot = await getLiveScorerSnapshot(parsed.gameId);

  if (!snapshot) {
    return;
  }

  await updateLiveGameState({
    gameId: parsed.gameId,
    quarter: parsed.quarter,
    secondsRemaining: parsed.secondsRemaining,
    teamOnOffense: parsed.teamOnOffense,
    status: parsed.status,
    homeOffensePlayId: snapshot.homeOffensePlayId ?? undefined,
    homeDefensePlayId: snapshot.homeDefensePlayId ?? undefined,
    awayOffensePlayId: snapshot.awayOffensePlayId ?? undefined,
    awayDefensePlayId: snapshot.awayDefensePlayId ?? undefined,
  });

  await saveGameLineupSelection({
    gameId: parsed.gameId,
    teamSide: "home",
    rosterMembershipIds: parsed.homeRosterMembershipIds,
  });

  await saveGameLineupSelection({
    gameId: parsed.gameId,
    teamSide: "away",
    rosterMembershipIds: parsed.awayRosterMembershipIds,
  });

  revalidateLiveGameSurfaces(parsed.gameId);
}

export async function updateTeamPlaySelectionAction(formData: FormData) {
  await requireScorerAccess();
  const parsed = playSelectionSchema.parse({
    gameId: formData.get("gameId"),
    deviceId: formData.get("deviceId"),
    teamSide: formData.get("teamSide"),
    playSide: formData.get("playSide"),
    playId: formData.get("playId") ?? "",
  });
  await requireScoringControl(parsed.gameId, parsed.deviceId);
  const snapshot = await getLiveScorerSnapshot(parsed.gameId);

  if (!snapshot) {
    return;
  }

  await updateLiveGameState({
    gameId: parsed.gameId,
    quarter: snapshot.quarter,
    secondsRemaining: snapshot.secondsRemaining,
    status:
      snapshot.status === "scheduled" || snapshot.status === "final"
        ? snapshot.status
        : "live",
    teamOnOffense: snapshot.teamOnOffense ?? "home",
    homeOffensePlayId:
      parsed.teamSide === "home" && parsed.playSide === "offense"
        ? parsed.playId || undefined
        : snapshot.homeOffensePlayId ?? undefined,
    homeDefensePlayId:
      parsed.teamSide === "home" && parsed.playSide === "defense"
        ? parsed.playId || undefined
        : snapshot.homeDefensePlayId ?? undefined,
    awayOffensePlayId:
      parsed.teamSide === "away" && parsed.playSide === "offense"
        ? parsed.playId || undefined
        : snapshot.awayOffensePlayId ?? undefined,
    awayDefensePlayId:
      parsed.teamSide === "away" && parsed.playSide === "defense"
        ? parsed.playId || undefined
        : snapshot.awayDefensePlayId ?? undefined,
  });

  revalidateLiveGameSurfaces(parsed.gameId);
}

export async function logQuickEventAction(formData: FormData) {
  await requireScorerAccess();
  const parsed = quickEventSchema.parse({
    gameId: formData.get("gameId"),
    deviceId: formData.get("deviceId"),
    teamSide: formData.get("teamSide"),
    eventType: formData.get("eventType"),
    rosterMembershipId: formData.get("rosterMembershipId") ?? "",
    relatedRosterMembershipId: formData.get("relatedRosterMembershipId") ?? "",
    quarter: formData.get("quarter"),
    secondsRemaining: parseSecondsInput(formData.get("secondsRemaining")),
    shotX: formData.get("shotX") || undefined,
    shotY: formData.get("shotY") || undefined,
    shotResult: formData.get("shotResult") || undefined,
    shotValue: formData.get("shotValue") || undefined,
    shotAction: formData.get("shotAction") || undefined,
    notes: formData.get("notes") ?? "",
  });
  await requireScoringControl(parsed.gameId, parsed.deviceId);
  const shotActionResult =
    parsed.shotAction?.endsWith("_make")
      ? "make"
      : parsed.shotAction?.endsWith("_miss")
        ? "miss"
        : undefined;
  const shotActionValue = parsed.shotAction
    ? Number.parseInt(parsed.shotAction.slice(0, 1), 10)
    : undefined;

  await createQuickGameEvent({
    ...parsed,
    rosterMembershipId: parsed.rosterMembershipId || undefined,
    relatedRosterMembershipId: parsed.relatedRosterMembershipId || undefined,
    shotX: parsed.eventType === "shot" ? parsed.shotX : undefined,
    shotY: parsed.eventType === "shot" ? parsed.shotY : undefined,
    shotResult:
      parsed.eventType === "shot"
        ? shotActionResult ?? parsed.shotResult
        : undefined,
    shotValue:
      parsed.eventType === "shot"
        ? ((shotActionValue ?? parsed.shotValue) as 1 | 2 | 3 | undefined)
        : undefined,
  });

  revalidateLiveGameSurfaces(parsed.gameId);
}

export async function editGameEventAction(formData: FormData) {
  await requireScorerAccess();
  const parsed = editEventSchema.parse({
    gameId: formData.get("gameId"),
    deviceId: formData.get("deviceId"),
    eventId: formData.get("eventId"),
    teamSide: formData.get("teamSide"),
    eventType: formData.get("eventType"),
    rosterMembershipId: formData.get("rosterMembershipId"),
    relatedRosterMembershipId: formData.get("relatedRosterMembershipId"),
    quarter: formData.get("quarter"),
    secondsRemaining: parseSecondsInput(formData.get("secondsRemaining")),
    shotResult: formData.get("shotResult"),
    shotValue: formData.get("shotValue"),
    offensePlayId: formData.get("offensePlayId"),
    defensePlayId: formData.get("defensePlayId"),
    notes: formData.get("notes") ?? "",
  });

  await requireScoringControl(parsed.gameId, parsed.deviceId);
  await updateGameEvent({
    ...parsed,
    rosterMembershipId: parsed.rosterMembershipId || undefined,
    relatedRosterMembershipId: parsed.relatedRosterMembershipId || undefined,
    shotValue:
      parsed.eventType === "shot" && parsed.shotValue
        ? (parsed.shotValue as 1 | 2 | 3)
        : undefined,
    offensePlayId: parsed.offensePlayId || undefined,
    defensePlayId: parsed.defensePlayId || undefined,
  });

  revalidateLiveGameSurfaces(parsed.gameId);
}

export async function deleteGameEventAction(formData: FormData) {
  await requireScorerAccess();
  const parsed = deleteEventSchema.parse({
    gameId: formData.get("gameId"),
    deviceId: formData.get("deviceId"),
    eventId: formData.get("eventId"),
  });

  await requireScoringControl(parsed.gameId, parsed.deviceId);
  await softDeleteGameEvent(parsed);
  revalidateLiveGameSurfaces(parsed.gameId);
}

export async function takeScoringControlAction(input: {
  gameId: string;
  deviceId: string;
  force?: boolean;
}) {
  const session = await requireScorerAccess();
  const parsed = scoringControlSchema.parse(input);
  const scorerLabel = await resolveScorerLabel(session);
  const lock = await takeScoringLock({
    gameId: parsed.gameId,
    deviceId: parsed.deviceId,
    force: parsed.force,
    scorerRole: session.role === "coach" ? "coach" : "admin",
    scorerUserId: session.authUserId,
    scorerProfileId: session.role === "coach" ? session.coachProfileId : null,
    scorerLabel,
  });

  revalidateLiveGameSurfaces(parsed.gameId);
  return lock;
}

export async function releaseScoringControlAction(input: {
  gameId: string;
  deviceId: string;
}) {
  const session = await requireScorerAccess();
  const parsed = scoringControlSchema.parse(input);
  const released = await releaseScoringLock({
    gameId: parsed.gameId,
    deviceId: parsed.deviceId,
    force: session.role === "admin",
  });

  revalidateLiveGameSurfaces(parsed.gameId);
  return released;
}

export async function heartbeatScoringControlAction(input: {
  gameId: string;
  deviceId: string;
}) {
  await requireScorerAccess();
  const parsed = scoringControlSchema.parse(input);
  return heartbeatScoringLock(parsed);
}
