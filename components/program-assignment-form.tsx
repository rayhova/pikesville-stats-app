"use client";

import { useMemo, useState } from "react";
import { createProgramAssignmentAction, updateProgramAssignmentAction } from "@/app/admin/actions";
import { CheckboxDropdownSelect } from "@/components/checkbox-dropdown-select";
import { PROGRAM_ASSIGNMENT_TYPE_OPTIONS } from "@/lib/program-hub";

interface AudienceRoleOption {
  value: "admin" | "coach" | "manager" | "player";
  label: string;
}

interface PlayOption {
  id: string;
  name: string;
  team: string;
}

interface GameOption {
  id: string;
  opponent: string;
  date: string;
}

interface PlayerOption {
  id: string;
  playerId: string;
  name: string;
  team: string;
  jersey: string;
}

interface TeamSeasonOption {
  id: string;
  label: string;
}

interface CoachOption {
  id: string;
  displayName: string;
  fullName: string;
}

interface ManagerOption {
  id: string;
  displayName: string;
  fullName: string;
}

export function ProgramAssignmentForm({
  audienceRoles,
  playRows,
  gameRows,
  teamSeasonRows,
  playerRows,
  coachRows,
  managerRows,
  initialAssignment,
  submitLabel,
  mode = "create",
}: {
  audienceRoles: readonly AudienceRoleOption[];
  playRows: PlayOption[];
  gameRows: GameOption[];
  teamSeasonRows: TeamSeasonOption[];
  playerRows: PlayerOption[];
  coachRows: CoachOption[];
  managerRows: ManagerOption[];
  initialAssignment?: {
    id: string;
    title: string;
    body?: string;
    assignmentType: string;
    dueAt?: string;
    isActive: boolean;
    targetRoles: string[];
    targetRosterMembershipIds: string[];
    targetCoachProfileIds: string[];
    targetManagerProfileIds: string[];
    relatedPlayIds: string[];
    relatedGameId?: string;
    relatedPlayerIds: string[];
    videoEmbedCode?: string;
    shotsTarget?: number;
    proofRequired: boolean;
    customUrl?: string;
  };
  submitLabel?: string;
  mode?: "create" | "edit";
}) {
  const [assignmentType, setAssignmentType] = useState(initialAssignment?.assignmentType ?? "custom");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialAssignment?.targetRoles ?? []);
  const [selectedTeamSeasons, setSelectedTeamSeasons] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(initialAssignment?.targetRosterMembershipIds ?? []);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>(initialAssignment?.targetCoachProfileIds ?? []);
  const [selectedManagers, setSelectedManagers] = useState<string[]>(initialAssignment?.targetManagerProfileIds ?? []);
  const [selectedPlays, setSelectedPlays] = useState<string[]>(initialAssignment?.relatedPlayIds ?? []);
  const [selectedRelatedPlayers, setSelectedRelatedPlayers] = useState<string[]>(initialAssignment?.relatedPlayerIds ?? []);
  const formAction = mode === "edit" ? updateProgramAssignmentAction : createProgramAssignmentAction;

  const targetsPlayers = selectedRoles.includes("player");
  const targetsCoaches = selectedRoles.includes("coach");
  const targetsManagers = selectedRoles.includes("manager");
  const needsPlaySelection = assignmentType === "play_review";
  const needsReportSelection = assignmentType === "read_scouting_report";
  const needsLinkedPlayer =
    assignmentType === "create_evaluation" || assignmentType === "create_development_plan";
  const needsShotsTarget = assignmentType === "shooting_goal";

  const linkedPlayerLabel = useMemo(() => {
    if (assignmentType === "create_evaluation") {
      return "Player For Evaluation";
    }
    if (assignmentType === "create_development_plan") {
      return "Player For Development Plan";
    }
    return "Player";
  }, [assignmentType]);

  function handleRoleToggle(role: string, checked: boolean) {
    setSelectedRoles((current) =>
      checked ? Array.from(new Set([...current, role])) : current.filter((item) => item !== role),
    );
  }

  return (
    <form action={formAction} className="form-grid">
      {initialAssignment ? <input type="hidden" name="programAssignmentId" value={initialAssignment.id} /> : null}
      <div className="field-group field-span-2">
        <label htmlFor="assignment-title">Title</label>
        <input id="assignment-title" name="title" defaultValue={initialAssignment?.title ?? ""} />
      </div>
      <div className="field-group">
        <label htmlFor="assignment-type">Assignment Type</label>
        <select
          id="assignment-type"
          name="assignmentType"
          value={assignmentType}
          onChange={(event) => setAssignmentType(event.target.value)}
        >
          {PROGRAM_ASSIGNMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group">
        <label htmlFor="assignment-due">Due</label>
        <input id="assignment-due" name="dueAt" type="datetime-local" defaultValue={initialAssignment?.dueAt ?? ""} />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor="assignment-body">Instructions / Context</label>
        <textarea id="assignment-body" name="body" defaultValue={initialAssignment?.body ?? ""} />
      </div>
      <div className="field-group field-span-2">
        <label>Assign To Roles</label>
        <div className="pill-row">
          {audienceRoles.map((role) => (
            <label key={role.value} className="checkbox-inline">
              <input
                name="targetRoles"
                type="checkbox"
                value={role.value}
                checked={selectedRoles.includes(role.value)}
                onChange={(event) => handleRoleToggle(role.value, event.target.checked)}
              />
              {role.label}
            </label>
          ))}
        </div>
      </div>

      {targetsPlayers ? (
        <>
          <div className="field-group field-span-2">
            <CheckboxDropdownSelect
              label="Target Player Groups"
              name="targetTeamSeasonIds"
              options={teamSeasonRows.map((teamSeason) => ({
                value: teamSeason.id,
                label: teamSeason.label,
              }))}
              selectedValues={selectedTeamSeasons}
              onChange={setSelectedTeamSeasons}
              placeholder="All player groups"
              allowSelectAll
            />
            <p className="meta">Pick Varsity, JV, or both. Leave blank to include every active Pikesville player.</p>
          </div>
          <div className="field-group field-span-2">
            <CheckboxDropdownSelect
              label="Target Specific Players"
              name="targetRosterMembershipIds"
              options={playerRows.map((player) => ({
                value: player.id,
                label: `${player.name} · ${player.team} · ${player.jersey}`,
              }))}
              selectedValues={selectedPlayers}
              onChange={setSelectedPlayers}
              placeholder="No specific player overrides"
              allowSelectAll
            />
            <p className="meta">Optional. Use this for one-off player targets in addition to the selected group.</p>
          </div>
        </>
      ) : null}

      {targetsCoaches ? (
        <div className="field-group field-span-2">
          <CheckboxDropdownSelect
            label="Target Specific Coaches"
            name="targetCoachProfileIds"
            options={coachRows.map((coach) => ({
              value: coach.id,
              label: `${coach.displayName} · ${coach.fullName}`,
            }))}
            selectedValues={selectedCoaches}
            onChange={setSelectedCoaches}
            placeholder="All selected coaches"
            allowSelectAll
          />
          <p className="meta">Leave blank to send it to every coach role.</p>
        </div>
      ) : null}

      {targetsManagers ? (
        <div className="field-group field-span-2">
          <CheckboxDropdownSelect
            label="Target Specific Managers"
            name="targetManagerProfileIds"
            options={managerRows.map((manager) => ({
              value: manager.id,
              label: `${manager.displayName} · ${manager.fullName}`,
            }))}
            selectedValues={selectedManagers}
            onChange={setSelectedManagers}
            placeholder="All selected managers"
            allowSelectAll
          />
          <p className="meta">Leave blank to send it to every manager role.</p>
        </div>
      ) : null}

      {needsPlaySelection ? (
        <div className="field-group field-span-2">
          <CheckboxDropdownSelect
            label="Linked Plays"
            name="relatedPlayIds"
            options={playRows.map((play) => ({ value: play.id, label: `${play.name} · ${play.team}` }))}
            selectedValues={selectedPlays}
            onChange={setSelectedPlays}
            placeholder="Select plays"
            allowSelectAll
          />
        </div>
      ) : null}

      {needsReportSelection ? (
        <div className="field-group field-span-2">
          <label htmlFor="assignment-game">Linked Report</label>
          <select id="assignment-game" name="relatedGameId" defaultValue={initialAssignment?.relatedGameId ?? ""}>
            <option value="">None</option>
            {gameRows.map((game) => (
              <option key={game.id} value={game.id}>
                {game.opponent} · {game.date}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {needsLinkedPlayer ? (
        <div className="field-group field-span-2">
          <CheckboxDropdownSelect
            label={linkedPlayerLabel}
            name="relatedPlayerIds"
            options={playerRows.map((player) => ({
              value: player.playerId,
              label: `${player.name} · ${player.team} · ${player.jersey}`,
            }))}
            selectedValues={selectedRelatedPlayers}
            onChange={setSelectedRelatedPlayers}
            placeholder="All active players"
            allowSelectAll
          />
          <p className="meta">Leave blank to assign it across all active Pikesville players.</p>
        </div>
      ) : null}

      {needsShotsTarget ? (
        <div className="field-group">
          <label htmlFor="assignment-shots-target">Shots Target</label>
          <input id="assignment-shots-target" name="shotsTarget" type="number" min="1" defaultValue={initialAssignment?.shotsTarget ?? 250} />
        </div>
      ) : null}

      <div className="field-group field-span-2">
        <label htmlFor="assignment-video-embed">Video Embed Code</label>
        <textarea id="assignment-video-embed" name="videoEmbedCode" defaultValue={initialAssignment?.videoEmbedCode ?? ""} />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor="assignment-custom-url">Custom URL</label>
        <input id="assignment-custom-url" name="customUrl" placeholder="https://..." defaultValue={initialAssignment?.customUrl ?? ""} />
      </div>
      <label className="checkbox-inline">
        <input name="proofRequired" type="checkbox" defaultChecked={initialAssignment?.proofRequired ?? false} />
        Proof Required
      </label>
      <label className="checkbox-inline">
        <input name="isActive" type="checkbox" defaultChecked={initialAssignment?.isActive ?? true} />
        Active
      </label>
      <div className="action-row field-span-2">
        <button className="button-link" type="submit">
          {submitLabel ?? (mode === "edit" ? "Update Assignment" : "Add Assignment")}
        </button>
      </div>
    </form>
  );
}
