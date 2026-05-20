import Link from "next/link";
import { notFound } from "next/navigation";
import {
  submitProgramAssignmentProofAction,
  toggleProgramAssignmentCompletionAction,
} from "@/app/tasks/actions";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { requireAccessRole } from "@/lib/access-control";
import {
  getProgramAssignmentById,
  listCoachProfileRows,
  listManagerProfileRows,
  listPlayerRosterRows,
  listProgramAssignmentCompletionRows,
  listProgramAssignmentProofs,
} from "@/lib/admin-repository";
import {
  extractEmbedSrc,
  formatAssignmentTypeLabel,
  formatDueLabel,
  getAssignmentCompletionForViewer,
  getLatestProofForViewer,
  getAssignmentPrimaryHref,
  getAssignmentSummaryMeta,
  isProgramAssignmentVisible,
} from "@/lib/program-hub";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await requireAccessRole(["admin", "coach", "manager", "player"]);
  const { assignmentId } = await params;
  const [assignment, proofRows, completionRows, playerRows, coachRows, managerRows] = await Promise.all([
    getProgramAssignmentById(assignmentId),
    listProgramAssignmentProofs(assignmentId),
    listProgramAssignmentCompletionRows(),
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
  ]);

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
    notFound();
  }

  const embedSrc = extractEmbedSrc(assignment.videoEmbedCode);
  const primaryHref =
    assignment.assignmentType === "play_review" ||
    assignment.assignmentType === "read_scouting_report" ||
    assignment.assignmentType === "create_evaluation" ||
    assignment.assignmentType === "create_development_plan" ||
    Boolean(assignment.customUrl)
      ? getAssignmentPrimaryHref(assignment)
      : null;
  const latestViewerProof = getLatestProofForViewer(
    proofRows,
    assignment.id,
    session.role,
    session.playerRosterMembershipId,
    session.coachProfileId,
    session.managerProfileId,
  );
  const viewerCompletion = getAssignmentCompletionForViewer(
    completionRows,
    assignment.id,
    session.role,
    session.playerRosterMembershipId,
    session.coachProfileId,
    session.managerProfileId,
    session.authUserId,
  );
  const assignedToParts = [
    assignment.targetRoles.includes("admin") ? "Admin" : null,
    assignment.targetRoles.includes("player")
      ? assignment.targetRosterMembershipIds.length > 0
        ? assignment.targetRosterMembershipIds
            .map((id) => playerRows.find((row) => row.id === id)?.name)
            .filter((value): value is string => Boolean(value))
            .join(", ")
        : "All Players"
      : null,
    assignment.targetRoles.includes("coach")
      ? assignment.targetCoachProfileIds.length > 0
        ? assignment.targetCoachProfileIds
            .map((id) => coachRows.find((row) => row.id === id)?.displayName)
            .filter((value): value is string => Boolean(value))
            .join(", ")
        : "All Coaches"
      : null,
    assignment.targetRoles.includes("manager")
      ? assignment.targetManagerProfileIds.length > 0
        ? assignment.targetManagerProfileIds
            .map((id) => managerRows.find((row) => row.id === id)?.displayName)
            .filter((value): value is string => Boolean(value))
            .join(", ")
        : "All Managers"
      : null,
  ].filter((value): value is string => Boolean(value));
  const assignedToLabel = assignedToParts.length > 0 ? assignedToParts.join(" · ") : "No audience set";

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Task</p>
          <h2>{assignment.title}</h2>
          <p>{formatAssignmentTypeLabel(assignment.assignmentType)}</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
          {primaryHref ? (
            <Link href={primaryHref} className="button-link secondary">
              Open Resource
            </Link>
          ) : null}
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        <article className="card">
          <h2>Due</h2>
          <p>{formatDueLabel(assignment.dueAt)}</p>
        </article>
        <article className="card">
          <h2>Context</h2>
          <p>{getAssignmentSummaryMeta(assignment)}</p>
        </article>
        <article className="card">
          <h2>Assigned To</h2>
          <p>{assignedToLabel}</p>
        </article>
        {(assignment.assignmentType === "create_evaluation" ||
          assignment.assignmentType === "create_development_plan") &&
        assignment.relatedPlayerNames.length > 0 ? (
          <article className="card">
            <h2>Players</h2>
            <p>{assignment.relatedPlayerNames.join(", ")}</p>
          </article>
        ) : null}
        {assignment.assignmentType === "shooting_goal" ? (
          <article className="card">
            <h2>Shot Goal</h2>
            <p>{assignment.shotsTarget ?? 250} shots</p>
            <p className="meta">{assignment.proofRequired ? "Proof required" : "No proof required"}</p>
          </article>
        ) : null}
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Instructions</p>
          <h3>What You Need To Do</h3>
          <p className="pre-line-copy">{assignment.body || "No extra instructions yet."}</p>
          <div className="action-row">
            <form action={toggleProgramAssignmentCompletionAction}>
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <input type="hidden" name="nextState" value={viewerCompletion ? "reopen" : "complete"} />
              <button className={`button-link ${viewerCompletion ? "secondary" : ""}`} type="submit">
                {viewerCompletion ? "Mark Incomplete" : "Mark Complete"}
              </button>
            </form>
          </div>
          {viewerCompletion ? (
            <p className="meta">
              Completed {formatDueLabel(viewerCompletion.completedAt)}
            </p>
          ) : null}
        </article>
      </section>

      {embedSrc ? (
        <section className="table-grid">
          <article className="panel-card">
            <p className="eyebrow-label">Video</p>
            <h3>Watch</h3>
            <div className="play-embed-modal-frame">
              <iframe
                src={embedSrc}
                title={assignment.title}
                loading="lazy"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
            </div>
          </article>
        </section>
      ) : null}

      {assignment.proofRequired ? (
        <section className="table-grid">
          <article className="panel-card">
            <p className="eyebrow-label">Proof</p>
            <h3>Submit Proof</h3>
            {latestViewerProof?.reviewStatus === "pending" ? (
              <p className="meta">Your latest proof is pending review.</p>
            ) : null}
            {latestViewerProof?.reviewStatus === "rejected" ? (
              <p className="assignment-proof-feedback rejected">
                Proof rejected{latestViewerProof.reviewReason ? `: ${latestViewerProof.reviewReason}` : "."}
              </p>
            ) : null}
            <form action={submitProgramAssignmentProofAction} className="form-grid">
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <div className="field-group field-span-2">
                <label htmlFor="task-proof-files">Proof Photos</label>
                <input id="task-proof-files" name="proofFiles" type="file" accept="image/*" multiple />
              </div>
              <div className="field-group field-span-2">
                <label htmlFor="task-proof-notes">Notes</label>
                <textarea id="task-proof-notes" name="notes" placeholder="Optional notes about the workout, makes, or anything else helpful." />
              </div>
              <div className="action-row field-span-2">
                <button className="button-link" type="submit">
                  Upload Proof
                </button>
              </div>
            </form>
            {proofRows.length > 0 ? (
              <div className="record-stack">
                {proofRows.map((proof) => (
                  <article key={proof.id} className="record-card">
                    <div className="record-card-header">
                      <div>
                        <h4>{proof.submittedByLabel}</h4>
                        <p className="meta">
                          {new Date(proof.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="pill-row">
                        <span className={`pill ${proof.reviewStatus === "rejected" ? "danger" : proof.reviewStatus === "accepted" ? "success" : "alt"}`}>
                          {proof.reviewStatus}
                        </span>
                        <span className="pill alt">{proof.imageUrls.length} photo{proof.imageUrls.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    {proof.notes ? <p>{proof.notes}</p> : null}
                    {proof.reviewStatus === "rejected" && proof.reviewReason ? (
                      <p className="assignment-proof-feedback rejected">{proof.reviewReason}</p>
                    ) : null}
                    <div className="assignment-proof-grid">
                      {proof.imageUrls.map((url, index) => (
                        <a
                          key={`${proof.id}-${index}`}
                          href={url}
                          className="assignment-proof-card"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img src={url} alt={`${assignment.title} proof ${index + 1}`} />
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="meta">No proof has been submitted yet.</p>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}
