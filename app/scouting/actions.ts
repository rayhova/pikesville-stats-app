"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import { createAndDispatchProgramAlert, createCoachScoutingSuggestion } from "@/lib/program-alerts";

const coachScoutingSuggestionSchema = z.object({
  gameId: z.string().min(1),
  note: z.string().trim().min(2),
});

export async function submitCoachScoutingSuggestionAction(formData: FormData) {
  const session = await requireAccessRole(["coach"]);
  const parsed = coachScoutingSuggestionSchema.parse({
    gameId: formData.get("gameId"),
    note: formData.get("note"),
  });

  if (!session.coachProfileId) {
    throw new Error("Coach account is missing a linked coach profile.");
  }

  const viewer = await getAccessSession();
  const suggestion = await createCoachScoutingSuggestion({
    gameId: parsed.gameId,
    coachProfileId: session.coachProfileId,
    note: parsed.note,
  });

  await createAndDispatchProgramAlert({
    title: "New Scouting Suggestion",
    body: `${suggestion?.coachDisplayName ?? "Coach"} added a scouting note.`,
    href: `/admin/games/${parsed.gameId}/prep/scouting`,
    category: "coach-scouting-suggestion",
    sourceRole: viewer.role ?? "coach",
    sourceLabel: suggestion?.coachDisplayName ?? viewer.authEmail ?? "Coach",
    targetRoles: ["admin"],
    tag: `coach-scouting-suggestion-${parsed.gameId}`,
  });

  revalidatePath(`/scouting/${parsed.gameId}`);
  revalidatePath(`/admin/games/${parsed.gameId}/prep/scouting`);
  revalidatePath("/");
}
