"use client";

import { useEffect, useState } from "react";
import { logQuickEventAction, updateTeamPlaySelectionAction } from "@/app/games/actions";
import { ShotChartInput } from "@/components/shot-chart-input";

interface OnFloorPlayer {
  id: string;
  name: string;
  jersey: string;
  position: string;
  points: number;
  fouls: number;
}

interface ShotMarker {
  id: string;
  x: number;
  y: number;
  result: "make" | "miss" | null;
  value: number | null;
  teamSide: "home" | "away";
  rosterMembershipId: string | null;
  playerName: string;
  jersey: string;
  quarter: number;
  secondsRemaining: number;
}

interface PlayOption {
  id: string;
  name: string;
}

interface OptimisticQuickEvent {
  teamSide: "home" | "away";
  eventType:
    | "shot"
    | "rebound_off"
    | "rebound_def"
    | "assist"
    | "steal"
    | "block"
    | "turnover"
    | "personal_foul"
    | "timeout_full"
    | "timeout_30";
  rosterMembershipId?: string;
  shotX?: number;
  shotY?: number;
  shotResult?: "make" | "miss";
  shotValue?: 1 | 2 | 3;
  playerName?: string;
  jersey?: string;
  quarter: number;
  secondsRemaining: number;
}

function rosterLabel(player: OnFloorPlayer) {
  return `${player.jersey} ${player.name}`;
}

function detectThreePointShot(x: number, y: number) {
  if (y >= 78 && (x <= 16 || x >= 84)) {
    return true;
  }

  const distanceFromRim = Math.hypot(x - 50, y - 88);
  return distanceFromRim >= 37;
}

