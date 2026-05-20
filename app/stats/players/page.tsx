import Link from "next/link";
import { AdminTeamSeasonMultiSelect } from "@/components/admin-team-season-multi-select";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { getAccessSession, requireAccessRole } from "@/lib/access-control";
import {
  listPlayerRosterRows,
  listPlayers,
  listSeasons,
  listTeamSeasonRows,
} from "@/lib/admin-repository";
import {
  formatTeamSeasonOptionLabel,
  pickDefaultPikesvilleVarsityTeamSeason,
} from "@/lib/team-season-selection";

export default async function PlayerDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAccessRole(["admin", "coach", "player"]);
  const session = await getAccessSession();
  const [players, playerRows, seasons, teamSeasonRows] = await Promise.all([
    listPlayers(),
    listPlayerRosterRows(),
    listSeasons(),
    listTeamSeasonRows(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedTeamSeasonIds = [
    ...(typeof resolvedSearchParams.teamSeason === "string"
      ? [resolvedSearchParams.teamSeason]
      : Array.isArray(resolvedSearchParams.teamSeason)
        ? resolvedSearchParams.teamSeason
        : []),
  ].filter(Boolean);
  const defaultTeamSeason = pickDefaultPikesvilleVarsityTeamSeason(teamSeasonRows, seasons);
  const selectedTeamSeasonIds =
    requestedTeamSeasonIds.length > 0
      ? requestedTeamSeasonIds.filter((id) => teamSeasonRows.some((teamSeason) => teamSeason.id === id))
      : defaultTeamSeason
        ? [defaultTeamSeason.id]
        : [];
  const selectedTeamSeasonSet = new Set(selectedTeamSeasonIds);

  const ourPlayerRows = playerRows.filter(
    (row) =>
      row.teamType === "ours" &&
      row.active &&
      (selectedTeamSeasonSet.size === 0 || selectedTeamSeasonSet.has(row.teamSeasonId)),
  );
  const teamSeasonOptions = teamSeasonRows
    .filter((teamSeason) => teamSeason.type === "ours")
    .map((teamSeason) => ({
      value: teamSeason.id,
      label: formatTeamSeasonOptionLabel(teamSeason),
    }));
  const playersWithProfiles = players
    .map((player) => {
      const rows = ourPlayerRows.filter((row) => row.playerId === player.id);
      if (rows.length === 0) {
        return null;
      }

      const currentRow = rows[0];
      const currentSeason =
        seasons.find((season) => season.name === currentRow.season || season.schoolYear === currentRow.season) ??
        null;
      const seasonCount = new Set(rows.map((row) => `${row.season}-${row.teamSeasonId}`)).size;

      return {
        player,
        currentRow,
        currentSeason,
        seasonCount,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.player.lastName.localeCompare(right.player.lastName) || left.player.firstName.localeCompare(right.player.firstName));

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Player Profiles</p>
          <h2>Pikesville Players</h2>
          <p>Open the full player home for stats, shot charts, evaluations, and development plans.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
        </ResponsivePageActions>
      </header>

      <section className="panel-card">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow-label">Roster Filter</p>
            <h3>{selectedTeamSeasonIds.length > 1 ? `${selectedTeamSeasonIds.length} groups selected` : "Current Varsity"}</h3>
            <p className="meta">Defaults to the active season’s Pikesville Varsity roster.</p>
          </div>
          <form method="get" className="form-grid compact-filter-form">
            <div className="field-group">
              <AdminTeamSeasonMultiSelect
                label="Season Teams"
                name="teamSeason"
                options={teamSeasonOptions}
                defaultValues={selectedTeamSeasonIds}
              />
            </div>
            <div className="action-row">
              <button className="button-link ghost" type="submit">
                Apply Filter
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card-grid">
        {playersWithProfiles.map(({ player, currentRow, currentSeason, seasonCount }) => (
          <article key={player.id} className="card player-directory-card">
            <div className="player-directory-card-top">
              {player.photoUrl ? (
                <div className="player-directory-photo">
                  <img src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`} />
                </div>
              ) : (
                <div className="player-directory-photo placeholder">
                  {player.firstName.charAt(0)}
                  {player.lastName.charAt(0)}
                </div>
              )}
              <div>
                <p className="eyebrow-label">{currentSeason?.name ?? "Player Profile"}</p>
                <h2>
                  {player.firstName} {player.lastName}
                </h2>
                <p className="meta">
                  #{currentRow.jersey} · {currentRow.position}
                  {currentRow.height ? ` · ${currentRow.height}` : ""}
                  {player.graduatingClass ? ` · Class of ${player.graduatingClass}` : ""}
                </p>
              </div>
            </div>
            <p className="meta">
              {seasonCount} season{seasonCount === 1 ? "" : "s"} tracked
            </p>
            <div className="action-row">
              <Link
                href={`/stats/players/${player.id}${currentSeason ? `?season=${currentSeason.id}` : ""}`}
                className="button-link"
              >
                Open Player Page
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
