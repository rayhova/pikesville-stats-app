import Link from "next/link";
import {
  bulkUpdatePlayLibraryAction,
  createPlayLibraryAction,
  deletePlayLibraryAction,
  updatePlayLibraryAction,
} from "@/app/admin/actions";
import { AdminEntryPicker } from "@/components/admin-entry-picker";
import { AdminStringMultiSelect } from "@/components/admin-string-multi-select";
import { AdminTeamSeasonMultiSelect } from "@/components/admin-team-season-multi-select";
import { PersistenceBadge } from "@/components/persistence-badge";
import {
  getAdminPersistenceMode,
  listPlayLibraryRows,
  listTeamSeasonRows,
} from "@/lib/admin-repository";

export default async function PlaysPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [playRows, teamSeasonRows] = await Promise.all([
    listPlayLibraryRows(),
    listTeamSeasonRows(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedEditId =
    typeof resolvedSearchParams.edit === "string" ? resolvedSearchParams.edit : undefined;
  const saveStatus =
    typeof resolvedSearchParams.saved === "string"
      ? resolvedSearchParams.saved
      : typeof resolvedSearchParams.error === "string"
        ? resolvedSearchParams.error
        : undefined;
  const selectedPlay = playRows.find((play) => play.id === requestedEditId) ?? playRows[0] ?? null;
  const teamSeasonOptions = teamSeasonRows.map((team) => ({
    value: team.id,
    label: `${team.season} · ${team.name} · ${team.label}`,
  }));
  const playTagOptions = [...new Set(playRows.flatMap((play) => play.tags))]
    .sort((left, right) => left.localeCompare(right))
    .map((tag) => ({ value: tag, label: tag }));
  const persistenceMode = getAdminPersistenceMode();

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Plays</p>
          <h2>Play Libraries</h2>
          <p>
            Plays are reusable context libraries for both your team and opponents.
            They stay selected live and are attached to events while active.
          </p>
        </div>
      </header>

      {saveStatus === "bulk" ? <p className="form-success">Bulk play edits saved.</p> : null}

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Bulk Edit Plays</p>
          <h3>Update Checked Plays</h3>
          <p className="meta">Blank fields stay unchanged. Selected tags and season teams replace the current values.</p>
          <form id="bulk-play-form" action={bulkUpdatePlayLibraryAction} className="form-grid">
            <div className="field-group">
              <label htmlFor="bulk-play-family">Play Family</label>
              <input id="bulk-play-family" name="bulkPlayFamily" placeholder="Leave blank for no change" />
            </div>
            <div className="field-group">
              <label htmlFor="bulk-play-status">Status</label>
              <select id="bulk-play-status" name="bulkIsActive" defaultValue="">
                <option value="">No change</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="field-group">
              <AdminTeamSeasonMultiSelect
                label="Season Teams"
                name="bulkTeamSeasonIds"
                options={teamSeasonOptions}
                defaultValues={[]}
              />
            </div>
            <div className="field-group">
              <AdminStringMultiSelect
                label="Tags"
                name="bulkTags"
                options={playTagOptions}
                placeholder="No tag change"
                allLabel="All tags"
              />
            </div>
            <div className="action-row field-span-2">
              <button className="button-link secondary" type="submit">
                Apply To Checked Plays
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Play Directory</h3>
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Play</th>
                  <th>Family</th>
                  <th>Side</th>
                  <th>Owner</th>
                  <th>Scope</th>
                  <th>Team</th>
                  <th>Media</th>
                  <th>Embed</th>
                  <th>Status</th>
                  <th>Tags</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {playRows.map((play) => (
                  <tr key={play.id}>
                    <td>
                      <input
                        form="bulk-play-form"
                        type="checkbox"
                        name="playIds"
                        value={play.id}
                        aria-label={`Select ${play.name}`}
                      />
                    </td>
                    <td>{play.name}</td>
                    <td>{play.family}</td>
                    <td>{play.side}</td>
                    <td>{play.owner}</td>
                    <td>{play.playScope === "global_opponent" ? "Global opponent" : "Team-specific"}</td>
                    <td>
                      {play.teamSeasonIds
                        .map((teamSeasonId) => teamSeasonRows.find((team) => team.id === teamSeasonId))
                        .filter(Boolean)
                        .map((team) => `${team?.season} · ${team?.name} · ${team?.label}`)
                        .join(", ") || play.team}
                    </td>
                    <td>{play.imageUrl ? <a href={play.imageUrl} target="_blank" rel="noreferrer">Open</a> : "None"}</td>
                    <td>{play.embedCode ? "Saved" : "None"}</td>
                    <td>{play.isActive ? "active" : "inactive"}</td>
                    <td>
                      <div className="pill-row">
                        {play.tags.map((tag) => (
                          <span key={tag} className="pill">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/admin/plays?edit=${play.id}#edit-play`}
                        className={`button-link ghost ${selectedPlay?.id === play.id ? "active" : ""}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article id="edit-play" className="table-card admin-edit-card">
            <div className="section-heading-row">
              <div>
                <h3>Edit Play</h3>
                <p className="meta">Choose a play from the directory and edit one at a time.</p>
              </div>
              <AdminEntryPicker
                id="edit-play-picker"
                name="edit"
                defaultValue={selectedPlay?.id}
                options={playRows.map((play) => ({
                  value: play.id,
                  label: `${play.team} · ${play.side} · ${play.name}`,
                }))}
              />
            </div>
            {saveStatus === "1" ? (
              <p className="form-success">Play saved.</p>
            ) : saveStatus === "save" ? (
              <p className="form-error">Couldn&apos;t save that play. Please try again.</p>
            ) : saveStatus === "season-team" ? (
              <p className="form-error">Select at least one season team.</p>
            ) : null}
            {selectedPlay ? (
              <form key={selectedPlay.id} action={updatePlayLibraryAction} className="management-card">
                <input type="hidden" name="playId" value={selectedPlay.id} />
                <div className="management-card-header">
                  <div>
                    <p className="eyebrow-label">
                      {selectedPlay.team} · {selectedPlay.side}
                    </p>
                    <h4>{selectedPlay.name}</h4>
                  </div>
                  <div className="management-actions">
                    <button className="button-link secondary" type="submit">
                      Save
                    </button>
                    <button
                      className="button-link ghost danger"
                      type="submit"
                      formAction={deletePlayLibraryAction}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`play-scope-${selectedPlay.id}`}>Scope</label>
                    <select
                      id={`play-scope-${selectedPlay.id}`}
                      name="playScope"
                      defaultValue={selectedPlay.playScope}
                    >
                      <option value="team">Team-specific play</option>
                      <option value="global_opponent">Global opponent action</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <AdminTeamSeasonMultiSelect
                      label="Season Teams"
                      name="teamSeasonIds"
                      options={teamSeasonOptions}
                      defaultValues={selectedPlay.teamSeasonIds.length ? selectedPlay.teamSeasonIds : [selectedPlay.teamSeasonId]}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`play-side-${selectedPlay.id}`}>Side</label>
                    <select
                      id={`play-side-${selectedPlay.id}`}
                      name="playSide"
                      defaultValue={selectedPlay.side}
                    >
                      <option value="offense">Offense</option>
                      <option value="defense">Defense</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`play-name-${selectedPlay.id}`}>Play Name</label>
                    <input id={`play-name-${selectedPlay.id}`} name="playName" defaultValue={selectedPlay.name} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`play-family-${selectedPlay.id}`}>Play Family</label>
                    <input id={`play-family-${selectedPlay.id}`} name="playFamily" defaultValue={selectedPlay.family} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`play-tags-${selectedPlay.id}`}>Tags</label>
                    <input
                      id={`play-tags-${selectedPlay.id}`}
                      name="tags"
                      defaultValue={selectedPlay.tags.join(", ")}
                    />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`play-notes-${selectedPlay.id}`}>Notes</label>
                    <textarea id={`play-notes-${selectedPlay.id}`} name="notes" defaultValue={selectedPlay.notes} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`play-image-url-${selectedPlay.id}`}>Play Image URL</label>
                    <input
                      id={`play-image-url-${selectedPlay.id}`}
                      name="imageUrl"
                      defaultValue={selectedPlay.imageUrl ?? ""}
                    />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`play-embed-code-${selectedPlay.id}`}>Embed Code</label>
                    <textarea
                      id={`play-embed-code-${selectedPlay.id}`}
                      name="embedCode"
                      defaultValue={selectedPlay.embedCode ?? ""}
                      placeholder="<iframe ...></iframe>"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`play-active-${selectedPlay.id}`}>Status</label>
                    <select
                      id={`play-active-${selectedPlay.id}`}
                      name="isActive"
                      defaultValue={selectedPlay.isActive ? "true" : "false"}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </form>
            ) : (
              <p className="meta">No plays available yet.</p>
            )}
          </article>
        </div>
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Create Play</p>
          <h3>New Library Entry</h3>
          <form action={createPlayLibraryAction} className="form-grid">
            <div className="field-group">
              <label htmlFor="play-scope">Scope</label>
              <select id="play-scope" name="playScope" defaultValue="team">
                <option value="team">Team-specific play</option>
                <option value="global_opponent">Global opponent action</option>
              </select>
            </div>
            <div className="field-group">
              <AdminTeamSeasonMultiSelect
                label="Season Teams"
                name="teamSeasonIds"
                options={teamSeasonOptions}
                defaultValues={teamSeasonRows[0]?.id ? [teamSeasonRows[0].id] : []}
              />
            </div>
            <div className="field-group">
              <label htmlFor="play-side">Side</label>
              <select id="play-side" name="playSide" defaultValue="offense">
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="play-name">Play Name</label>
              <input id="play-name" name="playName" placeholder="Horns" />
            </div>
            <div className="field-group">
              <label htmlFor="play-family">Play Family</label>
              <input id="play-family" name="playFamily" placeholder="Half Court" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="play-tags">Tags</label>
              <input
                id="play-tags"
                name="tags"
                placeholder="zone, half court, sideline out of bounds"
              />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="play-notes">Notes</label>
              <textarea
                id="play-notes"
                name="notes"
                placeholder="When to use it, counters, reminders, or scouting details"
              />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="play-image-url">Play Image URL</label>
              <input
                id="play-image-url"
                name="imageUrl"
                placeholder="https://... or a hosted diagram/image URL"
              />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="play-embed-code">Embed Code</label>
              <textarea
                id="play-embed-code"
                name="embedCode"
                placeholder="<iframe src='https://app.thehoopsgeek.com/...'></iframe>"
              />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="play-active">Status</label>
              <select id="play-active" name="isActive" defaultValue="true">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Save Play
              </button>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}
