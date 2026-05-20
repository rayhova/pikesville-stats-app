"use client";

import { useState } from "react";
import { CheckboxDropdownSelect } from "@/components/checkbox-dropdown-select";
import { sendCustomPushAlertAction } from "@/app/alerts/actions";

interface PlayerOption {
  id: string;
  label: string;
}

interface TeamSeasonOption {
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

export function CustomPushAlertForm({
  teamSeasonOptions,
  playerOptions,
  coachOptions,
  managerOptions,
}: {
  teamSeasonOptions: TeamSeasonOption[];
  playerOptions: PlayerOption[];
  coachOptions: CoachOption[];
  managerOptions: ManagerOption[];
}) {
  const [selectedTeamSeasons, setSelectedTeamSeasons] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

  return (
    <form action={sendCustomPushAlertAction} className="form-grid">
      <div className="field-group field-span-2">
        <label htmlFor="custom-alert-title">Alert Title</label>
        <input id="custom-alert-title" name="title" />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor="custom-alert-body">Message</label>
        <textarea id="custom-alert-body" name="body" />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor="custom-alert-link">Link</label>
        <input id="custom-alert-link" name="linkUrl" placeholder="/calendar" defaultValue="/" />
      </div>
      <div className="field-group field-span-2">
        <label>Send To Roles</label>
        <div className="pill-row">
          <label className="checkbox-inline">
            <input name="targetRoles" type="checkbox" value="admin" />
            Admin
          </label>
          <label className="checkbox-inline">
            <input name="targetRoles" type="checkbox" value="coach" />
            Coach
          </label>
          <label className="checkbox-inline">
            <input name="targetRoles" type="checkbox" value="manager" />
            Manager
          </label>
          <label className="checkbox-inline">
            <input name="targetRoles" type="checkbox" value="player" />
            Player
          </label>
        </div>
      </div>
      <div className="field-group field-span-2">
        <CheckboxDropdownSelect
          label="Player Groups"
          name="targetTeamSeasonIds"
          options={teamSeasonOptions.map((teamSeason) => ({ value: teamSeason.id, label: teamSeason.label }))}
          selectedValues={selectedTeamSeasons}
          onChange={setSelectedTeamSeasons}
          placeholder="All player groups"
          allowSelectAll
        />
        <p className="meta">Optional. Select Varsity, JV, or both when Player is checked.</p>
      </div>
      <div className="field-group field-span-2">
        <CheckboxDropdownSelect
          label="Specific Players"
          name="targetRosterMembershipIds"
          options={playerOptions.map((player) => ({ value: player.id, label: player.label }))}
          selectedValues={selectedPlayers}
          onChange={setSelectedPlayers}
          placeholder="All selected players"
          allowSelectAll
        />
        <p className="meta">Optional. If left blank, every selected player role gets the alert.</p>
      </div>
      <div className="field-group field-span-2">
        <CheckboxDropdownSelect
          label="Specific Coaches"
          name="targetCoachProfileIds"
          options={coachOptions.map((coach) => ({ value: coach.id, label: coach.label }))}
          selectedValues={selectedCoaches}
          onChange={setSelectedCoaches}
          placeholder="All selected coaches"
          allowSelectAll
        />
      </div>
      <div className="field-group field-span-2">
        <CheckboxDropdownSelect
          label="Specific Managers"
          name="targetManagerProfileIds"
          options={managerOptions.map((manager) => ({ value: manager.id, label: manager.label }))}
          selectedValues={selectedManagers}
          onChange={setSelectedManagers}
          placeholder="All selected managers"
          allowSelectAll
        />
      </div>
      <div className="action-row field-span-2">
        <button className="button-link secondary" type="submit">
          Send Alert
        </button>
      </div>
    </form>
  );
}
