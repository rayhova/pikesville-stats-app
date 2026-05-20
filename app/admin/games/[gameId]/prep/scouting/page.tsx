import Link from "next/link";
import { notFound } from "next/navigation";
import { GameDayHeader } from "@/components/game-day-header";
import { PersistenceBadge } from "@/components/persistence-badge";
import { PrepPlayerBoard } from "@/components/prep-player-board";
import { ScoutingOverviewPanels } from "@/components/prep-readonly-sections";
import { listCoachScoutingSuggestions } from "@/lib/program-alerts";
import {
  getAdminPersistenceMode,
  getGamePrepSnapshot,
} from "@/lib/admin-repository";

export default async function AdminPrepScoutingPage({
  params,
}: Readonly<{
  params: Promise<{ gameId: string }>;
}>) {
  const { gameId } = await params;
  const [prep, suggestions] = await Promise.all([
    getGamePrepSnapshot(gameId),
    listCoachScoutingSuggestions(gameId),
  ]);
  const persistenceMode = getAdminPersistenceMode();

  if (!prep) {
    notFound();
  }

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <GameDayHeader
        eyebrow="Admin Prep"
        title={prep.title}
        meta="Scouting"
        nav={[
          { label: "Scouting", href: `/admin/games/${prep.gameId}/prep/scouting`, active: true },
          { label: "Game Plan", href: `/admin/games/${prep.gameId}/prep/game-plan` },
          { label: "Timeout", href: `/admin/games/${prep.gameId}/prep/timeout` },
        ]}
        actions={
          <>
          <Link href="/admin/games" className="button-link ghost">
            Back To Games
          </Link>
          <Link href="/admin" className="button-link secondary">
            Open Admin Dashboard
          </Link>
          </>
        }
      />
      <ScoutingOverviewPanels prep={prep} />
      <PrepPlayerBoard players={prep.playerFocus} />
      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Coach Suggestions</p>
          <h3>Scouting Notes From Coaches</h3>
          {suggestions.length > 0 ? (
            <div className="record-stack">
              {suggestions.map((suggestion) => (
                <article key={suggestion.id} className="record-card">
                  <div className="record-card-header">
                    <div>
                      <h4>{suggestion.coachDisplayName}</h4>
                      <p className="meta">
                        {new Date(suggestion.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <p>{suggestion.note}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="meta">No coach scouting suggestions yet.</p>
          )}
        </article>
      </section>
    </>
  );
}
