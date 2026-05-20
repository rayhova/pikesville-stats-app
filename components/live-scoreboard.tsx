"use client";

import { useEffect, useState, useTransition } from "react";
import { saveClockStateAction } from "@/app/games/actions";

function formatClock(secondsRemaining: number) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function parseClockInput(value: string) {
  if (value.includes(":")) {
    const [minutesPart, secondsPart] = value.split(":");
    const minutes = Number.parseInt(minutesPart ?? "0", 10) || 0;
    const seconds = Number.parseInt(secondsPart ?? "0", 10) || 0;
    return Math.max(0, minutes * 60 + Math.min(seconds, 59));
  }

  return Math.max(0, Number.parseInt(value, 10) || 0);
}

function getQuarterResetSeconds(quarter: number) {
  return quarter > 4 ? 240 : 480;
}

export function LiveScoreboard({
  gameId,
  deviceId,
  canScore,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeFouls,
  awayFouls,
  homeFullTimeouts,
  awayFullTimeouts,
  homeThirtyTimeouts,
  awayThirtyTimeouts,
  initialQuarter,
  initialSecondsRemaining,
  initialStatus,
  initialTeamOnOffense,
  selectedTeamSide,
  onTeamSelect,
  onLiveStateChange,
}: Readonly<{
  gameId: string;
  deviceId: string;
  canScore: boolean;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeFouls: number;
  awayFouls: number;
  homeFullTimeouts: number;
  awayFullTimeouts: number;
  homeThirtyTimeouts: number;
  awayThirtyTimeouts: number;
  initialQuarter: number;
  initialSecondsRemaining: number;
  initialStatus: "scheduled" | "live" | "final";
  initialTeamOnOffense: "home" | "away" | null;
  selectedTeamSide: "home" | "away";
  onTeamSelect?: (teamSide: "home" | "away") => void;
  onLiveStateChange?: (state: {
    quarter: number;
    secondsRemaining: number;
    status: "scheduled" | "live" | "final";
    teamOnOffense: "home" | "away";
  }) => void;
}>) {
  const [quarter, setQuarter] = useState(initialQuarter);
  const [secondsRemaining, setSecondsRemaining] = useState(initialSecondsRemaining);
  const [teamOnOffense, setTeamOnOffense] = useState<"home" | "away">(
    initialTeamOnOffense ?? "home",
  );
  const [status, setStatus] = useState<"scheduled" | "live" | "final">(initialStatus);
  const [savedQuarter, setSavedQuarter] = useState(initialQuarter);
  const [savedSecondsRemaining, setSavedSecondsRemaining] = useState(initialSecondsRemaining);
  const [savedTeamOnOffense, setSavedTeamOnOffense] = useState<"home" | "away">(
    initialTeamOnOffense ?? "home",
  );
  const [savedStatus, setSavedStatus] = useState<"scheduled" | "live" | "final">(initialStatus);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditingClock, setIsEditingClock] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [clockInput, setClockInput] = useState(formatClock(initialSecondsRemaining));
  const isFinal = status === "final";
  const isLocked = !canScore;

  useEffect(() => {
    setQuarter(initialQuarter);
    setSecondsRemaining(initialSecondsRemaining);
    setStatus(initialStatus);
    setTeamOnOffense(initialTeamOnOffense ?? "home");
    setSavedQuarter(initialQuarter);
    setSavedSecondsRemaining(initialSecondsRemaining);
    setSavedTeamOnOffense(initialTeamOnOffense ?? "home");
    setSavedStatus(initialStatus);
    setClockInput(formatClock(initialSecondsRemaining));
  }, [initialQuarter, initialSecondsRemaining, initialStatus, initialTeamOnOffense]);

  useEffect(() => {
    onLiveStateChange?.({
      quarter,
      secondsRemaining,
      status,
      teamOnOffense,
    });
  }, [onLiveStateChange, quarter, secondsRemaining, status, teamOnOffense]);

  function persistClock(next: {
    quarter?: number;
    secondsRemaining?: number;
    status?: "scheduled" | "live" | "final";
    teamOnOffense?: "home" | "away";
  }) {
    const payload = {
      gameId,
      quarter: next.quarter ?? quarter,
      secondsRemaining: next.secondsRemaining ?? secondsRemaining,
      status: next.status ?? status,
      teamOnOffense: next.teamOnOffense ?? teamOnOffense,
      deviceId,
    };

    if (!canScore) {
      window.alert("Take scoring control before changing the live clock.");
      return;
    }

    startTransition(() => {
      void saveClockStateAction(payload)
        .then(() => {
          setSavedQuarter(payload.quarter);
          setSavedSecondsRemaining(payload.secondsRemaining);
          setClockInput(formatClock(payload.secondsRemaining));
          setSavedTeamOnOffense(payload.teamOnOffense);
          setSavedStatus(payload.status);
        })
        .catch(() => {
          window.alert("Couldn't save game state. Please try again.");
        });
    });
  }

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 0) {
          window.clearInterval(interval);
          setIsRunning(false);
          setStatus("live");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  return (
    <section className="scoreboard-shell">
      <button
        className={`scoreboard-team compact scoreboard-team-button ${
          selectedTeamSide === "home" ? "active" : ""
        }`}
        type="button"
        onClick={() => onTeamSelect?.("home")}
      >
        <p className="eyebrow-label">Home</p>
        <h2>{homeTeamName}</h2>
        <div className="scoreboard-score">{homeScore}</div>
        <p>
          Fouls {homeFouls} · Full TO {homeFullTimeouts} · 30s {homeThirtyTimeouts}
        </p>
      </button>

      <article className="scoreboard-center compact">
        <p className="eyebrow-label">Clock</p>
        <div className="scoreboard-clock-row">
          <button
            className={`scoreboard-possession-button ${teamOnOffense === "home" ? "active" : ""}`}
            type="button"
            aria-label={`${homeTeamName} possession`}
            onClick={() => {
              if (isFinal || isLocked) {
                return;
              }
              setTeamOnOffense("home");
              persistClock({ teamOnOffense: "home" });
            }}
          >
            ◀
          </button>
          <div className="scoreboard-clock">{formatClock(secondsRemaining)}</div>
          <button
            className={`scoreboard-possession-button ${teamOnOffense === "away" ? "active" : ""}`}
            type="button"
            aria-label={`${awayTeamName} possession`}
            onClick={() => {
              if (isFinal || isLocked) {
                return;
              }
              setTeamOnOffense("away");
              persistClock({ teamOnOffense: "away" });
            }}
          >
            ▶
          </button>
        </div>
        <div className="scoreboard-inline-meta">
          <span>Q{quarter}</span>
          <span>{teamOnOffense === "home" ? `${homeTeamName} ball` : `${awayTeamName} ball`}</span>
          <span>{status}</span>
        </div>
        {isEditingClock ? (
          <div className="scoreboard-compact-fields">
            <label className="field-group compact-field">
                  <span>Quarter</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quarter}
                    onChange={(event) => {
                      const nextQuarter = Number(event.target.value || 1);
                      setQuarter(nextQuarter);
                    }}
                  />
                </label>
                <label className="field-group compact-field">
                  <span>Clock</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={clockInput}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setClockInput(nextValue);
                      setSecondsRemaining(parseClockInput(nextValue));
                    }}
                  />
                </label>
            <label className="field-group compact-field">
              <span>Possession</span>
              <select
                value={teamOnOffense}
                onChange={(event) => setTeamOnOffense(event.target.value as "home" | "away")}
              >
                <option value="home">{homeTeamName}</option>
                <option value="away">{awayTeamName}</option>
              </select>
            </label>
          </div>
        ) : null}
        <div className="scoreboard-controls">
          <button
            className="button-link make compact-control"
            type="button"
            disabled={isFinal || isLocked}
            title={isLocked ? "Take scoring control before starting the clock." : undefined}
            onClick={() => {
              setStatus("live");
              setIsRunning(true);
              persistClock({ status: "live" });
            }}
          >
            Start
          </button>
          <button
            className="button-link secondary compact-control"
            type="button"
            disabled={isFinal || isLocked}
            title={isLocked ? "Take scoring control before pausing the clock." : undefined}
            onClick={() => {
              setIsRunning(false);
              persistClock({});
            }}
          >
            Pause
          </button>
          {isEditingClock ? (
            <>
              <button
                className="button-link ghost compact-control"
                type="button"
                onClick={() => {
                  if (isLocked) {
                    window.alert("Take scoring control before saving clock changes.");
                    return;
                  }

                  const quarterChanged = quarter !== savedQuarter;
                  const nextSecondsRemaining = quarterChanged
                    ? getQuarterResetSeconds(quarter)
                    : secondsRemaining;

                  if (
                    quarterChanged &&
                    !window.confirm(
                      "Saving a new quarter will reset the clock to 8:00 (or 4:00 in OT) and switch the scoreboard foul display to that quarter. Continue?",
                    )
                  ) {
                    return;
                  }

                  setSecondsRemaining(nextSecondsRemaining);
                  setClockInput(formatClock(nextSecondsRemaining));
                  persistClock({ secondsRemaining: nextSecondsRemaining });
                  setIsEditingClock(false);
                }}
              >
                Save
              </button>
              <button
                className="button-link ghost compact-control"
                type="button"
                  onClick={() => {
                    setQuarter(savedQuarter);
                    setSecondsRemaining(savedSecondsRemaining);
                    setClockInput(formatClock(savedSecondsRemaining));
                    setTeamOnOffense(savedTeamOnOffense);
                    setStatus(savedStatus);
                    setIsEditingClock(false);
                  }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="button-link ghost compact-control"
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  if (isLocked) {
                    window.alert("Take scoring control before editing the clock.");
                    return;
                  }
                  setIsEditingClock(true);
                }}
              >
                Edit
              </button>
              {isFinal ? (
                <button
                  className="button-link secondary compact-control"
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      window.alert("Take scoring control before reopening the game.");
                      return;
                    }

                    if (!window.confirm("Reopen this game for editing?")) {
                      return;
                    }

                    setStatus("live");
                    persistClock({ status: "live" });
                  }}
                >
                  Reopen
                </button>
              ) : (
                <button
                  className="button-link miss compact-control"
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      window.alert("Take scoring control before finishing the game.");
                      return;
                    }

                    if (!window.confirm("Finish this game and lock live stat entry?")) {
                      return;
                    }

                    setIsRunning(false);
                    setIsEditingClock(false);
                    setStatus("final");
                    persistClock({ status: "final" });
                  }}
                >
                  Finish
                </button>
              )}
            </>
          )}
        </div>
        {isPending ? <div className="scoreboard-status-row"><span className="meta">Saving...</span></div> : null}
      </article>

      <button
        className={`scoreboard-team compact scoreboard-team-button ${
          selectedTeamSide === "away" ? "active" : ""
        }`}
        type="button"
        onClick={() => onTeamSelect?.("away")}
      >
        <p className="eyebrow-label">Away</p>
        <h2>{awayTeamName}</h2>
        <div className="scoreboard-score">{awayScore}</div>
        <p>
          Fouls {awayFouls} · Full TO {awayFullTimeouts} · 30s {awayThirtyTimeouts}
        </p>
      </button>
    </section>
  );
}
