"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import {
  listEventAttendanceRows,
  listGameRows,
  listPracticePlanRows,
  upsertEventAttendanceResponse,
} from "@/lib/admin-repository";

const eventAttendanceResponseSchema = z.object({
  eventKind: z.enum(["game", "practice"]),
  eventId: z.string().min(1),
  responseStatus: z.enum(["coming", "out"]),
});

export async function submitEventAttendanceResponseAction(formData: FormData) {
  await requireAccessRole(["coach", "manager", "player"]);
  const session = await getAccessSession();
  const parsed = eventAttendanceResponseSchema.parse({
    eventKind: formData.get("eventKind"),
    eventId: formData.get("eventId"),
    responseStatus: formData.get("responseStatus"),
  });
  let responseStatus: "coming" | "out" | "waitlist" = parsed.responseStatus;

  if (session.role === "coach") {
    if (!session.coachProfileId) {
      throw new Error("Coach profile is required to respond to events.");
    }

    await upsertEventAttendanceResponse({
      eventKind: parsed.eventKind,
      eventId: parsed.eventId,
      attendeeRole: "coach",
      coachProfileId: session.coachProfileId,
      responseStatus,
    });
  } else if (session.role === "manager") {
    if (!session.managerProfileId) {
      throw new Error("Manager profile is required to respond to events.");
    }

    await upsertEventAttendanceResponse({
      eventKind: parsed.eventKind,
      eventId: parsed.eventId,
      attendeeRole: "manager",
      managerProfileId: session.managerProfileId,
      responseStatus,
    });
  } else {
    if (!session.playerRosterMembershipId) {
      throw new Error("Player roster membership is required to respond to events.");
    }

    if (parsed.responseStatus === "coming") {
      const [games, practices, attendanceRows] = await Promise.all([
        listGameRows(),
        listPracticePlanRows(),
        listEventAttendanceRows(),
      ]);
      const capacity =
        parsed.eventKind === "game"
          ? games.find((game) => game.id === parsed.eventId)?.capacity
          : practices.find((practice) => practice.id === parsed.eventId)?.capacity;

      if (capacity && capacity > 0) {
        const currentPlayerComingCount = attendanceRows.filter(
          (row) =>
            row.eventKind === parsed.eventKind &&
            row.eventId === parsed.eventId &&
            row.attendeeRole === "player" &&
            row.responseStatus === "coming",
        ).length;
        const selfAlreadyComing = attendanceRows.some(
          (row) =>
            row.eventKind === parsed.eventKind &&
            row.eventId === parsed.eventId &&
            row.attendeeRole === "player" &&
            row.rosterMembershipId === session.playerRosterMembershipId &&
            row.responseStatus === "coming",
        );

        if (!selfAlreadyComing && currentPlayerComingCount >= capacity) {
          responseStatus = "waitlist";
        }
      }
    }

    await upsertEventAttendanceResponse({
      eventKind: parsed.eventKind,
      eventId: parsed.eventId,
      attendeeRole: "player",
      rosterMembershipId: session.playerRosterMembershipId,
      responseStatus,
    });
  }

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  revalidatePath("/admin/practices");
}

const adminEventAttendanceUpdateSchema = z.object({
  eventKind: z.enum(["game", "practice"]),
  eventId: z.string().min(1),
  attendeeRole: z.enum(["player", "coach", "manager"]),
  responseStatus: z.enum(["coming", "waitlist", "out"]),
  rosterMembershipId: z.string().optional(),
  coachProfileId: z.string().optional(),
  managerProfileId: z.string().optional(),
});

export async function adminUpdateEventAttendanceResponseAction(formData: FormData) {
  await requireAccessRole(["admin"]);
  const parsed = adminEventAttendanceUpdateSchema.parse({
    eventKind: formData.get("eventKind"),
    eventId: formData.get("eventId"),
    attendeeRole: formData.get("attendeeRole"),
    responseStatus: formData.get("responseStatus"),
    rosterMembershipId: formData.get("rosterMembershipId")?.toString() || undefined,
    coachProfileId: formData.get("coachProfileId")?.toString() || undefined,
    managerProfileId: formData.get("managerProfileId")?.toString() || undefined,
  });

  await upsertEventAttendanceResponse({
    eventKind: parsed.eventKind,
    eventId: parsed.eventId,
    attendeeRole: parsed.attendeeRole,
    rosterMembershipId: parsed.attendeeRole === "player" ? parsed.rosterMembershipId : undefined,
    coachProfileId: parsed.attendeeRole === "coach" ? parsed.coachProfileId : undefined,
    managerProfileId: parsed.attendeeRole === "manager" ? parsed.managerProfileId : undefined,
    responseStatus:
      parsed.attendeeRole === "player" ? parsed.responseStatus : parsed.responseStatus === "waitlist" ? "coming" : parsed.responseStatus,
  });

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/admin");
  revalidatePath("/admin/games");
  revalidatePath("/admin/practices");
}
