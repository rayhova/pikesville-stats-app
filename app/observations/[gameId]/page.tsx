import { notFound } from "next/navigation";
import { CoachGameDayTaskStrip } from "@/components/coach-game-day-task-strip";
import { GameDayHeader } from "@/components/game-day-header";
import { ObservationHeaderActions } from "@/components/observation-header-actions";
import { ObservationWorkbench } from "@/components/observation-workbench";
import { canViewStrategicPrep, requireAccessRole } from "@/lib/access-control";
import {
  type PlayerRosterRow,
  buildLiveBoxScoreFromEvents,
  getGamePrepSnapshot,
  getLiveScorerSnapshot,
  listCoachingObservations,
  listGameEventFeed,
} from "@/lib/admin-repository";

function formatClock(secondsRemaining: number) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildOnFloorWithStats(
  players: PlayerRosterRow[],
  onFloorIds: string[],
  statLookup: Map<string, { points: number; reb: number; fouls: number }>,
) {
  return players.map((player) => {
    const stats = statLookup.get(player.id);

    return {
      id: player.id,
      name: player.name,
      jersey: player.jersey,
      position: player.position,
      points: stats?.points ?? 0,
      rebounds: stats?.reb ?? 0,
      fouls: stats?.fouls ?? 0,
      onFloor: onFloorIds.includes(player.id),
    };
  }).sort((left, right) => {
    if (left.onFloor !== right.onFloor) {
      return left.onFloor ? -1 : 1;
    }

    return left.jersey.localeCompare(right.jersey, undefined, { numeric: true, sensitivity: "base" });
  });
}

