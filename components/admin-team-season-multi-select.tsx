"use client";

import { useState } from "react";
import { CheckboxDropdownSelect } from "@/components/checkbox-dropdown-select";

interface TeamSeasonOption {
  value: string;
  label: string;
}

export function AdminTeamSeasonMultiSelect({
  label,
  name,
  options,
  defaultValues,
}: Readonly<{
  label: string;
  name: string;
  options: TeamSeasonOption[];
  defaultValues: string[];
}>) {
  const [selectedValues, setSelectedValues] = useState(defaultValues);

  return (
    <CheckboxDropdownSelect
      label={label}
      name={name}
      options={options}
      selectedValues={selectedValues}
      onChange={setSelectedValues}
      placeholder="Select season teams"
      allLabel="All season teams"
      allowSelectAll
    />
  );
}
