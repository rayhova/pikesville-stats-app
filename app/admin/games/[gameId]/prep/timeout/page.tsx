import Link from "next/link";
import { notFound } from "next/navigation";
import { GameDayHeader } from "@/components/game-day-header";
import { PersistenceBadge } from "@/components/persistence-badge";
import { TimeoutCardForm } from "@/components/prep-admin-forms";
import {
  getAdminPersistenceMode,
  getGamePrepSnapshot,
} from "@/lib/admin-repository";

export default async function AdminPrepTimeoutPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ gameId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { gameId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const prep = await getGamePrepSnapshot(gameId);
  const persistenceMode = getAdminPersistenceMode();
  const saved = typeof resolvedSearchParams.saved === "string";

  if (!prep) {
    notFound();
  }

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <GameDayHeader
        eyebrow="Admin Prep"
        title={prep.title}
        meta="Timeout"
        nav={[
          { label: "Scouting", href: `/admin/games/${prep.gameId}/prep/scouting` },
          { label: "Game Plan", href: `/admin/games/${prep.gameId}/prep/game-plan` },
          { label: "Timeout", href: `/admin/games/${prep.gameId}/prep/timeout`, active: true },
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
        {saved ? <p className="form-success">Timeout card saved.</p> : null}
        <TimeoutCardForm prep={prep} />
      </section>
    </>
  );
}
