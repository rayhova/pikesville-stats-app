"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessSession } from "@/lib/access-control";
import {
  createPlayerDevelopmentPlan,
  createPlayerEvaluation,
  getAdminProfileByAuthUser,
  listCoachProfiles,
  listPlayerRosterRows,
  replacePlayerParentContacts,
  updatePlayerDevelopmentPlan,
  updatePlayerEvaluation,
  updatePlayerSelfServiceProfile,
} from "@/lib/admin-repository";
import { createAndDispatchProgramAlert } from "@/lib/program-alerts";
import { generatePlayerViewEvaluation } from "@/lib/player-evaluation-summary";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const playerSelfServiceSchema = z.object({
  playerId: z.string().min(1),
  rosterMembershipId: z.string().min(1),
  height: z.string().min(1),
  birthdate: z.string().optional().default(""),
  parentContacts: z.array(
    z.object({
      fullName: z.string().trim().min(1),
      email: z.string().trim().optional().default(""),
      phone: z.string().trim().optional().default(""),
    }),
  ).default([]),
});

export interface PlayerSelfServiceState {
  error?: string;
  success?: boolean;
}

export interface PlayerCoachActionState {
  error?: string;
  success?: boolean;
}

const initialCoachActionState: PlayerCoachActionState = {};
const DEVELOPMENT_PLAN_HORIZONS = ["short_term", "long_term"] as const;
const DEVELOPMENT_GOAL_TYPES = [
  "skill_focus",
  "physical_development",
  "behavioral_goals",
  "tactical_or_team_goals",
] as const;

const playerEvaluationSchema = z.object({
  evaluationId: z.string().optional().default(""),
  playerId: z.string().min(1),
  coachName: z.string().optional().default(""),
  evaluationDate: z.string().min(1),
  evaluation: z.string().trim().min(8),
  playerViewEvaluation: z.string().optional().default(""),
});

const playerDevelopmentPlanSchema = z.object({
  planId: z.string().optional().default(""),
  playerId: z.string().min(1),
  coachName: z.string().optional().default(""),
  horizon: z.enum(DEVELOPMENT_PLAN_HORIZONS),
  planDate: z.string().min(1),
  targetDate: z.string().optional().default(""),
  goalType: z.enum(DEVELOPMENT_GOAL_TYPES),
  planBody: z.string().trim().min(8),
});

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

export async function updatePlayerSelfServiceAction(
  _previousState: PlayerSelfServiceState,
  formData: FormData,
): Promise<PlayerSelfServiceState> {
  const session = await getAccessSession();

  if (session.role !== "player" || !session.playerRosterMembershipId) {
    return { error: "Only the linked player can update this profile." };
  }

  const parentNames = formData
    .getAll("parentFullName")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());
  const parentEmails = formData
    .getAll("parentEmail")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());
  const parentPhones = formData
    .getAll("parentPhone")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());

  const parsed = playerSelfServiceSchema.safeParse({
    playerId: formData.get("playerId"),
    rosterMembershipId: formData.get("rosterMembershipId"),
    height: formData.get("height"),
    birthdate: formData.get("birthdate"),
    parentContacts: parentNames
      .map((fullName, index) => ({
        fullName,
        email: parentEmails[index] ?? "",
        phone: parentPhones[index] ?? "",
      }))
      .filter((contact) => contact.fullName.length > 0),
  });

  if (!parsed.success) {
    return { error: "Please complete the required profile fields." };
  }

  if (parsed.data.rosterMembershipId !== session.playerRosterMembershipId) {
    return { error: "You can only edit your own current roster profile." };
  }

  try {
    const uploadedPhotoUrl = await uploadPlayerPhotoFile(parsed.data.playerId, formData.get("photoFile"));
    await updatePlayerSelfServiceProfile({
      playerId: parsed.data.playerId,
      rosterMembershipId: parsed.data.rosterMembershipId,
      height: parsed.data.height,
      birthdate: parsed.data.birthdate,
      photoUrl: uploadedPhotoUrl,
    });

    await replacePlayerParentContacts({
      playerId: parsed.data.playerId,
      contacts: parsed.data.parentContacts,
    });

    revalidatePath("/stats/players");
    revalidatePath(`/stats/players/${parsed.data.playerId}`);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update profile.",
    };
  }
}

async function getLoggedInCoachLabel() {
  const session = await getAccessSession();
  if (session.role !== "coach" && session.role !== "admin") {
    throw new Error("Only coaches and admin can add player notes.");
  }

  if (session.role === "coach") {
    if (!session.coachProfileId) {
      throw new Error("Coach profile is missing from this session.");
    }

    const coaches = await listCoachProfiles();
    return coaches.find((coach) => coach.id === session.coachProfileId)?.displayName ?? "Coach";
  }

  if (session.authUserId) {
    const adminProfile = await getAdminProfileByAuthUser({
      authUserId: session.authUserId,
      authEmail: session.authEmail,
    });
    return adminProfile?.displayName ?? session.authEmail ?? "Admin";
  }

  return session.authEmail ?? "Admin";
}

async function buildPlayerAudience(playerId: string) {
  const playerRows = await listPlayerRosterRows();
  const targetRosterMembershipIds = playerRows
    .filter((row) => row.playerId === playerId && row.teamType === "ours")
    .map((row) => row.id);

  return {
    targetRoles: ["player"] as const,
    targetRosterMembershipIds,
  };
}

