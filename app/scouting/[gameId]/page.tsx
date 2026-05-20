import Link from "next/link";
import { notFound } from "next/navigation";
import { submitCoachScoutingSuggestionAction } from "@/app/scouting/actions";
import { CoachGameDayTaskStrip } from "@/components/coach-game-day-task-strip";
import { GameDayHeader } from "@/components/game-day-header";
import { PrepPlayerBoard } from "@/components/prep-player-board";
import { ScoutingOverviewPanels } from "@/components/prep-readonly-sections";
import {
  canViewStrategicPrep,
  requireAccessRole,
} from "@/lib/access-control";
import { getGamePrepSnapshot } from "@/lib/admin-repository";

export default async function ScoutingReportPage({
  params,
}: Readonly<{
  params: Promise<{ gameId: string }>;
}>) {
  const session = await requireAccessRole(["admin", "coach", "player"]);
  const { gameId } = await params;
  const prep = await getGamePrepSnapshot(gameId);

  if (!prep) {
    notFound();
  }

  const showStrategicPrep = canViewStrategicPrep(session.role);

  return (
    <main className="page-shell">
      <GameDayHeader
        eyebrow="Scouting Report"
        title={prep.title}
        meta="Shared Report"
        nav={[
          { label: "Scouting", href: `/scouting/${gameId}`, active: true },
          ...(showStrategicPrep
            ? [
                { label: "Game Plan", href: `/scouting/${gameId}/game-plan` },
                { label: "Timeout", href: `/scouting/${gameId}/timeout` },
              ]
            : []),
          ...(session.role === "player"
            ? []
            : [
                { label: "Notes", href: `/observations/${gameId}` },
                { label: "Live", href: `/games/${gameId}` },
              ]),
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
              <Link href={`/admin/games/${gameId}/prep/scouting`} className="button-link ghost">
                Open Prep
              </Link>
            ) : null}
          </>
        }
      />

      <ScoutingOverviewPanels prep={prep} />
      <PrepPlayerBoard players={prep.playerFocus} />
      {session.role === "coach" ? (
        <section className="table-grid">
          <article className="panel-card">
            <p className="eyebrow-label">Coach Input</p>
            <h3>Suggest A Scouting Note</h3>
            <form action={submitCoachScoutingSuggestionAction} className="form-grid">
              <input type="hidden" name="gameId" value={gameId} />
              <div className="field-group field-span-2">
                <label htmlFor="coach-scouting-note">Coach Note</label>
                <textarea
                  id="coach-scouting-note"
                  name="note"
                  placeholder="Add a matchup note, tendency, adjustment, or reminder for admin to review."
                />
              </div>
              <div className="action-row field-span-2">
                <button className="button-link secondary" type="submit">
                  Send Suggestion
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}
    </main>
  );
}
