import Link from "next/link";
import { AccessSessionForm } from "@/components/access-session-form";
import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { CustomPushAlertForm } from "@/components/custom-push-alert-form";
import { EventAttendanceControls } from "@/components/event-attendance-controls";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { PushNotificationControls } from "@/components/push-notification-controls";
import { PwaInstallControls } from "@/components/pwa-install-controls";
import { ResponsiveDisclosure } from "@/components/responsive-disclosure";
import { APP_ROLE_OPTIONS } from "@/lib/access-config";
import {
  canUseObservations,
  canUseScorer,
  canViewAdmin,
  getAccessSession,
} from "@/lib/access-control";
import {
  getAdminProfileByAuthUser,
  listCoachProfileRows,
  listEventAttendanceRows,
  listGameDayCoachAssignmentRows,
  listGameRows,
  listManagerProfileRows,
  listPlayerRosterRows,
  listProgramAssignmentCompletionRows,
  listPracticePlanRows,
  listProgramAssignmentRows,
  listProgramAssignmentProofRows,
  listTeamSeasonRows,
  listWeekGoalRows,
} from "@/lib/admin-repository";
import {
  getCurrentEventAttendanceStatus,
  summarizeEventAttendance,
} from "@/lib/event-attendance";
import {
  getLatestProofForViewer,
  getAssignmentCompletionForViewer,
  formatDueLabel,
  getAssignmentSummaryMeta,
  getAssignmentPrimaryHref,
  getWeekGoalRangeLabel,
  isProgramAssignmentVisible,
  isWeekGoalVisible,
} from "@/lib/program-hub";
import { buildAlertOpenHref, listUnreadProgramAlerts } from "@/lib/program-alerts";
import { isSupabaseConfigured } from "@/lib/env";

const PROGRAM_TIME_ZONE = "America/New_York";
const DEFAULT_GAME_DURATION_MINUTES = 120;

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

function getTimeZoneLocalParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number.parseInt(values.year, 10),
    month: Number.parseInt(values.month, 10),
    day: Number.parseInt(values.day, 10),
    hour: Number.parseInt(values.hour, 10),
    minute: Number.parseInt(values.minute, 10),
    second: Number.parseInt(values.second, 10),
  };
}

function toZonedTimestamp(date: string, time: string, timeZone: string) {
  const normalizedTime = normalizeTimeValue(time);
  if (!normalizedTime) {
    return toTimestamp(date);
  }

  const [year, month, day] = date.split("-").map((value) => Number.parseInt(value, 10));
  const [hours, minutes] = normalizedTime.split(":").map((value) => Number.parseInt(value, 10));

  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) {
    return null;
  }

  let guess = Date.UTC(year, month - 1, day, hours, minutes, 0);

  for (let index = 0; index < 2; index += 1) {
    const actual = getTimeZoneLocalParts(guess, timeZone);
    const desired = Date.UTC(year, month - 1, day, hours, minutes, 0);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const difference = desired - actualAsUtc;
    if (difference === 0) {
      break;
    }
    guess += difference;
  }

  return guess;
}

function getPracticeWindow(practice: {
  practiceDate: string;
  startTimeValue: string;
  lengthMinutes: number;
}) {
  const startsAtMs = toZonedTimestamp(practice.practiceDate, practice.startTimeValue, PROGRAM_TIME_ZONE);
  if (startsAtMs === null) {
    return { startsAtMs: null, endsAtMs: null };
  }

  return {
    startsAtMs,
    endsAtMs: startsAtMs + practice.lengthMinutes * 60_000,
  };
}

function getGameWindow(game: { startsAt?: string; date: string; status: string }) {
  const startsAtMs = game.startsAt ? toTimestamp(game.startsAt) : toTimestamp(game.date);
  if (startsAtMs === null) {
    return { startsAtMs: null, endsAtMs: null };
  }

  if (game.status === "complete") {
    return { startsAtMs, endsAtMs: startsAtMs };
  }

  if (game.status === "live") {
    return { startsAtMs, endsAtMs: Number.MAX_SAFE_INTEGER };
  }

  return {
    startsAtMs,
    endsAtMs: startsAtMs + DEFAULT_GAME_DURATION_MINUTES * 60_000,
  };
}

