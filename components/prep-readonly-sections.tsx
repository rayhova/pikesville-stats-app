import { type ReactNode } from "react";
import { type GamePrepSnapshot } from "@/lib/admin-repository";

function ReadOnlyNoteCard({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="prep-detail-card">
      <p className="eyebrow-label">{label}</p>
      <p className="pre-wrap-text">{value || "Nothing entered yet."}</p>
    </div>
  );
}

function CoachingResponsibilityList({
  value,
}: Readonly<{
  value: string[];
}>) {
  return (
    <div className="prep-detail-card">
      <p className="eyebrow-label">Coaching Responsibility</p>
      {value.length > 0 ? (
        <ul className="list-compact">
          {value.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="pre-wrap-text">Nothing entered yet.</p>
      )}
    </div>
  );
}

export function ScoutingOverviewPanels({
  prep,
}: Readonly<{
  prep: GamePrepSnapshot;
}>) {
  return (
    <section className="panel-grid">
      <article className="panel-card">
        <p className="eyebrow-label">Opponent Overview</p>
        <h3>{prep.opponentTeam.name}</h3>
        <div className="prep-scouting-stack">
          <ReadOnlyNoteCard label="Offense" value={prep.opponentTeam.offense} />
          <ReadOnlyNoteCard label="Defense" value={prep.opponentTeam.defense} />
          <ReadOnlyNoteCard label="Press" value={prep.opponentTeam.press} />
          <ReadOnlyNoteCard label="Scouting Summary" value={prep.opponentTeam.scoutingSummary} />
        </div>

        {prep.opponentTeam.scoutingVideos.length > 0 ? (
          <>
            <h3 style={{ marginTop: 18 }}>Scouting Videos</h3>
            <div className="prep-video-list">
              {prep.opponentTeam.scoutingVideos.map((video, index) => (
                <details key={`${prep.gameId}-video-${index}`} className="prep-video-card">
                  <summary>Video {index + 1}</summary>
                  <pre>{video}</pre>
                </details>
              ))}
            </div>
          </>
        ) : null}
      </article>

      <article className="panel-card">
        <p className="eyebrow-label">Game Emphasis</p>
        <h3>Shared Focus</h3>
        <div className="prep-scouting-stack">
          <ReadOnlyNoteCard label="Opponent Summary" value={prep.overview.opponentSummary} />
          <ReadOnlyNoteCard label="Keys To Winning" value={prep.overview.keysToWinning} />
          <ReadOnlyNoteCard label="Actions To Watch" value={prep.overview.actionsToWatch} />
        </div>
      </article>
    </section>
  );
}

export function GamePlanCardReadOnly({
  prep,
}: Readonly<{
  prep: GamePrepSnapshot;
}>) {
  return (
    <section className="panel-grid">
      <article className="panel-card">
        <p className="eyebrow-label">Coach View</p>
        <h3>Game Plan Card Front</h3>
        <div className="prep-scouting-stack">
          <ReadOnlyNoteCard label="Identity" value={prep.gamePlanCard.identity} />
          <ReadOnlyNoteCard label="Defense" value={prep.gamePlanCard.defensePlan} />
          <ReadOnlyNoteCard label="Defensive Matchups" value={prep.gamePlanCard.defenseMatchups} />
          <ReadOnlyNoteCard label="Press" value={prep.gamePlanCard.pressPlan} />
          <ReadOnlyNoteCard label="Offense vs Man" value={prep.gamePlanCard.offenseVsMan} />
          <ReadOnlyNoteCard label="Offense vs Zone" value={prep.gamePlanCard.offenseVsZone} />
        </div>
      </article>
      <article className="panel-card">
        <p className="eyebrow-label">Coach View</p>
        <h3>Execution Focus</h3>
        <div className="prep-scouting-stack">
          <ReadOnlyNoteCard label="BLOB" value={prep.gamePlanCard.blobPlan} />
          <ReadOnlyNoteCard label="SLOB" value={prep.gamePlanCard.slobPlan} />
          <ReadOnlyNoteCard label="Subs" value={prep.gamePlanCard.subsPlan} />
          <ReadOnlyNoteCard label="Key Matchups" value={prep.gamePlanCard.keyMatchups} />
          <ReadOnlyNoteCard label="Key Metrics" value={prep.gamePlanCard.keyMetrics} />
          <ReadOnlyNoteCard label="Special Situations" value={prep.gamePlanCard.specialSituations} />
          <CoachingResponsibilityList
            value={prep.gamePlanCard.coachingResponsibilities.split("\n").filter(Boolean)}
          />
        </div>
      </article>
    </section>
  );
}

export function TimeoutCardReadOnly({
  prep,
  coachTasks,
}: Readonly<{
  prep: GamePrepSnapshot;
  coachTasks?: ReactNode;
}>) {
  return (
    <section className="panel-grid">
      <article className="panel-card">
        <p className="eyebrow-label">Coach View</p>
        <h3>Timeout Checklist</h3>
        <div className="notice">
          <strong>{prep.timeoutCard.prompt}</strong>
          <br />
          Our timeouts: Full {prep.timeoutCard.ourFullTimeouts} | 30 {prep.timeoutCard.ourThirtyTimeouts}
          <br />
          Opponent timeouts: Full {prep.timeoutCard.opponentFullTimeouts} | 30{" "}
          {prep.timeoutCard.opponentThirtyTimeouts}
        </div>
        {coachTasks ? <div className="timeout-task-inline">{coachTasks}</div> : null}
        <div className="prep-scouting-stack">
          <ReadOnlyNoteCard label="Defense" value={prep.timeoutCard.timeoutDefenseChecklist} />
          <ReadOnlyNoteCard label="Offense" value={prep.timeoutCard.timeoutOffenseChecklist} />
          <ReadOnlyNoteCard
            label="Press / Poise"
            value={prep.timeoutCard.timeoutPressPoiseChecklist}
          />
        </div>
      </article>
      <article className="panel-card">
        <p className="eyebrow-label">Coach View</p>
        <h3>Lineup & Late Game</h3>
        <div className="prep-scouting-stack">
          <ReadOnlyNoteCard
            label="Lineup Questions"
            value={prep.timeoutCard.timeoutLineupQuestions}
          />
          <ReadOnlyNoteCard label="Late Game" value={prep.timeoutCard.timeoutLateGameChecklist} />
        </div>
      </article>
    </section>
  );
}
