import { saveGamePrepAction } from "@/app/admin/actions";
import { type CoachProfileRow, type GamePrepSnapshot } from "@/lib/admin-repository";

export function GamePlanCardForm({
  prep,
  coachRows,
}: Readonly<{
  prep: GamePrepSnapshot;
  coachRows: CoachProfileRow[];
}>) {
  return (
    <article className="panel-card">
      <p className="eyebrow-label">Admin Only</p>
      <h3>Game Plan Card Front</h3>
      <form action={saveGamePrepAction} className="form-grid">
        <input name="gameId" type="hidden" value={prep.gameId} />
        <input name="returnTo" type="hidden" value={`/admin/games/${prep.gameId}/prep/game-plan`} />
        <div className="field-group">
          <label htmlFor="identity">Identity</label>
          <textarea id="identity" name="identity" defaultValue={prep.gamePlanCard.identity} />
        </div>
        <div className="field-group">
          <label htmlFor="defense-plan">Defense</label>
          <textarea id="defense-plan" name="defensePlan" defaultValue={prep.gamePlanCard.defensePlan} />
        </div>
        <div className="field-group">
          <label htmlFor="defense-matchups">Defensive Matchups</label>
          <textarea
            id="defense-matchups"
            name="defenseMatchups"
            defaultValue={prep.gamePlanCard.defenseMatchups}
          />
        </div>
        <div className="field-group">
          <label htmlFor="press-plan">Press</label>
          <textarea id="press-plan" name="pressPlan" defaultValue={prep.gamePlanCard.pressPlan} />
        </div>
        <div className="field-group">
          <label htmlFor="offense-vs-man">Offense vs Man</label>
          <textarea
            id="offense-vs-man"
            name="offenseVsMan"
            defaultValue={prep.gamePlanCard.offenseVsMan}
          />
        </div>
        <div className="field-group">
          <label htmlFor="offense-vs-zone">Offense vs Zone</label>
          <textarea
            id="offense-vs-zone"
            name="offenseVsZone"
            defaultValue={prep.gamePlanCard.offenseVsZone}
          />
        </div>
        <div className="field-group">
          <label htmlFor="blob-plan">BLOB</label>
          <textarea id="blob-plan" name="blobPlan" defaultValue={prep.gamePlanCard.blobPlan} />
        </div>
        <div className="field-group">
          <label htmlFor="slob-plan">SLOB</label>
          <textarea id="slob-plan" name="slobPlan" defaultValue={prep.gamePlanCard.slobPlan} />
        </div>
        <div className="field-group">
          <label htmlFor="subs-plan">Subs</label>
          <textarea id="subs-plan" name="subsPlan" defaultValue={prep.gamePlanCard.subsPlan} />
        </div>
        <div className="field-group">
          <label htmlFor="key-matchups">Key Matchups</label>
          <textarea
            id="key-matchups"
            name="keyMatchups"
            defaultValue={prep.gamePlanCard.keyMatchups}
          />
        </div>
        <div className="field-group">
          <label htmlFor="key-metrics">Key Metrics</label>
          <textarea id="key-metrics" name="keyMetrics" defaultValue={prep.gamePlanCard.keyMetrics} />
        </div>
        <div className="field-group field-span-2">
          <label htmlFor="special-situations">Special Situations</label>
          <textarea
            id="special-situations"
            name="specialSituations"
            defaultValue={prep.gamePlanCard.specialSituations}
          />
        </div>
        <div className="field-group field-span-2">
          <label>Coaching Responsibility</label>
          <div className="repeatable-stack">
            {prep.gamePlanCard.coachingResponsibilityRows.map((row, index) => (
              <div key={row.id} className="management-card">
                <input type="hidden" name="coachingResponsibilityIds" value={row.id} />
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`coaching-responsibility-label-${row.id}`}>Responsibility</label>
                    <input
                      id={`coaching-responsibility-label-${row.id}`}
                      name={`coachingResponsibilityLabel:${row.id}`}
                      defaultValue={row.label}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`coaching-responsibility-coach-${row.id}`}>Assigned Coach</label>
                    <select
                      id={`coaching-responsibility-coach-${row.id}`}
                      name={`coachingResponsibilityCoachProfileId:${row.id}`}
                      defaultValue={row.coachProfileId ?? ""}
                    >
                      <option value="">Unassigned</option>
                      {coachRows.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="meta">Row {index + 1} will feed the coach-facing game day assignments automatically.</p>
              </div>
            ))}
          </div>
        </div>
        <div className="action-row field-span-2">
          <button className="button-link" type="submit">
            Save Game Plan Card
          </button>
        </div>
      </form>
    </article>
  );
}

export function TimeoutCardForm({
  prep,
}: Readonly<{
  prep: GamePrepSnapshot;
}>) {
  return (
    <article className="panel-card">
      <p className="eyebrow-label">Admin Only</p>
      <h3>Timeout Checklist (Back)</h3>
      <form action={saveGamePrepAction} className="form-grid">
        <input name="gameId" type="hidden" value={prep.gameId} />
        <input name="returnTo" type="hidden" value={`/admin/games/${prep.gameId}/prep/timeout`} />
        <div className="field-group field-span-2">
          <label>Timeout Prompt</label>
          <div className="notice">
            <strong>{prep.timeoutCard.prompt}</strong>
            <br />
            Our timeouts: Full {prep.timeoutCard.ourFullTimeouts} | 30 {prep.timeoutCard.ourThirtyTimeouts}
            <br />
            Opponent timeouts: Full {prep.timeoutCard.opponentFullTimeouts} | 30{" "}
            {prep.timeoutCard.opponentThirtyTimeouts}
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="timeout-defense-checklist">Defense</label>
          <textarea
            id="timeout-defense-checklist"
            name="timeoutDefenseChecklist"
            defaultValue={prep.timeoutCard.timeoutDefenseChecklist}
          />
        </div>
        <div className="field-group">
          <label htmlFor="timeout-offense-checklist">Offense</label>
          <textarea
            id="timeout-offense-checklist"
            name="timeoutOffenseChecklist"
            defaultValue={prep.timeoutCard.timeoutOffenseChecklist}
          />
        </div>
        <div className="field-group">
          <label htmlFor="timeout-press-poise-checklist">Press / Poise</label>
          <textarea
            id="timeout-press-poise-checklist"
            name="timeoutPressPoiseChecklist"
            defaultValue={prep.timeoutCard.timeoutPressPoiseChecklist}
          />
        </div>
        <div className="field-group">
          <label htmlFor="timeout-lineup-questions">Lineup Questions</label>
          <textarea
            id="timeout-lineup-questions"
            name="timeoutLineupQuestions"
            defaultValue={prep.timeoutCard.timeoutLineupQuestions}
          />
        </div>
        <div className="field-group field-span-2">
          <label htmlFor="timeout-late-game-checklist">Late Game</label>
          <textarea
            id="timeout-late-game-checklist"
            name="timeoutLateGameChecklist"
            defaultValue={prep.timeoutCard.timeoutLateGameChecklist}
          />
        </div>
        <div className="action-row field-span-2">
          <button className="button-link" type="submit">
            Save Timeout Card
          </button>
        </div>
      </form>
    </article>
  );
}
