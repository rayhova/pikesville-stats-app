"use client";

import { useMemo, useState } from "react";
import type { PlayerRosterRow } from "@/lib/admin-repository";

function formatValue(value?: string | string[]) {
  if (!value) {
    return "Not set";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Not set";
  }

  return value;
}

function PlayerCard({
  player,
  onOpen,
}: {
  player: PlayerRosterRow;
  onOpen: (player: PlayerRosterRow) => void;
}) {
  return (
    <button className="prep-player-card" type="button" onClick={() => onOpen(player)}>
      <div className="prep-player-card-top">
        <span className="prep-player-card-jersey">{player.jersey}</span>
        <span className={`prep-player-role ${player.isStarter ? "starter" : "reserve"}`}>
          {player.isStarter ? "Starter" : "Reserve"}
        </span>
      </div>
      <h4>{player.name}</h4>
      <p className="prep-player-card-meta">
        {player.position || "Player"} {player.height ? `· ${player.height}` : ""}
      </p>
      <p className="prep-player-card-summary">{player.playerNotes || player.tendencies || "Open player report"}</p>
    </button>
  );
}

export function PrepPlayerBoard({ players }: { players: PlayerRosterRow[] }) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRosterRow | null>(null);

  const { starters, reserves } = useMemo(
    () => ({
      starters: players.filter((player) => player.isStarter),
      reserves: players.filter((player) => !player.isStarter),
    }),
    [players],
  );

  return (
    <>
      <section className="panel-grid prep-player-sections">
        <article className="panel-card">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow-label">Opponent Starters</p>
              <h3>Projected Starting Group</h3>
            </div>
            <span className="pill">{starters.length}</span>
          </div>
          <div className="prep-player-grid">
            {starters.map((player) => (
              <PlayerCard key={player.id} player={player} onOpen={setSelectedPlayer} />
            ))}
            {starters.length === 0 ? <p className="meta">No starters marked yet.</p> : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow-label">Opponent Reserves</p>
              <h3>Bench Rotation</h3>
            </div>
            <span className="pill alt">{reserves.length}</span>
          </div>
          <div className="prep-player-grid">
            {reserves.map((player) => (
              <PlayerCard key={player.id} player={player} onOpen={setSelectedPlayer} />
            ))}
            {reserves.length === 0 ? <p className="meta">No reserve players marked yet.</p> : null}
          </div>
        </article>
      </section>

      {selectedPlayer ? (
        <div className="overlay-scrim" role="presentation" onClick={() => setSelectedPlayer(null)}>
          <article
            className="overlay-panel-card prep-player-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedPlayer.name} scouting report`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overlay-panel-header">
              <div>
                <p className="eyebrow-label">Individual Report</p>
                <h3>
                  {selectedPlayer.name} {selectedPlayer.jersey}
                </h3>
              </div>
              <button className="overlay-close-button" type="button" onClick={() => setSelectedPlayer(null)}>
                Close
              </button>
            </div>
            <div className="overlay-panel-body">
              <div className="prep-player-detail-grid">
                <div className="prep-detail-card">
                  <p className="eyebrow-label">Profile</p>
                  <ul className="list-compact">
                    <li>Role: {selectedPlayer.isStarter ? "Starter" : "Reserve"}</li>
                    <li>Position: {formatValue(selectedPlayer.position)}</li>
                    <li>Height: {formatValue(selectedPlayer.height)}</li>
                    <li>Closeout Type: {formatValue(selectedPlayer.closeoutType)}</li>
                    <li>Speed Type: {formatValue(selectedPlayer.speedType)}</li>
                    <li>Drive Preference: {formatValue(selectedPlayer.drivePreference)}</li>
                    <li>Trap Preference: {formatValue(selectedPlayer.trapPreference)}</li>
                    <li>Type Of Defender: {formatValue(selectedPlayer.defenderTypes)}</li>
                  </ul>
                </div>

                <div className="prep-detail-card">
                  <p className="eyebrow-label">Tendencies</p>
                  <p className="pre-wrap-text">{selectedPlayer.tendencies || "No tendencies entered yet."}</p>
                </div>

                <div className="prep-detail-card">
                  <p className="eyebrow-label">Matchup Notes</p>
                  <p className="pre-wrap-text">{selectedPlayer.matchupNotes || "No matchup notes entered yet."}</p>
                </div>

                <div className="prep-detail-card">
                  <p className="eyebrow-label">Player Notes</p>
                  <p className="pre-wrap-text">{selectedPlayer.playerNotes || "No player notes entered yet."}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
