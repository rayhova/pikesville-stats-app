import Link from "next/link";
import { notFound } from "next/navigation";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { PlayerCoachDevelopmentForm } from "@/components/player-coach-development-form";
import { PlayerCoachEvaluationForm } from "@/components/player-coach-evaluation-form";
import { PlayerSelfServiceForm } from "@/components/player-self-service-form";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { SharePageButton } from "@/components/share-page-button";
import { ShotChartDisplay } from "@/components/shot-chart-display";
import { StatsModeToggle } from "@/components/stats-mode-toggle";
import { StatsOverlayTabNav } from "@/components/stats-overlay-tab-nav";
import { StatsQuarterFilterControls } from "@/components/stats-quarter-filter-controls";
import { requireAccessRole } from "@/lib/access-control";
import { formatCompactDate } from "@/lib/date-format";
import {
  getLiveScorerSnapshot,
  listAdminProfiles,
  listGameEventFeed,
  listGameRows,
  listPlayerDevelopmentPlans,
  listPlayerEvaluations,
  listPlayerParentContacts,
  listPlayerRosterRows,
  listPlayers,
  listSeasons,
} from "@/lib/admin-repository";
import {
  buildGameStatsReport,
  buildReportHref,
  calculateEffectiveFieldGoalPercentage,
  calculateFreeThrowRate,
  calculateGameEfficiency,
  calculatePointsPerShot,
  calculateTrueShootingPercentage,
  formatDecimal,
  formatMinutes,
  formatPct,
  formatQuarterSummary,
  formatRatio,
  getAvailableQuarters,
  parseQuarterFilter,
  parseStatMode,
} from "@/lib/reporting";

type PlayerStatsTab =
  | "player"
  | "player-advanced"
  | "shots"
  | "games"
  | "development"
  | "evaluations";

function parsePlayerStatsTab(value: string | string[] | undefined): PlayerStatsTab {
  const tabValue = Array.isArray(value) ? value[0] : value;
  return tabValue === "player-advanced" ||
    tabValue === "shots" ||
    tabValue === "games" ||
    tabValue === "development" ||
    tabValue === "evaluations"
    ? tabValue
    : "player";
}

function formatValue(total: number, gameCount: number, statMode: "totals" | "per-game", digits = 1) {
  if (statMode === "per-game") {
    return formatDecimal(gameCount > 0 ? total / gameCount : 0, digits);
  }

  return String(total);
}

function formatValueOrSigned(total: number, gameCount: number, statMode: "totals" | "per-game", digits = 1) {
  const value = statMode === "per-game" ? (gameCount > 0 ? total / gameCount : 0) : total;
  if (value > 0) {
    return `+${formatDecimal(value, statMode === "per-game" ? digits : 0)}`;
  }

  return formatDecimal(value, statMode === "per-game" ? digits : 0);
}

function formatMinutesValue(seconds: number, gameCount: number, statMode: "totals" | "per-game") {
  return statMode === "per-game"
    ? formatMinutes(gameCount > 0 ? seconds / gameCount : 0)
    : formatMinutes(seconds);
}

function formatPctLine(makes: number, attempts: number, gameCount: number, statMode: "totals" | "per-game") {
  if (statMode === "per-game") {
    return `${formatValue(makes, gameCount, statMode)}/${formatValue(attempts, gameCount, statMode)} (${makes === 0 && attempts === 0 ? "-" : ((makes / Math.max(attempts, 1)) * 100).toFixed(1)}%)`;
  }

  return formatPct(makes, attempts);
}

function normalizeGoalType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pickDefaultSeasonId(
  availableSeasons: Awaited<ReturnType<typeof listSeasons>>,
) {
  const activeSeason = availableSeasons.find((season) => season.status === "active");
  if (activeSeason) {
    return activeSeason.id;
  }

  return [...availableSeasons].sort((left, right) => right.startDate.localeCompare(left.startDate))[0]?.id;
}

