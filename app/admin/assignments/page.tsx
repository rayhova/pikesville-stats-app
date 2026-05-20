import {
  createWeekGoalAction,
  deleteProgramAssignmentAction,
  deleteWeekGoalAction,
  reviewProgramAssignmentProofAction,
} from "@/app/admin/actions";
import {
  listGameRows,
  listCoachProfileRows,
  listProgramAssignmentProofRows,
  listManagerProfileRows,
  listPlayLibraryRows,
  listPlayerRosterRows,
  listProgramAssignmentRows,
  listTeamSeasonRows,
  listWeekGoalRows,
} from "@/lib/admin-repository";
import { ProgramAssignmentForm } from "@/components/program-assignment-form";
import {
  formatAssignmentTypeLabel,
  formatDueLabel,
  getWeekGoalRangeLabel,
} from "@/lib/program-hub";

const audienceRoles = [
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "manager", label: "Manager" },
  { value: "player", label: "Player" },
] as const;

export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  const query = searchParams ? await searchParams : undefined;
  const [weekGoals, assignments, proofRows, gameRows, playRows, playerRows, coachRows, managerRows, teamSeasonRows] = await Promise.all([
    listWeekGoalRows(),
    listProgramAssignmentRows(),
    listProgramAssignmentProofRows(),
    listGameRows(),
    listPlayLibraryRows(),
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
    listTeamSeasonRows(),
  ]);

  const ourPlayerRows = playerRows
    .filter((player) => player.teamType === "ours" && player.active)
    .map((player) => {
      const teamSeason = teamSeasonRows.find((row) => row.id === player.teamSeasonId);
      return {
        ...player,
        team: teamSeason ? `${teamSeason.season} · ${teamSeason.label}` : player.team,
      };
    });
  const ourTeamSeasonRows = teamSeasonRows
    .filter((teamSeason) => teamSeason.type === "ours")
    .map((teamSeason) => ({
      id: teamSeason.id,
      label: `${teamSeason.season} · ${teamSeason.name} · ${teamSeason.label}`,
    }));
  const pendingProofRows = proofRows.filter((proof) => proof.reviewStatus === "pending");
  const editingAssignment = assignments.find((assignment) => assignment.id === query?.edit) ?? null;

  return (
    <main>
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Assignments</p>
          <h2>Week Goals And Tasks</h2>
          <p>Create what players and coaches need to see on the homepage, with direct links into plays, reports, video, and player workflow.</p>
        </div>
      </header>

      <section className="table-grid">
        <article className="table-card">
          <h3>Week Goals</h3>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Range</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {weekGoals.map((goal) => (
                <tr key={goal.id}>
                  <td>
                    <strong>{goal.title}</strong>
                    {goal.body ? <p className="meta">{goal.body}</p> : null}
                  </td>
                  <td>{getWeekGoalRangeLabel(goal)}</td>
                  <td>{goal.targetRoles.length > 0 ? goal.targetRoles.join(", ") : "All roles"}</td>
                  <td>{goal.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <form action={deleteWeekGoalAction}>
                      <input type="hidden" name="weekGoalId" value={goal.id} />
                      <button className="button-link ghost danger" type="submit">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {weekGoals.length === 0 ? (
                <tr>
                  <td colSpan={5}>No week goals yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">New Week Goal</p>
          <h3>Create Week Goal</h3>
          <form action={createWeekGoalAction} className="form-grid">
            <div className="field-group field-span-2">
              <label htmlFor="week-goal-title">Title</label>
              <input id="week-goal-title" name="title" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="week-goal-body">Body</label>
              <textarea id="week-goal-body" name="body" />
            </div>
            <div className="field-group">
              <label htmlFor="week-goal-start">Start Date</label>
              <input id="week-goal-start" name="startDate" type="date" />
            </div>
            <div className="field-group">
              <label htmlFor="week-goal-end">End Date</label>
              <input id="week-goal-end" name="endDate" type="date" />
            </div>
            <div className="field-group field-span-2">
              <label>Audience</label>
              <div className="pill-row">
                {audienceRoles.map((role) => (
                  <label key={role.value} className="checkbox-inline">
                    <input name="targetRoles" type="checkbox" value={role.value} />
                    {role.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="checkbox-inline">
              <input name="isActive" type="checkbox" defaultChecked />
              Active
            </label>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Add Week Goal
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="table-grid">
        <article className="table-card">
          <h3>Proof Review</h3>
          <table>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Submitted By</th>
                <th>Submitted</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {pendingProofRows.map((proof) => {
                const assignment = assignments.find((item) => item.id === proof.assignmentId);

                return (
                  <tr key={proof.id}>
                    <td>
                      <strong>{assignment?.title ?? "Assignment"}</strong>
                      {proof.notes ? <p className="meta">{proof.notes}</p> : null}
                    </td>
                    <td>{proof.submittedByLabel}</td>
                    <td>{formatDueLabel(proof.createdAt)}</td>
                    <td>
                      <div className="record-stack">
                        <div className="assignment-proof-grid">
                          {proof.imageUrls.map((url, index) => (
                            <a
                              key={`${proof.id}-${index}`}
                              href={url}
                              className="assignment-proof-card"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img src={url} alt={`${assignment?.title ?? "assignment"} proof ${index + 1}`} />
                            </a>
                          ))}
                        </div>
                        <form action={reviewProgramAssignmentProofAction} className="form-grid">
                          <input type="hidden" name="proofId" value={proof.id} />
                          <input type="hidden" name="assignmentId" value={proof.assignmentId} />
                          <input type="hidden" name="reviewStatus" value="accepted" />
                          <button className="button-link secondary" type="submit">
                            Accept
                          </button>
                        </form>
                        <form action={reviewProgramAssignmentProofAction} className="form-grid">
                          <input type="hidden" name="proofId" value={proof.id} />
                          <input type="hidden" name="assignmentId" value={proof.assignmentId} />
                          <input type="hidden" name="reviewStatus" value="rejected" />
                          <div className="field-group">
                            <label htmlFor={`proof-reason-${proof.id}`}>Reject Reason</label>
                            <textarea
                              id={`proof-reason-${proof.id}`}
                              name="reviewReason"
                              placeholder="Tell them what needs to be fixed or resubmitted."
                            />
                          </div>
                          <button className="button-link ghost danger" type="submit">
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingProofRows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No proof submissions need review right now.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-grid">
        <article className="table-card">
          <h3>Assignments</h3>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Due</th>
                <th>Audience</th>
                <th>Assigned To</th>
                <th>Linked</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <strong>{assignment.title}</strong>
                    {assignment.body ? <p className="meta">{assignment.body}</p> : null}
                  </td>
                  <td>{formatAssignmentTypeLabel(assignment.assignmentType)}</td>
                  <td>{formatDueLabel(assignment.dueAt)}</td>
                  <td>{assignment.targetRoles.length > 0 ? assignment.targetRoles.join(", ") : "All roles"}</td>
                  <td>
                    <div className="record-stack">
                      {assignment.targetRosterMembershipIds.length > 0 ? (
                        <p className="meta">
                          Players: {assignment.targetRosterMembershipIds
                            .map((id) => playerRows.find((player) => player.id === id)?.name)
                            .filter((value): value is string => Boolean(value))
                            .join(", ")}
                        </p>
                      ) : assignment.targetRoles.includes("player") ? (
                        <p className="meta">Players: All Players</p>
                      ) : null}
                      {assignment.targetCoachNames.length > 0 ? (
                        <p className="meta">Coaches: {assignment.targetCoachNames.join(", ")}</p>
                      ) : assignment.targetRoles.includes("coach") ? (
                        <p className="meta">Coaches: All Coaches</p>
                      ) : null}
                      {assignment.targetManagerNames.length > 0 ? (
                        <p className="meta">Managers: {assignment.targetManagerNames.join(", ")}</p>
                      ) : assignment.targetRoles.includes("manager") ? (
                        <p className="meta">Managers: All Managers</p>
                      ) : null}
                      {assignment.targetRoles.includes("admin") ? <p className="meta">Admin: Included</p> : null}
                    </div>
                  </td>
                  <td>
                    {assignment.relatedPlayNames.length > 0
                      ? assignment.relatedPlayNames.join(", ")
                      : assignment.relatedGameTitle ??
                        (assignment.relatedPlayerNames.length > 0 ? assignment.relatedPlayerNames.join(", ") : "None")}
                  </td>
                  <td>
                    <a className="button-link ghost" href={`/admin/assignments?edit=${assignment.id}#edit-assignment`}>
                      Edit
                    </a>
                  </td>
                  <td>
                    <form action={deleteProgramAssignmentAction}>
                      <input type="hidden" name="programAssignmentId" value={assignment.id} />
                      <button className="button-link ghost danger" type="submit">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={7}>No assignments yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <div id="edit-assignment" />
          <p className="eyebrow-label">{editingAssignment ? "Edit Assignment" : "New Assignment"}</p>
          <h3>{editingAssignment ? editingAssignment.title : "Create Assignment"}</h3>
          <ProgramAssignmentForm
            audienceRoles={audienceRoles}
            playRows={playRows}
            gameRows={gameRows}
            teamSeasonRows={ourTeamSeasonRows}
            playerRows={ourPlayerRows}
            coachRows={coachRows}
            managerRows={managerRows}
            mode={editingAssignment ? "edit" : "create"}
            submitLabel={editingAssignment ? "Save Assignment" : "Add Assignment"}
            initialAssignment={editingAssignment ? {
              id: editingAssignment.id,
              title: editingAssignment.title,
              body: editingAssignment.body,
              assignmentType: editingAssignment.assignmentType,
              dueAt: editingAssignment.dueAt,
              isActive: editingAssignment.isActive,
              targetRoles: editingAssignment.targetRoles,
              targetRosterMembershipIds: editingAssignment.targetRosterMembershipIds,
              targetCoachProfileIds: editingAssignment.targetCoachProfileIds,
              targetManagerProfileIds: editingAssignment.targetManagerProfileIds,
              relatedPlayIds: editingAssignment.relatedPlayIds,
              relatedGameId: editingAssignment.relatedGameId,
              relatedPlayerIds: editingAssignment.relatedPlayerIds,
              videoEmbedCode: editingAssignment.videoEmbedCode,
              shotsTarget: editingAssignment.shotsTarget,
              proofRequired: editingAssignment.proofRequired,
              customUrl: editingAssignment.customUrl,
            } : undefined}
          />
        </article>
      </section>
    </main>
  );
}
