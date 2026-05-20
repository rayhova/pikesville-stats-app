"use client";

interface AdminEntryPickerOption {
  value: string;
  label: string;
}

export function AdminEntryPicker({
  id,
  name,
  defaultValue,
  options,
}: Readonly<{
  id: string;
  name: string;
  defaultValue?: string;
  options: AdminEntryPickerOption[];
}>) {
  return (
    <form method="get" className="inline-select-form">
      <label htmlFor={id} className="sr-only">
        Select entry
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
