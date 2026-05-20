"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ResponsivePageActions } from "@/components/responsive-page-actions";

type OverlayPanel = "stats" | "events" | "subs" | null;

const PANEL_COPY = {
  stats: {
    eyebrow: "Stats",
    title: "Game Stats",
  },
  events: {
    eyebrow: "Event Log",
    title: "Live Event Management",
  },
  subs: {
    eyebrow: "Substitutions",
    title: "Lineups And Live Context",
  },
} as const;

export function LiveOverlayShell({
  statsPanel,
  eventsPanel,
  substitutionsPanel,
  launcherClassName = "overlay-launcher-row overlay-launcher-inline",
  utilityMiddle,
  utilityActions,
}: Readonly<{
  statsPanel: ReactNode;
  eventsPanel: ReactNode;
  substitutionsPanel: ReactNode;
  launcherClassName?: string;
  utilityMiddle?: ReactNode;
  utilityActions?: ReactNode;
}>) {
  const [activePanel, setActivePanel] = useState<OverlayPanel>(null);

  useEffect(() => {
    if (!activePanel) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [activePanel]);

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePanel(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activePanel]);

  useEffect(() => {
    function handleOverlayClose(event: Event) {
      const customEvent = event as CustomEvent<{ panel?: OverlayPanel }>;
      const requestedPanel = customEvent.detail?.panel ?? null;

      if (!requestedPanel || requestedPanel === activePanel) {
        setActivePanel(null);
      }
    }

    window.addEventListener("live-overlay-close", handleOverlayClose as EventListener);
    return () =>
      window.removeEventListener("live-overlay-close", handleOverlayClose as EventListener);
  }, [activePanel]);

  const panelContent =
    activePanel === "stats"
      ? statsPanel
      : activePanel === "events"
        ? eventsPanel
        : activePanel === "subs"
          ? substitutionsPanel
          : null;

  const launcher = (
    <div className={launcherClassName}>
      <button
        className={`button-link secondary ${activePanel === "stats" ? "active" : ""}`}
        type="button"
        onClick={() => setActivePanel((current) => (current === "stats" ? null : "stats"))}
      >
        Stats
      </button>
      <button
        className={`button-link secondary ${activePanel === "events" ? "active" : ""}`}
        type="button"
        onClick={() => setActivePanel((current) => (current === "events" ? null : "events"))}
      >
        Event Log
      </button>
      <button
        className={`button-link secondary ${activePanel === "subs" ? "active" : ""}`}
        type="button"
        onClick={() => setActivePanel((current) => (current === "subs" ? null : "subs"))}
      >
        Substitutions
      </button>
    </div>
  );

  return (
    <>
      {utilityActions ? (
        <div className="live-utility-row">
          {launcher}
          {utilityMiddle}
          <ResponsivePageActions showHome={false} menuLabel="Menu" className="live-utility-actions">
            {utilityActions}
          </ResponsivePageActions>
        </div>
      ) : (
        launcher
      )}

      {activePanel ? (
        <section className="overlay-scrim" onClick={() => setActivePanel(null)}>
          <div className="overlay-panel-card" onClick={(event) => event.stopPropagation()}>
            <div className="overlay-panel-header">
              <div>
                <p className="eyebrow-label">{PANEL_COPY[activePanel].eyebrow}</p>
                <h3>{PANEL_COPY[activePanel].title}</h3>
              </div>
              <button className="overlay-close-button" type="button" onClick={() => setActivePanel(null)}>
                Close
              </button>
            </div>
            <div className="overlay-panel-body">{panelContent}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