export default async function PlayerStatsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{
    quarter?: string | string[];
    tab?: string | string[];
    mode?: string | string[];
    season?: string | string[];
  }>;
}>) {
  const session = await requireAccessRole(["admin", "coach", "player"]);
  const { playerId } = await params;
  const query = await searchParams;
  const [
    players,
    playerRows,
    seasons,
    games,
    evaluations,
    developmentPlans,
    parentContacts,
    adminProfiles,
  ] = await Promise.all([
    listPlayers(),
    listPlayerRosterRows(),
    listSeasons(),
    listGameRows(),
    listPlayerEvaluations(),
    listPlayerDevelopmentPlans(),
    listPlayerParentContacts(),
    listAdminProfiles(),
  ]);

  const player = players.find((entry) => entry.id === playerId);

  if (!player) {
    notFound();
  }

  const ourRosterRows = playerRows.filter(
    (row) => row.playerId === playerId && row.teamType === "ours",
  );

  if (ourRosterRows.length === 0) {
    notFound();
  }

  const availableSeasons = seasons.filter((season) =>
    ourRosterRows.some((row) => {
      const gameSeasonMatch = games.some(
        (game) =>
          game.seasonId === season.id &&
          (game.homeTeamSeasonId === row.teamSeasonId || game.awayTeamSeasonId === row.teamSeasonId),
      );
      return gameSeasonMatch;
    }),
  );
  const requestedSeasonId = Array.isArray(query.season) ? query.season[0] : query.season;
  const selectedSeason =
    availableSeasons.find((season) => season.id === requestedSeasonId) ??
    availableSeasons.find((season) => season.id === pickDefaultSeasonId(availableSeasons)) ??
    availableSeasons[0] ??
    seasons[0];

  if (!selectedSeason) {
    notFound();
  }

  const selectedRosterRows = ourRosterRows.filter((row) =>
    games.some(
      (game) =>
        game.seasonId === selectedSeason.id &&
        (game.homeTeamSeasonId === row.teamSeasonId || game.awayTeamSeasonId === row.teamSeasonId),
    ),
  );
  const rosterMembershipIds = new Set(selectedRosterRows.map((row) => row.id));
  const playerGames = games.filter(
    (game) =>
      game.seasonId === selectedSeason.id &&
      game.status !== "scheduled" &&
      selectedRosterRows.some(
        (row) => game.homeTeamSeasonId === row.teamSeasonId || game.awayTeamSeasonId === row.teamSeasonId,
      ),
  );

  const availableQuarterSet = new Set<number>([1, 2, 3, 4]);
  const requestedQuarters = parseQuarterFilter(query.quarter);
  const activeTab = parsePlayerStatsTab(query.tab);
  const statMode = query.mode ? parseStatMode(query.mode) : "per-game";

  const seasonSnapshots = [];

  const gameReports: Array<{
    gameId: string;
    date: string;
    opponent: string;
    score: string;
    report: ReturnType<typeof buildGameStatsReport>;
  }> = [];

  for (const game of playerGames) {
    const [snapshot, eventFeed] = await Promise.all([
      getLiveScorerSnapshot(game.id),
      listGameEventFeed(game.id),
    ]);

    if (!snapshot) {
      continue;
    }

    for (const quarter of getAvailableQuarters(snapshot, eventFeed)) {
      availableQuarterSet.add(quarter);
    }
  }

  for (const season of availableSeasons) {
    const seasonRosterMembershipIds = new Set(
      ourRosterRows
        .filter((row) =>
          games.some(
            (game) =>
              game.seasonId === season.id &&
              (game.homeTeamSeasonId === row.teamSeasonId || game.awayTeamSeasonId === row.teamSeasonId),
          ),
        )
        .map((row) => row.id),
    );
    const seasonGames = games.filter(
      (game) =>
        game.seasonId === season.id &&
        game.status !== "scheduled" &&
        ourRosterRows.some(
          (row) =>
            seasonRosterMembershipIds.has(row.id) &&
            (game.homeTeamSeasonId === row.teamSeasonId || game.awayTeamSeasonId === row.teamSeasonId),
        ),
    );
    let seasonPoints = 0;
    let seasonRebounds = 0;
    let seasonAssists = 0;

    for (const game of seasonGames) {
      const [snapshot, eventFeed] = await Promise.all([
        getLiveScorerSnapshot(game.id),
        listGameEventFeed(game.id),
      ]);

      if (!snapshot) {
        continue;
      }

      const report = buildGameStatsReport(snapshot, eventFeed, getAvailableQuarters(snapshot, eventFeed));
      const playerRow =
        report.ourRows.find((row) => seasonRosterMembershipIds.has(row.rosterMembershipId)) ?? null;
      if (!playerRow) {
        continue;
      }
      seasonPoints += playerRow.points;
      seasonRebounds += playerRow.reb;
      seasonAssists += playerRow.ast;
    }

    seasonSnapshots.push({
      season,
      gameCount: seasonGames.length,
      ppg: seasonGames.length > 0 ? seasonPoints / seasonGames.length : 0,
      rpg: seasonGames.length > 0 ? seasonRebounds / seasonGames.length : 0,
      apg: seasonGames.length > 0 ? seasonAssists / seasonGames.length : 0,
    });
  }

  const availableQuarters = [...availableQuarterSet].sort((left, right) => left - right);
  const activeQuarters =
    requestedQuarters.length > 0
      ? availableQuarters.filter((quarter) => requestedQuarters.includes(quarter))
      : availableQuarters;

  for (const game of playerGames) {
    const [snapshot, eventFeed] = await Promise.all([
      getLiveScorerSnapshot(game.id),
      listGameEventFeed(game.id),
    ]);

    if (!snapshot) {
      continue;
    }

    gameReports.push({
      gameId: game.id,
      date: game.date,
      opponent: game.opponent,
      score: game.score,
      report: buildGameStatsReport(snapshot, eventFeed, activeQuarters),
    });
  }

  const selectedEvaluations = evaluations.filter((entry) => entry.playerId === playerId);
  const playerFacingEvaluations = selectedEvaluations.filter((entry) => entry.playerViewEvaluation?.trim().length);
  const shortTermPlans = developmentPlans.filter(
    (entry) => entry.playerId === playerId && entry.horizon === "short_term",
  );
  const longTermPlans = developmentPlans.filter(
    (entry) => entry.playerId === playerId && entry.horizon === "long_term",
  );
  const normalizeCreatorName = (value: string) => {
    const trimmed = value.trim();
    const matchingAdmin = adminProfiles.find(
      (profile) => profile.authEmail?.toLowerCase() === trimmed.toLowerCase(),
    );
    return matchingAdmin?.displayName ?? trimmed;
  };

  const totals = {
    points: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    oreb: 0,
    dreb: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    turnovers: 0,
    fouls: 0,
  };
  let secondsPlayed = 0;
  let stints = 0;
  let plusMinus = 0;
  let secondChancePoints = 0;
  let paintPoints = 0;
  const shotMarkers = [];
  const gameLog: Array<{
    gameId: string;
    date: string;
    opponent: string;
    score: string;
    row: typeof totals;
    minutes: number;
    plusMinus: number;
    secondChancePoints: number;
    paintPoints: number;
  }> = [];

  for (const game of gameReports) {
    const playerRow =
      game.report.ourRows.find((row) => rosterMembershipIds.has(row.rosterMembershipId)) ?? null;

    if (!playerRow) {
      continue;
    }

    totals.points += playerRow.points;
    totals.fgm += playerRow.fgm;
    totals.fga += playerRow.fga;
    totals.threePm += playerRow.threePm;
    totals.threePa += playerRow.threePa;
    totals.ftm += playerRow.ftm;
    totals.fta += playerRow.fta;
    totals.oreb += playerRow.oreb;
    totals.dreb += playerRow.dreb;
    totals.reb += playerRow.reb;
    totals.ast += playerRow.ast;
    totals.stl += playerRow.stl;
    totals.blk += playerRow.blk;
    totals.turnovers += playerRow.turnovers;
    totals.fouls += playerRow.fouls;

    const usage = game.report.minutesSnapshot.playerUsage.get(playerRow.rosterMembershipId);
    const gameMinutes = usage?.secondsPlayed ?? 0;
    const gameStints = usage?.stintCount ?? 0;
    const gamePlusMinus =
      (game.report.ourSide === "home"
        ? game.report.playerPlusMinus.home
        : game.report.playerPlusMinus.away
      ).get(playerRow.rosterMembershipId) ?? 0;
    const gameSecondChancePoints =
      game.report.secondChanceSnapshot.playerPoints.get(playerRow.rosterMembershipId) ?? 0;
    const gamePaintPoints =
      game.report.paintPointsSnapshot.playerPoints.get(playerRow.rosterMembershipId) ?? 0;

    secondsPlayed += gameMinutes;
    stints += gameStints;
    plusMinus += gamePlusMinus;
    secondChancePoints += gameSecondChancePoints;
    paintPoints += gamePaintPoints;
    shotMarkers.push(
      ...game.report.shotMarkers.filter((marker) =>
        marker.rosterMembershipId ? rosterMembershipIds.has(marker.rosterMembershipId) : false,
      ),
    );
    gameLog.push({
      gameId: game.gameId,
      date: game.date,
      opponent: game.opponent,
      score: game.score,
      row: playerRow,
      minutes: gameMinutes,
      plusMinus: gamePlusMinus,
      secondChancePoints: gameSecondChancePoints,
      paintPoints: gamePaintPoints,
    });
  }

  const basePath = `/stats/players/${playerId}`;
  const currentPlayerRosterMembershipIds = new Set(ourRosterRows.map((row) => row.id));
  const canViewDevelopment =
    session.role === "admin" ||
    session.role === "coach" ||
    (session.role === "player" &&
      session.playerRosterMembershipId !== null &&
      currentPlayerRosterMembershipIds.has(session.playerRosterMembershipId));
  const canViewEvaluations =
    session.role === "admin" ||
    session.role === "coach" ||
    (session.role === "player" &&
      session.playerRosterMembershipId !== null &&
      currentPlayerRosterMembershipIds.has(session.playerRosterMembershipId) &&
      playerFacingEvaluations.length > 0);
  const canManagePlayerPlans = session.role === "admin" || session.role === "coach";
  const canEditOwnProfile =
    session.role === "player" &&
    session.playerRosterMembershipId !== null &&
    rosterMembershipIds.has(session.playerRosterMembershipId);
  const playerParentContacts = parentContacts.filter((contact) => contact.playerId === playerId);
  const safeActiveTab =
    activeTab === "evaluations" && !canViewEvaluations
      ? "player"
      : activeTab === "development" && !canViewDevelopment
        ? "player"
        : activeTab;
  const tabs: Array<{ value: PlayerStatsTab; label: string }> = [
    { value: "player", label: "Player Stats" },
    { value: "player-advanced", label: "Player Efficiency" },
    { value: "shots", label: "Shot Chart" },
    { value: "games", label: "Game Log" },
    ...(canViewDevelopment ? [{ value: "development" as const, label: "Development" }] : []),
    ...(canViewEvaluations ? [{ value: "evaluations" as const, label: "Evaluations" }] : []),
  ];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="player-profile-hero">
          {player.photoUrl ? (
            <div className="player-profile-photo">
              <img src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`} />
            </div>
          ) : (
            <div className="player-profile-photo placeholder">
              {player.firstName.charAt(0)}
              {player.lastName.charAt(0)}
            </div>
          )}
          <div className="admin-header-copy">
            <p className="eyebrow-label">Player Profile</p>
            <h2>
              {player.firstName} {player.lastName}
            </h2>
            <p>
              <strong className="player-profile-emphasis">
                #{selectedRosterRows[0]?.jersey ?? "--"} · {selectedRosterRows[0]?.position ?? "Player"}
              </strong>
            </p>
            <p>
              {player.graduatingClass ? `Class of ${player.graduatingClass}` : ""}
              {selectedRosterRows[0]?.height ? `${player.graduatingClass ? " · " : ""}${selectedRosterRows[0].height}` : ""}
            </p>
            <p className="meta">
              Current Season: {selectedSeason.name}
            </p>
          </div>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <SharePageButton />
          <FrontendMenuLinks
            session={session}
            extras={[{ href: `/stats/seasons/${selectedSeason.id}`, label: "Open Season Stats" }]}
          />
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        {seasonSnapshots.map((entry) => (
          <article
            key={entry.season.id}
            className={`card player-season-card ${entry.season.id === selectedSeason.id ? "active" : ""}`}
          >
            <p className="eyebrow-label">{entry.season.schoolYear}</p>
            <h2>{entry.season.name}</h2>
            <p className="meta">{entry.gameCount} games</p>
            <p className="meta">
              {entry.ppg.toFixed(1)} PPG · {entry.rpg.toFixed(1)} RPG · {entry.apg.toFixed(1)} APG
            </p>
            <div className="action-row">
              <Link
                href={buildReportHref(basePath, {
                  tab: safeActiveTab,
                  quarters: activeQuarters,
                  mode: statMode,
                  seasonId: entry.season.id,
                })}
                className={`button-link ${entry.season.id === selectedSeason.id ? "secondary" : "ghost"}`}
              >
                {entry.season.id === selectedSeason.id ? "Current Season" : "Open Season"}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="panel-card quarter-filter-card">
        <div>
          <p className="eyebrow-label">Season / Quarter Filter</p>
          <h3>Focus The Player View</h3>
          <p className="meta">Everything below is filtered to {formatQuarterSummary(activeQuarters)} in {selectedSeason.name}.</p>
        </div>
        <div className="page-actions">
          <StatsModeToggle
            options={[
              {
                value: "totals",
                label: "Totals",
                href: buildReportHref(basePath, { tab: safeActiveTab, quarters: activeQuarters, mode: "totals", seasonId: selectedSeason.id }),
                active: statMode === "totals",
              },
              {
                value: "per-game",
                label: "Per Game",
                href: buildReportHref(basePath, { tab: safeActiveTab, quarters: activeQuarters, mode: "per-game", seasonId: selectedSeason.id }),
                active: statMode === "per-game",
              },
            ]}
          />
          <StatsQuarterFilterControls
            basePath={basePath}
            activeTab={safeActiveTab}
            availableQuarters={availableQuarters}
            activeQuarters={activeQuarters}
            mode={statMode}
            seasonId={selectedSeason.id}
          />
        </div>
      </section>

      {canViewDevelopment ? (
        <section className="panel-grid reporting-dual-grid">
          {canEditOwnProfile ? (
            <article className="panel-card">
              <p className="eyebrow-label">Private Profile Details</p>
              <h3>Update Your Info</h3>
              <p className="meta">
                Height, player photo, and parent or guardian contacts stay private to you, coaches, and admin.
              </p>
              <PlayerSelfServiceForm
                playerId={player.id}
                rosterMembershipId={session.playerRosterMembershipId!}
                initialHeight={selectedRosterRows.find((row) => row.id === session.playerRosterMembershipId)?.height ?? ""}
                initialBirthdate={player.birthdate}
                currentPhotoUrl={player.photoUrl}
                contacts={playerParentContacts}
              />
            </article>
          ) : null}

          <article className="panel-card">
            <p className="eyebrow-label">Private Contacts</p>
            <h3>Parent / Guardian Contacts</h3>
            {playerParentContacts.length > 0 ? (
              <div className="record-stack">
                {playerParentContacts.map((contact) => (
                  <div key={contact.id} className="record-card">
                    <strong>{contact.fullName}</strong>
                    {contact.email ? (
                      <p>
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </p>
                    ) : null}
                    {contact.phone ? (
                      <p>
                        <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta">No parent or guardian contacts saved yet.</p>
            )}
          </article>
        </section>
      ) : null}

      <section className="table-grid overlay-table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>{player.firstName} {player.lastName}</h3>
              <p className="meta">
                {selectedRosterRows[0]?.position ?? "Player"}
                {selectedRosterRows[0]?.jersey ? ` · ${selectedRosterRows[0].jersey}` : ""}
                {selectedRosterRows[0]?.height ? ` · ${selectedRosterRows[0].height}` : ""}
              </p>
            </div>
            <span className="pill alt">{formatQuarterSummary(activeQuarters)}</span>
          </div>
          <StatsOverlayTabNav
            tabs={tabs.map((tab) => ({
              value: tab.value,
              label: tab.label,
              href: buildReportHref(basePath, { tab: tab.value, quarters: activeQuarters, mode: statMode, seasonId: selectedSeason.id }),
              active: safeActiveTab === tab.value,
            }))}
          />

          {safeActiveTab === "player" ? (
            <table>
              <thead>
                <tr>
                  <th>MIN</th>
                  <th>Stints</th>
                  <th>PTS</th>
                  <th>+/-</th>
                  <th>2CP</th>
                  <th>FG</th>
                  <th>3PT</th>
                  <th>FT</th>
                  <th>OREB</th>
                  <th>DREB</th>
                  <th>REB</th>
                  <th>AST</th>
                  <th>STL</th>
                  <th>BLK</th>
                  <th>TO</th>
                  <th>PF</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatMinutesValue(secondsPlayed, gameLog.length, statMode)}</td>
                  <td>{formatValue(stints, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.points, gameLog.length, statMode)}</td>
                  <td>{formatValueOrSigned(plusMinus, gameLog.length, statMode)}</td>
                  <td>{formatValue(secondChancePoints, gameLog.length, statMode)}</td>
                  <td>{formatPctLine(totals.fgm, totals.fga, gameLog.length, statMode)}</td>
                  <td>{formatPctLine(totals.threePm, totals.threePa, gameLog.length, statMode)}</td>
                  <td>{formatPctLine(totals.ftm, totals.fta, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.oreb, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.dreb, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.reb, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.ast, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.stl, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.blk, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.turnovers, gameLog.length, statMode)}</td>
                  <td>{formatValue(totals.fouls, gameLog.length, statMode)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}

          {safeActiveTab === "player-advanced" ? (
            <table>
              <thead>
                <tr>
                  <th>MIN</th>
                  <th>+/-</th>
                  <th>EFF</th>
                  <th>eFG%</th>
                  <th>TS%</th>
                  <th>PPS</th>
                  <th>PITP</th>
                  <th>FTr</th>
                  <th>AST/TO</th>
                  <th>Stocks</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatMinutesValue(secondsPlayed, gameLog.length, statMode)}</td>
                  <td>{formatValueOrSigned(plusMinus, gameLog.length, statMode)}</td>
                  <td>{calculateGameEfficiency(totals)}</td>
                  <td>{calculateEffectiveFieldGoalPercentage(totals)}</td>
                  <td>{calculateTrueShootingPercentage(totals)}</td>
                  <td>{calculatePointsPerShot(totals)}</td>
                  <td>{formatValue(paintPoints, gameLog.length, statMode)}</td>
                  <td>{calculateFreeThrowRate(totals)}</td>
                  <td>{formatRatio(totals.ast, totals.turnovers)}</td>
                  <td>{formatValue(totals.stl + totals.blk, gameLog.length, statMode)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}

          {safeActiveTab === "shots" ? (
            <section className="panel-grid reporting-dual-grid">
              <article className="panel-card">
                <p className="eyebrow-label">Shot Chart</p>
                <h3>{player.firstName} {player.lastName} Shot Map</h3>
                <ShotChartDisplay markers={shotMarkers} large />
              </article>
            </section>
          ) : null}

          {safeActiveTab === "games" ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>MIN</th>
                  <th>PTS</th>
                  <th>+/-</th>
                  <th>FG</th>
                  <th>3PT</th>
                  <th>FT</th>
                  <th>REB</th>
                  <th>AST</th>
                  <th>TO</th>
                  <th>Game</th>
                </tr>
              </thead>
              <tbody>
                {gameLog.map((game) => (
                  <tr key={game.gameId}>
                    <td>{formatCompactDate(game.date)}</td>
                    <td>{game.opponent}</td>
                    <td>{game.score}</td>
                    <td>{formatMinutes(game.minutes)}</td>
                    <td>{game.row.points}</td>
                    <td>{game.plusMinus > 0 ? `+${game.plusMinus}` : game.plusMinus}</td>
                    <td>{formatPct(game.row.fgm, game.row.fga)}</td>
                    <td>{formatPct(game.row.threePm, game.row.threePa)}</td>
                    <td>{formatPct(game.row.ftm, game.row.fta)}</td>
                    <td>{game.row.reb}</td>
                    <td>{game.row.ast}</td>
                    <td>{game.row.turnovers}</td>
                    <td>
                      <Link href={`/stats/games/${game.gameId}`} className="button-link ghost">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {safeActiveTab === "development" && canViewDevelopment ? (
            <section className="panel-grid reporting-dual-grid">
              {canManagePlayerPlans ? (
                <article className="panel-card">
                  <p className="eyebrow-label">Coach Workflow</p>
                  <h3>Add Development Plan</h3>
                  <p className="meta">Saved under the logged-in coach or admin automatically.</p>
                  <PlayerCoachDevelopmentForm playerId={player.id} defaultDate={today} />
                </article>
              ) : null}
              <article className="panel-card">
                <p className="eyebrow-label">Player Profile</p>
                <h3>Development Snapshot</h3>
                <div className="table-grid">
                  <div className="management-card">
                    <p><strong>Graduating Class:</strong> {player.graduatingClass ?? "Not set"}</p>
                    <p><strong>Birthdate:</strong> {player.birthdate ? formatCompactDate(player.birthdate) : "Not set"}</p>
                    <p><strong>Photo:</strong> {player.photoUrl ? <a href={player.photoUrl} target="_blank" rel="noreferrer">Open photo</a> : "Not set"}</p>
                  </div>
                </div>
              </article>
              <article className="panel-card">
                <p className="eyebrow-label">Short-Term Plans</p>
                <h3>Current Focus</h3>
                <div className="box-score-stack">
                  {shortTermPlans.length > 0 ? shortTermPlans.map((plan) => (
                    <div key={plan.id} className="management-card">
                      <p className="meta">{plan.planDate} · {normalizeCreatorName(plan.coachName)} · {normalizeGoalType(plan.goalType)}</p>
                      <p>{plan.planBody}</p>
                      {plan.targetDate ? <p className="meta">Target: {plan.targetDate}</p> : null}
                      {canManagePlayerPlans ? (
                        <div className="record-card">
                          <p className="eyebrow-label">Edit Plan</p>
                          <PlayerCoachDevelopmentForm
                            mode="edit"
                            playerId={player.id}
                            planId={plan.id}
                            creatorName={normalizeCreatorName(plan.coachName)}
                            defaultDate={plan.planDate}
                            defaultHorizon={plan.horizon}
                            defaultTargetDate={plan.targetDate ?? ""}
                            defaultGoalType={plan.goalType}
                            defaultPlanBody={plan.planBody}
                            submitLabel="Update Development Plan"
                          />
                        </div>
                      ) : null}
                    </div>
                  )) : <p className="meta">No short-term plans yet.</p>}
                </div>
              </article>
              <article className="panel-card">
                <p className="eyebrow-label">Long-Term Plans</p>
                <h3>Roadmap</h3>
                <div className="box-score-stack">
                  {longTermPlans.length > 0 ? longTermPlans.map((plan) => (
                    <div key={plan.id} className="management-card">
                      <p className="meta">{plan.planDate} · {normalizeCreatorName(plan.coachName)} · {normalizeGoalType(plan.goalType)}</p>
                      <p>{plan.planBody}</p>
                      {plan.targetDate ? <p className="meta">Target: {plan.targetDate}</p> : null}
                      {canManagePlayerPlans ? (
                        <div className="record-card">
                          <p className="eyebrow-label">Edit Plan</p>
                          <PlayerCoachDevelopmentForm
                            mode="edit"
                            playerId={player.id}
                            planId={plan.id}
                            creatorName={normalizeCreatorName(plan.coachName)}
                            defaultDate={plan.planDate}
                            defaultHorizon={plan.horizon}
                            defaultTargetDate={plan.targetDate ?? ""}
                            defaultGoalType={plan.goalType}
                            defaultPlanBody={plan.planBody}
                            submitLabel="Update Development Plan"
                          />
                        </div>
                      ) : null}
                    </div>
                  )) : <p className="meta">No long-term plans yet.</p>}
                </div>
              </article>
            </section>
          ) : null}

          {safeActiveTab === "evaluations" && canViewEvaluations ? (
            <section className="panel-grid reporting-dual-grid">
              {canManagePlayerPlans ? (
                <article className="panel-card">
                  <p className="eyebrow-label">Coach Workflow</p>
                  <h3>Add Evaluation</h3>
                  <p className="meta">The raw coach evaluation stays private. You can leave the player-view version blank to auto-generate it, or edit that softer version yourself.</p>
                  <PlayerCoachEvaluationForm playerId={player.id} defaultDate={today} />
                </article>
              ) : null}
              <article className="panel-card">
                <p className="eyebrow-label">{canManagePlayerPlans ? "Coach Evaluations" : "Player View Evaluation"}</p>
                <h3>{canManagePlayerPlans ? "Latest Evaluations" : "Feedback From Your Coaches"}</h3>
                <div className="box-score-stack">
                  {canManagePlayerPlans
                    ? selectedEvaluations.length > 0
                      ? selectedEvaluations.map((evaluation) => (
                          <div key={evaluation.id} className="management-card">
                            <p className="meta">{evaluation.evaluationDate} · {normalizeCreatorName(evaluation.coachName)}</p>
                            <div className="record-stack">
                              <div className="record-card">
                                <p className="eyebrow-label">Coach Version</p>
                                <p>{evaluation.evaluation}</p>
                              </div>
                              {evaluation.playerViewEvaluation ? (
                                <div className="record-card">
                                  <p className="eyebrow-label">Player View</p>
                                  <p>{evaluation.playerViewEvaluation}</p>
                                </div>
                              ) : null}
                              <div className="record-card">
                                <p className="eyebrow-label">Edit Evaluation</p>
                                <PlayerCoachEvaluationForm
                                  mode="edit"
                                  playerId={player.id}
                                  evaluationId={evaluation.id}
                                  creatorName={normalizeCreatorName(evaluation.coachName)}
                                  defaultDate={evaluation.evaluationDate}
                                  defaultEvaluation={evaluation.evaluation}
                                  defaultPlayerViewEvaluation={evaluation.playerViewEvaluation ?? ""}
                                  submitLabel="Update Evaluation"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      : <p className="meta">No evaluations yet.</p>
                    : playerFacingEvaluations.length > 0
                      ? playerFacingEvaluations.map((evaluation) => (
                          <div key={evaluation.id} className="management-card">
                            <p className="meta">{evaluation.evaluationDate} · {normalizeCreatorName(evaluation.coachName)}</p>
                            <p>{evaluation.playerViewEvaluation}</p>
                          </div>
                        ))
                      : <p className="meta">No player-view feedback yet.</p>}
                </div>
              </article>
              {canManagePlayerPlans ? (
                <article className="panel-card">
                  <p className="eyebrow-label">Access</p>
                  <h3>Who Can See This</h3>
                  <div className="box-score-stack">
                    <div className="management-card">
                      <p>Raw evaluations stay private to coaches and admin. Players only see the softened player-view version.</p>
                    </div>
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}
        </article>
      </section>
    </main>
  );
}
