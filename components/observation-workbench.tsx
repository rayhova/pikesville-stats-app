"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createObservationAction,
  deleteObservationAction,
} from "@/app/observations/actions";

interface ObservationPlayer {
  id: string;
  name: string;
  jersey: string;
  position: string;
  points: number;
  fouls: number;
  onFloor: boolean;
}

interface ObservationPlay {
  id: string | null;
  name: string;
  kind: "offense_play" | "defense_play";
}

interface ObservationRow {
  id: string;
  gameId: string;
  teamSide: "home" | "away";
  teamName: string;
  observationScope: "team" | "player" | "offense_play" | "defense_play";
  rosterMembershipId: string | null;
  playerName: string | null;
  jersey: string | null;
  playLibraryId: string | null;
  playName: string | null;
  quarter: number;
  secondsRemaining: number;
  tag: string;
  notes: string;
  scoreDelta: number;
  createdAt: string;
}

type FocusState =
  | { type: "team" }
  | { type: "player"; rosterMembershipId: string }
  | { type: "offense_play"; playLibraryId: string }
  | { type: "defense_play"; playLibraryId: string };

const PLAYER_ACTIONS = [
  { value: "good_movement", label: "Good Movement", scoreDelta: 1, tone: "positive" },
  { value: "no_movement", label: "No Movement", scoreDelta: -1, tone: "negative" },
  { value: "good_effort", label: "Good Effort", scoreDelta: 1, tone: "positive" },
  { value: "poor_effort", label: "Poor Effort", scoreDelta: -1, tone: "negative" },
  { value: "communication", label: "Communication", scoreDelta: 0, tone: "neutral" },
  { value: "mentality_good", label: "Mentality Good", scoreDelta: 1, tone: "positive" },
  { value: "mentality_bad", label: "Mentality Bad", scoreDelta: -1, tone: "negative" },
] as const;

const OFFENSE_PLAY_ACTIONS = [
  { value: "generated_open_shot", label: "Generated Open Shot", scoreDelta: 1, tone: "positive" },
  { value: "run_incorrectly", label: "Run Incorrectly", scoreDelta: -1, tone: "negative" },
  { value: "defended_well", label: "Defended Well", scoreDelta: 0, tone: "warning" },
] as const;

const DEFENSE_PLAY_ACTIONS = [
  { value: "open_shot_allowed", label: "Open Shot Allowed", scoreDelta: -1, tone: "negative" },
  { value: "press_broken_easily", label: "Press Broken Easily", scoreDelta: -1, tone: "negative" },
  { value: "offensive_rebound_allowed", label: "Opp. OREB", scoreDelta: -1, tone: "negative" },
  { value: "bad_rotation", label: "Bad Rotation", scoreDelta: 0, tone: "warning" },
  { value: "great_defense", label: "Great Defense", scoreDelta: 1, tone: "positive" },
  { value: "forced_turnover", label: "Forced TO", scoreDelta: 2, tone: "positive" },
] as const;

