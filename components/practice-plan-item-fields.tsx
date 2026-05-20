"use client";

import { useMemo, useState } from "react";

type PracticePlanItemType = "library_drill" | "custom_drill" | "instruction" | "circuit";

interface DrillOption {
  id: string;
  title: string;
  drillType: string;
  tags: string[];
}

const itemTypeOptions: Array<{ value: PracticePlanItemType; label: string }> = [
  { value: "library_drill", label: "Library Drill" },
  { value: "custom_drill", label: "Custom Drill" },
  { value: "instruction", label: "Instruction" },
  { value: "circuit", label: "Circuit" },
];

export function PracticePlanItemFields({
  fieldIdPrefix,
  drills,
  initialItemType,
  initialDrillLibraryId,
  initialTitle,
  initialFocusTags,
  initialCircuitItems,
}: Readonly<{
  fieldIdPrefix: string;
  drills: DrillOption[];
  initialItemType: PracticePlanItemType;
  initialDrillLibraryId?: string;
  initialTitle?: string;
  initialFocusTags: string;
  initialCircuitItems: string;
}>) {
  const [itemType, setItemType] = useState<PracticePlanItemType>(initialItemType);
  const [drillSearch, setDrillSearch] = useState("");
  const [drillTypeFilters, setDrillTypeFilters] = useState<string[]>([]);
  const [selectedDrillId, setSelectedDrillId] = useState(initialDrillLibraryId ?? "");

  const normalizedDrills = useMemo(
    () =>
      drills.map((drill) => ({
        ...drill,
        normalizedTypes: drill.drillType
          .split("|")
          .map((value) => value.trim())
          .filter(Boolean),
      })),
    [drills],
  );

  const drillTypes = useMemo(
    () =>
      [...new Set(normalizedDrills.flatMap((drill) => drill.normalizedTypes))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [normalizedDrills],
  );

  const filteredDrills = useMemo(() => {
    const query = drillSearch.trim().toLowerCase();
    return normalizedDrills.filter((drill) => {
      if (drillTypeFilters.length > 0 && !drillTypeFilters.every((type) => drill.normalizedTypes.includes(type))) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${drill.title} ${drill.drillType} ${drill.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 20);
  }, [drillSearch, drillTypeFilters, normalizedDrills]);

  const selectedDrill = drills.find((drill) => drill.id === selectedDrillId);
  const showTitleField = itemType !== "library_drill";
  const showFocusTagsField = itemType === "custom_drill" || itemType === "circuit";
  const showCircuitField = itemType === "circuit";
  const showLibraryPicker = itemType === "library_drill";

  return (
    <>
      <div className="field-group">
        <label htmlFor={`${fieldIdPrefix}-item-type`}>Block Type</label>
        <select
          id={`${fieldIdPrefix}-item-type`}
          name="itemType"
          value={itemType}
          onChange={(event) => setItemType(event.target.value as PracticePlanItemType)}
        >
          {itemTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showLibraryPicker ? (
        <>
          <div className="field-group">
            <label htmlFor={`${fieldIdPrefix}-drill-search`}>Search Library Drill</label>
            <input
              id={`${fieldIdPrefix}-drill-search`}
              type="search"
              value={drillSearch}
              onChange={(event) => setDrillSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              placeholder={selectedDrill ? selectedDrill.title : "Start typing a drill name or tag"}
              autoComplete="off"
            />
          </div>
          <div className="field-group">
            <label htmlFor={`${fieldIdPrefix}-drill-type-filter`}>Drill Type Filters</label>
            <select
              id={`${fieldIdPrefix}-drill-type-filter`}
              multiple
              value={drillTypeFilters}
              onChange={(event) =>
                setDrillTypeFilters(Array.from(event.target.selectedOptions, (option) => option.value))
              }
            >
              {drillTypes.map((drillType) => (
                <option key={drillType} value={drillType}>
                  {drillType}
                </option>
              ))}
            </select>
            <p className="meta">Hold Command on Mac to select multiple drill types. Matching drills must include all selected types.</p>
          </div>
          <div className="field-group field-span-2">
            <input type="hidden" name="drillLibraryId" value={selectedDrillId} />
            <label>Library Drill</label>
            {selectedDrill ? (
              <div className="selected-autocomplete-option">
                <div>
                  <p className="eyebrow-label">Selected Drill</p>
                  <strong>{selectedDrill.title}</strong>
                </div>
                <button
                  type="button"
                  className="button-link ghost"
                  onClick={() => {
                    setSelectedDrillId("");
                    setDrillSearch("");
                  }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <p className="meta">Type above, then choose one of the matching drills.</p>
            )}
            <div className="autocomplete-result-list" role="listbox" aria-label="Matching library drills">
              {filteredDrills.map((drill) => {
                const isSelected = drill.id === selectedDrillId;

                return (
                  <button
                    key={drill.id}
                    type="button"
                    className={`autocomplete-result-option ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      setSelectedDrillId(drill.id);
                      setDrillSearch(drill.title);
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span>
                      <strong>{drill.title}</strong>
                      {drill.drillType ? <small>{drill.drillType}</small> : null}
                    </span>
                    {drill.tags.length > 0 ? (
                      <span className="autocomplete-result-tags">
                        {drill.tags.slice(0, 3).join(" · ")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {filteredDrills.length === 0 ? (
                <p className="meta">No drills match that search.</p>
              ) : null}
            </div>
            <p className="meta">Showing up to 20 matches. Title and focus tags will pull from the selected drill.</p>
            {selectedDrill ? (
              <div className="pill-row">
                {selectedDrill.drillType ? <span className="pill alt">{selectedDrill.drillType}</span> : null}
                {selectedDrill.tags.map((tag) => (
                  <span key={`${selectedDrill.id}-${tag}`} className="pill">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {showTitleField ? (
        <div className="field-group field-span-2">
          <label htmlFor={`${fieldIdPrefix}-title`}>Title</label>
          <input id={`${fieldIdPrefix}-title`} name="title" defaultValue={initialTitle ?? ""} />
        </div>
      ) : null}

      {showFocusTagsField ? (
        <div className="field-group field-span-2">
          <label htmlFor={`${fieldIdPrefix}-focus-tags`}>Focus Tags</label>
          <input
            id={`${fieldIdPrefix}-focus-tags`}
            name="focusTags"
            defaultValue={initialFocusTags}
            placeholder="Defense, Shooting, Ball Handling"
          />
        </div>
      ) : null}

      {showCircuitField ? (
        <div className="field-group field-span-2">
          <label htmlFor={`${fieldIdPrefix}-circuit-items`}>Circuit Stations</label>
          <textarea
            id={`${fieldIdPrefix}-circuit-items`}
            name="circuitItems"
            defaultValue={initialCircuitItems}
            placeholder="Station Title | 5 | Defense, Rotation"
          />
        </div>
      ) : null}
    </>
  );
}
