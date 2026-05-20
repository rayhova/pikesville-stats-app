"use client";

import { useState } from "react";
import { saveSubstitutionsPanelAction } from "@/app/games/actions";
import { ScorerDeviceIdInput } from "@/components/scorer-device-id";

interface SubstitutionsPanelRosterRow {
  id: string;
  label: string;
  checked: boolean;
  minutes: string;
}

export function SubstitutionsPanelForm({
  gameId,
  homeTeamName,
  awayTeamName,
  homeRoster,
  awayRoster,
  status,
  quarter,
  secondsRemaining,
  teamOnOffense,
}: Readonly<{
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeRoster: SubstitutionsPanelRosterRow[];
  awayRoster: SubstitutionsPanelRosterRow[];
  status: "scheduled" | "live" | "final";
  quarter: number;
  secondsRemaining: string;
  teamOnOffense: "home" | "away";
}>) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      await saveSubstitutionsPanelAction(formData);
      window.dispatchEvent(
        new CustomEvent("live-overlay-close", {
          detail: { panel: "subs" },
        }),
      );
    } catch {
      window.alert("Couldn't save substitutions. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="live-game-grid">
      <input type="hidden" name="gameId" value={gameId} />
      <ScorerDeviceIdInput />
      <article className="panel-card">
        <p className="eyebrow-label">{homeTeamName}</p>
        <h3>On-Floor Lineup</h3>
        <div className="lineup-list">
          {homeRoster.map((player) => (
            <label key={player.id} className="lineup-item">
              <input
                type="checkbox"
                name="homeRosterMembershipIds"
                value={player.id}
                defaultChecked={player.checked}
              />
              <span className="lineup-item-copy">
                <span>{player.label}</span>
                <small className="lineup-item-minutes">MIN: {player.minutes}</small>
              </span>
            </label>
          ))}
        </div>
      </article>

      <article className="panel-card">
        <p className="eyebrow-label">{awayTeamName}</p>
        <h3>On-Floor Lineup</h3>
        <div className="lineup-list">
          {awayRoster.map((player) => (
            <label key={player.id} className="lineup-item">
              <input
                type="checkbox"
                name="awayRosterMembershipIds"
                value={player.id}
                defaultChecked={player.checked}
              />
              <span className="lineup-item-copy">
                <span>{player.label}</span>
                <small className="lineup-item-minutes">MIN: {player.minutes}</small>
              </span>
            </label>
          ))}
        </div>
      </article>

      <article className="panel-card field-span-2">
        <p className="eyebrow-label">Live Context</p>
        <h3>Game State</h3>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="game-status-live">Status</label>
            <select id="game-status-live" name="status" defaultValue={status}>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="quarter-live">Quarter</label>
            <input id="quarter-live" name="quarter" type="number" min="1" max="10" defaultValue={quarter} />
          </div>
          <div className="field-group">
            <label htmlFor="seconds-live">Clock</label>
            <input id="seconds-live" name="secondsRemaining" type="text" inputMode="numeric" defaultValue={secondsRemaining} />
          </div>
          <div className="field-group">
            <label htmlFor="offense-side-live">Team On Offense</label>
            <select id="offense-side-live" name="teamOnOffense" defaultValue={teamOnOffense}>
              <option value="home">{homeTeamName}</option>
              <option value="away">{awayTeamName}</option>
            </select>
          </div>
          <div className="action-row field-span-2">
            <button className="button-link" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Substitutions And Game State"}
            </button>
          </div>
        </div>
      </article>
    </form>
  );
}
