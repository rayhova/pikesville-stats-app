"use client";

import { useState } from "react";

export function ResponsiveDisclosure({
  title,
  hint = "Tap to open",
  className = "",
  contentClassName = "",
  showDesktopHeading = true,
  children,
}: Readonly<{
  title: string;
  hint?: string;
  className?: string;
  contentClassName?: string;
  showDesktopHeading?: boolean;
  children: React.ReactNode;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const showHintText = !title.toLowerCase().includes("menu");
  const isMenuDisclosure = title.toLowerCase().includes("menu");

  return (
    <details
      className={`responsive-disclosure ${isMenuDisclosure ? "menu-disclosure" : ""} ${className}`.trim()}
      open={isOpen}
      onToggle={(event) => setIsOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      {showDesktopHeading ? (
        <div className="responsive-disclosure-heading">
          <h2>{title}</h2>
        </div>
      ) : null}
      <summary
        className="responsive-disclosure-toggle"
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((current) => !current);
        }}
      >
        <span>{title}</span>
        {showHintText ? <span className="meta">{isOpen ? "Tap to close" : hint}</span> : null}
      </summary>
      <div
        className={`responsive-disclosure-content ${contentClassName}`.trim()}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("a, button")) {
            setIsOpen(false);
          }
        }}
      >
        {children}
      </div>
    </details>
  );
}
