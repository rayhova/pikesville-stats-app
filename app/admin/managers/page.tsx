import Link from "next/link";
import {
  createManagerProfileAction,
  deleteManagerProfileAction,
  updateManagerProfileAction,
} from "@/app/admin/actions";
import { AdminEntryPicker } from "@/components/admin-entry-picker";
import { PersistenceBadge } from "@/components/persistence-badge";
import {
  getAdminPersistenceMode,
  listManagerProfileRows,
} from "@/lib/admin-repository";

export default async function AdminManagersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const managerRows = await listManagerProfileRows();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedEditId =
    typeof resolvedSearchParams.edit === "string" ? resolvedSearchParams.edit : undefined;
  const selectedManager = managerRows.find((manager) => manager.id === requestedEditId) ?? managerRows[0] ?? null;
  const persistenceMode = getAdminPersistenceMode();

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Managers</p>
          <h2>Manager Accounts</h2>
          <p>Create and maintain the manager profiles that only get calendar and assignment access.</p>
        </div>
      </header>

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Manager Directory</h3>
            <table>
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Full Name</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {managerRows.map((manager) => (
                  <tr key={manager.id}>
                    <td>{manager.displayName}</td>
                    <td>{manager.fullName}</td>
                    <td>
                      <Link
                        href={`/admin/managers?edit=${manager.id}#edit-manager`}
                        className={`button-link ghost ${selectedManager?.id === manager.id ? "active" : ""}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {managerRows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No managers yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>

          <article id="edit-manager" className="table-card admin-edit-card">
            <div className="section-heading-row">
              <div>
                <h3>Edit Manager</h3>
                <p className="meta">Choose one manager at a time from the directory.</p>
              </div>
              <AdminEntryPicker
                id="edit-manager-picker"
                name="edit"
                defaultValue={selectedManager?.id}
                options={managerRows.map((manager) => ({
                  value: manager.id,
                  label: `${manager.displayName} · ${manager.fullName}`,
                }))}
              />
            </div>
            {selectedManager ? (
              <form key={selectedManager.id} action={updateManagerProfileAction} className="management-card">
                <input type="hidden" name="profileId" value={selectedManager.id} />
                <div className="management-card-header">
                  <div>
                    <p className="eyebrow-label">Manager Profile</p>
                    <h4>{selectedManager.displayName}</h4>
                  </div>
                  <div className="management-actions">
                    <button className="button-link secondary" type="submit">
                      Save
                    </button>
                    <button
                      className="button-link ghost danger"
                      type="submit"
                      formAction={deleteManagerProfileAction}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`manager-display-${selectedManager.id}`}>Display Name</label>
                    <input
                      id={`manager-display-${selectedManager.id}`}
                      name="displayName"
                      defaultValue={selectedManager.displayName}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`manager-full-${selectedManager.id}`}>Full Name</label>
                    <input
                      id={`manager-full-${selectedManager.id}`}
                      name="fullName"
                      defaultValue={selectedManager.fullName}
                    />
                  </div>
                </div>
              </form>
            ) : (
              <p className="meta">No managers available yet.</p>
            )}
          </article>
        </div>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Create Manager</p>
          <h3>New Manager Profile</h3>
          <form action={createManagerProfileAction} className="form-grid">
            <div className="field-group">
              <label htmlFor="manager-display-name">Display Name</label>
              <input id="manager-display-name" name="displayName" placeholder="Manager Jordan" />
            </div>
            <div className="field-group">
              <label htmlFor="manager-full-name">Full Name</label>
              <input id="manager-full-name" name="fullName" placeholder="Jordan Thomas" />
            </div>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Add Manager
              </button>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}
