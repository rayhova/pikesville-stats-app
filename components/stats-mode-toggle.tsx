"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function StatsModeToggle({
  options,
}: Readonly<{
  options: Array<{
    value: string;
    label: string;
    href: string;
    active: boolean;
  }>;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="stats-mode-toggle">
      {options.map((option) => (
        <button
          key={option.value}
          className={`stats-mode-pill ${option.active ? "active" : ""}`}
          type="button"
          disabled={isPending && option.active}
          onClick={() => {
            if (option.active) {
              return;
            }

            startTransition(() => {
              router.push(option.href, { scroll: false });
            });
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
