import Link from "next/link";
import {
  createCoachProfileAction,
  createCoachResponsibilityTemplateAction,
  deleteCoachProfileAction,
  deleteCoachResponsibilityTemplateAction,
  updateCoachProfileAction,
  updateCoachResponsibilityTemplateAction,
} from "@/app/admin/actions";
import { AdminEntryPicker } from "@/components/admin-entry-picker";
import { PersistenceBadge } from "@/components/persistence-badge";
import {
  getAdminPersistenceMode,
  listCoachResponsibilityTemplateRows,
  listCoachProfileRows,
} from "@/lib/admin-repository";

export default async function AdminCoachesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [coachRows, templateRows] = await Promise.all([
    listCoachProfileRows(),
    listCoachResponsibilityTemplateRows(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedEditId =
    typeof resolvedSearchParams.edit === "string" ? resolvedSearchParams.edit : undefined;
  const savedNotice =
    typeof resolvedSearchParams.saved === "string" ? resolvedSearchParams.saved : undefined;
  const selectedCoach = coachRows.find((coach) => coach.id === requestedEditId) ?? coachRows[0] ?? null;
  const persistenceMode = getAdminPersistenceMode();

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Coaches</p>
          <h2>Coach Accounts</h2>
          <p>Create and maintain the coach profiles you’ll attach to staging access and future accounts.</p>
        </div>
      </header>
      {savedNotice ? (
        <p className="form-success">
          {savedNotice === "coach-created"
            ? "Coach created."
            : savedNotice === "coach-saved"
              ? "Coach saved."
              : savedNotice === "responsibility-created"
                ? "Game day responsibility created."
                : savedNotice === "responsibility-saved"
                  ? "Game day responsibility saved."
                  : "Saved."}
        </p>
      ) : null}

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Coach Directory</h3>
            <table>
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Full Name</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {coachRows.map((coach) => (
                  <tr key={coach.id}>
                    <td>{coach.displayName}</td>
                    <td>{coach.fullName}</td>
                    <td>
                      <Link
                        href={`/admin/coaches?edit=${coach.id}#edit-coach`}
                        className={`button-link ghost ${selectedCoach?.id === coach.id ? "active" : ""}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {coachRows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No coaches yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>

          <article id="edit-coach" className="table-card admin-edit-card">
            <div className="section-heading-row">
              <div>
                <h3>Edit Coach</h3>
                <p className="meta">Choose one coach at a time from the directory.</p>
              </div>
              <AdminEntryPicker
                id="edit-coach-picker"
                name="edit"
                defaultValue={selectedCoach?.id}
                options={coachRows.map((coach) => ({
                  value: coach.id,
                  label: `${coach.displayName} · ${coach.fullName}`,
                }))}
              />
            </div>
            {selectedCoach ? (
              <form key={selectedCoach.id} action={updateCoachProfileAction} className="management-card">
                <input type="hidden" name="profileId" value={selectedCoach.id} />
                <input type="hidden" name="currentPhotoUrl" value={selectedCoach.photoUrl ?? ""} />
                <div className="management-card-header">
                  <div>
                    <p className="eyebrow-label">Coach Profile</p>
                    <h4>{selectedCoach.displayName}</h4>
                  </div>
                  <div className="management-actions">
                    <button className="button-link secondary" type="submit">
                      Save
                    </button>
                    <button
                      className="button-link ghost danger"
                      type="submit"
                      formAction={deleteCoachProfileAction}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`coach-display-${selectedCoach.id}`}>Display Name</label>
                    <input
                      id={`coach-display-${selectedCoach.id}`}
                      name="displayName"
                      defaultValue={selectedCoach.displayName}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`coach-full-${selectedCoach.id}`}>Full Name</label>
                    <input
                      id={`coach-full-${selectedCoach.id}`}
                      name="fullName"
                      defaultValue={selectedCoach.fullName}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`coach-role-${selectedCoach.id}`}>Staff Role</label>
                    <input
                      id={`coach-role-${selectedCoach.id}`}
                      name="staffRole"
                      defaultValue={selectedCoach.staffRole ?? ""}
                      placeholder="Assistant Coach"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`coach-photo-${selectedCoach.id}`}>Photo</label>
                    <input
                      id={`coach-photo-${selectedCoach.id}`}
                      name="photoFile"
                      type="file"
                      accept="image/*"
                    />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`coach-bio-${selectedCoach.id}`}>Bio</label>
                    <textarea
                      id={`coach-bio-${selectedCoach.id}`}
                      name="bio"
                      rows={4}
                      defaultValue={selectedCoach.bio ?? ""}
                    />
                  </div>
                </div>
                {selectedCoach.photoUrl ? (
                  <div className="field-group">
                    <label>Current Photo</label>
                    <img src={selectedCoach.photoUrl} alt={selectedCoach.displayName} className="staff-profile-photo-preview" />
                  </div>
                ) : null}
              </form>
            ) : (
              <p className="meta">No coaches available yet.</p>
            )}
          </article>
        </div>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Create Coach</p>
          <h3>New Coach Profile</h3>
          <form action={createCoachProfileAction} className="form-grid">
            <div className="field-group">
              <label htmlFor="coach-display-name">Display Name</label>
              <input id="coach-display-name" name="displayName" placeholder="Coach Mike" />
            </div>
            <div className="field-group">
              <label htmlFor="coach-full-name">Full Name</label>
              <input id="coach-full-name" name="fullName" placeholder="Michael Wertlieb" />
            </div>
            <div className="field-group">
              <label htmlFor="coach-staff-role">Staff Role</label>
              <input id="coach-staff-role" name="staffRole" placeholder="Assistant Coach" />
            </div>
            <div className="field-group">
              <label htmlFor="coach-photo-file">Photo</label>
              <input id="coach-photo-file" name="photoFile" type="file" accept="image/*" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="coach-bio">Bio</label>
              <textarea id="coach-bio" name="bio" rows={4} placeholder="Short staff bio" />
            </div>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Add Coach
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="table-grid">
        <article id="coach-responsibility-baseline" className="table-card admin-directory-card">
          <h3>Game Day Responsibility Baseline</h3>
          <p className="meta">
            These rows preload the coaching responsibilities on each game plan card and drive coach-facing game day assignments.
          </p>
          <div className="management-list">
            {templateRows.map((template) => (
              <form key={template.id} action={updateCoachResponsibilityTemplateAction} className="management-card">
                <input type="hidden" name="templateId" value={template.id} />
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`template-label-${template.id}`}>Responsibility</label>
                    <input
                      id={`template-label-${template.id}`}
                      name="label"
                      defaultValue={template.label}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`template-coach-${template.id}`}>Coach</label>
                    <select
                      id={`template-coach-${template.id}`}
                      name="coachProfileId"
                      defaultValue={template.coachProfileId ?? ""}
                    >
                      <option value="">Unassigned</option>
                      {coachRows.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`template-order-${template.id}`}>Sort Order</label>
                    <input
                      id={`template-order-${template.id}`}
                      name="sortOrder"
                      type="number"
                      min="1"
                      defaultValue={template.sortOrder}
                    />
                  </div>
                </div>
                <div className="management-actions">
                  <button className="button-link secondary" type="submit">
                    Save
                  </button>
                  <button
                    className="button-link ghost danger"
                    type="submit"
                    formAction={deleteCoachResponsibilityTemplateAction}
                  >
                    Delete
                  </button>
                </div>
              </form>
            ))}
          </div>
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Create Responsibility</p>
          <h3>New Game Day Responsibility</h3>
          <form action={createCoachResponsibilityTemplateAction} className="form-grid">
            <div className="field-group field-span-2">
              <label htmlFor="coach-responsibility-label">Responsibility</label>
              <input id="coach-responsibility-label" name="label" placeholder="Late Game TO/Strategy" />
            </div>
            <div className="field-group">
              <label htmlFor="coach-responsibility-coach">Coach</label>
              <select id="coach-responsibility-coach" name="coachProfileId" defaultValue="">
                <option value="">Unassigned</option>
                {coachRows.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="coach-responsibility-order">Sort Order</label>
              <input id="coach-responsibility-order" name="sortOrder" type="number" min="1" defaultValue={templateRows.length + 1} />
            </div>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Add Responsibility
              </button>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}
