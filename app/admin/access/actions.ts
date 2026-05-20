"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearAppUserMembershipAuthLink,
  createAppUserMembership,
  deleteAppUserMembership,
  generateAppUserInviteLink,
} from "@/lib/auth-access";
import { getConfiguredAppUrl } from "@/lib/env";

const createAccessSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["admin", "coach", "manager", "player"]),
  playerRosterMembershipId: z.string().optional().default(""),
  coachProfileId: z.string().optional().default(""),
  managerProfileId: z.string().optional().default(""),
}).superRefine((value, ctx) => {
  if (value.role === "admin" && !value.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Admin access still requires an email address.",
    });
  }
});

function getBaseUrlFromHeaders(headerStore: Headers) {
  const origin = headerStore.get("origin");
  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const configuredUrl = getConfiguredAppUrl();

  if (!host) {
    return configuredUrl ?? "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

function revalidateAccessPages() {
  revalidatePath("/admin/access");
  revalidatePath("/");
  revalidatePath("/login");
}

export async function createAccessMembershipAction(formData: FormData) {
  const parsed = createAccessSchema.parse({
    email: formData.get("email") ?? "",
    role: formData.get("role"),
    playerRosterMembershipId: formData.get("playerRosterMembershipId") ?? "",
    coachProfileId: formData.get("coachProfileId") ?? "",
    managerProfileId: formData.get("managerProfileId") ?? "",
  });

  const membership = await createAppUserMembership({
    email: parsed.email || undefined,
    role: parsed.role,
    playerRosterMembershipId: parsed.playerRosterMembershipId || undefined,
    coachProfileId: parsed.coachProfileId || undefined,
    managerProfileId: parsed.managerProfileId || undefined,
  });

  const headerStore = await headers();
  const baseUrl = getBaseUrlFromHeaders(headerStore);
  await generateAppUserInviteLink(membership.id, baseUrl);
  revalidateAccessPages();
  redirect("/admin/access");
}

export async function generateAccessInviteLinkAction(formData: FormData) {
  const membershipId = z.string().uuid().parse(formData.get("membershipId"));
  const headerStore = await headers();
  const baseUrl = getBaseUrlFromHeaders(headerStore);
  await generateAppUserInviteLink(membershipId, baseUrl);
  revalidateAccessPages();
  redirect("/admin/access");
}

export async function clearAccessAuthLinkAction(formData: FormData) {
  const membershipId = z.string().uuid().parse(formData.get("membershipId"));
  await clearAppUserMembershipAuthLink(membershipId);
  revalidateAccessPages();
  redirect("/admin/access");
}

export async function deleteAccessMembershipAction(formData: FormData) {
  const membershipId = z.string().uuid().parse(formData.get("membershipId"));
  await deleteAppUserMembership(membershipId);
  revalidateAccessPages();
  redirect("/admin/access");
}
