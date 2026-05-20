import Link from "next/link";
import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import type { AccessSession } from "@/lib/access-control";
import { canUseObservations, canUseScorer, canViewAdmin } from "@/lib/access-control";

export function FrontendMenuLinks({
  session,
  liveGameId,
  playerProfileHref,
  extras = [],
}: Readonly<{
  session: AccessSession;
  liveGameId?: string | null;
  playerProfileHref?: string | null;
  extras?: Array<{ href: string; label: string; variant?: "ghost" | "secondary" }>;
}>) {
  const resolvedPlayerProfileHref = playerProfileHref ?? "/profile";

  return (
    <>
      <Link href="/scouting" className="button-link ghost">
        Open Scouting
      </Link>
      <Link href="/calendar" className="button-link ghost">
        Open Calendar
      </Link>
      <Link href="/tasks" className="button-link ghost">
        Open Tasks
      </Link>
      <Link href="/stats" className="button-link ghost">
        Open Stats
      </Link>
      <Link href="/stats/teams" className="button-link ghost">
        Open Teams
      </Link>
      <Link href="/stats/players" className="button-link ghost">
        Open Players
      </Link>
      {session.role === "player" || session.role === "coach" || session.role === "admin" ? (
        <Link href={resolvedPlayerProfileHref} className="button-link ghost">
          Edit Profile
        </Link>
      ) : null}
      <Link href="/playbook" className="button-link ghost">
        Open Playbook
      </Link>
      {session.role !== "player" ? (
        <Link href="/drills" className="button-link ghost">
          Open Drills
        </Link>
      ) : null}
      {session.role === "admin" || session.role === "coach" ? (
        <Link href="/practices" className="button-link ghost">
          Open Practices
        </Link>
      ) : null}
      {canUseScorer(session.role) && liveGameId ? (
        <Link href={`/games/${liveGameId}`} className="button-link ghost">
          Open Live Game
        </Link>
      ) : null}
      {canUseObservations(session.role) && liveGameId ? (
        <Link href={`/observations/${liveGameId}`} className="button-link ghost">
          Open Observations
        </Link>
      ) : null}
      {canViewAdmin(session.role) ? (
        <Link href="/admin" className="button-link secondary">
          Open Admin
        </Link>
      ) : null}
      {extras.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className={`button-link ${item.variant === "secondary" ? "secondary" : "ghost"}`}
        >
          {item.label}
        </Link>
      ))}
      <AuthSignOutButton className="button-link ghost" />
    </>
  );
}