function formatClock(secondsRemaining: number) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatObservationLabel(tag: string) {
  return tag
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getScoreTone(score: number) {
  if (score >= 3) {
    return "green";
  }

  if (score <= -3) {
    return "red";
  }

  return "neutral";
}

function aggregateScore(rows: ObservationRow[]) {
  return rows.reduce((total, row) => total + row.scoreDelta, 0);
}

export function ObservationWorkbench({
  gameId,
  quarter,
  secondsRemaining,
  homeTeamName,
  awayTeamName,
  homeRoster,
  awayRoster,
  homeOffensePlay,
  homeDefensePlay,
  awayOffensePlay,
  awayDefensePlay,
  homeOffensePlays,
  homeDefensePlays,
  awayOffensePlays,
  awayDefensePlays,
  initialSelectedTeamSide,
  observations,
}: Readonly<{
  gameId: string;
  quarter: number;
  secondsRemaining: number;
  homeTeamName: string;
  awayTeamName: string;
  homeRoster: ObservationPlayer[];
  awayRoster: ObservationPlayer[];
  homeOffensePlay: ObservationPlay;
  homeDefensePlay: ObservationPlay;
  awayOffensePlay: ObservationPlay;
  awayDefensePlay: ObservationPlay;
  homeOffensePlays: ObservationPlay[];
  homeDefensePlays: ObservationPlay[];
  awayOffensePlays: ObservationPlay[];
  awayDefensePlays: ObservationPlay[];
  initialSelectedTeamSide: "home" | "away";
  observations: ObservationRow[];
}>) {
  const [selectedTeamSide, setSelectedTeamSide] = useState<"home" | "away">(
    initialSelectedTeamSide,
  );
  const [focus, setFocus] = useState<FocusState>({ type: "team" });
  const [showOffensePlays, setShowOffensePlays] = useState(false);
  const [showDefensePlays, setShowDefensePlays] = useState(false);
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();
  const [localObservations, setLocalObservations] = useState(observations);

  useEffect(() => {
    setLocalObservations(observations);
  }, [observations]);

  useEffect(() => {
    setSelectedTeamSide(initialSelectedTeamSide);
  }, [initialSelectedTeamSide]);

  const selectedRoster = useMemo(
    () => (selectedTeamSide === "home" ? homeRoster : awayRoster),
    [awayRoster, homeRoster, selectedTeamSide],
  );
  const selectedOffensePlay = selectedTeamSide === "home" ? homeOffensePlay : awayOffensePlay;
  const selectedDefensePlay = selectedTeamSide === "home" ? homeDefensePlay : awayDefensePlay;
  const offensePlayOptions = selectedTeamSide === "home" ? homeOffensePlays : awayOffensePlays;
  const defensePlayOptions = selectedTeamSide === "home" ? homeDefensePlays : awayDefensePlays;

  useEffect(() => {
    setFocus({ type: "team" });
  }, [selectedTeamSide]);

  const onCourtPlayers = selectedRoster.filter((player) => player.onFloor);
  const benchPlayers = selectedRoster.filter((player) => !player.onFloor);

  const selectedTeamObservations = localObservations.filter(
    (observation) => observation.teamSide === selectedTeamSide,
  );

  const playerScoreMap = new Map<string, number>();
  const playScoreMap = new Map<string, number>();

  for (const observation of selectedTeamObservations) {
    if (observation.observationScope === "player" && observation.rosterMembershipId) {
      playerScoreMap.set(
        observation.rosterMembershipId,
        (playerScoreMap.get(observation.rosterMembershipId) ?? 0) + observation.scoreDelta,
      );
    }

    if (
      (observation.observationScope === "offense_play" ||
        observation.observationScope === "defense_play") &&
      observation.playLibraryId
    ) {
      playScoreMap.set(
        observation.playLibraryId,
        (playScoreMap.get(observation.playLibraryId) ?? 0) + observation.scoreDelta,
      );
    }
  }

  const focusObservations = selectedTeamObservations.filter((observation) => {
    if (focus.type === "player") {
      return observation.observationScope === "player" && observation.rosterMembershipId === focus.rosterMembershipId;
    }

    if (focus.type === "offense_play") {
      return observation.observationScope === "offense_play" && observation.playLibraryId === focus.playLibraryId;
    }

    if (focus.type === "defense_play") {
      return observation.observationScope === "defense_play" && observation.playLibraryId === focus.playLibraryId;
    }

    return observation.observationScope === "team";
  });

  const focusScore = aggregateScore(focusObservations);

  function submitObservation(input: {
    tag: string;
    scoreDelta: number;
    scope: "team" | "player" | "offense_play" | "defense_play";
    rosterMembershipId?: string;
    playLibraryId?: string;
    playName?: string;
  }) {
    const formData = new FormData();
    formData.set("gameId", gameId);
    formData.set("teamSide", selectedTeamSide);
    formData.set("observationScope", input.scope);
    formData.set("quarter", String(quarter));
    formData.set("secondsRemaining", String(secondsRemaining));
    formData.set("tag", input.tag);
    formData.set("scoreDelta", String(input.scoreDelta));

    if (input.rosterMembershipId) {
      formData.set("rosterMembershipId", input.rosterMembershipId);
    }

    if (input.playLibraryId) {
      formData.set("playLibraryId", input.playLibraryId);
    }

    if (note.trim()) {
      formData.set("notes", note.trim());
    }

    if (
      input.scope === "defense_play" &&
      input.scoreDelta < 0 &&
      input.playLibraryId
    ) {
      const recentForPlay = selectedTeamObservations.filter(
        (observation) =>
          observation.observationScope === "defense_play" &&
          observation.playLibraryId === input.playLibraryId,
      );

      if (
        recentForPlay.length >= 2 &&
        recentForPlay[0]?.scoreDelta < 0 &&
        recentForPlay[1]?.scoreDelta < 0
      ) {
        window.alert(`Get out of ${input.playName ?? "this"} defense now.`);
      }
    }

    const optimisticObservation: ObservationRow = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gameId,
      teamSide: selectedTeamSide,
      teamName: selectedTeamSide === "home" ? homeTeamName : awayTeamName,
      observationScope: input.scope,
      rosterMembershipId: input.rosterMembershipId ?? null,
      playerName:
        input.scope === "player"
          ? selectedRoster.find((player) => player.id === input.rosterMembershipId)?.name ?? null
          : null,
      jersey:
        input.scope === "player"
          ? selectedRoster.find((player) => player.id === input.rosterMembershipId)?.jersey ?? null
          : null,
      playLibraryId: input.playLibraryId ?? null,
      playName: input.playName ?? null,
      quarter,
      secondsRemaining,
      tag: input.tag,
      notes: note.trim(),
      scoreDelta: input.scoreDelta,
      createdAt: new Date().toISOString(),
    };

    setLocalObservations((current) => [optimisticObservation, ...current]);
    setNote("");
    startTransition(async () => {
      await createObservationAction(formData);
    });
  }

  function removeObservation(observationId: string) {
    const formData = new FormData();
    formData.set("gameId", gameId);
    formData.set("observationId", observationId);

    setLocalObservations((current) => current.filter((item) => item.id !== observationId));
    startTransition(async () => {
      await deleteObservationAction(formData);
    });
  }

  const quickActions =
    focus.type === "player"
      ? PLAYER_ACTIONS.map((action) => ({
          ...action,
          onPress: () =>
            submitObservation({
              tag: action.value,
              scoreDelta: action.scoreDelta,
              scope: "player",
              rosterMembershipId: focus.rosterMembershipId,
            }),
        }))
      : focus.type === "offense_play"
        ? OFFENSE_PLAY_ACTIONS.map((action) => ({
            ...action,
            onPress: () =>
              submitObservation({
                tag: action.value,
                scoreDelta: action.scoreDelta,
                scope: "offense_play",
                playLibraryId: focus.playLibraryId,
                playName:
                  offensePlayOptions.find((play) => play.id === focus.playLibraryId)?.name ??
                  selectedOffensePlay.name,
              }),
          }))
        : focus.type === "defense_play"
          ? DEFENSE_PLAY_ACTIONS.map((action) => ({
              ...action,
              onPress: () =>
                submitObservation({
                  tag: action.value,
                  scoreDelta: action.scoreDelta,
                  scope: "defense_play",
                  playLibraryId: focus.playLibraryId,
                playName:
                  defensePlayOptions.find((play) => play.id === focus.playLibraryId)?.name ??
                  selectedDefensePlay.name,
              }),
          }))
          : [];

  return (
    <section className="observation-workbench-grid">
      <article className="panel-card">
        <p className="eyebrow-label">Observation Entry</p>
        <h3>
          Q{quarter} · {formatClock(secondsRemaining)}
        </h3>

        <div className="pill-row">
          <button
            className={`pill-button ${selectedTeamSide === "home" ? "active" : ""}`}
            type="button"
            onClick={() => setSelectedTeamSide("home")}
          >
            {homeTeamName}
          </button>
          <button
            className={`pill-button ${selectedTeamSide === "away" ? "active" : ""}`}
            type="button"
            onClick={() => setSelectedTeamSide("away")}
          >
            {awayTeamName}
          </button>
          <button
            className={`pill-button alt ${focus.type === "team" ? "active" : ""}`}
            type="button"
            onClick={() => setFocus({ type: "team" })}
          >
            Team Focus
          </button>
        </div>

        <div className="observation-focus-grid">
          <button
            className={`observation-focus-card ${
              focus.type === "offense_play" ? "active" : ""
            } score-${getScoreTone(selectedOffensePlay.id ? playScoreMap.get(selectedOffensePlay.id) ?? 0 : 0)}`}
            type="button"
            onClick={() =>
              selectedOffensePlay.id
                ? setFocus({ type: "offense_play", playLibraryId: selectedOffensePlay.id })
                : null
            }
          >
            <span className="eyebrow-label">Offense Play</span>
            <strong>{selectedOffensePlay.name}</strong>
            <span className="focus-score">
              Score {selectedOffensePlay.id ? playScoreMap.get(selectedOffensePlay.id) ?? 0 : 0}
            </span>
          </button>
          <button
            className={`observation-focus-card ${
              focus.type === "defense_play" ? "active" : ""
            } score-${getScoreTone(selectedDefensePlay.id ? playScoreMap.get(selectedDefensePlay.id) ?? 0 : 0)}`}
            type="button"
            onClick={() =>
              selectedDefensePlay.id
                ? setFocus({ type: "defense_play", playLibraryId: selectedDefensePlay.id })
                : null
            }
          >
            <span className="eyebrow-label">Defense Play</span>
            <strong>{selectedDefensePlay.name}</strong>
            <span className="focus-score">
              Score {selectedDefensePlay.id ? playScoreMap.get(selectedDefensePlay.id) ?? 0 : 0}
            </span>
          </button>
        </div>

        <div className="two-column observation-play-lists">
          <section className="panel-card nested-panel">
            <button
              className={`observation-section-toggle ${showOffensePlays ? "active" : ""}`}
              type="button"
              onClick={() => setShowOffensePlays((current) => !current)}
            >
              <span>All Offense Plays</span>
              <strong>{showOffensePlays ? "Hide" : "Show"}</strong>
            </button>
            {showOffensePlays ? (
              <div className="observation-play-chip-row">
                {offensePlayOptions.length === 0 ? (
                  <span className="meta">No offense plays loaded.</span>
                ) : (
                  offensePlayOptions.map((play) => {
                    const isCurrent = selectedOffensePlay.id === play.id;
                    const isFocused =
                      focus.type === "offense_play" && focus.playLibraryId === play.id;
                    const score = play.id ? playScoreMap.get(play.id) ?? 0 : 0;

                    return (
                      <button
                        key={play.id ?? play.name}
                        className={`observation-play-chip ${isFocused ? "active" : ""} score-${getScoreTone(score)}`}
                        type="button"
                        onClick={() =>
                          play.id ? setFocus({ type: "offense_play", playLibraryId: play.id }) : null
                        }
                      >
                        <strong>{play.name}</strong>
                        <span>{isCurrent ? "Current" : "Available"} · Score {score}</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </section>
          <section className="panel-card nested-panel">
            <button
              className={`observation-section-toggle ${showDefensePlays ? "active" : ""}`}
              type="button"
              onClick={() => setShowDefensePlays((current) => !current)}
            >
              <span>All Defense Plays</span>
              <strong>{showDefensePlays ? "Hide" : "Show"}</strong>
            </button>
            {showDefensePlays ? (
              <div className="observation-play-chip-row">
                {defensePlayOptions.length === 0 ? (
                  <span className="meta">No defense plays loaded.</span>
                ) : (
                  defensePlayOptions.map((play) => {
                    const isCurrent = selectedDefensePlay.id === play.id;
                    const isFocused =
                      focus.type === "defense_play" && focus.playLibraryId === play.id;
                    const score = play.id ? playScoreMap.get(play.id) ?? 0 : 0;

                    return (
                      <button
                        key={play.id ?? play.name}
                        className={`observation-play-chip ${isFocused ? "active" : ""} score-${getScoreTone(score)}`}
                        type="button"
                        onClick={() =>
                          play.id ? setFocus({ type: "defense_play", playLibraryId: play.id }) : null
                        }
                      >
                        <strong>{play.name}</strong>
                        <span>{isCurrent ? "Current" : "Available"} · Score {score}</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </section>
        </div>

        <div className="two-column" style={{ marginTop: 16 }}>
          <section className="panel-card nested-panel">
            <p className="eyebrow-label">On Court</p>
            <div className="observation-player-grid">
              {onCourtPlayers.map((player) => (
                <button
                  key={player.id}
                  className={`player-selector-button compact ${
                    focus.type === "player" && focus.rosterMembershipId === player.id ? "active" : ""
                  } score-${getScoreTone(playerScoreMap.get(player.id) ?? 0)}`}
                  type="button"
                  onClick={() => setFocus({ type: "player", rosterMembershipId: player.id })}
                >
                  <strong>
                    #{player.jersey || "--"} {player.name}
                  </strong>
                  <span>
                    {player.position || "Player"} · PTS {player.points} · PF {player.fouls}
                  </span>
                  <span className="player-status-line">On court · Score {playerScoreMap.get(player.id) ?? 0}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel-card nested-panel">
            <p className="eyebrow-label">Bench</p>
            <div className="observation-player-grid">
              {benchPlayers.map((player) => (
                <button
                  key={player.id}
                  className={`player-selector-button compact bench ${
                    focus.type === "player" && focus.rosterMembershipId === player.id ? "active" : ""
                  } score-${getScoreTone(playerScoreMap.get(player.id) ?? 0)}`}
                  type="button"
                  onClick={() => setFocus({ type: "player", rosterMembershipId: player.id })}
                >
                  <strong>
                    #{player.jersey || "--"} {player.name}
                  </strong>
                  <span>
                    {player.position || "Player"} · PTS {player.points} · PF {player.fouls}
                  </span>
                  <span className="player-status-line">Bench · Score {playerScoreMap.get(player.id) ?? 0}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

      </article>

      <article className="panel-card observation-control-card">
        <div className={`observation-focus-summary score-${getScoreTone(focusScore)}`}>
          <strong>
            {focus.type === "player"
              ? "Player focus"
              : focus.type === "offense_play"
                ? "Offense play focus"
                : focus.type === "defense_play"
                  ? "Defense play focus"
                  : "Team focus"}
          </strong>
          <span>Current score {focusScore}</span>
        </div>

        <label className="field-group">
          <span>Quick note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional context for this observation"
            rows={3}
          />
        </label>

        {quickActions.length > 0 ? (
          <div className="observation-tag-grid">
            {quickActions.map((action) => (
              <button
                key={action.value}
                className={`observation-tag-button ${action.tone}`}
                type="button"
                onClick={action.onPress}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="meta">
            Select a player, offense play, or defense play to log graded observations.
          </p>
        )}

        <div className="observation-control-divider" />

        <p className="eyebrow-label">Recent Observations</p>
        <h3>Live Coaching Notes</h3>
        <div className="observation-feed">
          {selectedTeamObservations.length > 0 ? (
            selectedTeamObservations.map((observation) => (
              <article key={observation.id} className={`observation-feed-item ${observation.teamSide}`}>
                <div className="observation-feed-header">
                  <div>
                    <strong>{formatObservationLabel(observation.tag)}</strong>
                    <p className="meta">
                      {observation.teamName}
                      {observation.playerName
                        ? ` · ${observation.playerName}${observation.jersey ? ` #${observation.jersey}` : ""}`
                        : observation.playName
                          ? ` · ${observation.playName}`
                          : " · Team"}
                      {" · "}
                      Q{observation.quarter} {formatClock(observation.secondsRemaining)} · Score{" "}
                      {observation.scoreDelta > 0 ? `+${observation.scoreDelta}` : observation.scoreDelta}
                    </p>
                  </div>
                  <button
                    className="button-link ghost compact-control"
                    type="button"
                    onClick={() => removeObservation(observation.id)}
                  >
                    Delete
                  </button>
                </div>
                <p className="pre-wrap-text">{observation.notes || "No note added."}</p>
              </article>
            ))
          ) : (
            <p className="meta">No observations logged yet for this team.</p>
          )}
        </div>
      </article>
    </section>
  );
}
