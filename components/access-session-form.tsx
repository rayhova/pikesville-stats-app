"use client";

import { useState } from "react";
import { clearAccessSessionAction, setAccessSessionAction } from "@/app/access/actions";
import {
  APP_ROLE_OPTIONS,
  getDefaultAccessDestination,
  type AppRole,
} from "@/lib/access-config";

interface PlayerOption {
  id: string;
  label: string;
}

interface CoachOption {
  id: string;
  label: string;
}

interface ManagerOption {
  id: string;
  label: string;
}

export function AccessSessionForm({
  currentRole,
  currentPlayerRosterMembershipId,
  currentCoachProfileId,
  currentManagerProfileId,
  playerOptions,
  coachOptions,
  managerOptions,
}: {
  currentRole: AppRole | null;
  currentPlayerRosterMembershipId: string | null;
  currentCoachProfileId: string | null;
  currentManagerProfileId: string | null;
  playerOptions: PlayerOption[];
  coachOptions: CoachOption[];
  managerOptions: ManagerOption[];
}) {
  const [role, setRole] = useState<AppRole>(currentRole ?? "coach");

  return (
    <article className="card access-card">
      <h2>Access</h2>
      <p>
        Staging access uses role-based entry for now. Admin keeps full setup access, coaches can
        view strategy, managers stay on calendar and assignments, and players stay in the read-only scouting
        view.
      </p>
      <form action={setAccessSessionAction} className="form-grid">
        <div className="field-group">
          <label htmlFor="access-role">Role</label>
          <select
            id="access-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as AppRole)}
          >
            {APP_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {role === "player" ? (
          <div className="field-group">
            <label htmlFor="access-player">Player Context</label>
            <select
              id="access-player"
              name="playerRosterMembershipId"
              defaultValue={currentPlayerRosterMembershipId ?? ""}
            >
              <option value="">None</option>
              {playerOptions.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="playerRosterMembershipId" value="" />
        )}
        {role === "coach" ? (
          <div className="field-group">
            <label htmlFor="access-coach">Coach Context</label>
            <select id="access-coach" name="coachProfileId" defaultValue={currentCoachProfileId ?? ""}>
              <option value="">None</option>
              {coachOptions.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="coachProfileId" value="" />
        )}
        {role === "manager" ? (
          <div className="field-group">
            <label htmlFor="access-manager">Manager Context</label>
            <select
              id="access-manager"
              name="managerProfileId"
              defaultValue={currentManagerProfileId ?? ""}
            >
              <option value="">None</option>
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="managerProfileId" value="" />
        )}
        <div className="action-row field-span-2">
          <button className="button-link" type="submit">
            Continue As {APP_ROLE_OPTIONS.find((option) => option.value === role)?.label}
          </button>
          {currentRole ? (
            <button className="button-link ghost" type="submit" formAction={clearAccessSessionAction}>
              Clear Access
            </button>
          ) : null}
        </div>
      </form>
      {currentRole ? (
        <p className="meta">
          Current destination: {getDefaultAccessDestination(currentRole)}
        </p>
      ) : null}
    </article>
  );
}