function formatDashboardDate(value: string) {
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

function getViewerDisplayName(input: {
  role: "admin" | "coach" | "manager" | "player";
  playerRosterMembershipId: string | null;
  coachProfileId: string | null;
  managerProfileId: string | null;
  adminDisplayName?: string | null;
  adminFullName?: string | null;
  authEmail?: string | null;
  playerRows: Awaited<ReturnType<typeof listPlayerRosterRows>>;
  coachRows: Awaited<ReturnType<typeof listCoachProfileRows>>;
  managerRows: Awaited<ReturnType<typeof listManagerProfileRows>>;
}) {
  if (input.role === "player") {
    return (
      input.playerRows.find((row) => row.id === input.playerRosterMembershipId)?.name ??
      "Player"
    );
  }

  if (input.role === "coach") {
    return (
      input.coachRows.find((row) => row.id === input.coachProfileId)?.displayName ??
      "Coach"
    );
  }

  if (input.role === "manager") {
    return (
      input.managerRows.find((row) => row.id === input.managerProfileId)?.displayName ??
      "Manager"
    );
  }

  const looksLikeEmail = (value?: string | null) => Boolean(value && value.includes("@"));
  if (input.adminDisplayName && !looksLikeEmail(input.adminDisplayName)) {
    return input.adminDisplayName;
  }
  if (input.adminFullName && !looksLikeEmail(input.adminFullName)) {
    return input.adminFullName;
  }
  if (input.adminDisplayName) {
    return input.adminDisplayName;
  }
  return input.authEmail ?? "Admin";
}

export default async function HomePage() {
  const session = await getAccessSession();
  const [games, playerRows, practiceRows, weekGoals, assignments, proofRows, completionRows, attendanceRows, coachRows, managerRows, teamSeasonRows, adminProfile] = await Promise.all([
    listGameRows(),
    listPlayerRosterRows(),
    listPracticePlanRows(),
    listWeekGoalRows(),
    listProgramAssignmentRows(),
    listProgramAssignmentProofRows(),
    listProgramAssignmentCompletionRows(),
    listEventAttendanceRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
    listTeamSeasonRows(),
    session.role === "admin" && session.authUserId
      ? getAdminProfileByAuthUser({
          authUserId: session.authUserId,
          authEmail: session.authEmail,
        })
      : Promise.resolve(null),
  ]);
  const gameDayAssignments = await listGameDayCoachAssignmentRows({
    role: session.role,
    coachProfileId: session.coachProfileId,
  });
  const alerts = session.role
    ? await listUnreadProgramAlerts(session as typeof session & { role: "admin" | "coach" | "manager" | "player" })
    : [];

  const playerOptions = playerRows
    .filter((player) => player.teamType === "ours")
    .map((player) => {
      const teamSeason = teamSeasonRows.find((row) => row.id === player.teamSeasonId);
      return {
        id: player.id,
        label: `${teamSeason?.season ?? player.season} · ${teamSeason?.label ?? player.team} · ${player.name} ${player.jersey}`,
      };
    });
  const teamSeasonOptions = teamSeasonRows
    .filter((teamSeason) => teamSeason.type === "ours")
    .map((teamSeason) => ({
      id: teamSeason.id,
      label: `${teamSeason.season} · ${teamSeason.name} · ${teamSeason.label}`,
    }));
  const coachOptions = coachRows.map((coach) => ({
    id: coach.id,
    label: `${coach.displayName} · ${coach.fullName}`,
  }));
  const managerOptions = managerRows.map((manager) => ({
    id: manager.id,
    label: `${manager.displayName} · ${manager.fullName}`,
  }));
  const viewerPlayerTeamSeasonId =
    session.role === "player" && session.playerRosterMembershipId
      ? playerRows.find((player) => player.id === session.playerRosterMembershipId)?.teamSeasonId
      : null;
  const viewerGames = viewerPlayerTeamSeasonId
    ? games.filter(
        (game) =>
          game.homeTeamSeasonId === viewerPlayerTeamSeasonId ||
          game.awayTeamSeasonId === viewerPlayerTeamSeasonId,
      )
    : games;
  const viewerPractices = viewerPlayerTeamSeasonId
    ? practiceRows.filter((practice) =>
        (practice.teamSeasonIds.length ? practice.teamSeasonIds : [practice.teamSeasonId]).includes(viewerPlayerTeamSeasonId),
      )
    : practiceRows;
  const now = Date.now();
  const currentGames = viewerGames
    .map((game) => ({ ...game, ...getGameWindow(game) }))
    .filter((game) => game.startsAtMs !== null && game.endsAtMs !== null && game.endsAtMs >= now)
    .sort((left, right) => (left.startsAtMs ?? 0) - (right.startsAtMs ?? 0));
  const currentPractices = viewerPractices
    .map((practice) => ({
      ...practice,
      ...getPracticeWindow(practice),
    }))
    .filter((practice) => practice.startsAtMs !== null && practice.endsAtMs !== null && practice.endsAtMs >= now)
    .sort((left, right) => (left.startsAtMs ?? 0) - (right.startsAtMs ?? 0));
  const nextGame = currentGames[0] ?? null;
  const nextPractice = currentPractices[0];
  const liveGame = games.find((game) => game.status === "live");
  const visibleWeekGoals = weekGoals.filter((goal) => isWeekGoalVisible(goal, session.role));
  const canOpenGameReport = session.role === "admin" || session.role === "coach" || session.role === "player";
  const canOpenPracticePlan = session.role === "admin" || session.role === "coach";
  const visibleAssignments = assignments
    .filter((assignment) =>
      isProgramAssignmentVisible(
        assignment,
        session.role,
        session.playerRosterMembershipId,
        session.coachProfileId,
        session.managerProfileId,
      ),
    )
    .filter((assignment) => {
      const completion = getAssignmentCompletionForViewer(
        completionRows,
        assignment.id,
        session.role,
        session.playerRosterMembershipId,
        session.coachProfileId,
        session.managerProfileId,
        session.authUserId,
      );
      if (completion) {
        return false;
      }

      if (!assignment.proofRequired) {
        return true;
      }

      const latestProof = getLatestProofForViewer(
        proofRows,
        assignment.id,
        session.role,
        session.playerRosterMembershipId,
        session.coachProfileId,
        session.managerProfileId,
      );

      return latestProof?.reviewStatus !== "accepted";
    })
    .sort((left, right) => {
      const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });
  const combinedTodoItems = [
    ...gameDayAssignments.map((assignment) => ({
      id: assignment.id,
      href: assignment.href,
      eyebrow: assignment.coachDisplayName ? `Game Day · ${assignment.coachDisplayName}` : "Game Day",
      title: assignment.responsibilityLabel,
      body: assignment.gameTitle,
      dueLabel: assignment.startsAt ? formatDueLabel(assignment.startsAt) : "No date set",
      sortMs: assignment.startsAt ? new Date(assignment.startsAt).getTime() : Number.MAX_SAFE_INTEGER,
    })),
    ...visibleAssignments.map((assignment) => {
      const latestProof = assignment.proofRequired
        ? getLatestProofForViewer(
            proofRows,
            assignment.id,
            session.role,
            session.playerRosterMembershipId,
            session.coachProfileId,
            session.managerProfileId,
          )
        : null;

      return {
        id: assignment.id,
        href: `/tasks/${assignment.id}`,
        eyebrow:
          latestProof?.reviewStatus === "rejected"
            ? "Proof Rejected"
            : latestProof?.reviewStatus === "pending"
              ? "Proof Pending Review"
              : getAssignmentSummaryMeta(assignment),
        title: assignment.title,
        body:
          latestProof?.reviewStatus === "rejected" && latestProof.reviewReason
            ? latestProof.reviewReason
            : assignment.body ??
              (assignment.assignmentType === "play_review" && getAssignmentPrimaryHref(assignment)
                ? "Linked resource ready"
                : ""),
        dueLabel: formatDueLabel(assignment.dueAt),
        sortMs: assignment.dueAt ? new Date(assignment.dueAt).getTime() : Number.MAX_SAFE_INTEGER,
      };
    }),
  ].sort((left, right) => left.sortMs - right.sortMs);
  const viewerDisplayName = session.role
    ? getViewerDisplayName({
        role: session.role,
        playerRosterMembershipId: session.playerRosterMembershipId,
        coachProfileId: session.coachProfileId,
        managerProfileId: session.managerProfileId,
        adminDisplayName: adminProfile?.displayName ?? null,
        adminFullName: adminProfile?.fullName ?? null,
        authEmail: session.authEmail,
        playerRows,
        coachRows,
        managerRows,
      })
    : null;
  const upcomingItems = [
    ...currentGames.slice(0, 4).map((game) => ({
      eventKind: "game" as const,
      eventId: game.id,
      kind: "Game",
      title: `vs ${game.opponent}`,
      dateLabel: formatDashboardDate(game.date),
      sortMs: game.startsAtMs ?? Number.MAX_SAFE_INTEGER,
      href: canOpenGameReport ? `/scouting/${game.id}` : "/calendar",
      actionLabel: canOpenGameReport ? "Open Scouting Report" : "Open Calendar",
      attendanceMode: game.attendanceMode,
    })),
    ...currentPractices.slice(0, 4).map((practice) => ({
      eventKind: "practice" as const,
      eventId: practice.id,
      kind: "Practice",
      title: practice.title,
      dateLabel: formatDashboardDate(toPracticeDateTime(practice.practiceDate, practice.startTimeValue)),
      sortMs: practice.startsAtMs ?? Number.MAX_SAFE_INTEGER,
      href: canOpenPracticePlan ? `/practices/${practice.id}` : "/calendar",
      actionLabel: canOpenPracticePlan ? "Open Practice Plan" : "Open Calendar",
      attendanceMode: practice.attendanceMode,
    })),
  ].sort((left, right) => left.sortMs - right.sortMs);
  const upNextOptions = [
    nextGame
      ? {
          eventKind: "game" as const,
          eventId: nextGame.id,
          title: `vs ${nextGame.opponent}`,
          subtitle: `${nextGame.season} · Game`,
          href: canOpenGameReport ? `/scouting/${nextGame.id}` : "/calendar",
          actionLabel: canOpenGameReport ? "Open Scouting Report" : "Open Calendar",
          dateLabel: formatDashboardDate(nextGame.startsAt ?? nextGame.date),
          sortMs: nextGame.startsAtMs ?? Number.MAX_SAFE_INTEGER,
          attendanceMode: nextGame.attendanceMode,
        }
      : null,
    nextPractice
      ? {
          eventKind: "practice" as const,
          eventId: nextPractice.id,
          title: nextPractice.title,
          subtitle: `${nextPractice.team} · Practice`,
          href: canOpenPracticePlan ? `/practices/${nextPractice.id}` : "/calendar",
          actionLabel: canOpenPracticePlan ? "Open Practice Plan" : "Open Calendar",
          dateLabel: formatDashboardDate(toPracticeDateTime(nextPractice.practiceDate, nextPractice.startTimeValue)),
          sortMs: nextPractice.startsAtMs ?? Number.MAX_SAFE_INTEGER,
          attendanceMode: nextPractice.attendanceMode,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const upNext = upNextOptions.sort((left, right) => left.sortMs - right.sortMs)[0] ?? null;
  const upNextAttendanceSummary = upNext
    ? summarizeEventAttendance(attendanceRows, upNext.eventKind, upNext.eventId)
    : null;
  const upNextCurrentStatus = upNext
    ? getCurrentEventAttendanceStatus(attendanceRows, {
        eventKind: upNext.eventKind,
        eventId: upNext.eventId,
        role: session.role,
        playerRosterMembershipId: session.playerRosterMembershipId,
        coachProfileId: session.coachProfileId,
        managerProfileId: session.managerProfileId,
      })
    : null;
  const supabaseEnabled = isSupabaseConfigured();
  const hasLinkedSupabaseSession = session.authSource === "supabase" && Boolean(session.role);
  const canRespondToAttendance = Boolean(session.role) && session.role !== "admin";
  const signedInRoleLabel = session.role
    ? APP_ROLE_OPTIONS.find((option) => option.value === session.role)?.label ?? session.role
    : null;
  const showAccessCard = session.role === "admin";
  const accessCard = hasLinkedSupabaseSession ? (
    <article className="card signed-in-card">
      <h2>Signed In</h2>
      <p>
        Logged in as <strong>{signedInRoleLabel}</strong>
      </p>
      {session.authEmail ? <p className="meta">{session.authEmail}</p> : null}
      <div className="action-row">
        <AuthSignOutButton />
        {canViewAdmin(session.role) ? (
          <Link href="/admin/access" className="button-link ghost">
            Manage Access
          </Link>
        ) : null}
      </div>
      <PwaInstallControls />
      <PushNotificationControls />
    </article>
  ) : session.authSource === "supabase" && !session.role ? (
    <article className="card signed-in-card">
      <h2>Account Needs Access</h2>
      <p>
        This account is signed in, but it is not linked to a player, coach, manager, or admin profile yet.
      </p>
      <p className="meta">Ask an admin to create your invite from Admin / Access.</p>
      <div className="action-row">
        <AuthSignOutButton />
      </div>
      <PwaInstallControls />
    </article>
  ) : (
    <article className="card signed-in-card">
      <h2>Sign In</h2>
      <p>
        Use your player, coach, manager, or admin login to open your Program Hub and stay signed in until you log out.
      </p>
      <div className="action-row">
        <Link href="/login" className="button-link">
          Open Login
        </Link>
      </div>
      <PwaInstallControls />
      {supabaseEnabled ? (
        <p className="meta">No account yet? Ask an admin to generate an invite link for your profile.</p>
      ) : null}
    </article>
  );

  if (!session.role) {
    return (
      <main className="page-shell">
        <section className="hero">
          <div className="dashboard-brand-lockup">
            <img
              src="/branding/pikesville-panthers-logo.svg"
              alt="Pikesville Panthers logo"
              className="dashboard-brand-mark"
            />
            <div>
              <p className="eyebrow">Pikesville Basketball</p>
              <h1>Program Hub</h1>
            </div>
          </div>
          <p className="lede">
            Secure team access for scouting, live workflow, assignments, practices, and reporting.
          </p>
        </section>

        <PwaInstallBanner />

        <section className="card-grid">
          {accessCard}
        </section>
      </main>
    );
  }

  if (session.role === "manager") {
    return (
      <main className="page-shell">
      <section className="hero">
          <p className="eyebrow">Pikesville Basketball</p>
          <h1>Manager Hub</h1>
          <p className="lede">Calendar and assignments, without the rest of the coaching workflow.</p>
          {viewerDisplayName ? <p className="meta">Welcome, {viewerDisplayName}.</p> : null}
        </section>

        <PwaInstallBanner />

        <section className="card-grid">
          <article className="card">
            <ResponsiveDisclosure title="Menu" className="home-quick-access-disclosure">
              <div className="action-row quick-access-actions">
                <FrontendMenuLinks session={session} />
              </div>
            </ResponsiveDisclosure>
          </article>
        </section>

        <section className="card-grid">
          <article className="card">
            <h2>Up Next</h2>
            {upNext && upNextAttendanceSummary ? (
              <>
                <p className="meta">{upNext.dateLabel}</p>
                <h3 className="dashboard-card-title">{upNext.title}</h3>
                <p>{upNext.subtitle}</p>
                <EventAttendanceControls
                  eventKind={upNext.eventKind}
                  eventId={upNext.eventId}
                  attendanceMode={upNext.attendanceMode}
                  summary={upNextAttendanceSummary}
                  currentStatus={upNextCurrentStatus}
                  canRespond={canRespondToAttendance}
                  viewerRole={session.role}
                />
                <div className="action-row">
                  <Link href={upNext.href} className="button-link ghost">
                    {upNext.actionLabel}
                  </Link>
                </div>
              </>
            ) : (
              <p>No upcoming game or practice is scheduled yet.</p>
            )}
          </article>

          <article className="card">
            <h2>Week At A Glance</h2>
            {upcomingItems.length > 0 ? (
              <div className="dashboard-stack">
                {upcomingItems.slice(0, 5).map((item) => {
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
                    <div key={`${item.kind}-${item.title}-${item.dateLabel}`} className="dashboard-list-link attendance-list-link">
                      <div>
                        <p className="eyebrow-label">{item.kind}</p>
                        <strong>{item.title}</strong>
                        <p className="meta">{item.dateLabel}</p>
                        <EventAttendanceControls
                          eventKind={item.eventKind}
                          eventId={item.eventId}
                          attendanceMode={item.attendanceMode}
                          summary={summary}
                          currentStatus={currentStatus}
                          canRespond={canRespondToAttendance}
                          viewerRole={session.role}
                        />
                      </div>
                      <div className="action-row">
                        <Link href={item.href} className="button-link ghost">
                          {item.actionLabel}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No games or practices on the schedule yet.</p>
            )}
          </article>

          <article className="card">
            <h2>To-Do</h2>
            {visibleAssignments.length > 0 ? (
              <div className="dashboard-stack">
                {visibleAssignments.slice(0, 6).map((assignment) => {
                  const latestProof = assignment.proofRequired
                    ? getLatestProofForViewer(
                        proofRows,
                        assignment.id,
                        session.role,
                        session.playerRosterMembershipId,
                        session.coachProfileId,
                        session.managerProfileId,
                      )
                    : null;

                  return (
                    <Link key={assignment.id} href={`/tasks/${assignment.id}`} className="dashboard-list-link">
                      <div>
                        <p className="eyebrow-label">
                          {latestProof?.reviewStatus === "rejected"
                            ? "Proof Rejected"
                            : latestProof?.reviewStatus === "pending"
                              ? "Proof Pending Review"
                              : getAssignmentSummaryMeta(assignment)}
                        </p>
                        <strong>{assignment.title}</strong>
                        {latestProof?.reviewStatus === "rejected" && latestProof.reviewReason ? (
                          <p>{latestProof.reviewReason}</p>
                        ) : assignment.body ? (
                          <p>{assignment.body}</p>
                        ) : null}
                      </div>
                      <span className="meta">{formatDueLabel(assignment.dueAt)}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p>No assignments right now.</p>
            )}
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="dashboard-brand-lockup">
          <img
            src="/branding/pikesville-panthers-logo.svg"
            alt="Pikesville Panthers logo"
            className="dashboard-brand-mark"
          />
          <div>
            <p className="eyebrow">Pikesville Basketball</p>
            <h1>Program Hub</h1>
          </div>
        </div>
        <p className="lede">
          One place for scouting, live game workflow, player development, drills, practices, and season reporting.
        </p>
        {viewerDisplayName ? <p className="meta">Welcome, {viewerDisplayName}.</p> : null}
      </section>

      <PwaInstallBanner />

      <section className="card-grid">
        {showAccessCard ? accessCard : null}

        {session.role === "admin" ? (
          <AccessSessionForm
            currentRole={session.role}
            currentPlayerRosterMembershipId={session.playerRosterMembershipId}
            currentCoachProfileId={session.coachProfileId}
            currentManagerProfileId={session.managerProfileId}
            playerOptions={playerOptions}
            coachOptions={coachOptions}
            managerOptions={managerOptions}
          />
        ) : null}

        <article className="card">
          <ResponsiveDisclosure title="Menu" className="home-quick-access-disclosure">
            <div className="action-row quick-access-actions">
              <FrontendMenuLinks
                session={session}
                liveGameId={liveGame?.id}
                extras={
                  canViewAdmin(session.role)
                    ? [
                        { href: "/admin/access", label: "Manage Access" },
                        { href: "/admin/games", label: "Manage Games / Prep" },
                      ]
                    : []
                }
              />
            </div>
            {session.role === "player" ? (
              <div className="quick-access-utility">
                {session.authEmail ? <p className="meta">{session.authEmail}</p> : null}
                <PwaInstallControls />
                <PushNotificationControls />
              </div>
            ) : null}
            <p className="meta">
              {nextGame ? `Next game: ${nextGame.opponent} · ${formatDashboardDate(nextGame.startsAt ?? nextGame.date)}` : "No upcoming games scheduled yet."}
            </p>
          </ResponsiveDisclosure>
        </article>

      </section>

      {alerts.length > 0 ? (
        <section className="table-grid">
          <article className="table-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow-label">Alerts</p>
                <h3>What Needs Your Attention</h3>
              </div>
              <span className="pill alt">{alerts.length} unread</span>
            </div>
            <div className="dashboard-stack">
              {alerts.map((alert) => (
                <a
                  key={alert.id}
                  href={buildAlertOpenHref(alert.id, alert.href)}
                  className="dashboard-list-link alert-list-link"
                >
                  <div>
                    <p className="eyebrow-label">
                      {alert.sourceLabel ? `From ${alert.sourceLabel}` : "Program Alert"}
                    </p>
                    <strong>{alert.title}</strong>
                    <p>{alert.body}</p>
                  </div>
                  <span className="meta">
                    {new Date(alert.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </a>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="card-grid">
        <article className="card">
          <h2>To-Do</h2>
          {combinedTodoItems.length > 0 ? (
            <div className="dashboard-stack">
              {combinedTodoItems.slice(0, 6).map((assignment) => (
                <Link key={assignment.id} href={assignment.href} className="dashboard-list-link">
                  <div>
                    <p className="eyebrow-label">
                      {viewerDisplayName ? `${session.role?.toUpperCase()} · ${viewerDisplayName}` : assignment.eyebrow}
                    </p>
                    <strong>{assignment.title}</strong>
                    {assignment.body ? <p>{assignment.body}</p> : null}
                  </div>
                  <span className="meta">{assignment.dueLabel}</span>
                </Link>
              ))}
            </div>
          ) : (
            <>
              <p className="meta">No assigned tasks yet.</p>
              <p>Assignments will land here for players, coaches, and staff.</p>
            </>
          )}
        </article>

        <article className="card">
          <h2>Week Goals</h2>
          {visibleWeekGoals.length > 0 ? (
            <div className="dashboard-stack">
              {visibleWeekGoals.slice(0, 3).map((goal) => (
                <div key={goal.id} className="dashboard-list-link">
                  <div>
                    <p className="eyebrow-label">Week Goal</p>
                    <strong>{goal.title}</strong>
                    {goal.body ? <p>{goal.body}</p> : null}
                  </div>
                  <span className="meta">{getWeekGoalRangeLabel(goal)}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="meta">No week goals posted yet.</p>
              <p>Weekly team goals will live here once they’re assigned.</p>
            </>
          )}
        </article>

        <article className="card">
          <h2>Up Next</h2>
          {upNext && upNextAttendanceSummary ? (
            <>
              <p className="meta">{upNext.dateLabel}</p>
              <h3 className="dashboard-card-title">{upNext.title}</h3>
              <p>{upNext.subtitle}</p>
              <EventAttendanceControls
                eventKind={upNext.eventKind}
                eventId={upNext.eventId}
                attendanceMode={upNext.attendanceMode}
                summary={upNextAttendanceSummary}
                currentStatus={upNextCurrentStatus}
                canRespond={canRespondToAttendance}
                viewerRole={session.role}
              />
              <div className="action-row">
                <Link href={upNext.href} className="button-link secondary">
                  {upNext.actionLabel}
                </Link>
              </div>
            </>
          ) : (
            <p>No upcoming game or practice is scheduled yet.</p>
          )}
        </article>

        <article className="card">
          <h2>Week At A Glance</h2>
          {upcomingItems.length > 0 ? (
            <div className="dashboard-stack">
              {upcomingItems.slice(0, 5).map((item) => {
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
                  <div key={`${item.kind}-${item.title}-${item.dateLabel}`} className="dashboard-list-link attendance-list-link">
                    <div>
                      <p className="eyebrow-label">{item.kind}</p>
                      <strong>{item.title}</strong>
                      <p className="meta">{item.dateLabel}</p>
                      <EventAttendanceControls
                        eventKind={item.eventKind}
                        eventId={item.eventId}
                        attendanceMode={item.attendanceMode}
                        summary={summary}
                        currentStatus={currentStatus}
                        canRespond={canRespondToAttendance}
                        viewerRole={session.role}
                      />
                    </div>
                    <div>
                      <span className="meta">{item.actionLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No games or practices on the schedule yet.</p>
          )}
        </article>

      </section>

      {session.role === "admin" || session.role === "coach" ? (
        <section className="card-grid">
          <article className="card">
            <h2>Send Alert</h2>
            <p className="meta">
              Push a custom alert to players, coaches, managers, or admin right away.
            </p>
            <CustomPushAlertForm
              teamSeasonOptions={teamSeasonOptions}
              playerOptions={playerOptions}
              coachOptions={coachOptions}
              managerOptions={managerOptions}
            />
          </article>
        </section>
      ) : null}
    </main>
  );
}
