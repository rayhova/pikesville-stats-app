"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import { listPlayerRosterRows } from "@/lib/admin-repository";
import { createAndDispatchProgramAlert } from "@/lib/program-alerts";

const customPushAlertSchema = z.object({
  title: z.string().trim().min(2),
  body: z.string().trim().min(2),
  linkUrl: z.string().trim().optional().default(""),
  targetRoles: z.array(z.enum(["admin", "coach", "manager", "player"])).min(1),
  targetTeamSeasonIds: z.array(z.string()).default([]),
  targetRosterMembershipIds: z.array(z.string()).default([]),
  targetCoachProfileIds: z.array(z.string()).default([]),
  targetManagerProfileIds: z.array(z.string()).default([]),
});

function stringListFromFormData(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function sendCustomPushAlertAction(formData: FormData) {
  await requireAccessRole(["admin", "coach"]);
  const session = await getAccessSession();
  const parsed = customPushAlertSchema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
    linkUrl: formData.get("linkUrl"),
    targetRoles: stringListFromFormData(formData, "targetRoles"),
    targetTeamSeasonIds: stringListFromFormData(formData, "targetTeamSeasonIds"),
    targetRosterMembershipIds: stringListFromFormData(formData, "targetRosterMembershipIds"),
    targetCoachProfileIds: stringListFromFormData(formData, "targetCoachProfileIds"),
    targetManagerProfileIds: stringListFromFormData(formData, "targetManagerProfileIds"),
  });
  let targetRosterMembershipIds = parsed.targetRosterMembershipIds;
  if (parsed.targetTeamSeasonIds.length > 0) {
    const selectedTeamSeasonIds = new Set(parsed.targetTeamSeasonIds);
    const playerRows = await listPlayerRosterRows();
    targetRosterMembershipIds = Array.from(
      new Set([
        ...targetRosterMembershipIds,
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

  await createAndDispatchProgramAlert({
    title: parsed.title,
    body: parsed.body,
    href: parsed.linkUrl || "/",
    tag: `custom-alert-${crypto.randomUUID()}`,
    category: "custom-alert",
    sourceRole: session.role ?? "admin",
    sourceLabel: session.authEmail ?? session.role ?? "Program Staff",
    targetRoles: parsed.targetRoles,
    targetRosterMembershipIds,
    targetCoachProfileIds: parsed.targetCoachProfileIds,
    targetManagerProfileIds: parsed.targetManagerProfileIds,
  });

  revalidatePath("/");
}
