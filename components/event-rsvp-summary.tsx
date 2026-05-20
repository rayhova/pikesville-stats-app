import { adminUpdateEventAttendanceResponseAction } from "@/app/calendar/actions";
import type { AppRole } from "@/lib/access-config";
import type { EventAttendanceMode } from "@/lib/admin-domain";
import type { EventAttendanceRow } from "@/lib/admin-repository";

function groupRows(rows: EventAttendanceRow[], eventKind: "game" | "practice", eventId: string) {
  const eventRows = rows.filter((row) => row.eventKind === eventKind && row.eventId === eventId);

  return {
    coming: eventRows.filter((row) => row.responseStatus === "coming"),
    waitlist: eventRows.filter((row) => row.responseStatus === "waitlist"),
    out: eventRows.filter((row) => row.responseStatus === "out"),
  };
}

function getPrimaryStatus(attendanceMode: EventAttendanceMode) {
  return attendanceMode === "voluntary" ? "coming" : "out";
}

function getStatusLabel(status: "coming" | "waitlist" | "out") {
  if (status === "coming") {
    return "Coming";
  }

  if (status === "waitlist") {
    return "Waitlist";
  }

  return "Out";
}

export function EventRsvpSummary({
  eventKind,
  eventId,
  attendanceMode,
  capacity,
  rows,
  viewerRole,
}: Readonly<{
  eventKind: "game" | "practice";
  eventId: string;
  attendanceMode: EventAttendanceMode;
  capacity?: number;
  rows: EventAttendanceRow[];
  viewerRole: AppRole | null;
}>) {
  const groupedRows = groupRows(rows, eventKind, eventId);
  const primaryStatus = getPrimaryStatus(attendanceMode);
  const primaryRows = groupedRows[primaryStatus];
  const secondaryRows =
    primaryStatus === "coming"
      ? (["waitlist", "out"] as const)
      : (["coming", "waitlist"] as const);
  const emptyLabel =
    attendanceMode === "voluntary"
      ? "No one has marked themselves coming yet."
      : "No one has marked themselves out.";
  const helperLabel =
    attendanceMode === "voluntary"
      ? "Voluntary event: this view prioritizes who is in."
      : "Mandatory event: this view prioritizes who is out.";

  const renderRow = (row: EventAttendanceRow) =>
    viewerRole === "admin" ? (
      <form key={row.id} action={adminUpdateEventAttendanceResponseAction} className="inline-form attendance-admin-row">
        <input type="hidden" name="eventKind" value={eventKind} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="attendeeRole" value={row.attendeeRole} />
        <input type="hidden" name="rosterMembershipId" value={row.rosterMembershipId ?? ""} />
        <input type="hidden" name="coachProfileId" value={row.coachProfileId ?? ""} />
        <input type="hidden" name="managerProfileId" value={row.managerProfileId ?? ""} />
        <span className="meta">{row.attendeeLabel}</span>
        <select name="responseStatus" defaultValue={row.responseStatus}>
          <option value="coming">Coming</option>
          {row.attendeeRole === "player" ? <option value="waitlist">Waitlist</option> : null}
          <option value="out">Out</option>
        </select>
        <button className="button-link ghost" type="submit">
          Save
        </button>
      </form>
    ) : (
      <div key={row.id} className="attendance-admin-row">
        <span className="meta">{row.attendeeLabel}</span>
      </div>
    );

  return (
    <div className="attendance-admin-stack">
      <p className="meta">
        {helperLabel} {capacity ? `Capacity: ${capacity}` : "No capacity limit."}
      </p>
      <div className="attendance-admin-group">
        <p className="eyebrow-label">{getStatusLabel(primaryStatus)}</p>
        {primaryRows.length > 0 ? <div className="record-stack">{primaryRows.map(renderRow)}</div> : <p className="meta">{emptyLabel}</p>}
      </div>
      {secondaryRows.map((status) =>
        groupedRows[status].length > 0 ? (
          <div key={status} className="attendance-admin-group">
            <p className="eyebrow-label">{getStatusLabel(status)}</p>
            <div className="record-stack">{groupedRows[status].map(renderRow)}</div>
          </div>
        ) : null,
      )}
    </div>
  );
}
