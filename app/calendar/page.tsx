import Link from "next/link";
import { EventAttendanceControls } from "@/components/event-attendance-controls";
import { EventRsvpSummary } from "@/components/event-rsvp-summary";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsiveDisclosure } from "@/components/responsive-disclosure";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { requireAccessRole } from "@/lib/access-control";
import { formatCompactDate, formatCompactTime } from "@/lib/date-format";
import {
  listEventAttendanceRows,
  listGameRows,
  listPlayerRosterRows,
  listPracticePlanRows,
} from "@/lib/admin-repository";
import {
  getCurrentEventAttendanceStatus,
  summarizeEventAttendance,
} from "@/lib/event-attendance";

function toTimestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function normalizeTimeValue(time: string) {
  const trimmed = time.trim();
  if (!trimmed) {
    return "";
  }

  if (/am|pm/i.test(trimmed)) {
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      return trimmed;
    }
    const [, rawHours, rawMinutes, period] = match;
    let hours = Number.parseInt(rawHours, 10) % 12;
    if (period.toUpperCase() === "PM") {
      hours += 12;
    }
    return `${hours.toString().padStart(2, "0")}:${rawMinutes}`;
  }

  return trimmed;
}

function toPracticeDateTime(date: string, time: string) {
  const normalizedTime = normalizeTimeValue(time);
  return normalizedTime ? `${date}T${normalizedTime}` : date;
}

function formatCalendarDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizePositiveInt(value: string | string[] | undefined, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getStartOfTodayTimestamp() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function sortScheduleItems<T extends { startsAtMs: number }>(items: T[], view: "current" | "older") {
  return [...items].sort((left, right) =>
    view === "older" ? right.startsAtMs - left.startsAtMs : left.startsAtMs - right.startsAtMs,
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAccessRole(["admin", "coach", "manager", "player"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const scheduleView = resolvedSearchParams.view === "older" ? "older" : "current";
  const [games, practices, attendanceRows, playerRows] = await Promise.all([
    listGameRows(),
    listPracticePlanRows(),
    listEventAttendanceRows(),
    listPlayerRosterRows(),
  ]);
  const viewerPlayerTeamSeasonId =
    session.role === "player" && session.playerRosterMembershipId
      ? playerRows.find((player) => player.id === session.playerRosterMembershipId)?.teamSeasonId
      : null;
  const visibleGames = viewerPlayerTeamSeasonId
    ? games.filter(
        (game) =>
          game.homeTeamSeasonId === viewerPlayerTeamSeasonId ||
          game.awayTeamSeasonId === viewerPlayerTeamSeasonId,
      )
    : games;
  const visiblePractices = viewerPlayerTeamSeasonId
    ? practices.filter((practice) =>
        (practice.teamSeasonIds.length ? practice.teamSeasonIds : [practice.teamSeasonId]).includes(viewerPlayerTeamSeasonId),
      )
    : practices;

  const scheduleItems = [
    ...visibleGames.map((game) => ({
      id: `game-${game.id}`,
      eventId: game.id,
      eventKind: "game" as const,
      kind: "Game",
      title: `vs ${game.opponent}`,
      subtitle: `${game.season} · ${game.location}`,
      startsAt: game.startsAt ?? game.date,
      startsAtMs: toTimestamp(game.startsAt ?? game.date) ?? Number.MAX_SAFE_INTEGER,
      attendanceMode: game.attendanceMode,
      capacity: game.capacity,
      href: session.role === "manager" ? undefined : `/scouting/${game.id}`,
    })),
    ...visiblePractices.map((practice) => ({
      id: `practice-${practice.id}`,
      eventId: practice.id,
      eventKind: "practice" as const,
      kind: "Practice",
      title: practice.title,
      subtitle: `${practice.team}${practice.teamSeasonLabel ? ` · ${practice.teamSeasonLabel}` : ""}`,
      startsAt: toPracticeDateTime(practice.practiceDate, practice.startTimeValue),
      startsAtMs:
        toTimestamp(toPracticeDateTime(practice.practiceDate, practice.startTimeValue)) ??
        Number.MAX_SAFE_INTEGER,
      attendanceMode: practice.attendanceMode,
      capacity: practice.capacity,
      href: session.role === "admin" || session.role === "coach" ? `/practices/${practice.id}` : undefined,
    })),
  ].sort((left, right) => left.startsAtMs - right.startsAtMs);
  const startOfTodayMs = getStartOfTodayTimestamp();
  const currentScheduleItems = sortScheduleItems(
    scheduleItems.filter((item) => item.startsAtMs >= startOfTodayMs),
    "current",
  );
  const olderScheduleItems = sortScheduleItems(
    scheduleItems.filter((item) => item.startsAtMs < startOfTodayMs),
    "older",
  );
  const visibleScheduleItems = scheduleView === "older" ? olderScheduleItems : currentScheduleItems;

  const pageSize = [5, 10].includes(normalizePositiveInt(resolvedSearchParams.pageSize, 10))
    ? normalizePositiveInt(resolvedSearchParams.pageSize, 10)
    : 10;
  const page = normalizePositiveInt(resolvedSearchParams.page, 1);
  const totalPages = Math.max(1, Math.ceil(visibleScheduleItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedScheduleItems = visibleScheduleItems.slice(pageStart, pageStart + pageSize);
  const upcomingItems = currentScheduleItems.filter((item) => item.startsAtMs >= Date.now()).slice(0, 3);

  const buildCalendarHref = (nextPage: number, nextPageSize = pageSize) => {
    const params = new URLSearchParams();
    if (scheduleView === "older") {
      params.set("view", "older");
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    if (nextPageSize !== 10) {
      params.set("pageSize", String(nextPageSize));
    }

    return `/calendar${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Calendar</p>
          <h2>Program Schedule</h2>
          <p>See upcoming games and practices in one place.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} playerProfileHref={session.role === "player" ? "/profile" : null} />
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        <article className="card">
          <h2>Up Next</h2>
          {upcomingItems.length > 0 ? (
            <div className="dashboard-stack">
              {upcomingItems.map((item) => (
                item.href ? (
                  <Link key={item.id} href={item.href} className="dashboard-list-link">
                    <div>
                      <p className="eyebrow-label">{item.kind}</p>
                      <strong>{item.title}</strong>
                      <p>{item.subtitle}</p>
                    </div>
                    <span className="meta">{formatCalendarDate(item.startsAt)}</span>
                  </Link>
                ) : (
                  <div key={item.id} className="dashboard-list-link">
                    <div>
                      <p className="eyebrow-label">{item.kind}</p>
                      <strong>{item.title}</strong>
                      <p>{item.subtitle}</p>
                    </div>
                    <span className="meta">{formatCalendarDate(item.startsAt)}</span>
                  </div>
                )
              ))}
            </div>
          ) : (
            <p>No games or practices scheduled yet.</p>
          )}
        </article>
      </section>

      <section className="table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>{scheduleView === "older" ? "Older Schedule" : "Current Schedule"}</h3>
              <p className="meta">
                Showing {pagedScheduleItems.length} of {visibleScheduleItems.length} events.
              </p>
            </div>
            <div className="filter-link-row">
              <Link href="/calendar" className={`button-link ghost ${scheduleView === "current" ? "active" : ""}`}>
                Current
              </Link>
              <Link href="/calendar?view=older" className={`button-link ghost ${scheduleView === "older" ? "active" : ""}`}>
                Older
              </Link>
              <Link href={buildCalendarHref(1, 5)} className={`button-link ghost ${pageSize === 5 ? "active" : ""}`}>
                Show 5
              </Link>
              <Link href={buildCalendarHref(1, 10)} className={`button-link ghost ${pageSize === 10 ? "active" : ""}`}>
                Show 10
              </Link>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Date</th>
                <th>Time</th>
                <th>Attendance</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {pagedScheduleItems.map((item) => {
                const summary = summarizeEventAttendance(attendanceRows, item.eventKind, item.eventId);
                const currentStatus = getCurrentEventAttendanceStatus(attendanceRows, {
                  eventKind: item.eventKind,
                  eventId: item.eventId,
                  role: session.role,
                  playerRosterMembershipId: session.playerRosterMembershipId,
                  coachProfileId: session.coachProfileId,
                  managerProfileId: session.managerProfileId,
                });
                return (
                  <tr
                    key={item.id}
                    className={
                      summary.coming.manager === 0 && item.startsAtMs >= Date.now()
                        ? "schedule-alert-row"
                        : ""
                    }
                  >
                    <td>{item.kind}</td>
                    <td>
                      <strong>{item.title}</strong>
                      <p className="meta">{item.subtitle}</p>
                    </td>
                    <td>{formatCompactDate(item.startsAt)}</td>
                    <td>{formatCompactTime(item.startsAt)}</td>
                    <td>
                      <EventAttendanceControls
                        eventKind={item.eventKind}
                        eventId={item.eventId}
                        attendanceMode={item.attendanceMode}
                        summary={summary}
                        currentStatus={currentStatus}
                        canRespond={session.role !== "admin"}
                        viewerRole={session.role}
                      />
                      {session.role === "admin" || session.role === "coach" ? (
                        <ResponsiveDisclosure
                          title="RSVPs"
                          hint="Tap to open"
                          className="attendance-admin-disclosure"
                          contentClassName="attendance-admin-disclosure-content"
                          showDesktopHeading={false}
                        >
                          <EventRsvpSummary
                            eventKind={item.eventKind}
                            eventId={item.eventId}
                            attendanceMode={item.attendanceMode}
                            capacity={item.capacity}
                            rows={attendanceRows}
                            viewerRole={session.role}
                          />
                        </ResponsiveDisclosure>
                      ) : null}
                    </td>
                    <td>
                      {item.href ? (
                        <Link href={item.href} className="button-link ghost">
                          Open
                        </Link>
                      ) : (
                        <span className="meta">Calendar only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleScheduleItems.length === 0 ? (
                <tr>
                  <td colSpan={6}>{scheduleView === "older" ? "No older events yet." : "No current events yet."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {visibleScheduleItems.length > pageSize ? (
            <div className="calendar-pagination">
              <Link
                href={buildCalendarHref(Math.max(1, currentPage - 1))}
                className={`button-link ghost ${currentPage === 1 ? "disabled" : ""}`}
                aria-disabled={currentPage === 1}
              >
                Previous
              </Link>
              <span className="meta">
                Page {currentPage} of {totalPages}
              </span>
              <Link
                href={buildCalendarHref(Math.min(totalPages, currentPage + 1))}
                className={`button-link ghost ${currentPage >= totalPages ? "disabled" : ""}`}
                aria-disabled={currentPage >= totalPages}
              >
                Next
              </Link>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
