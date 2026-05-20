"use client";

import { useActionState } from "react";
import {
  createPlayerEvaluationFromPlayerPageAction,
  type PlayerCoachActionState,
  updatePlayerEvaluationFromPlayerPageAction,
} from "@/app/stats/players/actions";

const initialState: PlayerCoachActionState = {};

export function PlayerCoachEvaluationForm({
  playerId,
  defaultDate,
  evaluationId,
  creatorName,
  defaultEvaluation = "",
  defaultPlayerViewEvaluation = "",
  submitLabel,
  mode = "create",
}: Readonly<{
  playerId: string;
  defaultDate: string;
  evaluationId?: string;
  creatorName?: string;
  defaultEvaluation?: string;
  defaultPlayerViewEvaluation?: string;
  submitLabel?: string;
  mode?: "create" | "edit";
}>) {
  const action = mode === "edit" ? updatePlayerEvaluationFromPlayerPageAction : createPlayerEvaluationFromPlayerPageAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldKey = evaluationId ?? playerId;

  return (
    <form action={formAction} className="form-grid player-coach-form">
      <input type="hidden" name="playerId" value={playerId} />
      {evaluationId ? <input type="hidden" name="evaluationId" value={evaluationId} /> : null}
      {creatorName ? <input type="hidden" name="coachName" value={creatorName} /> : null}
      {mode === "edit" && creatorName ? (
        <p className="meta field-span-2">Originally created by {creatorName}</p>
      ) : null}
      <div className="field-group">
        <label htmlFor={`player-evaluation-date-${fieldKey}`}>Evaluation Date</label>
        <input id={`player-evaluation-date-${fieldKey}`} name="evaluationDate" type="date" defaultValue={defaultDate} required />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor={`player-evaluation-body-${fieldKey}`}>Coach Evaluation</label>
        <textarea
          id={`player-evaluation-body-${fieldKey}`}
          name="evaluation"
          rows={6}
          placeholder="Write the full coach evaluation here. The player-facing version will be generated automatically."
          defaultValue={defaultEvaluation}
          required
        />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor={`player-evaluation-player-view-${fieldKey}`}>Player View Evaluation</label>
        <textarea
          id={`player-evaluation-player-view-${fieldKey}`}
          name="playerViewEvaluation"
          rows={5}
          placeholder="Optional. Leave blank to auto-generate a softer player-facing version."
          defaultValue={defaultPlayerViewEvaluation}
        />
      </div>
      {state.error ? <p className="form-error field-span-2">{state.error}</p> : null}
      {state.success ? <p className="form-success field-span-2">Evaluation saved.</p> : null}
      <div className="action-row field-span-2">
        <button className="button-link" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : (submitLabel ?? (mode === "edit" ? "Update Evaluation" : "Save Evaluation"))}
        </button>
      </div>
    </form>
  );
}
