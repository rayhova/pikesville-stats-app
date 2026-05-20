import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachGameDayTaskStrip } from "@/components/coach-game-day-task-strip";
import { GameDayHeader } from "@/components/game-day-header";
import { GamePlanCardReadOnly } from "@/components/prep-readonly-sections";
import {
  requireAccessRole,
} from "@/lib/access-control";
import { getGamePrepSnapshot } from "@/lib/admin-repository";

export default async function ScoutingGamePlanPage({
  params,
}: Readonly<{
  params: Promise<{ gameId: string }>;
}>) {
  const session = await requireAccessRole(["admin", "coach"]);
  const { gameId } = await params;
  const prep = await getGamePrepSnapshot(gameId);

  if (!prep) {
    notFound();
  }

  return (
    <main className="page-shell">
      <GameDayHeader
        eyebrow="Game Plan Card"
        title={prep.title}
        meta="Coach View"
        nav={[
          { label: "Scouting", href: `/scouting/${gameId}` },
          { label: "Game Plan", href: `/scouting/${gameId}/game-plan`, active: true },
          { label: "Timeout", href: `/scouting/${gameId}/timeout` },
          { label: "Notes", href: `/observations/${gameId}` },
        ]}
        actions={
          <>
            <CoachGameDayTaskStrip
              gameId={gameId}
              role={session.role}
              coachProfileId={session.coachProfileId}
              className="coach-task-strip-inline"
            />
            {session.role === "admin" ? (
              <Link href={`/admin/games/${gameId}/prep/game-plan`} className="button-link ghost">
                Open Prep
              </Link>
            ) : null}
          </>
        }
      />

      <section className="panel-grid">
        <GamePlanCardReadOnly prep={prep} />
      </section>
    </main>
  );
}
