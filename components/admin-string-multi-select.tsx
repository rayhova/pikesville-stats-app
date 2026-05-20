"use client";

import { useState } from "react";
import { CheckboxDropdownSelect } from "@/components/checkbox-dropdown-select";

export function AdminStringMultiSelect({
  label,
  name,
  options,
  defaultValues = [],
  placeholder = "Select options",
  allLabel = "All",
}: Readonly<{
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValues?: string[];
  placeholder?: string;
  allLabel?: string;
}>) {
  const [selectedValues, setSelectedValues] = useState(defaultValues);

  return (
    <CheckboxDropdownSelect
      label={label}
      name={name}
      options={options}
      selectedValues={selectedValues}
      onChange={setSelectedValues}
      placeholder={placeholder}
      allLabel={allLabel}
      allowSelectAll
    />
  );
}
