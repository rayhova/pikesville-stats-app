"use client";

import { useActionState } from "react";
import {
  createPlayerDevelopmentPlanFromPlayerPageAction,
  type PlayerCoachActionState,
  updatePlayerDevelopmentPlanFromPlayerPageAction,
} from "@/app/stats/players/actions";

const initialState: PlayerCoachActionState = {};

const GOAL_TYPES = [
  { value: "skill_focus", label: "Skill Focus" },
  { value: "physical_development", label: "Physical Development" },
  { value: "behavioral_goals", label: "Behavioral Goals" },
  { value: "tactical_or_team_goals", label: "Tactical / Team Goals" },
] as const;

export function PlayerCoachDevelopmentForm({
  playerId,
  defaultDate,
  planId,
  creatorName,
  defaultHorizon = "short_term",
  defaultTargetDate = "",
  defaultGoalType = "skill_focus",
  defaultPlanBody = "",
  submitLabel,
  mode = "create",
}: Readonly<{
  playerId: string;
  defaultDate: string;
  planId?: string;
  creatorName?: string;
  defaultHorizon?: "short_term" | "long_term";
  defaultTargetDate?: string;
  defaultGoalType?: "skill_focus" | "physical_development" | "behavioral_goals" | "tactical_or_team_goals";
  defaultPlanBody?: string;
  submitLabel?: string;
  mode?: "create" | "edit";
}>) {
  const action = mode === "edit" ? updatePlayerDevelopmentPlanFromPlayerPageAction : createPlayerDevelopmentPlanFromPlayerPageAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldKey = planId ?? playerId;

  return (
    <form action={formAction} className="form-grid player-coach-form">
      <input type="hidden" name="playerId" value={playerId} />
      {planId ? <input type="hidden" name="planId" value={planId} /> : null}
      {creatorName ? <input type="hidden" name="coachName" value={creatorName} /> : null}
      {mode === "edit" && creatorName ? (
        <p className="meta field-span-2">Originally created by {creatorName}</p>
      ) : null}
      <div className="field-group">
        <label htmlFor={`player-plan-horizon-${fieldKey}`}>Plan Horizon</label>
        <select id={`player-plan-horizon-${fieldKey}`} name="horizon" defaultValue={defaultHorizon}>
          <option value="short_term">Short-Term</option>
          <option value="long_term">Long-Term</option>
        </select>
      </div>
      <div className="field-group">
        <label htmlFor={`player-plan-date-${fieldKey}`}>Plan Date</label>
        <input id={`player-plan-date-${fieldKey}`} name="planDate" type="date" defaultValue={defaultDate} required />
      </div>
      <div className="field-group">
        <label htmlFor={`player-plan-target-${fieldKey}`}>Target Date</label>
        <input id={`player-plan-target-${fieldKey}`} name="targetDate" type="date" defaultValue={defaultTargetDate} />
      </div>
      <div className="field-group">
        <label htmlFor={`player-plan-goal-type-${fieldKey}`}>Goal Type</label>
        <select id={`player-plan-goal-type-${fieldKey}`} name="goalType" defaultValue={defaultGoalType}>
          {GOAL_TYPES.map((goal) => (
            <option key={goal.value} value={goal.value}>
              {goal.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group field-span-2">
        <label htmlFor={`player-plan-body-${fieldKey}`}>Development Plan</label>
        <textarea
          id={`player-plan-body-${fieldKey}`}
          name="planBody"
          rows={5}
          placeholder="Write the player's development focus, habits, and next steps."
          defaultValue={defaultPlanBody}
          required
        />
      </div>
      {state.error ? <p className="form-error field-span-2">{state.error}</p> : null}
      {state.success ? <p className="form-success field-span-2">Development plan saved.</p> : null}
      <div className="action-row field-span-2">
        <button className="button-link" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : (submitLabel ?? (mode === "edit" ? "Update Development Plan" : "Save Development Plan"))}
        </button>
      </div>
    </form>
  );
}
