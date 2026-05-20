"use client";

import Link from "next/link";
import { useState } from "react";

export function ResponsivePageActions({
  children,
  showHome = true,
  homeHref = "/",
  menuLabel = "Menu",
  className = "",
}: Readonly<{
  children?: React.ReactNode;
  showHome?: boolean;
  homeHref?: string;
  menuLabel?: string;
  className?: string;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className={`responsive-page-actions ${className}`.trim()}
      open={isOpen}
      onToggle={(event) => setIsOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        className="page-actions-mobile-toggle"
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((current) => !current);
        }}
      >
        <span>{menuLabel}</span>
      </summary>
      <div
        className="page-actions"
        onClickCapture={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("a, button")) {
            setIsOpen(false);
          }
        }}
      >
        {showHome ? (
          <Link href={homeHref} className="button-link ghost">
            Home
          </Link>
        ) : null}
        {children}
      </div>
    </details>
  );
}