export async function createPlayerEvaluationFromPlayerPageAction(
  _previousState: PlayerCoachActionState = initialCoachActionState,
  formData: FormData,
): Promise<PlayerCoachActionState> {
  try {
    const parsed = playerEvaluationSchema.parse({
      playerId: formData.get("playerId"),
      coachName: formData.get("coachName") ?? "",
      evaluationDate: formData.get("evaluationDate"),
      evaluation: formData.get("evaluation"),
      playerViewEvaluation: formData.get("playerViewEvaluation"),
    });
    const coachName = await getLoggedInCoachLabel();
    const playerViewEvaluation =
      parsed.playerViewEvaluation.trim().length > 0
        ? parsed.playerViewEvaluation.trim()
        : await generatePlayerViewEvaluation(parsed.evaluation);

    await createPlayerEvaluation({
      ...parsed,
      coachName,
      playerViewEvaluation,
    });

    const audience = await buildPlayerAudience(parsed.playerId);
    await createAndDispatchProgramAlert({
      title: "New Player Feedback",
      body: `${coachName} added new player-facing feedback for you.`,
      href: `/stats/players/${parsed.playerId}?tab=evaluations`,
      category: "player-evaluation",
      sourceRole: "coach",
      sourceLabel: coachName,
      targetRoles: [...audience.targetRoles],
      targetRosterMembershipIds: audience.targetRosterMembershipIds,
      tag: `player-evaluation-${parsed.playerId}`,
    });

    revalidatePath("/stats/players");
    revalidatePath(`/stats/players/${parsed.playerId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save evaluation." };
  }
}

export async function updatePlayerEvaluationFromPlayerPageAction(
  _previousState: PlayerCoachActionState = initialCoachActionState,
  formData: FormData,
): Promise<PlayerCoachActionState> {
  try {
    const parsed = playerEvaluationSchema.parse({
      evaluationId: formData.get("evaluationId") ?? "",
      playerId: formData.get("playerId"),
      coachName: formData.get("coachName") ?? "",
      evaluationDate: formData.get("evaluationDate"),
      evaluation: formData.get("evaluation"),
      playerViewEvaluation: formData.get("playerViewEvaluation"),
    });
    if (!parsed.evaluationId) {
      return { error: "Evaluation ID is missing." };
    }
    const playerViewEvaluation =
      parsed.playerViewEvaluation.trim().length > 0
        ? parsed.playerViewEvaluation.trim()
        : await generatePlayerViewEvaluation(parsed.evaluation);

    await updatePlayerEvaluation({
      id: parsed.evaluationId,
      playerId: parsed.playerId,
      coachName: parsed.coachName || (await getLoggedInCoachLabel()),
      evaluationDate: parsed.evaluationDate,
      evaluation: parsed.evaluation,
      playerViewEvaluation,
    });

    revalidatePath("/stats/players");
    revalidatePath(`/stats/players/${parsed.playerId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update evaluation." };
  }
}

export async function createPlayerDevelopmentPlanFromPlayerPageAction(
  _previousState: PlayerCoachActionState = initialCoachActionState,
  formData: FormData,
): Promise<PlayerCoachActionState> {
  try {
    const parsed = playerDevelopmentPlanSchema.parse({
      playerId: formData.get("playerId"),
      coachName: formData.get("coachName") ?? "",
      horizon: formData.get("horizon"),
      planDate: formData.get("planDate"),
      targetDate: formData.get("targetDate") ?? "",
      goalType: formData.get("goalType"),
      planBody: formData.get("planBody"),
    });
    const coachName = await getLoggedInCoachLabel();

    await createPlayerDevelopmentPlan({
      ...parsed,
      coachName,
      targetDate: parsed.targetDate || undefined,
    });

    const audience = await buildPlayerAudience(parsed.playerId);
    await createAndDispatchProgramAlert({
      title: "New Development Plan",
      body: `${coachName} added a new development update for you.`,
      href: `/stats/players/${parsed.playerId}?tab=development`,
      category: "player-development-plan",
      sourceRole: "coach",
      sourceLabel: coachName,
      targetRoles: [...audience.targetRoles],
      targetRosterMembershipIds: audience.targetRosterMembershipIds,
      tag: `player-development-plan-${parsed.playerId}`,
    });

    revalidatePath("/stats/players");
    revalidatePath(`/stats/players/${parsed.playerId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save development plan." };
  }
}

export async function updatePlayerDevelopmentPlanFromPlayerPageAction(
  _previousState: PlayerCoachActionState = initialCoachActionState,
  formData: FormData,
): Promise<PlayerCoachActionState> {
  try {
    const parsed = playerDevelopmentPlanSchema.parse({
      planId: formData.get("planId") ?? "",
      playerId: formData.get("playerId"),
      coachName: formData.get("coachName") ?? "",
      horizon: formData.get("horizon"),
      planDate: formData.get("planDate"),
      targetDate: formData.get("targetDate") ?? "",
      goalType: formData.get("goalType"),
      planBody: formData.get("planBody"),
    });
    if (!parsed.planId) {
      return { error: "Development plan ID is missing." };
    }
    await updatePlayerDevelopmentPlan({
      id: parsed.planId,
      playerId: parsed.playerId,
      horizon: parsed.horizon,
      coachName: parsed.coachName || (await getLoggedInCoachLabel()),
      planDate: parsed.planDate,
      targetDate: parsed.targetDate || undefined,
      goalType: parsed.goalType,
      planBody: parsed.planBody,
    });

    revalidatePath("/stats/players");
    revalidatePath(`/stats/players/${parsed.playerId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update development plan." };
  }
}
