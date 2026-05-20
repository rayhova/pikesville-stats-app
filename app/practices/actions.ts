"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import { updatePracticePlanItemCoachingLog } from "@/lib/admin-repository";
import { createAndDispatchProgramAlert, createCoachPracticeSuggestion } from "@/lib/program-alerts";

const practiceItemLogSchema = z.object({
  practicePlanId: z.string().min(1),
  itemId: z.string().min(1),
  notes: z.string().optional().default(""),
  results: z.string().optional().default(""),
  rating: z.enum(["bad", "ok", "good", "amazing"]),
  isFinished: z.boolean(),
});

const practiceSuggestionSchema = z.object({
  practicePlanId: z.string().min(1),
  note: z.string().trim().min(2),
});

function booleanFromFormData(value: FormDataEntryValue | null) {
  return value === "true" || value === "on";
}

export async function savePracticeItemLogAction(formData: FormData) {
  await requireAccessRole(["admin", "coach"]);
  const parsed = practiceItemLogSchema.parse({
    practicePlanId: formData.get("practicePlanId"),
    itemId: formData.get("itemId"),
    notes: formData.get("notes"),
    results: formData.get("results"),
    rating: formData.get("rating"),
    isFinished: booleanFromFormData(formData.get("isFinished")),
  });

  await updatePracticePlanItemCoachingLog(parsed);
  revalidatePath("/practices");
  revalidatePath(`/practices/${parsed.practicePlanId}`);
  revalidatePath("/admin/practices");
  revalidatePath(`/admin/practices/${parsed.practicePlanId}`);
}

export async function submitCoachPracticeSuggestionAction(formData: FormData) {
  const session = await requireAccessRole(["coach"]);
  const parsed = practiceSuggestionSchema.parse({
    practicePlanId: formData.get("practicePlanId"),
    note: formData.get("note"),
  });

  if (!session.coachProfileId) {
    throw new Error("Coach account is missing a linked coach profile.");
  }

  const viewer = await getAccessSession();
  const suggestion = await createCoachPracticeSuggestion({
    practicePlanId: parsed.practicePlanId,
    coachProfileId: session.coachProfileId,
    note: parsed.note,
  });

  await createAndDispatchProgramAlert({
    title: "New Practice Suggestion",
    body: `${suggestion?.coachDisplayName ?? "Coach"} suggested a practice item.`,
    href: `/admin/practices/${parsed.practicePlanId}`,
    category: "coach-practice-suggestion",
    sourceRole: viewer.role ?? "coach",
    sourceLabel: suggestion?.coachDisplayName ?? viewer.authEmail ?? "Coach",
    targetRoles: ["admin"],
    tag: `coach-practice-suggestion-${parsed.practicePlanId}`,
  });

  revalidatePath(`/practices/${parsed.practicePlanId}`);
  revalidatePath(`/admin/practices/${parsed.practicePlanId}`);
  revalidatePath("/");
}
