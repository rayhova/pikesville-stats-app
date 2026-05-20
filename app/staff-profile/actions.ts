"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAccessSession } from "@/lib/access-control";
import { getAdminProfileByAuthUser, listCoachProfiles, updateCoachProfile, upsertAdminProfile } from "@/lib/admin-repository";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const staffProfileSchema = z.object({
  displayName: z.string().trim().min(2),
  fullName: z.string().trim().min(2),
  bio: z.string().optional().default(""),
  staffRole: z.string().optional().default(""),
  currentPhotoUrl: z.string().optional().default(""),
});

export interface StaffProfileState {
  error?: string;
  success?: boolean;
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

export async function saveStaffProfileAction(
  _previousState: StaffProfileState,
  formData: FormData,
): Promise<StaffProfileState> {
  let shouldRedirect = false;

  try {
    const session = await getAccessSession();

    if (session.role !== "coach" && session.role !== "admin") {
      return { error: "Only staff members can edit this profile." };
    }

    const parsed = staffProfileSchema.safeParse({
      displayName: formData.get("displayName"),
      fullName: formData.get("fullName"),
      bio: formData.get("bio"),
      staffRole: formData.get("staffRole"),
      currentPhotoUrl: formData.get("currentPhotoUrl"),
    });

    if (!parsed.success) {
      return { error: "Please complete the required profile fields." };
    }

    if (session.role === "coach") {
      if (!session.coachProfileId) {
        return { error: "Coach profile not found for this session." };
      }

      const photoUrl =
        (await uploadStaffPhotoFile(session.coachProfileId, formData.get("photoFile"))) ||
        parsed.data.currentPhotoUrl ||
        undefined;
      const coaches = await listCoachProfiles();
      const current = coaches.find((coach) => coach.id === session.coachProfileId);
      await updateCoachProfile({
        id: session.coachProfileId,
        displayName: parsed.data.displayName,
        fullName: parsed.data.fullName,
        bio: parsed.data.bio,
        photoUrl,
        staffRole: current?.staffRole,
      });
    } else {
      if (!session.authUserId) {
        return { error: "Admin session is missing a linked auth user." };
      }

      const current = await getAdminProfileByAuthUser({
        authUserId: session.authUserId,
        authEmail: session.authEmail,
      });
      const photoUrl =
        (await uploadStaffPhotoFile(session.authUserId, formData.get("photoFile"))) ||
        parsed.data.currentPhotoUrl ||
        current?.photoUrl ||
        undefined;

      await upsertAdminProfile({
        id: current?.id ?? crypto.randomUUID(),
        authUserId: session.authUserId,
        authEmail: session.authEmail ?? undefined,
        displayName: parsed.data.displayName,
        fullName: parsed.data.fullName,
        staffRole: parsed.data.staffRole || "Administrator",
        bio: parsed.data.bio,
        photoUrl,
      });
    }

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/staff-profile");
    revalidatePath("/admin/coaches");
    shouldRedirect = true;
  } catch (error) {
    console.error("saveStaffProfileAction failed", error);
    return { error: error instanceof Error ? error.message : "Unable to save staff profile." };
  }

  if (shouldRedirect) {
    redirect("/staff-profile?saved=1");
  }

  return { success: true };
}
