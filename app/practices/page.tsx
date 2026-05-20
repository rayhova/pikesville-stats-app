import Link from "next/link";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { requireAccessRole } from "@/lib/access-control";
import { listPracticePlanRows } from "@/lib/admin-repository";
import { formatPracticeDate, formatPracticeTime, formatPracticeWindow } from "@/lib/date-format";

export default async function PracticesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAccessRole(["admin", "coach"]);
  const practiceRows = await listPracticePlanRows();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const scheduleView = resolvedSearchParams.view === "older" ? "older" : "current";
  const today = new Date().toISOString().slice(0, 10);
  const filteredPracticeRows = [...practiceRows]
    .filter((practice) => (scheduleView === "older" ? practice.practiceDate < today : practice.practiceDate >= today))
    .sort((left, right) => {
      const leftKey = `${left.practiceDate}T${left.startTimeValue}`;
      const rightKey = `${right.practiceDate}T${right.startTimeValue}`;
      const leftTime = new Date(leftKey).getTime();
      const rightTime = new Date(rightKey).getTime();
      return scheduleView === "older" ? rightTime - leftTime : leftTime - rightTime;
    });

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Practice Plans</p>
          <h2>Practice Library</h2>
          <p>Review upcoming plans, open the full practice schedule, and log how each block went after practice.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks
            session={session}
            playerProfileHref={session.role === "player" ? "/profile" : null}
            extras={
              session.role === "admin"
                ? [{ href: "/admin/practices", label: "Manage Practices", variant: "secondary" }]
                : []
            }
          />
        </ResponsivePageActions>
      </header>

      <section className="table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <h3>{scheduleView === "older" ? "Older Practice Plans" : "Current Practice Plans"}</h3>
              <p className="meta">Showing {filteredPracticeRows.length} plans.</p>
            </div>
            <div className="filter-link-row">
              <Link href="/practices" className={`button-link ghost ${scheduleView === "current" ? "active" : ""}`}>
                Current
              </Link>
              <Link href="/practices?view=older" className={`button-link ghost ${scheduleView === "older" ? "active" : ""}`}>
                Older
              </Link>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Title</th>
                <th>Team</th>
                <th>Season</th>
                <th>Window</th>
                <th>Blocks</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredPracticeRows.map((practice) => (
                <tr key={practice.id}>
                  <td>{formatPracticeDate(practice)}</td>
                  <td>{formatPracticeTime(practice)}</td>
                  <td>{practice.title}</td>
                  <td>
                    {practice.team}
                    {practice.teamSeasonLabel ? ` · ${practice.teamSeasonLabel}` : ""}
                  </td>
                  <td>{practice.season}</td>
                  <td>{formatPracticeWindow(practice)}</td>
                  <td>{practice.blockCount}</td>
                  <td>
                    <Link href={`/practices/${practice.id}`} className="button-link ghost">
                      Open Plan
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredPracticeRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>{scheduleView === "older" ? "No older practice plans yet." : "No current practice plans yet."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}
