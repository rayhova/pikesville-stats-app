"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveScorerEntry } from "@/components/live-scorer-entry";
import { LiveScoreboard } from "@/components/live-scoreboard";

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

type SelectionMode = "team" | "player";

interface OptimisticQuickEvent {
  teamSide: "home" | "away";
  eventType:
    | "shot"
    | "rebound_off"
    | "rebound_def"
    | "assist"
    | "steal"
    | "block"
    | "turnover"
    | "personal_foul"
    | "timeout_full"
    | "timeout_30";
  rosterMembershipId?: string;
  shotX?: number;
  shotY?: number;
  shotResult?: "make" | "miss";
  shotValue?: 1 | 2 | 3;
  playerName?: string;
  jersey?: string;
  quarter: number;
  secondsRemaining: number;
}

export function LiveGameWorkbench({
  gameId,
  quarter,
  secondsRemaining,
  teamOnOffense,
  homeTeamName,
  awayTeamName,
  homeOnFloor,
  awayOnFloor,
  shotMarkers,
  homeScore,
  awayScore,
  homeQuarterFouls,
  awayQuarterFouls,
  homeQuarterFoulMap,
  awayQuarterFoulMap,
  homeFullTimeouts,
  awayFullTimeouts,
  homeThirtyTimeouts,
  awayThirtyTimeouts,
  homeOffensePlayId,
  homeDefensePlayId,
  awayOffensePlayId,
  awayDefensePlayId,
  homeOffensePlays,
  homeDefensePlays,
  awayOffensePlays,
  awayDefensePlays,
  initialStatus,
  deviceId,
  hasScoringControl,
}: Readonly<{
  gameId: string;
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
  deviceId: string;
  hasScoringControl: boolean;
}>) {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultTeamSide = teamOnOffense ?? "home";
  const defaultHomeRosterId = homeOnFloor[0]?.id ?? "";
  const defaultAwayRosterId = awayOnFloor[0]?.id ?? "";
  const [selectedTeamSide, setSelectedTeamSide] = useState<"home" | "away">(defaultTeamSide);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(
    (defaultTeamSide === "home" ? defaultHomeRosterId : defaultAwayRosterId) ? "player" : "team",
  );
  const [homeSelectedRosterId, setHomeSelectedRosterId] = useState(defaultHomeRosterId);
  const [awaySelectedRosterId, setAwaySelectedRosterId] = useState(defaultAwayRosterId);
  const [liveQuarter, setLiveQuarter] = useState(quarter);
  const [liveSecondsRemaining, setLiveSecondsRemaining] = useState(secondsRemaining);
  const [liveStatus, setLiveStatus] = useState(initialStatus);
  const [displayHomeScore, setDisplayHomeScore] = useState(homeScore);
  const [displayAwayScore, setDisplayAwayScore] = useState(awayScore);
  const [displayHomeQuarterFouls, setDisplayHomeQuarterFouls] = useState(homeQuarterFouls);
  const [displayAwayQuarterFouls, setDisplayAwayQuarterFouls] = useState(awayQuarterFouls);
  const [displayHomePlayers, setDisplayHomePlayers] = useState(homeOnFloor);
  const [displayAwayPlayers, setDisplayAwayPlayers] = useState(awayOnFloor);
  const [displayShotMarkers, setDisplayShotMarkers] = useState(shotMarkers);
  const isViewOnly = liveStatus === "final" || !hasScoringControl;

  useEffect(() => {
    setLiveQuarter(quarter);
    setLiveSecondsRemaining(secondsRemaining);
    setLiveStatus(initialStatus);
  }, [quarter, secondsRemaining, initialStatus]);

  useEffect(() => {
    if (!homeOnFloor.some((player) => player.id === homeSelectedRosterId)) {
      setHomeSelectedRosterId(homeOnFloor[0]?.id ?? "");
    }
  }, [homeOnFloor, homeSelectedRosterId]);

  useEffect(() => {
    if (!awayOnFloor.some((player) => player.id === awaySelectedRosterId)) {
      setAwaySelectedRosterId(awayOnFloor[0]?.id ?? "");
    }
  }, [awayOnFloor, awaySelectedRosterId]);

  useEffect(() => {
    setDisplayHomeScore(homeScore);
  }, [homeScore]);

  useEffect(() => {
    setDisplayAwayScore(awayScore);
  }, [awayScore]);

  useEffect(() => {
    setDisplayHomeQuarterFouls(homeQuarterFoulMap[liveQuarter] ?? homeQuarterFouls);
  }, [homeQuarterFoulMap, homeQuarterFouls, liveQuarter]);

  useEffect(() => {
    setDisplayAwayQuarterFouls(awayQuarterFoulMap[liveQuarter] ?? awayQuarterFouls);
  }, [awayQuarterFoulMap, awayQuarterFouls, liveQuarter]);

  useEffect(() => {
    setDisplayHomePlayers(homeOnFloor);
  }, [homeOnFloor]);

  useEffect(() => {
    setDisplayAwayPlayers(awayOnFloor);
  }, [awayOnFloor]);

  useEffect(() => {
    setDisplayShotMarkers(shotMarkers);
  }, [shotMarkers]);

  function scheduleRefresh() {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      router.refresh();
      refreshTimerRef.current = null;
    }, 1200);
  }

  function handleOptimisticEvent(event: OptimisticQuickEvent) {
    if (event.eventType === "shot") {
      if (event.shotResult === "make" && event.shotValue) {
        if (event.teamSide === "home") {
          setDisplayHomeScore((current) => current + event.shotValue!);
        } else {
          setDisplayAwayScore((current) => current + event.shotValue!);
        }
      }

      if (event.rosterMembershipId) {
        const applyPoints = (players: OnFloorPlayer[]) =>
          players.map((player) =>
            player.id === event.rosterMembershipId && event.shotResult === "make" && event.shotValue
              ? { ...player, points: player.points + event.shotValue }
              : player,
          );

        if (event.teamSide === "home") {
          setDisplayHomePlayers((current) => applyPoints(current));
        } else {
          setDisplayAwayPlayers((current) => applyPoints(current));
        }
      }

      if (
        event.shotX !== undefined &&
        event.shotY !== undefined &&
        event.playerName &&
        event.jersey !== undefined
      ) {
        setDisplayShotMarkers((current) => [
          {
            id: `optimistic-shot-${Date.now()}`,
            x: event.shotX!,
            y: event.shotY!,
            result: event.shotResult ?? null,
            value: event.shotValue ?? null,
            teamSide: event.teamSide,
            rosterMembershipId: event.rosterMembershipId ?? null,
            playerName: event.playerName!,
            jersey: event.jersey ?? "",
            quarter: event.quarter,
            secondsRemaining: event.secondsRemaining,
          },
          ...current,
        ]);
      }
    }

    if (event.eventType === "personal_foul") {
      if (event.teamSide === "home") {
        setDisplayHomeQuarterFouls((current) => current + 1);
        if (event.rosterMembershipId) {
          setDisplayHomePlayers((current) =>
            current.map((player) =>
              player.id === event.rosterMembershipId
                ? { ...player, fouls: player.fouls + 1 }
                : player,
            ),
          );
        }
      } else {
        setDisplayAwayQuarterFouls((current) => current + 1);
        if (event.rosterMembershipId) {
          setDisplayAwayPlayers((current) =>
            current.map((player) =>
              player.id === event.rosterMembershipId
                ? { ...player, fouls: player.fouls + 1 }
                : player,
            ),
          );
        }
      }
    }

    scheduleRefresh();
  }

  const filteredShotMarkers = useMemo(() => {
    const activeRosterId = selectedTeamSide === "home" ? homeSelectedRosterId : awaySelectedRosterId;
    return displayShotMarkers.filter((marker) => {
      if (marker.teamSide !== selectedTeamSide) {
        return false;
      }

      if (selectionMode === "player" && activeRosterId) {
        return marker.rosterMembershipId === activeRosterId;
      }

      return true;
    });
  }, [awaySelectedRosterId, displayShotMarkers, homeSelectedRosterId, selectedTeamSide, selectionMode]);
  return (
    <section className="live-primary-stage">
      <LiveScoreboard
        gameId={gameId}
        deviceId={deviceId}
        canScore={hasScoringControl}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeScore={displayHomeScore}
        awayScore={displayAwayScore}
        homeFouls={displayHomeQuarterFouls}
        awayFouls={displayAwayQuarterFouls}
        homeFullTimeouts={homeFullTimeouts}
        awayFullTimeouts={awayFullTimeouts}
        homeThirtyTimeouts={homeThirtyTimeouts}
        awayThirtyTimeouts={awayThirtyTimeouts}
        initialQuarter={quarter}
        initialSecondsRemaining={secondsRemaining}
        initialStatus={initialStatus}
        initialTeamOnOffense={teamOnOffense}
        selectedTeamSide={selectedTeamSide}
        onTeamSelect={(teamSide) => {
          setSelectedTeamSide(teamSide);
          setSelectionMode("team");
        }}
        onLiveStateChange={(state) => {
          setLiveQuarter(state.quarter);
          setLiveSecondsRemaining(state.secondsRemaining);
          setLiveStatus(state.status);
        }}
      />

      <LiveScorerEntry
        gameId={gameId}
        quarter={liveQuarter}
        secondsRemaining={liveSecondsRemaining}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeOnFloor={displayHomePlayers}
        awayOnFloor={displayAwayPlayers}
        shotMarkers={filteredShotMarkers}
        selectedTeamSide={selectedTeamSide}
        selectedRosterId={selectedTeamSide === "home" ? homeSelectedRosterId : awaySelectedRosterId}
        selectionMode={selectionMode}
        onSelectTeam={(teamSide) => {
          setSelectedTeamSide(teamSide);
          setSelectionMode("team");
        }}
        onSelectPlayer={(teamSide, rosterId) => {
          setSelectedTeamSide(teamSide);
          setSelectionMode("player");
          if (teamSide === "home") {
            setHomeSelectedRosterId(rosterId);
          } else {
            setAwaySelectedRosterId(rosterId);
          }
        }}
        homeFullTimeouts={homeFullTimeouts}
        awayFullTimeouts={awayFullTimeouts}
        homeThirtyTimeouts={homeThirtyTimeouts}
        awayThirtyTimeouts={awayThirtyTimeouts}
        homeOffensePlayId={homeOffensePlayId}
        homeDefensePlayId={homeDefensePlayId}
        awayOffensePlayId={awayOffensePlayId}
        awayDefensePlayId={awayDefensePlayId}
        homeOffensePlays={homeOffensePlays}
        homeDefensePlays={homeDefensePlays}
        awayOffensePlays={awayOffensePlays}
        awayDefensePlays={awayDefensePlays}
        isGameFinal={liveStatus === "final"}
        canScore={!isViewOnly}
        deviceId={deviceId}
        onOptimisticEvent={handleOptimisticEvent}
      />
    </section>
  );
}
