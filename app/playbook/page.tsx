import Link from "next/link";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { PlayEmbedButton } from "@/components/play-embed-button";
import { PlayTagFilterControls } from "@/components/play-tag-filter-controls";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { requireAccessRole } from "@/lib/access-control";
import {
  listPlayLibraryRows,
  listRosterMemberships,
  listSeasons,
  listTeamSeasons,
  listTeamSeasonRows,
} from "@/lib/admin-repository";

function extractIframeSrc(embedCode?: string) {
  if (!embedCode) {
    return undefined;
  }

  const match = embedCode.match(/src=(["'])(.*?)\1/i);
  return match?.[2];
}

function toFamilyLabel(family: string) {
  return family.trim().length > 0 ? family : "General";
}

function normalizeTags(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAccessRole(["admin", "coach", "player"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [playRows, teamRows, teamSeasons, rosterMemberships, seasons] = await Promise.all([
    listPlayLibraryRows(),
    listTeamSeasonRows(),
    listTeamSeasons(),
    listRosterMemberships(),
    listSeasons(),
  ]);
  const activeSeasonIds = new Set(seasons.filter((season) => season.status === "active").map((season) => season.id));
  const activeTeamSeasonIds = new Set(
    teamSeasons.filter((teamSeason) => activeSeasonIds.has(teamSeason.seasonId)).map((teamSeason) => teamSeason.id),
  );
  const playerMembership = session.playerRosterMembershipId
    ? rosterMemberships.find((membership) => membership.id === session.playerRosterMembershipId)
    : undefined;
  const playerVisibleTeamSeasonIds =
    session.role === "player" && playerMembership
      ? new Set(
          rosterMemberships
            .filter(
              (membership) =>
                membership.playerId === playerMembership.playerId &&
                membership.isActive &&
                activeTeamSeasonIds.has(membership.teamSeasonId),
            )
            .map((membership) => membership.teamSeasonId),
        )
      : null;
  const visibleTeamIds =
    playerVisibleTeamSeasonIds && playerVisibleTeamSeasonIds.size > 0
      ? playerVisibleTeamSeasonIds
      : session.role === "player" && playerMembership
        ? new Set([playerMembership.teamSeasonId])
        : null;
  const teamPlayRows = playRows.filter((play) => play.playScope !== "global_opponent");
  const visiblePlayRows = visibleTeamIds
    ? teamPlayRows.filter((play) => play.teamSeasonIds.some((teamSeasonId) => visibleTeamIds.has(teamSeasonId)))
    : teamPlayRows;
  const requestedTags = resolvedSearchParams.tag;
  const activeTags = normalizeTags(
    Array.isArray(requestedTags)
      ? requestedTags
      : typeof requestedTags === "string"
        ? [requestedTags]
        : [],
  );
  const availableTags = normalizeTags(visiblePlayRows.flatMap((play) => play.tags));

  const playbookGroups = teamRows
    .filter((team) => team.type === "ours" && (!visibleTeamIds || visibleTeamIds.has(team.id)))
    .map((team) => {
      const plays = visiblePlayRows
        .filter(
          (play) =>
            play.isActive &&
            play.teamSeasonIds.includes(team.id) &&
            activeTags.every((tag) => play.tags.includes(tag)),
        )
        .sort(
          (left, right) =>
            left.side.localeCompare(right.side) ||
            left.family.localeCompare(right.family) ||
            left.name.localeCompare(right.name),
        );

      return {
        team,
        offense: plays.filter((play) => play.side === "offense"),
        defense: plays.filter((play) => play.side === "defense"),
      };
    })
    .filter((group) => group.offense.length > 0 || group.defense.length > 0);

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Playbook</p>
          <h2>Pikesville Play Library</h2>
          <p>Browse active offensive and defensive concepts, teaching clips, and notes in one place.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
        </ResponsivePageActions>
      </header>

      <section className="table-grid">
        <article className="table-card">
          <PlayTagFilterControls activeTags={activeTags} availableTags={availableTags} />
        </article>
      </section>

      <section className="card-grid">
        {playbookGroups.length > 0 ? (
          playbookGroups.map(({ team, offense, defense }) => (
            <article key={team.id} className="card">
              <p className="eyebrow-label">{team.season}</p>
              <h2>{team.name} {team.label}</h2>
              <p>{offense.length} offense plays · {defense.length} defense plays</p>
            </article>
          ))
        ) : (
          <article className="card">
            <h2>No active plays yet</h2>
            <p>Add active Pikesville plays in Admin to populate the shared playbook.</p>
          </article>
        )}
      </section>

      {playbookGroups.map(({ team, offense, defense }) => (
        <section key={team.id} className="table-grid">
          <article className="table-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow-label">{team.season}</p>
                <h3>{team.name} {team.label}</h3>
              </div>
              <span className="pill alt">Current Plays</span>
            </div>

            <div className="panel-grid reporting-dual-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Offense</p>
                <h3>Offensive Library</h3>
                <div className="playbook-list">
                  {offense.length > 0 ? (
                    offense.map((play) => {
                      const iframeSrc = extractIframeSrc(play.embedCode);

                      return (
                        <article key={play.id} id={`play-${play.id}`} className="playbook-card">
                          <div className="playbook-card-head">
                            <div>
                              <p className="eyebrow-label">{toFamilyLabel(play.family)}</p>
                              <h4>{play.name}</h4>
                            </div>
                            <div className="pill-row">
                              {play.tags.map((tag) => (
                                <span key={tag} className="pill">{tag}</span>
                              ))}
                            </div>
                          </div>
                          {play.notes ? <p className="meta">{play.notes}</p> : null}
                          {iframeSrc || play.imageUrl ? (
                            <div className="action-row">
                              {iframeSrc ? <PlayEmbedButton iframeSrc={iframeSrc} title={`${play.name} video`} /> : null}
                              {play.imageUrl ? (
                                <a href={play.imageUrl} target="_blank" rel="noreferrer" className="button-link ghost">
                                  Open Diagram
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="meta">No active offense plays yet.</p>
                  )}
                </div>
              </article>

              <article className="panel-card">
                <p className="eyebrow-label">Defense</p>
                <h3>Defensive Library</h3>
                <div className="playbook-list">
                  {defense.length > 0 ? (
                    defense.map((play) => {
                      const iframeSrc = extractIframeSrc(play.embedCode);

                      return (
                        <article key={play.id} id={`play-${play.id}`} className="playbook-card">
                          <div className="playbook-card-head">
                            <div>
                              <p className="eyebrow-label">{toFamilyLabel(play.family)}</p>
                              <h4>{play.name}</h4>
                            </div>
                            <div className="pill-row">
                              {play.tags.map((tag) => (
                                <span key={tag} className="pill">{tag}</span>
                              ))}
                            </div>
                          </div>
                          {play.notes ? <p className="meta">{play.notes}</p> : null}
                          {iframeSrc || play.imageUrl ? (
                            <div className="action-row">
                              {iframeSrc ? <PlayEmbedButton iframeSrc={iframeSrc} title={`${play.name} video`} /> : null}
                              {play.imageUrl ? (
                                <a href={play.imageUrl} target="_blank" rel="noreferrer" className="button-link ghost">
                                  Open Diagram
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="meta">No active defense plays yet.</p>
                  )}
                </div>
              </article>
            </div>
          </article>
        </section>
      ))}
    </main>
  );
}
