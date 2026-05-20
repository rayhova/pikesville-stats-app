"use client";

import { useEffect, useState } from "react";
import {
  heartbeatScoringControlAction,
  releaseScoringControlAction,
  takeScoringControlAction,
} from "@/app/games/actions";
import { useScorerDeviceId } from "@/components/scorer-device-id";
import type { ScoringLockRecord } from "@/lib/admin-repository";

export function ScoringControlChip({
  gameId,
  initialScoringLock,
  onControlChange,
}: Readonly<{
  gameId: string;
  initialScoringLock: ScoringLockRecord | null;
  onControlChange: (input: {
    deviceId: string;
    lock: ScoringLockRecord | null;
    hasControl: boolean;
  }) => void;
}>) {
  const deviceId = useScorerDeviceId();
  const [scoringLock, setScoringLock] = useState<ScoringLockRecord | null>(initialScoringLock);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const hasControl = Boolean(deviceId) && scoringLock?.status === "active" && scoringLock.deviceId === deviceId;

  useEffect(() => {
    setScoringLock(initialScoringLock);
  }, [initialScoringLock]);

  useEffect(() => {
    onControlChange({ deviceId, lock: scoringLock, hasControl });
  }, [deviceId, hasControl, onControlChange, scoringLock]);

  useEffect(() => {
    if (!deviceId || !hasControl) {
      return;
    }

    const heartbeat = () => {
      void heartbeatScoringControlAction({ gameId, deviceId })
        .then((lock) => {
          if (lock) {
            setScoringLock(lock);
          }
        })
        .catch(() => {
          setMessage("Heartbeat missed");
        });
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, 15000);

    return () => window.clearInterval(interval);
  }, [deviceId, gameId, hasControl]);

  async function takeControl(force = false) {
    if (!deviceId) {
      setMessage("Device setup...");
      return;
    }

    if (
      force &&
      scoringLock &&
      !window.confirm(
        `${scoringLock.scorerLabel} may have unsynced offline events. Taking over could create duplicate stats if their device comes back online. Continue?`,
      )
    ) {
      return;
    }

    setIsPending(true);
    setMessage("");

    try {
      const lock = await takeScoringControlAction({ gameId, deviceId, force });
      setScoringLock(lock);
      setMessage("Control active");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not take control");
    } finally {
      setIsPending(false);
    }
  }

  async function releaseControl() {
    if (!deviceId) {
      return;
    }

    setIsPending(true);
    setMessage("");

    try {
      await releaseScoringControlAction({ gameId, deviceId });
      setScoringLock(null);
      setMessage("Released");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not release");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={`scoring-control-chip ${hasControl ? "active" : "view-only"}`}>
      <div className="scoring-control-copy">
        <span className="scoring-control-label">Scorer</span>
        <strong>{hasControl ? "This device" : scoringLock ? scoringLock.scorerLabel : "View only"}</strong>
        <small>
          {message ||
            (scoringLock
              ? `Seen ${new Date(scoringLock.lastHeartbeatAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "No active lock")}
        </small>
      </div>
      <div className="scoring-control-actions">
        {hasControl ? (
          <button className="button-link ghost compact-control" type="button" disabled={isPending} onClick={() => void releaseControl()}>
            Release
          </button>
        ) : (
          <>
            <button className="button-link secondary compact-control" type="button" disabled={isPending || !deviceId} onClick={() => void takeControl(false)}>
              Take
            </button>
            {scoringLock ? (
              <button className="button-link ghost danger compact-control" type="button" disabled={isPending || !deviceId} onClick={() => void takeControl(true)}>
                Override
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
