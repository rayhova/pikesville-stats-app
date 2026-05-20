"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  accessCookieNames,
} from "@/lib/access-control";
import {
  APP_ROLE_OPTIONS,
  getDefaultAccessDestination,
  type AppRole,
} from "@/lib/access-config";

const accessSessionSchema = z.object({
  role: z.enum(APP_ROLE_OPTIONS.map((option) => option.value) as [AppRole, ...AppRole[]]),
  playerRosterMembershipId: z.string().optional().default(""),
  coachProfileId: z.string().optional().default(""),
  managerProfileId: z.string().optional().default(""),
});

export async function setAccessSessionAction(formData: FormData) {
  const parsed = accessSessionSchema.parse({
    role: formData.get("role"),
    playerRosterMembershipId: formData.get("playerRosterMembershipId") ?? "",
    coachProfileId: formData.get("coachProfileId") ?? "",
    managerProfileId: formData.get("managerProfileId") ?? "",
  });

  const cookieStore = await cookies();
  cookieStore.set(accessCookieNames.role, parsed.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  if (parsed.playerRosterMembershipId) {
    cookieStore.set(accessCookieNames.playerRosterMembershipId, parsed.playerRosterMembershipId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    cookieStore.delete(accessCookieNames.playerRosterMembershipId);
  }

  if (parsed.coachProfileId) {
    cookieStore.set(accessCookieNames.coachProfileId, parsed.coachProfileId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    cookieStore.delete(accessCookieNames.coachProfileId);
  }

  if (parsed.managerProfileId) {
    cookieStore.set(accessCookieNames.managerProfileId, parsed.managerProfileId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    cookieStore.delete(accessCookieNames.managerProfileId);
  }

  redirect(getDefaultAccessDestination(parsed.role));
}

export async function clearAccessSessionAction() {
  const cookieStore = await cookies();
  cookieStore.delete(accessCookieNames.role);
  cookieStore.delete(accessCookieNames.playerRosterMembershipId);
  cookieStore.delete(accessCookieNames.coachProfileId);
  cookieStore.delete(accessCookieNames.managerProfileId);
  redirect("/");
}
