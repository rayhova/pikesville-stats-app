"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { LiveOverlayShell } from "@/components/live-overlay-shell";
import { LiveGameWorkbench } from "@/components/live-game-workbench";
import { ScoringControlChip } from "@/components/scoring-control-chip";
import type { ScoringLockRecord } from "@/lib/admin-repository";

interface OnFloorPlayer {
  id: string;
  name: string;
  jersey: string;
  position: string;
  points: number;
  fouls: number;
}

interface ShotMarker {
  id: string;
  x: number;
  y: number;
  result: "make" | "miss" | null;
  value: number | null;
  teamSide: "home" | "away";
  rosterMembershipId: string | null;
  playerName: string;
  jersey: string;
  quarter: number;
  secondsRemaining: number;
}

interface PlayOption {
  id: string;
  name: string;
}

export function LiveGameWithScoringControl({
  gameId,
  initialScoringLock,
  utilityMiddle,
  utilityActions,
  statsPanel,
  eventsPanel,
  substitutionsPanel,
  ...workbenchProps
}: Readonly<{
  gameId: string;
  initialScoringLock: ScoringLockRecord | null;
  utilityMiddle?: ReactNode;
  utilityActions: ReactNode;
  statsPanel: ReactNode;
  eventsPanel: ReactNode;
  substitutionsPanel: ReactNode;
  quarter: number;
  secondsRemaining: number;
  teamOnOffense: "home" | "away" | null;
  homeTeamName: string;
  awayTeamName: string;
  homeOnFloor: OnFloorPlayer[];
  awayOnFloor: OnFloorPlayer[];
  shotMarkers: ShotMarker[];
  homeScore: number;
  awayScore: number;
  homeQuarterFouls: number;
  awayQuarterFouls: number;
  homeQuarterFoulMap: Record<number, number>;
  awayQuarterFoulMap: Record<number, number>;
  homeFullTimeouts: number;
  awayFullTimeouts: number;
  homeThirtyTimeouts: number;
  awayThirtyTimeouts: number;
  homeOffensePlayId: string | null;
  homeDefensePlayId: string | null;
  awayOffensePlayId: string | null;
  awayDefensePlayId: string | null;
  homeOffensePlays: PlayOption[];
  homeDefensePlays: PlayOption[];
  awayOffensePlays: PlayOption[];
  awayDefensePlays: PlayOption[];
  initialStatus: "scheduled" | "live" | "final";
}>) {
  const [deviceId, setDeviceId] = useState("");
  const [hasScoringControl, setHasScoringControl] = useState(false);
  const handleControlChange = useCallback(
    (input: { deviceId: string; lock: ScoringLockRecord | null; hasControl: boolean }) => {
      setDeviceId(input.deviceId);
      setHasScoringControl(input.hasControl);
    },
    [],
  );
  const chip = (
    <ScoringControlChip
      gameId={gameId}
      initialScoringLock={initialScoringLock}
      onControlChange={handleControlChange}
    />
  );

  return (
    <>
      <LiveOverlayShell
        launcherClassName="overlay-launcher-row overlay-launcher-inline utility-overlay-launcher"
        utilityMiddle={
          <>
            {chip}
            {utilityMiddle}
          </>
        }
        utilityActions={utilityActions}
        statsPanel={statsPanel}
        eventsPanel={eventsPanel}
        substitutionsPanel={substitutionsPanel}
      />
      <LiveGameWorkbench
        gameId={gameId}
        {...workbenchProps}
        deviceId={deviceId}
        hasScoringControl={hasScoringControl}
      />
    </>
  );
}
