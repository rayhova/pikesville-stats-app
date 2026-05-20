"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function StatsOverlayTabNav({
  tabs,
}: Readonly<{
  tabs: Array<{
    value: string;
    label: string;
    href: string;
    active: boolean;
  }>;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="stats-tab-row">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`stats-tab ${tab.active ? "active" : ""}`}
          type="button"
          disabled={isPending && tab.active}
          onClick={() => {
            if (tab.active) {
              return;
            }

            startTransition(() => {
              router.push(tab.href, { scroll: false });
            });
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