export function LiveScorerEntry({
  gameId,
  quarter,
  secondsRemaining,
  homeTeamName,
  awayTeamName,
  homeOnFloor,
  awayOnFloor,
  shotMarkers,
  selectedTeamSide,
  selectedRosterId,
  selectionMode,
  onSelectTeam,
  onSelectPlayer,
  homeFullTimeouts,
  awayFullTimeouts,
  homeThirtyTimeouts,
  awayThirtyTimeouts,
  homeOffensePlayId,
  homeDefensePlayId,
  awayOffensePlayId,
  awayDefensePlayId,
  homeOffensePlays,
  homeDefensePlays,
  awayOffensePlays,
  awayDefensePlays,
  isGameFinal,
  canScore,
  deviceId,
  onOptimisticEvent,
}: Readonly<{
  gameId: string;
  quarter: number;
  secondsRemaining: number;
  homeTeamName: string;
  awayTeamName: string;
  homeOnFloor: OnFloorPlayer[];
  awayOnFloor: OnFloorPlayer[];
  shotMarkers: ShotMarker[];
  selectedTeamSide: "home" | "away";
  selectedRosterId: string;
  selectionMode: "team" | "player";
  onSelectTeam: (teamSide: "home" | "away") => void;
  onSelectPlayer: (teamSide: "home" | "away", rosterId: string) => void;
  homeFullTimeouts: number;
  awayFullTimeouts: number;
  homeThirtyTimeouts: number;
  awayThirtyTimeouts: number;
  homeOffensePlayId: string | null;
  homeDefensePlayId: string | null;
  awayOffensePlayId: string | null;
  awayDefensePlayId: string | null;
  homeOffensePlays: PlayOption[];
  homeDefensePlays: PlayOption[];
  awayOffensePlays: PlayOption[];
  awayDefensePlays: PlayOption[];
  isGameFinal: boolean;
  canScore: boolean;
  deviceId: string;
  onOptimisticEvent?: (event: OptimisticQuickEvent) => void;
}>) {
  const [shotLocation, setShotLocation] = useState<{ x: number; y: number } | null>(null);
  const [homeOffenseSelection, setHomeOffenseSelection] = useState(homeOffensePlayId ?? "");
  const [homeDefenseSelection, setHomeDefenseSelection] = useState(homeDefensePlayId ?? "");
  const [awayOffenseSelection, setAwayOffenseSelection] = useState(awayOffensePlayId ?? "");
  const [awayDefenseSelection, setAwayDefenseSelection] = useState(awayDefensePlayId ?? "");

  useEffect(() => {
    setHomeOffenseSelection(homeOffensePlayId ?? "");
  }, [homeOffensePlayId]);

  useEffect(() => {
    setHomeDefenseSelection(homeDefensePlayId ?? "");
  }, [homeDefensePlayId]);

  useEffect(() => {
    setAwayOffenseSelection(awayOffensePlayId ?? "");
  }, [awayOffensePlayId]);

  useEffect(() => {
    setAwayDefenseSelection(awayDefensePlayId ?? "");
  }, [awayDefensePlayId]);

  const selectedTeamPlayers = selectedTeamSide === "home" ? homeOnFloor : awayOnFloor;
  const selectedPlayer = selectedTeamPlayers.find((player) => player.id === selectedRosterId);
  const suggestedShotValue = shotLocation ? (detectThreePointShot(shotLocation.x, shotLocation.y) ? 3 : 2) : null;
  const selectedTeamName = selectedTeamSide === "home" ? homeTeamName : awayTeamName;
  const remainingFullTimeouts = selectedTeamSide === "home" ? homeFullTimeouts : awayFullTimeouts;
  const remainingThirtyTimeouts =
    selectedTeamSide === "home" ? homeThirtyTimeouts : awayThirtyTimeouts;
  async function submitQuickEvent({
    eventType,
    shotAction,
    notes = "",
    useShotLocation = false,
  }: {
    eventType: OptimisticQuickEvent["eventType"];
    shotAction?: "1_make" | "1_miss" | "2_make" | "2_miss" | "3_make" | "3_miss";
    notes?: string;
    useShotLocation?: boolean;
  }) {
    if (isGameFinal) {
      return;
    }

    if (!canScore) {
      window.alert("Take scoring control before logging live stats.");
      return;
    }

    if (!selectedPlayer && eventType !== "timeout_full" && eventType !== "timeout_30") {
      window.alert("Select a player before logging a stat.");
      return;
    }

    if (useShotLocation && !shotLocation) {
      window.alert("Select a shot location first.");
      return;
    }

    const formData = new FormData();
    formData.set("gameId", gameId);
    formData.set("deviceId", deviceId);
    formData.set("eventType", eventType);
    formData.set("teamSide", selectedTeamSide);
    formData.set("rosterMembershipId", selectedPlayer?.id ?? "");
    formData.set("quarter", String(quarter));
    formData.set("secondsRemaining", String(secondsRemaining));
    formData.set("notes", notes);

    if (shotAction) {
      formData.set("shotAction", shotAction);
    }

    if (useShotLocation && shotLocation) {
      formData.set("shotX", String(shotLocation.x));
      formData.set("shotY", String(shotLocation.y));
    }

    if (eventType === "shot" && selectedPlayer) {
      const derivedShotResult =
        shotAction && shotAction.endsWith("_make")
          ? "make"
          : shotAction && shotAction.endsWith("_miss")
            ? "miss"
            : undefined;
      const derivedShotValue = shotAction
        ? (Number.parseInt(shotAction.slice(0, 1), 10) as 1 | 2 | 3)
        : undefined;

      if (useShotLocation) {
        setShotLocation(null);
      }

      if (derivedShotResult && derivedShotValue) {
        onOptimisticEvent?.({
          teamSide: selectedTeamSide,
          eventType: "shot",
          rosterMembershipId: selectedPlayer.id,
          shotX: shotLocation?.x,
          shotY: shotLocation?.y,
          shotResult: derivedShotResult,
          shotValue: derivedShotValue,
          playerName: selectedPlayer.name,
          jersey: selectedPlayer.jersey,
          quarter,
          secondsRemaining,
        });
      }
    } else if (selectedPlayer) {
      onOptimisticEvent?.({
        teamSide: selectedTeamSide,
        eventType,
        rosterMembershipId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        jersey: selectedPlayer.jersey,
        quarter,
        secondsRemaining,
      });
    }

    try {
      await logQuickEventAction(formData);
    } catch {
      window.alert("Couldn't save that stat. Check scoring control and try again.");
    }
  }

  return (
    <section className="panel-card scorer-workbench">
      <div className="scorer-topline">
        <span className="pill alt">
          {isGameFinal
            ? "Game final · scorer locked"
            : selectedPlayer
            ? `${rosterLabel(selectedPlayer)} active`
            : `${selectedTeamName} selected`}
        </span>
      </div>

      <div className="scorer-main-grid">
        <div className="player-selector-column">
          <div className="player-selector-heading">
            <button className="pill alt scorer-team-pill" type="button" onClick={() => onSelectTeam("home")}>
              {homeTeamName}
            </button>
          </div>
          <div className="player-play-selector-stack">
            <form
              action={async (formData) => {
                try {
                  await updateTeamPlaySelectionAction(formData);
                } catch {
                  window.alert("Couldn't save the selected play. Please try again.");
                }
              }}
              className="play-quick-form"
            >
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="deviceId" value={deviceId} />
              <input type="hidden" name="teamSide" value="home" />
              <input type="hidden" name="playSide" value="offense" />
              <label className="play-quick-label">
                <span>Off</span>
                <select
                  name="playId"
                  value={homeOffenseSelection}
                  disabled={isGameFinal || !canScore}
                  onChange={(event) => {
                    if (!canScore) {
                      window.alert("Take scoring control before changing plays.");
                      return;
                    }
                    setHomeOffenseSelection(event.currentTarget.value);
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  <option value="">No offense</option>
                  {homeOffensePlays.map((play) => (
                    <option key={play.id} value={play.id}>
                      {play.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
            <form
              action={async (formData) => {
                try {
                  await updateTeamPlaySelectionAction(formData);
                } catch {
                  window.alert("Couldn't save the selected play. Please try again.");
                }
              }}
              className="play-quick-form"
            >
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="deviceId" value={deviceId} />
              <input type="hidden" name="teamSide" value="home" />
              <input type="hidden" name="playSide" value="defense" />
              <label className="play-quick-label">
                <span>Def</span>
                <select
                  name="playId"
                  value={homeDefenseSelection}
                  disabled={isGameFinal || !canScore}
                  onChange={(event) => {
                    if (!canScore) {
                      window.alert("Take scoring control before changing plays.");
                      return;
                    }
                    setHomeDefenseSelection(event.currentTarget.value);
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  <option value="">No defense</option>
                  {homeDefensePlays.map((play) => (
                    <option key={play.id} value={play.id}>
                      {play.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
          </div>
          <div className="player-selector-grid">
            {homeOnFloor.length > 0 ? homeOnFloor.map((player) => {
              const isActive =
                selectedTeamSide === "home" && selectedPlayer?.id === player.id;

              return (
                <button
                  key={player.id}
                  className={`player-selector-button home ${isActive ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    onSelectPlayer("home", player.id);
                  }}
                >
                  <strong>{player.jersey}</strong>
                  <span>{player.name}</span>
                  <small>{player.position}</small>
                  <small className="player-selector-stats">PTS: {player.points} | PF: {player.fouls}</small>
                </button>
              );
            }) : <p className="meta">No home roster loaded for this game yet.</p>}
          </div>
        </div>

        <div className="scorer-center-column">
          <div className="scorer-shot-form">
            <ShotChartInput
              markers={shotMarkers}
              selection={shotLocation}
              onSelectLocation={(selection) => {
                if (!selectedPlayer) {
                  window.alert("Select a player before logging a shot.");
                  return;
                }

                if (isGameFinal) {
                  window.alert("Game is marked final. Reopen it to add or edit live stats.");
                  return;
                }

                if (!canScore) {
                  window.alert("Take scoring control before logging a shot.");
                  return;
                }

                setShotLocation(selection);
              }}
              large
            />

            {shotLocation ? (
              <div className="shot-action-modal">
                <div className="shot-action-modal-card">
                  <p className="eyebrow-label">Shot Choice</p>
                  <h3>
                    {selectedPlayer ? rosterLabel(selectedPlayer) : selectedTeamName} ·{" "}
                    {selectedTeamSide === "home" ? homeTeamName : awayTeamName}
                  </h3>
                  <p className="meta">
                    Tap the result for this shot. Suggested value: {suggestedShotValue ?? 2}PT.
                  </p>
                  <div className="shot-action-grid">
                    <button
                      className="button-link make"
                      type="button"
                      disabled={isGameFinal || !canScore}
                      onClick={() => void submitQuickEvent({ eventType: "shot", shotAction: "2_make", useShotLocation: true })}
                    >
                      2PT Make
                    </button>
                    <button
                      className="button-link miss"
                      type="button"
                      disabled={isGameFinal || !canScore}
                      onClick={() => void submitQuickEvent({ eventType: "shot", shotAction: "2_miss", useShotLocation: true })}
                    >
                      2PT Miss
                    </button>
                    <button
                      className="button-link make"
                      type="button"
                      disabled={isGameFinal || !canScore}
                      onClick={() => void submitQuickEvent({ eventType: "shot", shotAction: "3_make", useShotLocation: true })}
                    >
                      3PT Make
                    </button>
                    <button
                      className="button-link miss"
                      type="button"
                      disabled={isGameFinal || !canScore}
                      onClick={() => void submitQuickEvent({ eventType: "shot", shotAction: "3_miss", useShotLocation: true })}
                    >
                      3PT Miss
                    </button>
                  </div>
                  <div className="action-row">
                    <button className="button-link ghost" type="button" onClick={() => setShotLocation(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="scorer-action-strip">
            <div className="scorer-button-panel compact">
              <div className="scorer-button-grid compact-grid">
                <button className="button-link secondary" type="button" disabled={isGameFinal || !canScore} onClick={() => void submitQuickEvent({ eventType: "assist" })}>
                  Assist
                </button>
                <button className="button-link secondary" type="button" disabled={isGameFinal || !canScore} onClick={() => void submitQuickEvent({ eventType: "rebound_off" })}>
                  OREB
                </button>
                <button className="button-link secondary" type="button" disabled={isGameFinal || !canScore} onClick={() => void submitQuickEvent({ eventType: "rebound_def" })}>
                  DREB
                </button>
                <button className="button-link secondary" type="button" disabled={isGameFinal || !canScore} onClick={() => void submitQuickEvent({ eventType: "steal" })}>
                  Steal
                </button>
                <button
                  className="button-link timeout-button timeout-full"
                  type="button"
                  disabled={isGameFinal || !canScore}
                  onClick={(event) => {
                    if (remainingFullTimeouts <= 0) {
                      window.alert(`${selectedTeamName} is out of full timeouts.`);
                      return;
                    }
                    void submitQuickEvent({ eventType: "timeout_full" });
                  }}
                >
                  Full TO
                </button>
                <button className="button-link secondary" type="button" disabled={isGameFinal || !canScore} onClick={() => void submitQuickEvent({ eventType: "turnover" })}>
                  TO
                </button>
                <button className="button-link secondary" type="button" disabled={isGameFinal || !canScore} onClick={() => void submitQuickEvent({ eventType: "personal_foul" })}>
                  PF
                </button>
                <button className="button-link secondary" type="button" disabled={isGameFinal || !canScore} onClick={() => void submitQuickEvent({ eventType: "block" })}>
                  Block
                </button>
                <button
                  className="button-link timeout-button timeout-thirty"
                  type="button"
                  disabled={isGameFinal || !canScore}
                  onClick={(event) => {
                    if (remainingThirtyTimeouts <= 0) {
                      window.alert(`${selectedTeamName} is out of 30-second timeouts.`);
                      return;
                    }
                    void submitQuickEvent({ eventType: "timeout_30" });
                  }}
                >
                  30 TO
                </button>
              </div>
            </div>

            <div className="scorer-button-panel compact ft-strip">
              <div className="scorer-button-grid two-up">
                <button
                  className="button-link make"
                  type="button"
                  disabled={isGameFinal || !canScore}
                  onClick={() => void submitQuickEvent({ eventType: "shot", shotAction: "1_make", notes: "Free throw" })}
                >
                  FT Make
                </button>
                <button
                  className="button-link miss"
                  type="button"
                  disabled={isGameFinal || !canScore}
                  onClick={() => void submitQuickEvent({ eventType: "shot", shotAction: "1_miss", notes: "Free throw" })}
                >
                  FT Miss
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="player-selector-column">
          <div className="player-selector-heading">
            <button className="pill alt scorer-team-pill" type="button" onClick={() => onSelectTeam("away")}>
              {awayTeamName}
            </button>
          </div>
          <div className="player-play-selector-stack">
            <form
              action={async (formData) => {
                try {
                  await updateTeamPlaySelectionAction(formData);
                } catch {
                  window.alert("Couldn't save the selected play. Please try again.");
                }
              }}
              className="play-quick-form"
            >
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="deviceId" value={deviceId} />
              <input type="hidden" name="teamSide" value="away" />
              <input type="hidden" name="playSide" value="offense" />
              <label className="play-quick-label">
                <span>Off</span>
                <select
                  name="playId"
                  value={awayOffenseSelection}
                  disabled={isGameFinal || !canScore}
                  onChange={(event) => {
                    if (!canScore) {
                      window.alert("Take scoring control before changing plays.");
                      return;
                    }
                    setAwayOffenseSelection(event.currentTarget.value);
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  <option value="">No offense</option>
                  {awayOffensePlays.map((play) => (
                    <option key={play.id} value={play.id}>
                      {play.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
            <form
              action={async (formData) => {
                try {
                  await updateTeamPlaySelectionAction(formData);
                } catch {
                  window.alert("Couldn't save the selected play. Please try again.");
                }
              }}
              className="play-quick-form"
            >
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="deviceId" value={deviceId} />
              <input type="hidden" name="teamSide" value="away" />
              <input type="hidden" name="playSide" value="defense" />
              <label className="play-quick-label">
                <span>Def</span>
                <select
                  name="playId"
                  value={awayDefenseSelection}
                  disabled={isGameFinal || !canScore}
                  onChange={(event) => {
                    if (!canScore) {
                      window.alert("Take scoring control before changing plays.");
                      return;
                    }
                    setAwayDefenseSelection(event.currentTarget.value);
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  <option value="">No defense</option>
                  {awayDefensePlays.map((play) => (
                    <option key={play.id} value={play.id}>
                      {play.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
          </div>
          <div className="player-selector-grid">
            {awayOnFloor.length > 0 ? awayOnFloor.map((player) => {
              const isActive =
                selectedTeamSide === "away" && selectedPlayer?.id === player.id;

              return (
                <button
                  key={player.id}
                  className={`player-selector-button away ${isActive ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    onSelectPlayer("away", player.id);
                  }}
                >
                  <strong>{player.jersey}</strong>
                  <span>{player.name}</span>
                  <small>{player.position}</small>
                  <small className="player-selector-stats">PTS: {player.points} | PF: {player.fouls}</small>
                </button>
              );
            }) : <p className="meta">No away roster loaded for this game yet.</p>}
          </div>
        </div>
      </div>

    </section>
  );
}
