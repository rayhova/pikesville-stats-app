import { submitEventAttendanceResponseAction } from "@/app/calendar/actions";
import type { AppRole } from "@/lib/access-config";
import type { EventAttendanceMode, EventAttendanceResponseStatus } from "@/lib/admin-domain";
import type { EventAttendanceSummary } from "@/lib/event-attendance";
import { getPrimaryAttendanceLabel, hasManagerCoverage } from "@/lib/event-attendance";

export function EventAttendanceControls({
  eventKind,
  eventId,
  attendanceMode,
  summary,
  currentStatus,
  canRespond,
  viewerRole,
}: Readonly<{
  eventKind: "game" | "practice";
  eventId: string;
  attendanceMode: EventAttendanceMode;
  summary: EventAttendanceSummary;
  currentStatus: EventAttendanceResponseStatus | null;
  canRespond: boolean;
  viewerRole: AppRole | null;
}>) {
  const isPlayerView = viewerRole === "player";
  const showAttendanceMeta = viewerRole === "admin" || viewerRole === "coach";
  const helperLabel =
    attendanceMode === "mandatory"
      ? "Mandatory: mark yourself out if you cannot make it."
      : "Voluntary: mark yourself coming if you plan to attend.";
  const managerCoverage = hasManagerCoverage(summary);
  const waitlistMessage =
    currentStatus === "waitlist" ? "You're on the waitlist right now." : null;

  return (
    <div className={`event-attendance-panel ${!isPlayerView && !managerCoverage ? "alert" : ""}`}>
      {showAttendanceMeta ? <p className="meta">{helperLabel}</p> : null}
      {showAttendanceMeta ? <p className="event-attendance-summary">{getPrimaryAttendanceLabel(attendanceMode, summary)}</p> : null}
      {waitlistMessage ? <p className="event-attendance-alert">{waitlistMessage}</p> : null}
      {showAttendanceMeta && !managerCoverage ? (
        <p className="event-attendance-alert">No managers marked coming yet.</p>
      ) : null}
      {canRespond ? (
        <div className="event-attendance-actions">
          <form action={submitEventAttendanceResponseAction}>
            <input type="hidden" name="eventKind" value={eventKind} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="responseStatus" value="coming" />
            <button
              className={`button-link ghost attendance-choice attendance-choice-coming ${currentStatus === "coming" ? "active" : ""} ${currentStatus === "waitlist" ? "waitlist" : ""}`}
              type="submit"
            >
              {currentStatus === "waitlist" ? "Waitlisted" : "I'm Coming"}
            </button>
          </form>
          <form action={submitEventAttendanceResponseAction}>
            <input type="hidden" name="eventKind" value={eventKind} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="responseStatus" value="out" />
            <button
              className={`button-link ghost attendance-choice attendance-choice-out ${currentStatus === "out" ? "active" : ""}`}
              type="submit"
            >
              I'm Out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
