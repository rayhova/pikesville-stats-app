import { createSeasonAction, updateSeasonAction } from "@/app/admin/actions";
import { AdminEntryPicker } from "@/components/admin-entry-picker";
import { PersistenceBadge } from "@/components/persistence-badge";
import {
  getAdminPersistenceMode,
  listSeasons,
  listSeasonSummaries,
} from "@/lib/admin-repository";

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const persistenceMode = getAdminPersistenceMode();
  const [seasonSummaries, seasons] = await Promise.all([
    listSeasonSummaries(),
    listSeasons(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedSeasonId =
    typeof resolvedSearchParams.season === "string"
      ? resolvedSearchParams.season
      : undefined;
  const selectedSeason =
    seasons.find((season) => season.id === requestedSeasonId) ??
    seasons.find((season) => season.status === "active") ??
    seasons[0] ??
    null;

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Seasons</p>
          <h2>Seasons</h2>
          <p>
            Seasons are the top-level container for teams, games, scouting, and
            reports. The Active season becomes the default across rosters, players,
            assignments, alerts, and schedule views.
          </p>
        </div>
      </header>

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Season List</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>School Year</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Counts</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {seasonSummaries.map((season) => (
                  <tr key={season.id}>
                    <td>{season.name}</td>
                    <td>{season.schoolYear}</td>
                    <td>{season.status}</td>
                    <td>
                      {season.startDate} to {season.endDate}
                    </td>
                    <td>
                      {season.gameCount} games · {season.teamSeasonCount} team seasons ·{" "}
                      {season.rosterEntryCount} roster entries
                    </td>
                    <td>
                      <a
                        className={`button-link ghost ${selectedSeason?.id === season.id ? "active" : ""}`}
                        href={`/admin/seasons?season=${season.id}#edit-season`}
                      >
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article id="edit-season" className="table-card admin-edit-card">
            <div className="section-heading-row">
              <div>
                <h3>Edit Season</h3>
                <p className="meta">Choose the current season here. Set the season you are working in to Active.</p>
              </div>
              <AdminEntryPicker
                id="season-picker"
                name="season"
                defaultValue={selectedSeason?.id}
                options={seasons.map((season) => ({
                  value: season.id,
                  label: `${season.name} · ${season.schoolYear}`,
                }))}
              />
            </div>
            {selectedSeason ? (
              <form action={updateSeasonAction} className="management-card">
                <input type="hidden" name="seasonId" value={selectedSeason.id} />
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`edit-season-name-${selectedSeason.id}`}>Season Name</label>
                    <input id={`edit-season-name-${selectedSeason.id}`} name="name" defaultValue={selectedSeason.name} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`edit-season-year-${selectedSeason.id}`}>School Year</label>
                    <input id={`edit-season-year-${selectedSeason.id}`} name="schoolYear" defaultValue={selectedSeason.schoolYear} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`edit-season-start-${selectedSeason.id}`}>Start Date</label>
                    <input id={`edit-season-start-${selectedSeason.id}`} name="startDate" type="date" defaultValue={selectedSeason.startDate} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`edit-season-end-${selectedSeason.id}`}>End Date</label>
                    <input id={`edit-season-end-${selectedSeason.id}`} name="endDate" type="date" defaultValue={selectedSeason.endDate} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`edit-season-status-${selectedSeason.id}`}>Status</label>
                    <select id={`edit-season-status-${selectedSeason.id}`} name="status" defaultValue={selectedSeason.status}>
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                </div>
                <div className="action-row">
                  <button className="button-link secondary" type="submit">
                    Save Season
                  </button>
                </div>
              </form>
            ) : (
              <p className="meta">No seasons yet.</p>
            )}
          </article>

          <article className="panel-card admin-create-grid">
            <p className="eyebrow-label">Create Season</p>
            <h3>New Season</h3>
            <form action={createSeasonAction} className="form-grid">
              <div className="field-group">
                <label htmlFor="season-name">Season Name</label>
                <input
                  id="season-name"
                  name="name"
                  placeholder="2026-27 Varsity Season"
                />
              </div>
              <div className="field-group">
                <label htmlFor="school-year">School Year</label>
                <input id="school-year" name="schoolYear" placeholder="2026-2027" />
              </div>
              <div className="field-group">
                <label htmlFor="start-date">Start Date</label>
                <input id="start-date" name="startDate" type="date" />
              </div>
              <div className="field-group">
                <label htmlFor="end-date">End Date</label>
                <input id="end-date" name="endDate" type="date" />
              </div>
              <div className="field-group field-span-2">
                <label htmlFor="season-status">Status</label>
                <select id="season-status" name="status" defaultValue="upcoming">
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div className="action-row field-span-2">
                <button className="button-link" type="submit">
                  Save Season
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </>
  );
}
