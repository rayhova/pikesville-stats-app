"use client";

import { useState } from "react";
import type { ShotMarker } from "@/lib/reporting";

export function ShotChartDisplay({
  markers,
  large = false,
}: Readonly<{
  markers: ShotMarker[];
  large?: boolean;
}>) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) ?? null;

  return (
    <div className="shot-chart-input">
      <div className={`court-placeholder interactive-court ${large ? "large-court" : ""}`}>
        <svg
          className="court-svg"
          viewBox="0 0 1000 700"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <rect x="36" y="34" width="928" height="618" fill="none" stroke="#111" strokeWidth="6" />
          <line x1="36" y1="162" x2="66" y2="162" stroke="#111" strokeWidth="8" strokeLinecap="round" />
          <line x1="934" y1="162" x2="964" y2="162" stroke="#111" strokeWidth="8" strokeLinecap="round" />
          <path d="M 124 652 A 376 376 0 0 1 876 652" fill="none" stroke="#111" strokeWidth="6" />
          <line x1="378" y1="652" x2="378" y2="338" stroke="#111" strokeWidth="6" />
          <line x1="622" y1="652" x2="622" y2="338" stroke="#111" strokeWidth="6" />
          <line x1="378" y1="338" x2="622" y2="338" stroke="#111" strokeWidth="6" />
          <path d="M 378 460 A 122 122 0 0 1 622 460" fill="none" stroke="#111" strokeWidth="6" />
          <line x1="378" y1="460" x2="622" y2="460" stroke="#111" strokeWidth="6" />
          <path d="M 445 652 A 55 55 0 0 1 555 652" fill="none" stroke="#111" strokeWidth="5" />
          <line x1="500" y1="652" x2="500" y2="626" stroke="#111" strokeWidth="6" />
          <circle cx="500" cy="620" r="15" fill="none" stroke="#111" strokeWidth="6" />
          <line x1="378" y1="522" x2="362" y2="522" stroke="#111" strokeWidth="6" strokeLinecap="round" />
          <line x1="378" y1="570" x2="362" y2="570" stroke="#111" strokeWidth="6" strokeLinecap="round" />
          <line x1="622" y1="522" x2="638" y2="522" stroke="#111" strokeWidth="6" strokeLinecap="round" />
          <line x1="622" y1="570" x2="638" y2="570" stroke="#111" strokeWidth="6" strokeLinecap="round" />
          <line x1="378" y1="590" x2="362" y2="590" stroke="#111" strokeWidth="10" strokeLinecap="round" />
          <line x1="622" y1="590" x2="638" y2="590" stroke="#111" strokeWidth="10" strokeLinecap="round" />
        </svg>
        {markers.map((marker) => (
          <button
            key={marker.id}
            className={`shot-marker ${marker.result === "miss" ? "miss" : "make"} ${
              marker.teamSide === "away" ? "away" : "home"
            }`}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            title={`${marker.playerName} · ${marker.result === "make" ? "Make" : "Miss"} ${marker.value ?? ""}PT`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedMarkerId(marker.id);
            }}
          >
            {marker.result === "make" ? marker.jersey.replace("#", "") : ""}
          </button>
        ))}
        {selectedMarker ? (
          <div className="shot-marker-popover" onClick={(event) => event.stopPropagation()}>
            <button
              className="shot-marker-popover-close"
              type="button"
              onClick={() => setSelectedMarkerId(null)}
            >
              x
            </button>
            <strong>{selectedMarker.playerName}</strong>
            <span>
              {selectedMarker.value}PT {selectedMarker.result?.toUpperCase()} in Q
              {selectedMarker.quarter} at{" "}
              {Math.floor(selectedMarker.secondsRemaining / 60)}:
              {(selectedMarker.secondsRemaining % 60).toString().padStart(2, "0")}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
