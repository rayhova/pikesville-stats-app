"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckboxDropdownSelect } from "@/components/checkbox-dropdown-select";

export function PlayTagFilterControls({
  activeTags,
  availableTags,
}: Readonly<{
  activeTags: string[];
  availableTags: string[];
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function pushTags(nextTags: string[]) {
    const params = new URLSearchParams();
    nextTags.forEach((tag) => params.append("tag", tag));
    const href = params.toString() ? `/playbook?${params.toString()}` : "/playbook";

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  return (
    <div className="quarter-filter-form">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow-label">Filter</p>
          <h3>Play Tags</h3>
        </div>
      </div>
      <CheckboxDropdownSelect
        label="Play Tags"
        options={availableTags.map((tag) => ({ value: tag, label: tag }))}
        selectedValues={activeTags}
        placeholder="All play tags"
        allLabel="All play tags"
        onChange={(nextTags) => {
          if (!isPending) {
            pushTags(nextTags);
          }
        }}
      />
      {activeTags.length > 0 ? (
        <div className="action-row">
          <button className="button-link ghost" type="button" disabled={isPending} onClick={() => pushTags([])}>
            Clear Filter
          </button>
        </div>
      ) : null}
    </div>
  );
}
