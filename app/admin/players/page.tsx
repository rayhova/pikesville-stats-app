import Link from "next/link";
import {
  bulkUpdatePlayerRosterAction,
  createPlayerDevelopmentPlanAction,
  createPlayerEvaluationAction,
  createPlayerWithRosterAction,
  createRosterMembershipAction,
  deletePlayerDevelopmentPlanAction,
  deletePlayerEvaluationAction,
  deleteRosterMembershipAction,
  updatePlayerRosterEntryAction,
} from "@/app/admin/actions";
import { AdminTeamSeasonMultiSelect } from "@/components/admin-team-season-multi-select";
import { PersistenceBadge } from "@/components/persistence-badge";
import {
  getAdminPersistenceMode,
  listPlayerDevelopmentPlans,
  listPlayerEvaluations,
  listPlayerRosterRows,
  listPlayers,
  listRosterMemberships,
  listSeasons,
  listTeamSeasonRows,
} from "@/lib/admin-repository";
import {
  formatTeamSeasonOptionLabel,
  pickDefaultPikesvilleVarsityTeamSeason,
} from "@/lib/team-season-selection";

const DEVELOPMENT_GOAL_TYPE_OPTIONS = [
  { value: "skill_focus", label: "Skill Focus" },
  { value: "physical_development", label: "Physical Development" },
  { value: "behavioral_goals", label: "Behavioral Goals" },
  { value: "tactical_or_team_goals", label: "Tactical Or Team Goals" },
] as const;

const CLOSEOUT_TYPE_OPTIONS = [
  { value: "curry", label: "Curry" },
  { value: "kyrie", label: "Kyrie" },
  { value: "ben", label: "Ben" },
] as const;

const SPEED_TYPE_OPTIONS = [
  { value: "cheetah", label: "Cheetah" },
  { value: "elephant", label: "Elephant" },
  { value: "sloth", label: "Sloth" },
] as const;

const DEFENDER_TYPE_OPTIONS = [
  { value: "glove", label: "Glove" },
  { value: "cone", label: "Cone" },
  { value: "eraser", label: "Eraser" },
] as const;

const DRIVE_PREFERENCE_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "equal_driver", label: "Equal Driver" },
] as const;

const TRAP_PREFERENCE_OPTIONS = [
  { value: "trap", label: "Trap" },
  { value: "do_not_trap", label: "Do Not Trap" },
] as const;

