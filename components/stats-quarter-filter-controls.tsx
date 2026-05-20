"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function formatQuarterLabel(quarter: number) {
  if (quarter <= 4) {
    return `Q${quarter}`;
  }

  return quarter === 5 ? "OT" : `OT${quarter - 4}`;
}

export function StatsQuarterFilterControls({
  basePath,
  activeTab,
  availableQuarters,
  activeQuarters,
  mode,
  seasonId,
}: Readonly<{
  basePath: string;
  activeTab: string;
  availableQuarters: number[];
  activeQuarters: number[];
  mode?: string;
  seasonId?: string;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedQuarters, setSelectedQuarters] = useState<number[]>(activeQuarters);

  useEffect(() => {
    setSelectedQuarters(activeQuarters);
  }, [activeQuarters]);

  function buildHref(quarters: number[]) {
    const params = new URLSearchParams();
    params.set("tab", activeTab);

    if (mode && mode !== "totals") {
      params.set("mode", mode);
    }

    if (seasonId) {
      params.set("season", seasonId);
    }

    for (const quarter of quarters) {
      params.append("quarter", String(quarter));
    }

    return `${basePath}?${params.toString()}`;
  }

  function toggleQuarter(quarter: number) {
    setSelectedQuarters((current) =>
      current.includes(quarter)
        ? current.filter((value) => value !== quarter)
        : [...current, quarter].sort((left, right) => left - right),
    );
  }

  return (
    <div className="quarter-filter-form">
      <div className="quarter-pill-row">
        {availableQuarters.map((quarter) => (
          <label
            key={quarter}
            className={`quarter-filter-pill ${selectedQuarters.includes(quarter) ? "active" : ""}`}
          >
            <input
              type="checkbox"
              checked={selectedQuarters.includes(quarter)}
              onChange={() => toggleQuarter(quarter)}
            />
            <span>{formatQuarterLabel(quarter)}</span>
          </label>
        ))}
      </div>
      <div className="action-row">
        <button
          className="button-link secondary"
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              router.push(buildHref(selectedQuarters), { scroll: false });
            });
          }}
        >
          Apply Filter
        </button>
        <button
          className="button-link ghost"
          type="button"
          disabled={isPending}
          onClick={() => {
            setSelectedQuarters(availableQuarters);
            startTransition(() => {
              router.push(buildHref([]), { scroll: false });
            });
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
