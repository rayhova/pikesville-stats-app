"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccessRole } from "@/lib/access-control";
import {
  createCoachingObservation,
  deleteCoachingObservation,
} from "@/lib/admin-repository";

const createObservationSchema = z.object({
  gameId: z.string().min(1),
  teamSide: z.enum(["home", "away"]),
  observationScope: z.enum(["team", "player", "offense_play", "defense_play"]),
  rosterMembershipId: z.string().min(1).optional(),
  playLibraryId: z.string().min(1).optional(),
  quarter: z.coerce.number().int().min(1).max(10),
  secondsRemaining: z.coerce.number().int().min(0).max(600),
  tag: z.string().min(2).max(80),
  scoreDelta: z.coerce.number().int().min(-1).max(2).optional(),
  notes: z.string().max(400).optional(),
});

const deleteObservationSchema = z.object({
  gameId: z.string().min(1),
  observationId: z.string().min(1),
});

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function requireObservationAccess() {
  await requireAccessRole(["admin", "coach"]);
}

function revalidateObservationSurfaces(gameId: string) {
  revalidatePath(`/observations/${gameId}`);
  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/scouting/${gameId}`);
}

export async function createObservationAction(formData: FormData) {
  await requireObservationAccess();

  const parsed = createObservationSchema.parse({
    gameId: formData.get("gameId"),
    teamSide: formData.get("teamSide"),
    observationScope: formData.get("observationScope"),
    rosterMembershipId: optionalString(formData.get("rosterMembershipId")),
    playLibraryId: optionalString(formData.get("playLibraryId")),
    quarter: formData.get("quarter"),
    secondsRemaining: formData.get("secondsRemaining"),
    tag: formData.get("tag"),
    scoreDelta: formData.get("scoreDelta"),
    notes: optionalString(formData.get("notes")),
  });

  await createCoachingObservation(parsed);
  revalidateObservationSurfaces(parsed.gameId);
}

export async function deleteObservationAction(formData: FormData) {
  await requireObservationAccess();

  const parsed = deleteObservationSchema.parse({
    gameId: formData.get("gameId"),
    observationId: formData.get("observationId"),
  });

  await deleteCoachingObservation(parsed);
  revalidateObservationSurfaces(parsed.gameId);
}
