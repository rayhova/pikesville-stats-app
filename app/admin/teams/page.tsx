import Link from "next/link";
import {
  createProgramAction,
  createTeamSeasonAction,
  deleteTeamSeasonAction,
  updateTeamSeasonAction,
} from "@/app/admin/actions";
import { AdminEntryPicker } from "@/components/admin-entry-picker";
import { PersistenceBadge } from "@/components/persistence-badge";
import {
  getAdminPersistenceMode,
  listPrograms,
  listSeasons,
  listTeamSeasons,
  listTeamSeasonRows,
} from "@/lib/admin-repository";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [programs, seasons, teamSeasonRows, teamSeasons] = await Promise.all([
    listPrograms(),
    listSeasons(),
    listTeamSeasonRows(),
    listTeamSeasons(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const errorMessage =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : undefined;
  const requestedTeamSeasonId =
    typeof resolvedSearchParams.teamSeason === "string"
      ? resolvedSearchParams.teamSeason
      : undefined;
  const selectedTeamSeason =
    teamSeasons.find((row) => row.id === requestedTeamSeasonId) ?? teamSeasons[0] ?? null;
  const selectedTeamSeasonRow =
    teamSeasonRows.find((row) => row.id === selectedTeamSeason?.id) ?? teamSeasonRows[0] ?? null;
  const selectedProgram = selectedTeamSeason
    ? programs.find((item) => item.id === selectedTeamSeason.programId)
    : null;
  const selectedSeason = selectedTeamSeason
    ? seasons.find((item) => item.id === selectedTeamSeason.seasonId)
    : null;
  const persistenceMode = getAdminPersistenceMode();
  const isOpponentTeamSeason = selectedTeamSeason?.teamType === "opponent";

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Teams</p>
          <h2>Teams</h2>
          <p>
            Manage season-specific team records. Opponent scouting lives at the
            team-season level so it does not accidentally carry across years.
          </p>
        </div>
      </header>

      {errorMessage ? (
        <section className="table-grid">
          <article className="table-card">
            <p className="form-error">{errorMessage}</p>
          </article>
        </section>
      ) : null}

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Team Season Directory</h3>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Season</th>
                  <th>Type</th>
                  <th>Active Players</th>
                  <th>Last Game</th>
                  <th>Scouting</th>
                  <th>Edit</th>
                  <th>Roster</th>
                </tr>
              </thead>
              <tbody>
                {teamSeasonRows.map((team) => (
                  <tr key={team.id}>
                    <td>{team.name}</td>
                    <td>{team.season}</td>
                    <td>{team.type}</td>
                    <td>{team.activePlayers}</td>
                    <td>{team.lastGameDate}</td>
                    <td>{team.scoutingSummary}</td>
                    <td>
                      <Link
                        href={`/admin/teams?teamSeason=${team.id}#edit-team-season`}
                        className={`button-link ghost ${selectedTeamSeason?.id === team.id ? "active" : ""}`}
                      >
                        Edit
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/admin/players?teamSeason=${team.id}`}
                        className="button-link ghost"
                      >
                        Manage Roster
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article id="edit-team-season" className="table-card admin-edit-card">
            <div className="section-heading-row">
              <div>
                <h3>Edit Team Season</h3>
                <p className="meta">Pick a team season from the table and edit one at a time.</p>
              </div>
              <AdminEntryPicker
                id="edit-team-season-picker"
                name="teamSeason"
                defaultValue={selectedTeamSeason?.id}
                options={teamSeasonRows.map((team) => ({
                  value: team.id,
                  label: `${team.season} · ${team.name} · ${team.label}`,
                }))}
              />
            </div>
            {selectedTeamSeason && selectedProgram && selectedSeason && selectedTeamSeasonRow ? (
              <form key={selectedTeamSeason.id} action={updateTeamSeasonAction} className="management-card">
                <input type="hidden" name="teamSeasonId" value={selectedTeamSeason.id} />
                <input type="hidden" name="programId" value={selectedTeamSeason.programId} />
                <input type="hidden" name="returnTeamSeasonId" value={selectedTeamSeason.id} />
                <div className="management-card-header">
                  <div>
                    <p className="eyebrow-label">
                      {selectedSeason.name} · {selectedTeamSeason.teamType}
                    </p>
                    <h4>{selectedProgram.name}</h4>
                  </div>
                  <div className="management-actions">
                    <Link
                      href={`/admin/players?teamSeason=${selectedTeamSeason.id}`}
                      className="button-link ghost"
                    >
                      Roster
                    </Link>
                    <button className="button-link secondary" type="submit">
                      Save
                    </button>
                    <button
                      className="button-link ghost danger"
                      type="submit"
                      formAction={deleteTeamSeasonAction}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`team-name-${selectedTeamSeason.id}`}>Program Name</label>
                    <input
                      id={`team-name-${selectedTeamSeason.id}`}
                      name="name"
                      defaultValue={selectedProgram.name}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`team-short-name-${selectedTeamSeason.id}`}>Short Name</label>
                    <input
                      id={`team-short-name-${selectedTeamSeason.id}`}
                      name="shortName"
                      defaultValue={selectedProgram.shortName}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`team-is-pikesville-${selectedTeamSeason.id}`}>Program Type</label>
                    <select
                      id={`team-is-pikesville-${selectedTeamSeason.id}`}
                      name="isPikesville"
                      defaultValue={selectedProgram.isPikesville ? "true" : "false"}
                    >
                      <option value="true">Pikesville Program</option>
                      <option value="false">Opponent Program</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`team-type-${selectedTeamSeason.id}`}>Team Type</label>
                    <select
                      id={`team-type-${selectedTeamSeason.id}`}
                      name="teamType"
                      defaultValue={selectedTeamSeason.teamType}
                    >
                      <option value="ours">Ours</option>
                      <option value="opponent">Opponent</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`team-label-${selectedTeamSeason.id}`}>Label</label>
                    <input
                      id={`team-label-${selectedTeamSeason.id}`}
                      name="label"
                      defaultValue={selectedTeamSeason.label}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`team-level-${selectedTeamSeason.id}`}>Level</label>
                    <select
                      id={`team-level-${selectedTeamSeason.id}`}
                      name="level"
                      defaultValue={selectedTeamSeason.level ?? selectedTeamSeason.label}
                    >
                      <option value="Varsity">Varsity</option>
                      <option value="JV">JV</option>
                      <option value="Freshman">Freshman</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`team-active-players-${selectedTeamSeason.id}`}>Active Players</label>
                    <input
                      id={`team-active-players-${selectedTeamSeason.id}`}
                      value={String(selectedTeamSeasonRow.activePlayers)}
                      disabled
                    />
                  </div>
                  {isOpponentTeamSeason ? (
                    <>
                      <div className="field-group field-span-2">
                        <label htmlFor={`team-offense-${selectedTeamSeason.id}`}>Offense</label>
                        <textarea
                          id={`team-offense-${selectedTeamSeason.id}`}
                          name="offense"
                          defaultValue={selectedTeamSeason.offense ?? ""}
                        />
                      </div>
                      <div className="field-group field-span-2">
                        <label htmlFor={`team-defense-${selectedTeamSeason.id}`}>Defense</label>
                        <textarea
                          id={`team-defense-${selectedTeamSeason.id}`}
                          name="defense"
                          defaultValue={selectedTeamSeason.defense ?? ""}
                        />
                      </div>
                      <div className="field-group field-span-2">
                        <label htmlFor={`team-press-${selectedTeamSeason.id}`}>Press</label>
                        <textarea
                          id={`team-press-${selectedTeamSeason.id}`}
                          name="press"
                          defaultValue={selectedTeamSeason.press ?? ""}
                        />
                      </div>
                      <div className="field-group field-span-2">
                        <label htmlFor={`team-scouting-summary-${selectedTeamSeason.id}`}>Scouting Summary</label>
                        <textarea
                          id={`team-scouting-summary-${selectedTeamSeason.id}`}
                          name="scoutingSummary"
                          defaultValue={selectedTeamSeason.scoutingSummary ?? ""}
                        />
                      </div>
                      <div className="field-group field-span-2">
                        <label>Scouting Videos</label>
                        <div className="repeatable-stack">
                          {Array.from({
                            length: Math.max(selectedTeamSeason.scoutingVideos?.length ?? 0, 3),
                          }).map((_, index) => (
                            <textarea
                              key={`video-${selectedTeamSeason.id}-${index}`}
                              name="scoutingVideos"
                              defaultValue={selectedTeamSeason.scoutingVideos?.[index] ?? ""}
                              placeholder={`Embed code ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="field-group field-span-2">
                        <label htmlFor={`team-keys-to-winning-${selectedTeamSeason.id}`}>Keys To Winning</label>
                        <textarea
                          id={`team-keys-to-winning-${selectedTeamSeason.id}`}
                          name="keysToWinning"
                          defaultValue={selectedTeamSeason.keysToWinning ?? ""}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </form>
            ) : (
              <p className="meta">No team seasons yet.</p>
            )}
          </article>

          <div className="panel-grid admin-create-grid">
            <article className="panel-card">
              <p className="eyebrow-label">Create Program</p>
              <h3>Program Identity</h3>
              <form action={createProgramAction} className="form-grid">
                <div className="field-group">
                  <label htmlFor="program-create-name">Program Name</label>
                  <input id="program-create-name" name="name" placeholder="Pikesville" />
                </div>
                <div className="field-group">
                  <label htmlFor="program-short-name">Short Name</label>
                  <input
                    id="program-short-name"
                    name="shortName"
                    placeholder="Pikesville"
                  />
                </div>
                <div className="field-group field-span-2">
                  <label htmlFor="is-pikesville">Program Type</label>
                  <select id="is-pikesville" name="isPikesville" defaultValue="false">
                    <option value="false">Opponent Program</option>
                    <option value="true">Pikesville Program</option>
                  </select>
                </div>
                <div className="action-row field-span-2">
                  <button className="button-link" type="submit">
                    Save Program
                  </button>
                </div>
              </form>
            </article>

            <article className="panel-card">
              <p className="eyebrow-label">Create Team Season</p>
              <h3>New Season Team Record</h3>
              <form action={createTeamSeasonAction} className="form-grid">
                <div className="field-group">
                  <label htmlFor="program-name">Program</label>
                  <select id="program-name" name="programId" defaultValue={programs[0]?.id}>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="team-season">Season</label>
                  <select id="team-season" name="seasonId" defaultValue={seasons[0]?.id}>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="team-type">Team Type</label>
                  <select id="team-type" name="teamType" defaultValue="ours">
                    <option value="ours">Ours</option>
                    <option value="opponent">Opponent</option>
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="team-label">Label</label>
                  <input id="team-label" name="label" placeholder="Varsity" defaultValue="Varsity" />
                </div>
                <div className="field-group">
                  <label htmlFor="team-level">Level</label>
                  <select id="team-level" name="level" defaultValue="Varsity">
                    <option value="Varsity">Varsity</option>
                    <option value="JV">JV</option>
                    <option value="Freshman">Freshman</option>
                  </select>
                </div>
                <div className="field-group field-span-2">
                  <p className="meta">
                    Create the team season first. Opponent scouting fields are edited afterward, and
                    Pikesville team seasons do not need those scouting notes here.
                  </p>
                </div>
                <div className="action-row field-span-2">
                  <button className="button-link" type="submit">
                    Save Team Season
                  </button>
                </div>
              </form>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
