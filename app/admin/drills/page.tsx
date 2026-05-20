import Link from "next/link";
import {
  bulkUpdateDrillLibraryAction,
  createDrillLibraryAction,
  deleteDrillLibraryAction,
  updateDrillLibraryAction,
} from "@/app/admin/actions";
import { AdminEntryPicker } from "@/components/admin-entry-picker";
import { AdminStringMultiSelect } from "@/components/admin-string-multi-select";
import { PersistenceBadge } from "@/components/persistence-badge";
import {
  getAdminPersistenceMode,
  listDrillLibraryRows,
} from "@/lib/admin-repository";

export default async function DrillsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const drillRows = await listDrillLibraryRows();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedEditId =
    typeof resolvedSearchParams.edit === "string" ? resolvedSearchParams.edit : undefined;
  const selectedDrill = drillRows.find((drill) => drill.id === requestedEditId) ?? drillRows[0] ?? null;
  const saveStatus = typeof resolvedSearchParams.saved === "string" ? resolvedSearchParams.saved : undefined;
  const drillTagOptions = [...new Set(drillRows.flatMap((drill) => drill.tags))]
    .sort((left, right) => left.localeCompare(right))
    .map((tag) => ({ value: tag, label: tag }));
  const persistenceMode = getAdminPersistenceMode();

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Drills</p>
          <h2>Drill Library</h2>
          <p>
            Keep your drill bank in one place so coaches can build practice plans and quickly review teaching clips.
          </p>
        </div>
      </header>

      {saveStatus === "bulk" ? <p className="form-success">Bulk drill edits saved.</p> : null}

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Bulk Edit Drills</p>
          <h3>Update Checked Drills</h3>
          <p className="meta">Blank fields stay unchanged. Selected tags replace the current tag list.</p>
          <form id="bulk-drill-form" action={bulkUpdateDrillLibraryAction} className="form-grid">
            <div className="field-group">
              <label htmlFor="bulk-drill-type">Drill Type</label>
              <input id="bulk-drill-type" name="bulkDrillType" placeholder="Leave blank for no change" />
            </div>
            <div className="field-group">
              <label htmlFor="bulk-drill-play-type">Play Type</label>
              <input id="bulk-drill-play-type" name="bulkPlayType" placeholder="Leave blank for no change" />
            </div>
            <div className="field-group">
              <label htmlFor="bulk-drill-status">Status</label>
              <select id="bulk-drill-status" name="bulkIsActive" defaultValue="">
                <option value="">No change</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="field-group">
              <AdminStringMultiSelect
                label="Tags"
                name="bulkTags"
                options={drillTagOptions}
                placeholder="No tag change"
                allLabel="All tags"
              />
            </div>
            <div className="action-row field-span-2">
              <button className="button-link secondary" type="submit">
                Apply To Checked Drills
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Drill Directory</h3>
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Tags</th>
                  <th>Video</th>
                  <th>Status</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {drillRows.map((drill) => (
                  <tr key={drill.id}>
                    <td>
                      <input
                        form="bulk-drill-form"
                        type="checkbox"
                        name="drillIds"
                        value={drill.id}
                        aria-label={`Select ${drill.title}`}
                      />
                    </td>
                    <td>{drill.title}</td>
                    <td>{drill.drillType || "-"}</td>
                    <td>
                      <div className="pill-row">
                        {drill.tags.map((tag) => (
                          <span key={tag} className="pill">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{drill.videoUrl ? "Saved" : "None"}</td>
                    <td>{drill.isActive ? "active" : "inactive"}</td>
                    <td>
                      <Link
                        href={`/admin/drills?edit=${drill.id}#edit-drill`}
                        className={`button-link ghost ${selectedDrill?.id === drill.id ? "active" : ""}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {drillRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No drills imported yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>

          <article id="edit-drill" className="table-card admin-edit-card">
            <div className="section-heading-row">
              <div>
                <h3>Edit Drill</h3>
                <p className="meta">Choose a drill from the directory and edit one at a time.</p>
              </div>
              <AdminEntryPicker
                id="edit-drill-picker"
                name="edit"
                defaultValue={selectedDrill?.id}
                options={drillRows.map((drill) => ({
                  value: drill.id,
                  label: `${drill.drillType || "General"} · ${drill.title}`,
                }))}
              />
            </div>
            {selectedDrill ? (
              <form key={selectedDrill.id} action={updateDrillLibraryAction} className="management-card">
                <input type="hidden" name="drillId" value={selectedDrill.id} />
                <div className="management-card-header">
                  <div>
                    <p className="eyebrow-label">{selectedDrill.drillType || "General Drill"}</p>
                    <h4>{selectedDrill.title}</h4>
                  </div>
                  <div className="management-actions">
                    <Link href="/drills" className="button-link ghost">
                      Open Library
                    </Link>
                    <button className="button-link secondary" type="submit">
                      Save
                    </button>
                    <button
                      className="button-link ghost danger"
                      type="submit"
                      formAction={deleteDrillLibraryAction}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`drill-title-${selectedDrill.id}`}>Title</label>
                    <input id={`drill-title-${selectedDrill.id}`} name="title" defaultValue={selectedDrill.title} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`drill-legacy-${selectedDrill.id}`}>Legacy ID</label>
                    <input id={`drill-legacy-${selectedDrill.id}`} name="legacyId" defaultValue={selectedDrill.legacyId ?? ""} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`drill-type-${selectedDrill.id}`}>Drill Type</label>
                    <input id={`drill-type-${selectedDrill.id}`} name="drillType" defaultValue={selectedDrill.drillType} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`drill-play-type-${selectedDrill.id}`}>Play Type</label>
                    <input id={`drill-play-type-${selectedDrill.id}`} name="playType" defaultValue={selectedDrill.playType} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`drill-tags-${selectedDrill.id}`}>Tags</label>
                    <input id={`drill-tags-${selectedDrill.id}`} name="tags" defaultValue={selectedDrill.tags.join(", ")} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`drill-description-${selectedDrill.id}`}>Description</label>
                    <textarea id={`drill-description-${selectedDrill.id}`} name="description" defaultValue={selectedDrill.description} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`drill-instructions-${selectedDrill.id}`}>Instructions</label>
                    <textarea id={`drill-instructions-${selectedDrill.id}`} name="instructions" defaultValue={selectedDrill.instructions} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`drill-notes-${selectedDrill.id}`}>Coach Notes</label>
                    <textarea id={`drill-notes-${selectedDrill.id}`} name="notes" defaultValue={selectedDrill.notes} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`drill-video-${selectedDrill.id}`}>Video URL</label>
                    <input id={`drill-video-${selectedDrill.id}`} name="videoUrl" defaultValue={selectedDrill.videoUrl ?? ""} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`drill-image-${selectedDrill.id}`}>Image URL</label>
                    <input id={`drill-image-${selectedDrill.id}`} name="imageUrl" defaultValue={selectedDrill.imageUrl ?? ""} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`drill-active-${selectedDrill.id}`}>Status</label>
                    <select id={`drill-active-${selectedDrill.id}`} name="isActive" defaultValue={selectedDrill.isActive ? "true" : "false"}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </form>
            ) : (
              <p className="meta">No drills available yet.</p>
            )}
          </article>
        </div>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Create Drill</p>
          <h3>New Library Entry</h3>
          <form action={createDrillLibraryAction} className="form-grid">
            <div className="field-group">
              <label htmlFor="drill-title">Title</label>
              <input id="drill-title" name="title" placeholder="Gap Closeout Drill" />
            </div>
            <div className="field-group">
              <label htmlFor="drill-legacy-id">Legacy ID</label>
              <input id="drill-legacy-id" name="legacyId" placeholder="786" />
            </div>
            <div className="field-group">
              <label htmlFor="drill-type">Drill Type</label>
              <input id="drill-type" name="drillType" placeholder="Defense" />
            </div>
            <div className="field-group">
              <label htmlFor="drill-play-type">Play Type</label>
              <input id="drill-play-type" name="playType" placeholder="Optional" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="drill-tags">Tags</label>
              <input id="drill-tags" name="tags" placeholder="closeout, shell, rebounding" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="drill-description">Description</label>
              <textarea id="drill-description" name="description" placeholder="What this drill is for and why you use it." />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="drill-instructions">Instructions</label>
              <textarea id="drill-instructions" name="instructions" placeholder="Step-by-step flow, scoring system, coaching points." />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="drill-notes">Coach Notes</label>
              <textarea id="drill-notes" name="notes" placeholder="Teaching emphasis, substitutions, variations." />
            </div>
            <div className="field-group">
              <label htmlFor="drill-video-url">Video URL</label>
              <input id="drill-video-url" name="videoUrl" placeholder="https://youtu.be/..." />
            </div>
            <div className="field-group">
              <label htmlFor="drill-image-url">Image URL</label>
              <input id="drill-image-url" name="imageUrl" placeholder="Optional diagram link" />
            </div>
            <div className="field-group">
              <label htmlFor="drill-active">Status</label>
              <select id="drill-active" name="isActive" defaultValue="true">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Save Drill
              </button>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}