export default async function PlayersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [playerRows, players, teamSeasonRows, seasons, rosterMemberships, playerEvaluations, playerDevelopmentPlans] = await Promise.all([
    listPlayerRosterRows(),
    listPlayers(),
    listTeamSeasonRows(),
    listSeasons(),
    listRosterMemberships(),
    listPlayerEvaluations(),
    listPlayerDevelopmentPlans(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const errorMessage =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : undefined;
  const saveStatus = typeof resolvedSearchParams.saved === "string" ? resolvedSearchParams.saved : undefined;
  const requestedTeamSeasonIds = [
    ...(typeof resolvedSearchParams.teamSeason === "string"
      ? [resolvedSearchParams.teamSeason]
      : Array.isArray(resolvedSearchParams.teamSeason)
        ? resolvedSearchParams.teamSeason
        : []),
    ...(typeof resolvedSearchParams.teamSeasonIds === "string"
      ? [resolvedSearchParams.teamSeasonIds]
      : Array.isArray(resolvedSearchParams.teamSeasonIds)
        ? resolvedSearchParams.teamSeasonIds
        : []),
  ].filter(Boolean);
  const defaultTeamSeason = pickDefaultPikesvilleVarsityTeamSeason(teamSeasonRows, seasons);
  const selectedTeamSeasonIds =
    requestedTeamSeasonIds.length > 0
      ? requestedTeamSeasonIds.filter((id) => teamSeasonRows.some((row) => row.id === id))
      : defaultTeamSeason
        ? [defaultTeamSeason.id]
        : [];
  const selectedTeamSeasonSet = new Set(selectedTeamSeasonIds);
  const rosterStatus =
    resolvedSearchParams.rosterStatus === "all" || resolvedSearchParams.rosterStatus === "inactive"
      ? resolvedSearchParams.rosterStatus
      : "active";
  const selectedTeamSeason =
    teamSeasonRows.find((row) => row.id === selectedTeamSeasonIds[0]) ?? defaultTeamSeason;
  const filteredPlayerRows = playerRows.filter((row) => {
    const matchesTeamSeason =
      selectedTeamSeasonSet.size === 0 || selectedTeamSeasonSet.has(row.teamSeasonId);
    const matchesStatus =
      rosterStatus === "all" ||
      (rosterStatus === "active" ? row.active : !row.active);
    return matchesTeamSeason && matchesStatus;
  });
  const requestedEditId =
    typeof resolvedSearchParams.edit === "string" ? resolvedSearchParams.edit : undefined;
  const selectedPlayerRow =
    filteredPlayerRows.find((row) => row.id === requestedEditId) ?? filteredPlayerRows[0] ?? null;
  const selectedPlayer = selectedPlayerRow
    ? players.find((item) => item.id === selectedPlayerRow.playerId)
    : null;
  const selectedMembership = selectedPlayerRow
    ? rosterMemberships.find((item) => item.id === selectedPlayerRow.id)
    : null;
  const selectedPlayerEvaluations = selectedPlayer
    ? playerEvaluations.filter((item) => item.playerId === selectedPlayer.id)
    : [];
  const selectedShortTermPlans = selectedPlayer
    ? playerDevelopmentPlans.filter(
        (item) => item.playerId === selectedPlayer.id && item.horizon === "short_term",
      )
    : [];
  const selectedLongTermPlans = selectedPlayer
    ? playerDevelopmentPlans.filter(
        (item) => item.playerId === selectedPlayer.id && item.horizon === "long_term",
      )
    : [];
  const reusablePikesvillePlayers = players.filter((player) =>
    playerRows.some(
      (row) => row.playerId === player.id && row.teamType === "ours",
    ),
  );
  const persistenceMode = getAdminPersistenceMode();
  const isPikesvilleRosterEntry = selectedPlayerRow?.teamType === "ours";
  const isOpponentRosterEntry = selectedPlayerRow?.teamType === "opponent";
  const ourTeamSeasonOptions = teamSeasonRows
    .filter((teamSeason) => teamSeason.type === "ours")
    .map((teamSeason) => ({
      value: teamSeason.id,
      label: formatTeamSeasonOptionLabel(teamSeason),
    }));
  const bulkTeamSeasonOptions =
    selectedTeamSeason?.type === "ours"
      ? ourTeamSeasonOptions
        : teamSeasonRows.map((teamSeason) => ({
          value: teamSeason.id,
          label: formatTeamSeasonOptionLabel(teamSeason),
        }));

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      {errorMessage ? (
        <section className="table-grid">
          <article className="table-card">
            <p className="form-error">{errorMessage}</p>
          </article>
        </section>
      ) : null}
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Players</p>
          <h2>Players</h2>
          <p>
            Player identity is persistent, but jersey number, position, height,
            and scouting notes belong to the season roster entry.
          </p>
        </div>
      </header>

      {saveStatus === "bulk" ? <p className="form-success">Bulk player edits saved.</p> : null}

      <section className="panel-card">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow-label">Roster Scope</p>
            <h3>{selectedTeamSeasonIds.length > 1 ? `${selectedTeamSeasonIds.length} groups selected` : selectedTeamSeason ? formatTeamSeasonOptionLabel(selectedTeamSeason) : "No Team Selected"}</h3>
            <p className="meta">
              Defaults to active Varsity for the current season. Add JV or past seasons when you need a wider view.
            </p>
          </div>
          <form method="get" className="form-grid compact-filter-form">
            <div className="field-group">
              <AdminTeamSeasonMultiSelect
                label="Season Teams"
                name="teamSeason"
                options={teamSeasonRows.map((teamSeason) => ({
                  value: teamSeason.id,
                  label: formatTeamSeasonOptionLabel(teamSeason),
                }))}
                defaultValues={selectedTeamSeasonIds}
              />
            </div>
            <div className="field-group">
              <label htmlFor="player-roster-status-filter">Roster Status</label>
              <select id="player-roster-status-filter" name="rosterStatus" defaultValue={rosterStatus}>
                <option value="active">Active</option>
                <option value="all">All</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="action-row">
              <button className="button-link ghost" type="submit">
                Apply Filter
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Bulk Edit Players</p>
          <h3>Update Checked Roster Entries</h3>
          <p className="meta">
            Blank fields stay unchanged. Season Teams adds selected players to those buckets without deleting old season history.
          </p>
          <form id="bulk-player-form" action={bulkUpdatePlayerRosterAction} className="form-grid">
            <input type="hidden" name="returnTeamSeasonId" value={selectedTeamSeason?.id ?? ""} />
            <div className="field-group">
              <label htmlFor="bulk-graduating-class">Graduating Class</label>
              <input id="bulk-graduating-class" name="bulkGraduatingClass" placeholder="Leave blank for no change" />
            </div>
            <div className="field-group">
              <label htmlFor="bulk-position">Position</label>
              <input id="bulk-position" name="bulkPosition" placeholder="Leave blank for no change" />
            </div>
            <div className="field-group">
              <label htmlFor="bulk-roster-status">Roster Status</label>
              <select id="bulk-roster-status" name="bulkIsActive" defaultValue="">
                <option value="">No change</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="bulk-player-role">Role</label>
              <select id="bulk-player-role" name="bulkIsStarter" defaultValue="">
                <option value="">No change</option>
                <option value="true">Starter</option>
                <option value="false">Reserve</option>
              </select>
            </div>
            <div className="field-group field-span-2">
              <AdminTeamSeasonMultiSelect
                label="Season Teams"
                name="bulkTeamSeasonIds"
                options={bulkTeamSeasonOptions}
                defaultValues={[]}
              />
            </div>
            <div className="action-row field-span-2">
              <button className="button-link secondary" type="submit">
                Apply To Checked Players
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="table-grid">
        <div className="two-column">
          <article className="table-card admin-directory-card">
            <h3>Season Roster Entries</h3>
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Player</th>
                  <th>Season</th>
                  <th>Team</th>
                  <th>Position</th>
                  <th>Height</th>
                  <th>Tendencies</th>
                  <th>Matchup Notes</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayerRows.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <input
                        form="bulk-player-form"
                        type="checkbox"
                        name="rosterMembershipIds"
                        value={player.id}
                        aria-label={`Select ${player.name}`}
                      />
                    </td>
                    <td>
                      {player.name} {player.jersey}
                    </td>
                    <td>{player.season}</td>
                    <td>{player.team}</td>
                    <td>{player.position}</td>
                    <td>{player.height}</td>
                    <td>{player.tendencies}</td>
                    <td>{player.matchupNotes}</td>
                    <td>
                      <Link
                        href={`/admin/players?teamSeason=${player.teamSeasonId}&edit=${player.id}#edit-roster-entry`}
                        className={`button-link ghost ${selectedPlayerRow?.id === player.id ? "active" : ""}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredPlayerRows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No roster entries yet for this team season.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>

          <article id="edit-roster-entry" className="table-card admin-edit-card">
            <div className="section-heading-row">
              <div>
                <h3>Edit Roster Entry</h3>
                <p className="meta">Pick a player from the filtered roster table and edit one entry at a time.</p>
              </div>
            </div>
            {selectedPlayerRow && selectedPlayer && selectedMembership ? (
              <form
                key={selectedPlayerRow.id}
                action={updatePlayerRosterEntryAction}
                className="management-card"
              >
                <input type="hidden" name="rosterMembershipId" value={selectedPlayerRow.id} />
                <input type="hidden" name="playerId" value={selectedPlayerRow.playerId} />
                <input type="hidden" name="returnTeamSeasonId" value={selectedPlayerRow.teamSeasonId} />
                <input type="hidden" name="returnEditId" value={selectedPlayerRow.id} />
                <input type="hidden" name="photoUrl" value={selectedPlayer.photoUrl ?? ""} />
                <div className="management-card-header">
                  <div>
                    <p className="eyebrow-label">
                      {selectedPlayerRow.season} · {selectedPlayerRow.team}
                    </p>
                    <h4>{selectedPlayerRow.name} {selectedPlayerRow.jersey}</h4>
                    {isPikesvilleRosterEntry ? (
                      <p className="meta">Pikesville profile fields carry across seasons for this player.</p>
                    ) : isOpponentRosterEntry ? (
                      <p className="meta">Opponent scouting fields stay on this season-specific roster entry.</p>
                    ) : null}
                  </div>
                  <div className="management-actions">
                    <button className="button-link secondary" type="submit">
                      Save
                    </button>
                    <button
                      className="button-link ghost danger"
                      type="submit"
                      formAction={deleteRosterMembershipAction}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`player-first-name-${selectedPlayerRow.id}`}>
                      {isOpponentRosterEntry ? "First Name (Optional)" : "First Name"}
                    </label>
                    <input
                      id={`player-first-name-${selectedPlayerRow.id}`}
                      name="firstName"
                      defaultValue={selectedPlayer.firstName}
                      placeholder={isOpponentRosterEntry ? "Optional" : ""}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`player-last-name-${selectedPlayerRow.id}`}>
                      {isOpponentRosterEntry ? "Last Name (Optional)" : "Last Name"}
                    </label>
                    <input
                      id={`player-last-name-${selectedPlayerRow.id}`}
                      name="lastName"
                      defaultValue={selectedPlayer.lastName}
                      placeholder={isOpponentRosterEntry ? "Optional" : ""}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`player-dominant-hand-${selectedPlayerRow.id}`}>Dominant Hand</label>
                    <select
                      id={`player-dominant-hand-${selectedPlayerRow.id}`}
                      name="dominantHand"
                      defaultValue={selectedPlayer.dominantHand ?? "right"}
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                    </select>
                  </div>
                  {isPikesvilleRosterEntry ? (
                    <>
                      <div className="field-group">
                        <label htmlFor={`player-graduating-class-${selectedPlayerRow.id}`}>Graduating Class</label>
                        <input
                          id={`player-graduating-class-${selectedPlayerRow.id}`}
                          name="graduatingClass"
                          defaultValue={selectedPlayer.graduatingClass ?? ""}
                          placeholder="2027"
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor={`player-birthdate-${selectedPlayerRow.id}`}>Birthdate</label>
                        <input
                          id={`player-birthdate-${selectedPlayerRow.id}`}
                          name="birthdate"
                          type="date"
                          defaultValue={selectedPlayer.birthdate ?? ""}
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor={`player-photo-url-${selectedPlayerRow.id}`}>Player Photo Upload</label>
                        <input
                          id={`player-photo-url-${selectedPlayerRow.id}`}
                          name="photoFile"
                          type="file"
                          accept="image/*"
                        />
                        <p className="meta">Upload a new photo to replace the current one.</p>
                      </div>
                    </>
                  ) : null}
                  <div className="field-group">
                    <label htmlFor={`player-team-season-${selectedPlayerRow.id}`}>Season Team</label>
                    <select
                      id={`player-team-season-${selectedPlayerRow.id}`}
                      name="teamSeasonId"
                      defaultValue={selectedPlayerRow.teamSeasonId}
                    >
                      {teamSeasonRows.map((teamSeason) => (
                        <option key={teamSeason.id} value={teamSeason.id}>
                          {formatTeamSeasonOptionLabel(teamSeason)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`player-jersey-${selectedPlayerRow.id}`}>Jersey</label>
                    <input
                      id={`player-jersey-${selectedPlayerRow.id}`}
                      name="jerseyNumber"
                      defaultValue={selectedMembership.jerseyNumber}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`player-position-${selectedPlayerRow.id}`}>Position</label>
                    <input
                      id={`player-position-${selectedPlayerRow.id}`}
                      name="position"
                      defaultValue={selectedMembership.position}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`player-height-${selectedPlayerRow.id}`}>Height</label>
                    <input
                      id={`player-height-${selectedPlayerRow.id}`}
                      name="height"
                      defaultValue={selectedMembership.height}
                    />
                  </div>
                <div className="field-group">
                  <label htmlFor={`player-active-${selectedPlayerRow.id}`}>Roster Status</label>
                  <select
                    id={`player-active-${selectedPlayerRow.id}`}
                    name="isActive"
                      defaultValue={selectedMembership.isActive ? "true" : "false"}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`player-is-starter-${selectedPlayerRow.id}`}>Role</label>
                    <select
                      id={`player-is-starter-${selectedPlayerRow.id}`}
                      name="isStarter"
                      defaultValue={selectedMembership.isStarter ? "true" : "false"}
                    >
                      <option value="true">Starter</option>
                      <option value="false">Reserve</option>
                    </select>
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`player-tendencies-${selectedPlayerRow.id}`}>Season Tendencies</label>
                    <textarea
                      id={`player-tendencies-${selectedPlayerRow.id}`}
                      name="tendencies"
                      defaultValue={selectedMembership.tendencies ?? ""}
                    />
                  </div>
                  {isOpponentRosterEntry ? (
                    <>
                      <div className="field-group">
                        <label htmlFor={`player-closeout-type-${selectedPlayerRow.id}`}>Closeout Type</label>
                        <select
                          id={`player-closeout-type-${selectedPlayerRow.id}`}
                          name="closeoutType"
                          defaultValue={selectedMembership.closeoutType ?? ""}
                        >
                          <option value="">Not set</option>
                          {CLOSEOUT_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group">
                        <label htmlFor={`player-speed-type-${selectedPlayerRow.id}`}>Speed Type</label>
                        <select
                          id={`player-speed-type-${selectedPlayerRow.id}`}
                          name="speedType"
                          defaultValue={selectedMembership.speedType ?? ""}
                        >
                          <option value="">Not set</option>
                          {SPEED_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group">
                        <label htmlFor={`player-drive-preference-${selectedPlayerRow.id}`}>Drive Preference</label>
                        <select
                          id={`player-drive-preference-${selectedPlayerRow.id}`}
                          name="drivePreference"
                          defaultValue={selectedMembership.drivePreference ?? ""}
                        >
                          <option value="">Not set</option>
                          {DRIVE_PREFERENCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group">
                        <label htmlFor={`player-trap-preference-${selectedPlayerRow.id}`}>Trap Preference</label>
                        <select
                          id={`player-trap-preference-${selectedPlayerRow.id}`}
                          name="trapPreference"
                          defaultValue={selectedMembership.trapPreference ?? ""}
                        >
                          <option value="">Not set</option>
                          {TRAP_PREFERENCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group field-span-2">
                        <label htmlFor={`player-defender-types-${selectedPlayerRow.id}`}>Type Of Defender</label>
                        <select
                          id={`player-defender-types-${selectedPlayerRow.id}`}
                          name="defenderTypes"
                          multiple
                          defaultValue={selectedMembership.defenderTypes ?? []}
                          className="multi-select"
                        >
                          {DEFENDER_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <p className="meta">Hold Command or Ctrl to select multiple.</p>
                      </div>
                      <div className="field-group field-span-2">
                        <label htmlFor={`player-notes-${selectedPlayerRow.id}`}>Player Notes</label>
                        <textarea
                          id={`player-notes-${selectedPlayerRow.id}`}
                          name="playerNotes"
                          defaultValue={selectedMembership.playerNotes ?? ""}
                          placeholder="Opponent scouting notes"
                        />
                      </div>
                    </>
                  ) : null}
                  {isPikesvilleRosterEntry && selectedPlayer.photoUrl ? (
                    <div className="field-group field-span-2">
                      <label>Current Photo</label>
                      <div className="player-photo-preview">
                        <img src={selectedPlayer.photoUrl} alt={`${selectedPlayer.firstName} ${selectedPlayer.lastName}`} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </form>
            ) : (
              <p className="meta">No roster entries yet.</p>
            )}
          </article>

          <div className="panel-grid admin-create-grid">
            <article className="panel-card">
              <p className="eyebrow-label">Create Player + Roster Entry</p>
              <h3>
                {selectedTeamSeason?.type === "ours" ? "New Pikesville Player" : "New Opponent Player"}
              </h3>
              <form action={createPlayerWithRosterAction} className="form-grid">
                <input type="hidden" name="returnTeamSeasonId" value={selectedTeamSeason?.id ?? ""} />
                <div className="field-group">
                  <label htmlFor="first-name">First Name</label>
                  <input
                    id="first-name"
                    name="firstName"
                    placeholder="Kylan"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="last-name">Last Name</label>
                  <input
                    id="last-name"
                    name="lastName"
                    placeholder="Artis"
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="dominant-hand">Dominant Hand</label>
                  <select id="dominant-hand" name="dominantHand" defaultValue="right">
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                  </select>
                </div>
                {selectedTeamSeason?.type === "ours" ? (
                  <>
                    <div className="field-group">
                      <label htmlFor="graduating-class">Graduating Class</label>
                      <input id="graduating-class" name="graduatingClass" placeholder="2027" />
                    </div>
                    <div className="field-group">
                      <label htmlFor="birthdate">Birthdate</label>
                      <input id="birthdate" name="birthdate" type="date" />
                    </div>
                    <div className="field-group field-span-2">
                      <label htmlFor="photo-url">Player Photo Upload</label>
                      <input id="photo-url" name="photoFile" type="file" accept="image/*" />
                      <p className="meta">Optional. Upload a player photo from your device.</p>
                    </div>
                  </>
                ) : null}
                {selectedTeamSeason?.type === "ours" ? (
                  <div className="field-group">
                    <label>Pikesville Season Teams</label>
                    <AdminTeamSeasonMultiSelect
                      label="Season Teams"
                      name="teamSeasonIds"
                      options={ourTeamSeasonOptions}
                      defaultValues={selectedTeamSeason ? [selectedTeamSeason.id] : []}
                    />
                    <p className="meta">Use this for Varsity, JV, and any multi-season communication buckets.</p>
                  </div>
                ) : (
                  <div className="field-group">
                    <label htmlFor="roster-season">Season Team</label>
                    <select
                      id="roster-season"
                      name="teamSeasonId"
                      defaultValue={selectedTeamSeason?.id}
                    >
                      {teamSeasonRows.map((teamSeason) => (
                        <option key={teamSeason.id} value={teamSeason.id}>
                          {formatTeamSeasonOptionLabel(teamSeason)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field-group">
                  <label htmlFor="jersey-number">Jersey Number</label>
                  <input id="jersey-number" name="jerseyNumber" placeholder="#25" />
                </div>
                <div className="field-group">
                  <label htmlFor="position">Position</label>
                  <input id="position" name="position" placeholder="G" required />
                </div>
                <div className="field-group">
                  <label htmlFor="height">Height</label>
                  <input id="height" name="height" placeholder={"6'1\""} />
                </div>
                <div className="field-group">
                  <label htmlFor="active-roster">Roster Status</label>
                  <select id="active-roster" name="isActive" defaultValue="true">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="starter-role">Role</label>
                  <select id="starter-role" name="isStarter" defaultValue="false">
                    <option value="true">Starter</option>
                    <option value="false">Reserve</option>
                  </select>
                </div>
                <div className="field-group field-span-2">
                  <label htmlFor="tendencies">Season Tendencies</label>
                  <textarea
                    id="tendencies"
                    name="tendencies"
                    placeholder="Season-specific tendencies and notes"
                  />
                </div>
                {selectedTeamSeason?.type === "opponent" ? (
                  <>
                    <div className="field-group">
                      <label htmlFor="closeout-type">Closeout Type</label>
                      <select id="closeout-type" name="closeoutType" defaultValue="kyrie">
                        <option value="">Not set</option>
                        {CLOSEOUT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor="speed-type">Speed Type</label>
                      <select id="speed-type" name="speedType" defaultValue="">
                        <option value="">Not set</option>
                        {SPEED_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor="drive-preference">Drive Preference</label>
                      <select id="drive-preference" name="drivePreference" defaultValue="">
                        <option value="">Not set</option>
                        {DRIVE_PREFERENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor="trap-preference">Trap Preference</label>
                      <select id="trap-preference" name="trapPreference" defaultValue="">
                        <option value="">Not set</option>
                        {TRAP_PREFERENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group field-span-2">
                      <label htmlFor="defender-types">Type Of Defender</label>
                      <select id="defender-types" name="defenderTypes" multiple className="multi-select">
                        {DEFENDER_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="meta">Hold Command or Ctrl to select multiple.</p>
                    </div>
                    <div className="field-group field-span-2">
                      <label htmlFor="player-notes">Player Notes</label>
                      <textarea
                        id="player-notes"
                        name="playerNotes"
                        placeholder="Opponent-specific scouting notes"
                      />
                    </div>
                  </>
                ) : null}
                <div className="action-row field-span-2">
                  <button className="button-link" type="submit">
                    Save Player
                  </button>
                </div>
              </form>
            </article>

            {selectedTeamSeason?.type === "ours" ? (
              <article className="panel-card">
                <p className="eyebrow-label">Add Existing Pikesville Player To Season</p>
                <h3>New Roster Membership</h3>
                <form action={createRosterMembershipAction} className="form-grid">
                  <input type="hidden" name="returnTeamSeasonId" value={selectedTeamSeason?.id ?? ""} />
                  <div className="field-group">
                    <label htmlFor="existing-player">Player</label>
                    <select id="existing-player" name="playerId" defaultValue={reusablePikesvillePlayers[0]?.id}>
                      {reusablePikesvillePlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Pikesville Season Teams</label>
                    <AdminTeamSeasonMultiSelect
                      label="Season Teams"
                      name="teamSeasonIds"
                      options={ourTeamSeasonOptions}
                      defaultValues={selectedTeamSeason?.type === "ours" && selectedTeamSeason ? [selectedTeamSeason.id] : []}
                    />
                    <p className="meta">Select Varsity, JV, or multiple season teams at once.</p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="existing-jersey-number">Jersey Number</label>
                    <input
                      id="existing-jersey-number"
                      name="jerseyNumber"
                      placeholder="#25"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="existing-position">Position</label>
                    <input id="existing-position" name="position" placeholder="G" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="existing-height">Height</label>
                    <input id="existing-height" name="height" placeholder={"6'1\""} />
                  </div>
                  <div className="field-group">
                    <label htmlFor="existing-active-roster">Roster Status</label>
                    <select id="existing-active-roster" name="isActive" defaultValue="true">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor="existing-starter-role">Role</label>
                    <select id="existing-starter-role" name="isStarter" defaultValue="false">
                      <option value="true">Starter</option>
                      <option value="false">Reserve</option>
                    </select>
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor="existing-tendencies">Season Tendencies</label>
                    <textarea
                      id="existing-tendencies"
                      name="tendencies"
                      placeholder="Season-specific tendencies and notes"
                    />
                  </div>
                  <div className="action-row field-span-2">
                    <button className="button-link secondary" type="submit">
                      Save Roster Entry
                    </button>
                  </div>
                </form>
              </article>
            ) : (
              <article className="panel-card">
                <p className="eyebrow-label">Opponent Roster Workflow</p>
                <h3>Season-Specific Opponent Players</h3>
                <p className="meta">
                  Opponent players stay attached to this selected season team. Create them from the form above instead of reusing past-season identities. These scouting fields can feed prep views later.
                </p>
              </article>
            )}
          </div>

          {selectedPlayer && isPikesvilleRosterEntry ? (
            <>
              <section className="panel-card player-detail-break">
                <p className="eyebrow-label">Selected Pikesville Player</p>
                <h3>Development And Evaluation</h3>
                <p className="meta">
                  These sections are tied to the selected player above, not the create-player forms.
                </p>
              </section>
              <div className="panel-grid player-development-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Player Evaluations</p>
                <h3>Coach Evaluation History</h3>
                <p className="meta">
                  This is player-specific and should eventually be visible only to the player and approved staff.
                </p>
                <form action={createPlayerEvaluationAction} className="form-grid">
                  <input type="hidden" name="playerId" value={selectedPlayer.id} />
                  <input type="hidden" name="returnTeamSeasonId" value={selectedPlayerRow?.teamSeasonId ?? ""} />
                  <input type="hidden" name="returnEditId" value={selectedPlayerRow?.id ?? ""} />
                  <div className="field-group">
                    <label htmlFor="evaluation-coach-name">Coach</label>
                    <input id="evaluation-coach-name" name="coachName" placeholder="Coach Gotha" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="evaluation-date">Evaluation Date</label>
                    <input id="evaluation-date" type="date" name="evaluationDate" />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor="evaluation-text">Evaluation</label>
                    <textarea
                      id="evaluation-text"
                      name="evaluation"
                      placeholder="Coach evaluation notes. We can swap this to a richer editor later if you want."
                    />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor="evaluation-player-view-text">Player View Evaluation</label>
                    <textarea
                      id="evaluation-player-view-text"
                      name="playerViewEvaluation"
                      placeholder="Optional. Leave blank to auto-generate a kinder player-facing version."
                    />
                  </div>
                  <div className="action-row field-span-2">
                    <button className="button-link secondary" type="submit">
                      Save Evaluation
                    </button>
                  </div>
                </form>
                <div className="record-stack">
                  {selectedPlayerEvaluations.length > 0 ? (
                    selectedPlayerEvaluations.map((evaluation) => (
                      <article key={evaluation.id} className="record-card">
                        <div className="record-card-header">
                          <div>
                            <h4>{evaluation.coachName}</h4>
                            <p className="meta">{evaluation.evaluationDate}</p>
                          </div>
                          <form action={deletePlayerEvaluationAction}>
                            <input type="hidden" name="evaluationId" value={evaluation.id} />
                            <input type="hidden" name="returnTeamSeasonId" value={selectedPlayerRow?.teamSeasonId ?? ""} />
                            <input type="hidden" name="returnEditId" value={selectedPlayerRow?.id ?? ""} />
                            <button className="button-link ghost danger" type="submit">
                              Delete
                            </button>
                          </form>
                        </div>
                        <p>{evaluation.evaluation}</p>
                      </article>
                    ))
                  ) : (
                    <p className="meta">No evaluations saved yet.</p>
                  )}
                </div>
              </article>

              <article className="panel-card">
                <p className="eyebrow-label">Short-Term Development Plan</p>
                <h3>Near-Term Goals</h3>
                <form action={createPlayerDevelopmentPlanAction} className="form-grid">
                  <input type="hidden" name="playerId" value={selectedPlayer.id} />
                  <input type="hidden" name="horizon" value="short_term" />
                  <input type="hidden" name="returnTeamSeasonId" value={selectedPlayerRow?.teamSeasonId ?? ""} />
                  <input type="hidden" name="returnEditId" value={selectedPlayerRow?.id ?? ""} />
                  <div className="field-group">
                    <label htmlFor="short-plan-coach-name">Coach</label>
                    <input id="short-plan-coach-name" name="coachName" placeholder="Coach Gotha" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="short-plan-date">Plan Date</label>
                    <input id="short-plan-date" type="date" name="planDate" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="short-plan-target-date">Target Date</label>
                    <input id="short-plan-target-date" type="date" name="targetDate" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="short-plan-goal-type">Goal Type</label>
                    <select id="short-plan-goal-type" name="goalType" defaultValue="skill_focus">
                      {DEVELOPMENT_GOAL_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor="short-plan-body">Short-Term Plan</label>
                    <textarea id="short-plan-body" name="planBody" placeholder="Short-term focus and action steps" />
                  </div>
                  <div className="action-row field-span-2">
                    <button className="button-link secondary" type="submit">
                      Save Short-Term Plan
                    </button>
                  </div>
                </form>
                <div className="record-stack">
                  {selectedShortTermPlans.length > 0 ? (
                    selectedShortTermPlans.map((plan) => (
                      <article key={plan.id} className="record-card">
                        <div className="record-card-header">
                          <div>
                            <h4>{DEVELOPMENT_GOAL_TYPE_OPTIONS.find((option) => option.value === plan.goalType)?.label ?? plan.goalType}</h4>
                            <p className="meta">
                              {plan.coachName} · {plan.planDate}
                              {plan.targetDate ? ` -> ${plan.targetDate}` : ""}
                            </p>
                          </div>
                          <form action={deletePlayerDevelopmentPlanAction}>
                            <input type="hidden" name="planId" value={plan.id} />
                            <input type="hidden" name="returnTeamSeasonId" value={selectedPlayerRow?.teamSeasonId ?? ""} />
                            <input type="hidden" name="returnEditId" value={selectedPlayerRow?.id ?? ""} />
                            <button className="button-link ghost danger" type="submit">
                              Delete
                            </button>
                          </form>
                        </div>
                        <p>{plan.planBody}</p>
                      </article>
                    ))
                  ) : (
                    <p className="meta">No short-term plans saved yet.</p>
                  )}
                </div>
              </article>

              <article className="panel-card">
                <p className="eyebrow-label">Long-Term Development Plan</p>
                <h3>Big-Picture Development</h3>
                <form action={createPlayerDevelopmentPlanAction} className="form-grid">
                  <input type="hidden" name="playerId" value={selectedPlayer.id} />
                  <input type="hidden" name="horizon" value="long_term" />
                  <input type="hidden" name="returnTeamSeasonId" value={selectedPlayerRow?.teamSeasonId ?? ""} />
                  <input type="hidden" name="returnEditId" value={selectedPlayerRow?.id ?? ""} />
                  <div className="field-group">
                    <label htmlFor="long-plan-coach-name">Coach</label>
                    <input id="long-plan-coach-name" name="coachName" placeholder="Coach Gotha" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="long-plan-date">Plan Date</label>
                    <input id="long-plan-date" type="date" name="planDate" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="long-plan-target-date">Target Date</label>
                    <input id="long-plan-target-date" type="date" name="targetDate" />
                  </div>
                  <div className="field-group">
                    <label htmlFor="long-plan-goal-type">Goal Type</label>
                    <select id="long-plan-goal-type" name="goalType" defaultValue="skill_focus">
                      {DEVELOPMENT_GOAL_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor="long-plan-body">Long-Term Plan</label>
                    <textarea id="long-plan-body" name="planBody" placeholder="Long-term development roadmap" />
                  </div>
                  <div className="action-row field-span-2">
                    <button className="button-link secondary" type="submit">
                      Save Long-Term Plan
                    </button>
                  </div>
                </form>
                <div className="record-stack">
                  {selectedLongTermPlans.length > 0 ? (
                    selectedLongTermPlans.map((plan) => (
                      <article key={plan.id} className="record-card">
                        <div className="record-card-header">
                          <div>
                            <h4>{DEVELOPMENT_GOAL_TYPE_OPTIONS.find((option) => option.value === plan.goalType)?.label ?? plan.goalType}</h4>
                            <p className="meta">
                              {plan.coachName} · {plan.planDate}
                              {plan.targetDate ? ` -> ${plan.targetDate}` : ""}
                            </p>
                          </div>
                          <form action={deletePlayerDevelopmentPlanAction}>
                            <input type="hidden" name="planId" value={plan.id} />
                            <input type="hidden" name="returnTeamSeasonId" value={selectedPlayerRow?.teamSeasonId ?? ""} />
                            <input type="hidden" name="returnEditId" value={selectedPlayerRow?.id ?? ""} />
                            <button className="button-link ghost danger" type="submit">
                              Delete
                            </button>
                          </form>
                        </div>
                        <p>{plan.planBody}</p>
                      </article>
                    ))
                  ) : (
                    <p className="meta">No long-term plans saved yet.</p>
                  )}
                </div>
              </article>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
