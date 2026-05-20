import Link from "next/link";
import { type ReactNode } from "react";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { SharePageButton } from "@/components/share-page-button";

export function GameDayHeader({
  eyebrow,
  title,
  meta,
  nav,
  actions,
}: Readonly<{
  eyebrow: string;
  title: string;
  meta?: string;
  nav: Array<{
    label: string;
    href: string;
    active?: boolean;
  }>;
  actions?: ReactNode;
}>) {
  return (
    <header className="game-day-header">
      <div className="game-day-header-main">
        <div className="game-day-header-copy">
          <p className="eyebrow-label">{eyebrow}</p>
          <div className="game-day-title-row">
            <h1>{title}</h1>
            {meta ? <span className="pill alt">{meta}</span> : null}
          </div>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <SharePageButton />
          {actions}
        </ResponsivePageActions>
      </div>
      <nav className="game-day-nav" aria-label="Game day navigation">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`button-link ghost ${item.active ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