export default async function ObservationPage({
  params,
}: Readonly<{
  params: Promise<{ gameId: string }>;
}>) {
  const session = await requireAccessRole(["admin", "coach"]);
  const { gameId } = await params;
  const [snapshot, prep, eventFeed, observations] = await Promise.all([
    getLiveScorerSnapshot(gameId),
    getGamePrepSnapshot(gameId),
    listGameEventFeed(gameId),
    listCoachingObservations(gameId),
  ]);

  if (!snapshot || !prep) {
    notFound();
  }

  const boxScore = buildLiveBoxScoreFromEvents(snapshot, eventFeed);
  const homeLookup = new Map(
    boxScore.homeRows.map((row) => [
      row.rosterMembershipId,
      { points: row.points, reb: row.reb, fouls: row.fouls },
    ]),
  );
  const awayLookup = new Map(
    boxScore.awayRows.map((row) => [
      row.rosterMembershipId,
      { points: row.points, reb: row.reb, fouls: row.fouls },
    ]),
  );
  const homeOnFloor = buildOnFloorWithStats(
    snapshot.homeTeam.roster,
    snapshot.homeTeam.onFloorIds,
    homeLookup,
  );
  const awayOnFloor = buildOnFloorWithStats(
    snapshot.awayTeam.roster,
    snapshot.awayTeam.onFloorIds,
    awayLookup,
  );
  const recentEvents = eventFeed.slice(0, 10);
  const homeOffensePlay =
    snapshot.homeTeam.offensePlays.find((play) => play.id === snapshot.homeOffensePlayId) ?? null;
  const homeDefensePlay =
    snapshot.homeTeam.defensePlays.find((play) => play.id === snapshot.homeDefensePlayId) ?? null;
  const awayOffensePlay =
    snapshot.awayTeam.offensePlays.find((play) => play.id === snapshot.awayOffensePlayId) ?? null;
  const awayDefensePlay =
    snapshot.awayTeam.defensePlays.find((play) => play.id === snapshot.awayDefensePlayId) ?? null;
  const initialSelectedTeamSide =
    snapshot.homeTeam.teamType === "ours"
      ? "home"
      : snapshot.awayTeam.teamType === "ours"
        ? "away"
        : "home";

  return (
    <main className="page-shell">
      <GameDayHeader
        eyebrow="Observation"
        title={snapshot.title}
        meta={snapshot.dateLabel}
        nav={[
          { label: "Scouting", href: `/scouting/${gameId}` },
          ...(canViewStrategicPrep(session.role)
            ? [
                { label: "Game Plan", href: `/scouting/${gameId}/game-plan` },
                { label: "Timeout", href: `/scouting/${gameId}/timeout` },
              ]
            : []),
          { label: "Notes", href: `/observations/${gameId}`, active: true },
        ]}
        actions={
          <>
            <CoachGameDayTaskStrip
              gameId={gameId}
              role={session.role}
              coachProfileId={session.coachProfileId}
              className="coach-task-strip-inline"
            />
            <ObservationHeaderActions
              gameId={gameId}
            />
          </>
        }
      />

      <section className="scoreboard-shell observation-scoreboard">
        <article className="scoreboard-team compact">
          <p className="eyebrow-label">Home</p>
          <h2>{snapshot.homeTeam.name}</h2>
          <div className="scoreboard-score">{snapshot.homeTeam.score}</div>
          <p>
            Fouls {snapshot.homeTeam.fouls} · Full TO {snapshot.homeTeam.fullTimeouts} · 30s{" "}
            {snapshot.homeTeam.thirtyTimeouts}
          </p>
        </article>
        <article className="scoreboard-center compact">
          <p className="eyebrow-label">Live Context</p>
          <div className="scoreboard-clock">{formatClock(snapshot.secondsRemaining)}</div>
          <div className="scoreboard-inline-meta">
            <span>Q{snapshot.quarter}</span>
            <span>
              {snapshot.teamOnOffense === "home"
                ? `${snapshot.homeTeam.name} ball`
                : snapshot.teamOnOffense === "away"
                  ? `${snapshot.awayTeam.name} ball`
                  : "Possession unset"}
            </span>
            <span>{snapshot.status}</span>
            <span>{snapshot.dateLabel}</span>
          </div>
        </article>
        <article className="scoreboard-team compact">
          <p className="eyebrow-label">Away</p>
          <h2>{snapshot.awayTeam.name}</h2>
          <div className="scoreboard-score">{snapshot.awayTeam.score}</div>
          <p>
            Fouls {snapshot.awayTeam.fouls} · Full TO {snapshot.awayTeam.fullTimeouts} · 30s{" "}
            {snapshot.awayTeam.thirtyTimeouts}
          </p>
        </article>
      </section>

      <ObservationWorkbench
        gameId={gameId}
        quarter={snapshot.quarter}
        secondsRemaining={snapshot.secondsRemaining}
        homeTeamName={snapshot.homeTeam.name}
        awayTeamName={snapshot.awayTeam.name}
        homeRoster={homeOnFloor.map((player) => ({
          id: player.id,
          name: player.name,
          jersey: player.jersey,
          position: player.position,
          points: player.points,
          fouls: player.fouls,
          onFloor: player.onFloor,
        }))}
        awayRoster={awayOnFloor.map((player) => ({
          id: player.id,
          name: player.name,
          jersey: player.jersey,
          position: player.position,
          points: player.points,
          fouls: player.fouls,
          onFloor: player.onFloor,
        }))}
        homeOffensePlay={{ id: homeOffensePlay?.id ?? null, name: homeOffensePlay?.name ?? "No offense selected", kind: "offense_play" }}
        homeDefensePlay={{ id: homeDefensePlay?.id ?? null, name: homeDefensePlay?.name ?? "No defense selected", kind: "defense_play" }}
        awayOffensePlay={{ id: awayOffensePlay?.id ?? null, name: awayOffensePlay?.name ?? "No offense selected", kind: "offense_play" }}
        awayDefensePlay={{ id: awayDefensePlay?.id ?? null, name: awayDefensePlay?.name ?? "No defense selected", kind: "defense_play" }}
        homeOffensePlays={snapshot.homeTeam.offensePlays.map((play) => ({
          id: play.id,
          name: play.name,
          kind: "offense_play" as const,
        }))}
        homeDefensePlays={snapshot.homeTeam.defensePlays.map((play) => ({
          id: play.id,
          name: play.name,
          kind: "defense_play" as const,
        }))}
        awayOffensePlays={snapshot.awayTeam.offensePlays.map((play) => ({
          id: play.id,
          name: play.name,
          kind: "offense_play" as const,
        }))}
        awayDefensePlays={snapshot.awayTeam.defensePlays.map((play) => ({
          id: play.id,
          name: play.name,
          kind: "defense_play" as const,
        }))}
        initialSelectedTeamSide={initialSelectedTeamSide}
        observations={observations}
      />

      <section style={{ marginTop: 16 }}>
        <article className="panel-card">
          <p className="eyebrow-label">Live Feed</p>
          <h3>Recent Official Events</h3>
          <div className="event-feed">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <article key={event.id} className={`event-feed-item ${event.teamSide}`}>
                  <div className="event-feed-meta">
                    <span className="pill alt">{event.teamName}</span>
                    <span>
                      Q{event.quarter} · {formatClock(event.secondsRemaining)}
                    </span>
                  </div>
                  <strong>{event.summary}</strong>
                </article>
              ))
            ) : (
              <p className="meta">No official events logged yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="panel-grid" style={{ marginTop: 16 }}>
        <article className="table-card">
          <p className="eyebrow-label">{snapshot.homeTeam.name}</p>
          <h3>Live Player Stats</h3>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>PTS</th>
                <th>REB</th>
                <th>PF</th>
              </tr>
            </thead>
            <tbody>
              {boxScore.homeRows.map((row) => (
                <tr key={row.rosterMembershipId}>
                  <td>
                    #{row.jersey || "--"} {row.playerName}
                  </td>
                  <td>{row.points}</td>
                  <td>{row.reb}</td>
                  <td>{row.fouls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="table-card">
          <p className="eyebrow-label">{snapshot.awayTeam.name}</p>
          <h3>Live Player Stats</h3>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>PTS</th>
                <th>REB</th>
                <th>PF</th>
              </tr>
            </thead>
            <tbody>
              {boxScore.awayRows.map((row) => (
                <tr key={row.rosterMembershipId}>
                  <td>
                    #{row.jersey || "--"} {row.playerName}
                  </td>
                  <td>{row.points}</td>
                  <td>{row.reb}</td>
                  <td>{row.fouls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

    </main>
  );
}
