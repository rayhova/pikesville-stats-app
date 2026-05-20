import Link from "next/link";
import { notFound } from "next/navigation";
import { EventRsvpSummary } from "@/components/event-rsvp-summary";
import { GameDayHeader } from "@/components/game-day-header";
import { PersistenceBadge } from "@/components/persistence-badge";
import { GamePlanCardForm } from "@/components/prep-admin-forms";
import {
  getAdminPersistenceMode,
  getGamePrepSnapshot,
  listCoachProfileRows,
  listEventAttendanceRows,
  listGameRows,
} from "@/lib/admin-repository";

export default async function AdminPrepGamePlanPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ gameId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { gameId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [prep, coachRows, attendanceRows, gameRows] = await Promise.all([
    getGamePrepSnapshot(gameId),
    listCoachProfileRows(),
    listEventAttendanceRows(),
    listGameRows(),
  ]);
  const persistenceMode = getAdminPersistenceMode();
  const saved = typeof resolvedSearchParams.saved === "string";

  if (!prep) {
    notFound();
  }

  const gameRow = gameRows.find((game) => game.id === prep.gameId);

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <GameDayHeader
        eyebrow="Admin Prep"
        title={prep.title}
        meta="Game Plan"
        nav={[
          { label: "Scouting", href: `/admin/games/${prep.gameId}/prep/scouting` },
          { label: "Game Plan", href: `/admin/games/${prep.gameId}/prep/game-plan`, active: true },
          { label: "Timeout", href: `/admin/games/${prep.gameId}/prep/timeout` },
        ]}
        actions={
          <>
          <Link href="/admin/games" className="button-link ghost">
            Back To Games
          </Link>
          <Link href={`/admin/games/${prep.gameId}/prep/scouting`} className="button-link secondary">
            Open Scouting
          </Link>
          </>
        }
      />
      <section className="panel-grid">
        {saved ? <p className="form-success">Game plan card saved.</p> : null}
        {gameRow ? (
          <article className="panel-card">
            <p className="eyebrow-label">Game RSVPs</p>
            <h3>{gameRow.attendanceMode === "voluntary" ? "Who's In" : "Who's Out"}</h3>
            <EventRsvpSummary
              eventKind="game"
              eventId={gameRow.id}
              attendanceMode={gameRow.attendanceMode}
              capacity={gameRow.capacity}
              rows={attendanceRows}
              viewerRole="admin"
            />
          </article>
        ) : null}
        <GamePlanCardForm prep={prep} coachRows={coachRows} />
      </section>
    </>
  );
}
