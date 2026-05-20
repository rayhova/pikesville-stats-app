import Link from "next/link";
import { createPracticePlanAction, sendEventReminderAction } from "@/app/admin/actions";
import { AdminTeamSeasonMultiSelect } from "@/components/admin-team-season-multi-select";
import { PersistenceBadge } from "@/components/persistence-badge";
import { formatPracticeDate, formatPracticeWindow } from "@/lib/date-format";
import {
  getAdminPersistenceMode,
  listPracticePlanRows,
  listSeasonSummaries,
  listTeamSeasonRows,
} from "@/lib/admin-repository";
import {
  formatTeamSeasonOptionLabel,
  pickDefaultPikesvilleVarsityTeamSeason,
} from "@/lib/team-season-selection";

export default async function AdminPracticesPage() {
  const [practiceRows, seasonRows, teamRows] = await Promise.all([
    listPracticePlanRows(),
    listSeasonSummaries(),
    listTeamSeasonRows(),
  ]);
  const persistenceMode = getAdminPersistenceMode();
  const ourTeamRows = teamRows.filter((team) => team.type === "ours");
  const defaultTeamSeason = pickDefaultPikesvilleVarsityTeamSeason(teamRows, seasonRows);
  const teamSeasonOptions = ourTeamRows.map((team) => ({
    value: team.id,
    label: formatTeamSeasonOptionLabel(team),
  }));

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Practices</p>
          <h2>Practice Plans</h2>
          <p>Build plans from your drill library, keep the schedule organized, and review each session after practice.</p>
        </div>
      </header>

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Practice Directory</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Team</th>
                  <th>Season</th>
                  <th>Blocks</th>
                  <th>Window</th>
                  <th>Notify</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {practiceRows.map((practice) => (
                  <tr key={practice.id}>
                    <td>{formatPracticeDate(practice)}</td>
                    <td>{practice.title}</td>
                    <td>
                      {practice.team}
                      {practice.teamSeasonLabel ? ` · ${practice.teamSeasonLabel}` : ""}
                    </td>
                    <td>{practice.season}</td>
                    <td>{practice.blockCount}</td>
                    <td>{formatPracticeWindow(practice)}</td>
                    <td>
                      <div className="management-actions">
                        <form action={sendEventReminderAction}>
                          <input type="hidden" name="eventKind" value="practice" />
                          <input type="hidden" name="eventId" value={practice.id} />
                          <input type="hidden" name="reminderType" value="attendance" />
                          <button className="button-link ghost" type="submit">
                            RSVP
                          </button>
                        </form>
                        <form action={sendEventReminderAction}>
                          <input type="hidden" name="eventKind" value="practice" />
                          <input type="hidden" name="eventId" value={practice.id} />
                          <input type="hidden" name="reminderType" value="event" />
                          <button className="button-link ghost" type="submit">
                            Practice
                          </button>
                        </form>
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/practices/${practice.id}`} className="button-link ghost">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {practiceRows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No practice plans yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>
        </div>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Create Practice</p>
          <h3>New Practice Plan</h3>
          <form action={createPracticePlanAction} className="form-grid">
            <div className="field-group">
              <label htmlFor="practice-title">Title</label>
              <input id="practice-title" name="title" placeholder="02-25-2026 Practice Plan" />
            </div>
            <div className="field-group">
              <label htmlFor="practice-season">Season</label>
              <select id="practice-season" name="seasonId" defaultValue={seasonRows[0]?.id}>
                {seasonRows.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label>Teams</label>
              <AdminTeamSeasonMultiSelect
                label="Practice Teams"
                name="teamSeasonIds"
                options={teamSeasonOptions}
                defaultValues={defaultTeamSeason ? [defaultTeamSeason.id] : []}
              />
            </div>
            <div className="field-group">
              <label htmlFor="practice-date">Practice Date</label>
              <input id="practice-date" name="practiceDate" type="date" />
            </div>
            <div className="field-group">
              <label htmlFor="practice-start-time">Start Time</label>
              <input id="practice-start-time" name="startTime" type="time" defaultValue="17:00" />
            </div>
            <div className="field-group">
              <label htmlFor="practice-length">Length</label>
              <input id="practice-length" name="lengthMinutes" type="number" min="1" defaultValue="120" />
            </div>
            <div className="field-group">
              <label htmlFor="practice-attendance-mode">Attendance</label>
              <select id="practice-attendance-mode" name="attendanceMode" defaultValue="mandatory">
                <option value="mandatory">Mandatory</option>
                <option value="voluntary">Voluntary</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="practice-capacity">Capacity</label>
              <input id="practice-capacity" name="capacity" type="number" min="1" placeholder="Optional" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="practice-goal">Practice Goal</label>
              <textarea
                id="practice-goal"
                name="practiceGoal"
                placeholder="What are we trying to get out of this practice?"
              />
            </div>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Create Practice Plan
              </button>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}
