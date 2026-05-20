"use client";

import { useMemo, useState } from "react";

interface CheckboxDropdownOption {
  value: string;
  label: string;
}

export function CheckboxDropdownSelect({
  label,
  name,
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  allLabel = "All",
  allowSelectAll = false,
}: Readonly<{
  label: string;
  name?: string;
  options: CheckboxDropdownOption[];
  selectedValues: string[];
  onChange?: (nextValues: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  allowSelectAll?: boolean;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const allSelected = options.length > 0 && options.every((option) => selectedSet.has(option.value));
  const summaryLabel =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === options.length
        ? allLabel
        : `${selectedValues.length} selected`;

  function update(nextValues: string[]) {
    onChange?.([...nextValues].sort((left, right) => left.localeCompare(right)));
  }

  function toggleValue(value: string) {
    if (selectedSet.has(value)) {
      update(selectedValues.filter((item) => item !== value));
      return;
    }

    update([...selectedValues, value]);
  }

  function handleToggleAll() {
    update(allSelected ? [] : options.map((option) => option.value));
  }

  return (
    <div className="checkbox-dropdown">
      {name
        ? selectedValues.map((value) => <input key={value} type="hidden" name={name} value={value} />)
        : null}
      <button
        type="button"
        className={`checkbox-dropdown-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="checkbox-dropdown-label">{label}</span>
        <span className="checkbox-dropdown-summary">{summaryLabel}</span>
      </button>
      {isOpen ? (
        <div className="checkbox-dropdown-panel">
          {allowSelectAll ? (
            <button type="button" className="checkbox-dropdown-toggle-all" onClick={handleToggleAll}>
              {allSelected ? "Unselect all" : "Select all"}
            </button>
          ) : null}
          <div className="checkbox-dropdown-options">
            {options.map((option) => {
              const checked = selectedSet.has(option.value);

              return (
                <label key={option.value} className={`checkbox-dropdown-option ${checked ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
