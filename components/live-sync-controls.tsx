"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function formatLastSynced(timestamp: number) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function shouldPauseAutoRefresh() {
  if (document.hidden || document.body.style.overflow === "hidden") {
    return true;
  }

  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) {
    return false;
  }

  if (activeElement.isContentEditable) {
    return true;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
}

export function LiveSyncControls({
  intervalMs = 5000,
  scopeLabel = "Live",
  pauseWhileEditing = true,
}: Readonly<{
  intervalMs?: number;
  scopeLabel?: string;
  pauseWhileEditing?: boolean;
}>) {
  const router = useRouter();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const refreshInFlightRef = useRef(false);

  const triggerRefresh = useCallback(
    (force = false) => {
      if (!force && pauseWhileEditing && shouldPauseAutoRefresh()) {
        return;
      }

      if (refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;
      startTransition(() => {
        router.refresh();
        window.setTimeout(() => {
          refreshInFlightRef.current = false;
          setLastSyncedAt(Date.now());
        }, 450);
      });
    },
    [pauseWhileEditing, router],
  );

  useEffect(() => {
    if (!autoSyncEnabled) {
      return;
    }

    const interval =
      intervalMs > 0
        ? window.setInterval(() => {
            triggerRefresh(false);
          }, intervalMs)
        : null;

    function handleFocus() {
      triggerRefresh(false);
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        triggerRefresh(false);
      }
    }

    function handleOnline() {
      triggerRefresh(true);
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      if (interval !== null) {
        window.clearInterval(interval);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [autoSyncEnabled, intervalMs, triggerRefresh]);

  return (
    <div className="sync-status-card">
      <div className="sync-status-copy">
        <span className={`sync-status-dot ${autoSyncEnabled ? "active" : ""}`} />
        <div>
          <strong>{isPending ? "Syncing…" : `${scopeLabel} sync ${autoSyncEnabled ? "on" : "paused"}`}</strong>
          <p className="meta">Last sync {formatLastSynced(lastSyncedAt)}</p>
        </div>
      </div>
      <div className="sync-status-actions">
        <button
          className="button-link ghost compact-control"
          type="button"
          onClick={() => triggerRefresh(true)}
        >
          Sync now
        </button>
        <button
          className={`button-link compact-control ${autoSyncEnabled ? "secondary" : "ghost"}`}
          type="button"
          onClick={() => setAutoSyncEnabled((current) => !current)}
        >
          {autoSyncEnabled ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}
