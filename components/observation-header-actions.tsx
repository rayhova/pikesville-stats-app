"use client";

import { LiveSyncControls } from "@/components/live-sync-controls";

export function ObservationHeaderActions({
  gameId,
}: Readonly<{
  gameId: string;
}>) {
  function goTo(path: string) {
    window.location.assign(path);
  }

  return (
    <>
      <LiveSyncControls intervalMs={5000} scopeLabel="Observation" pauseWhileEditing={false} />
      <button
        className="button-link secondary"
        type="button"
        onClick={() => goTo(`/games/${gameId}`)}
      >
        Open Scorer
      </button>
      <button
        className="button-link ghost"
        type="button"
        onClick={() => goTo("/admin/games")}
      >
        Back To Games
      </button>
    </>
  );
}
