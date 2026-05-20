"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import {
  createProgramAssignmentCompletion,
  createProgramAssignmentProof,
  deleteProgramAssignmentCompletion,
  getProgramAssignmentById,
} from "@/lib/admin-repository";
import { createAndDispatchProgramAlert } from "@/lib/program-alerts";
import { isProgramAssignmentVisible } from "@/lib/program-hub";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const submitAssignmentProofSchema = z.object({
  assignmentId: z.string().min(1),
  notes: z.string().optional().default(""),
});

const toggleAssignmentCompletionSchema = z.object({
  assignmentId: z.string().min(1),
  nextState: z.enum(["complete", "reopen"]),
});

async function uploadAssignmentProofFiles(assignmentId: string, files: File[]) {
  const supabase = getSupabaseAdminClient();

  const uploadedUrls = await Promise.all(
    files.map(async (file) => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Proof must be uploaded as image files.");
      }

      const extension = file.name.includes(".")
        ? file.name.split(".").pop()?.toLowerCase() ?? "jpg"
        : "jpg";
      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${assignmentId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error } = await supabase.storage.from("assignment-proofs").upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from("assignment-proofs").getPublicUrl(path);
      return data.publicUrl;
    }),
  );

  return uploadedUrls;
}

export async function submitProgramAssignmentProofAction(formData: FormData) {
  await requireAccessRole(["admin", "coach", "manager", "player"]);
  const session = await getAccessSession();
  const parsed = submitAssignmentProofSchema.parse({
    assignmentId: formData.get("assignmentId"),
    notes: typeof formData.get("notes") === "string" ? String(formData.get("notes")).trim() : "",
  });

  const assignment = await getProgramAssignmentById(parsed.assignmentId);
  if (
    !assignment ||
    !isProgramAssignmentVisible(
      assignment,
      session.role,
      session.playerRosterMembershipId,
      session.coachProfileId,
      session.managerProfileId,
    )
  ) {
    throw new Error("You do not have access to submit proof for this task.");
  }

  const uploadedFiles = formData
    .getAll("proofFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (uploadedFiles.length === 0) {
    throw new Error("Please upload at least one proof photo.");
  }

  const imageUrls = await uploadAssignmentProofFiles(parsed.assignmentId, uploadedFiles);

  await createProgramAssignmentProof({
    assignmentId: parsed.assignmentId,
    submittedByRole: session.role ?? "player",
    submittedByRosterMembershipId: session.playerRosterMembershipId ?? undefined,
    submittedByCoachProfileId: session.coachProfileId ?? undefined,
    submittedByManagerProfileId: session.managerProfileId ?? undefined,
    imageUrls,
    notes: parsed.notes || undefined,
  });

  await createAndDispatchProgramAlert({
    title: `Proof Submitted: ${assignment.title}`,
    body: "A new proof submission is ready for review.",
    href: "/admin/assignments",
    tag: `proof-submitted-${parsed.assignmentId}`,
    category: "proof-submitted",
    sourceRole: session.role ?? "player",
    sourceLabel: session.authEmail ?? session.role ?? "Program Member",
    targetRoles: ["admin"],
  });

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${parsed.assignmentId}`);
  revalidatePath("/admin/assignments");
}

export async function toggleProgramAssignmentCompletionAction(formData: FormData) {
  await requireAccessRole(["admin", "coach", "manager", "player"]);
  const session = await getAccessSession();
  const parsed = toggleAssignmentCompletionSchema.parse({
    assignmentId: formData.get("assignmentId"),
    nextState: formData.get("nextState"),
  });

  const assignment = await getProgramAssignmentById(parsed.assignmentId);
  if (
    !assignment ||
    !isProgramAssignmentVisible(
      assignment,
      session.role,
      session.playerRosterMembershipId,
      session.coachProfileId,
      session.managerProfileId,
    )
  ) {
    throw new Error("You do not have access to update this task.");
  }

  const completionIdentity = {
    assignmentId: parsed.assignmentId,
    completedByRole: (session.role ?? "player") as "admin" | "coach" | "manager" | "player",
    completedByRosterMembershipId: session.playerRosterMembershipId ?? undefined,
    completedByCoachProfileId: session.coachProfileId ?? undefined,
    completedByManagerProfileId: session.managerProfileId ?? undefined,
    completedByAdminAuthUserId: session.authUserId ?? undefined,
  };

  if (parsed.nextState === "complete") {
    await createProgramAssignmentCompletion(completionIdentity);
  } else {
    await deleteProgramAssignmentCompletion(completionIdentity);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${parsed.assignmentId}`);
}
