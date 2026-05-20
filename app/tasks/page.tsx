import Link from "next/link";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import {
  listGameDayCoachAssignmentRows,
  listProgramAssignmentCompletionRows,
  listProgramAssignmentProofRows,
  listProgramAssignmentRows,
} from "@/lib/admin-repository";
import {
  getLatestProofForViewer,
  formatDueLabel,
  getAssignmentCompletionForViewer,
  getAssignmentSummaryMeta,
  isProgramAssignmentVisible,
} from "@/lib/program-hub";

export default async function TasksPage() {
  await requireAccessRole(["admin", "coach", "manager", "player"]);
  const session = await getAccessSession();
  const [assignments, proofRows, completionRows, gameDayAssignments] = await Promise.all([
    listProgramAssignmentRows(),
    listProgramAssignmentProofRows(),
    listProgramAssignmentCompletionRows(),
    listGameDayCoachAssignmentRows({
      role: session.role,
      coachProfileId: session.coachProfileId,
    }),
  ]);

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

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Tasks</p>
          <h2>Assignments</h2>
          <p>Review assigned tasks, due dates, and direct links into the right resource.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
        </ResponsivePageActions>
      </header>

      <section className="table-grid">
        {gameDayAssignments.length > 0 ? (
          <article className="table-card">
            <h3>Game Day Assignments</h3>
            <table>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Responsibility</th>
                  <th>Coach</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {gameDayAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <strong>{assignment.gameTitle}</strong>
                      <p className="meta">{assignment.startsAt ? formatDueLabel(assignment.startsAt) : "No date set"}</p>
                    </td>
                    <td>{assignment.responsibilityLabel}</td>
                    <td>{assignment.coachDisplayName ?? "Unassigned"}</td>
                    <td>
                      <Link href={assignment.href} className="button-link ghost">
                        Open Game Plan
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ) : null}

        <article className="table-card">
          <h3>Assigned To You</h3>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Due</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {visibleAssignments.map((assignment) => (
                (() => {
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
                    <tr key={assignment.id}>
                      <td>
                        <strong>{assignment.title}</strong>
                        {latestProof?.reviewStatus === "rejected" && latestProof.reviewReason ? (
                          <p className="meta">Rejected: {latestProof.reviewReason}</p>
                        ) : assignment.body ? (
                          <p className="meta">{assignment.body}</p>
                        ) : null}
                      </td>
                      <td>
                        {latestProof?.reviewStatus === "pending"
                          ? "Proof Pending Review"
                          : latestProof?.reviewStatus === "rejected"
                            ? "Proof Rejected"
                            : getAssignmentSummaryMeta(assignment)}
                      </td>
                      <td>{formatDueLabel(assignment.dueAt)}</td>
                      <td>
                        <Link href={`/tasks/${assignment.id}`} className="button-link ghost">
                          Open Task
                        </Link>
                      </td>
                    </tr>
                  );
                })()
              ))}
              {visibleAssignments.length === 0 ? (
                <tr>
                  <td colSpan={4}>No assignments right now.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}
