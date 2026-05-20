"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckboxDropdownSelect } from "@/components/checkbox-dropdown-select";

export function DrillTypeFilterControls({
  activeTypes,
  drillTypes,
}: Readonly<{
  activeTypes: string[];
  drillTypes: string[];
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function pushTypes(nextTypes: string[]) {
    const params = new URLSearchParams();

    nextTypes.forEach((type) => params.append("type", type));

    const href = params.toString() ? `/drills?${params.toString()}` : "/drills";

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function toggleType(type: string) {
    const nextTypes = activeTypes.includes(type)
      ? activeTypes.filter((value) => value !== type)
      : [...activeTypes, type].sort((left, right) => left.localeCompare(right));

    pushTypes(nextTypes);
  }

  return (
    <div className="quarter-filter-form">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow-label">Filter</p>
          <h3>Drill Type</h3>
        </div>
      </div>
      <CheckboxDropdownSelect
        label="Drill Type"
        options={drillTypes.map((type) => ({ value: type, label: type }))}
        selectedValues={activeTypes}
        placeholder="All drill types"
        allLabel="All drill types"
        onChange={(nextTypes) => {
          if (!isPending) {
            pushTypes(nextTypes);
          }
        }}
      />
      {activeTypes.length > 0 ? (
        <div className="pill-row">
          {activeTypes.map((type) => (
            <span key={type} className="pill alt">
              {type}
            </span>
          ))}
        </div>
      ) : null}
      {activeTypes.length > 0 ? (
        <div className="action-row">
          <button className="button-link ghost" type="button" disabled={isPending} onClick={() => pushTypes([])}>
            Clear Filter
          </button>
        </div>
      ) : null}
    </div>
  );
}
