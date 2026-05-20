import type { EventAttendanceMode, EventAttendanceResponseStatus } from "@/lib/admin-domain";
import type { EventAttendanceRow } from "@/lib/admin-repository";

export interface EventAttendanceSummary {
  coming: {
    player: number;
    coach: number;
    manager: number;
  };
  waitlist: {
    player: number;
    coach: number;
    manager: number;
  };
  out: {
    player: number;
    coach: number;
    manager: number;
  };
}

export function summarizeEventAttendance(
  rows: EventAttendanceRow[],
  eventKind: "game" | "practice",
  eventId: string,
): EventAttendanceSummary {
  return rows
    .filter((row) => row.eventKind === eventKind && row.eventId === eventId)
    .reduce<EventAttendanceSummary>(
      (summary, row) => {
        summary[row.responseStatus][row.attendeeRole] += 1;
        return summary;
      },
      {
        coming: { player: 0, coach: 0, manager: 0 },
        waitlist: { player: 0, coach: 0, manager: 0 },
        out: { player: 0, coach: 0, manager: 0 },
      },
    );
}

export function getCurrentEventAttendanceStatus(
  rows: EventAttendanceRow[],
  input: {
    eventKind: "game" | "practice";
    eventId: string;
    role: "player" | "coach" | "manager" | "admin" | null;
    playerRosterMembershipId: string | null;
    coachProfileId: string | null;
    managerProfileId: string | null;
  },
): EventAttendanceResponseStatus | null {
  const response = rows.find((row) => {
    if (row.eventKind !== input.eventKind || row.eventId !== input.eventId) {
      return false;
    }

    if (input.role === "coach") {
      return row.attendeeRole === "coach" && row.coachProfileId === input.coachProfileId;
    }

    if (input.role === "manager") {
      return row.attendeeRole === "manager" && row.managerProfileId === input.managerProfileId;
    }

    if (input.role === "player") {
      return row.attendeeRole === "player" && row.rosterMembershipId === input.playerRosterMembershipId;
    }

    return false;
  });

  return response?.responseStatus ?? null;
}

export function getPrimaryAttendanceLabel(
  attendanceMode: EventAttendanceMode,
  summary: EventAttendanceSummary,
) {
  const counts = attendanceMode === "voluntary" ? summary.coming : summary.out;
  const label = attendanceMode === "voluntary" ? "Coming" : "Out";
  const waitlistLabel =
    summary.waitlist.player > 0 ? ` · Waitlist P ${summary.waitlist.player}` : "";
  return `${label}: P ${counts.player} · C ${counts.coach} · M ${counts.manager}${waitlistLabel}`;
}

export function hasManagerCoverage(summary: EventAttendanceSummary) {
  return summary.coming.manager > 0;
}
