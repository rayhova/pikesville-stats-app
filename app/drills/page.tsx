import Link from "next/link";
import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { DrillTypeFilterControls } from "@/components/drill-type-filter-controls";
import { PlayEmbedButton } from "@/components/play-embed-button";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { requireAccessRole } from "@/lib/access-control";
import { listDrillLibraryRows } from "@/lib/admin-repository";

function toHeading(value: string) {
  return value.trim().length > 0 ? value : "General";
}

function normalizeDrillTypes(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function getDrillTypeTags(drill: { drillType: string; tags: string[] }) {
  const taggedTypes = drill.tags.filter((tag) => tag.trim().length > 0);
  if (taggedTypes.length > 0) {
    return normalizeDrillTypes(taggedTypes);
  }

  return normalizeDrillTypes(drill.drillType.split("|"));
}

function formatDrillGroupLabel(drill: { drillType: string; tags: string[] }) {
  const types = getDrillTypeTags(drill);
  return types.length > 0 ? types.join(" · ") : "General";
}

function toYouTubeEmbedSrc(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : undefined;
    }

    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : undefined;
      }

      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : undefined;
    }

    return value;
  } catch {
    return undefined;
  }
}

export default async function DrillsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAccessRole(["admin", "coach"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const drillRows = (await listDrillLibraryRows()).filter((drill) => drill.isActive);
  const requestedTypes = resolvedSearchParams.type;
  const activeTypes = normalizeDrillTypes(
    Array.isArray(requestedTypes)
      ? requestedTypes
      : typeof requestedTypes === "string"
        ? [requestedTypes]
        : [],
  );
  const drillTypes = normalizeDrillTypes(
    drillRows.flatMap((drill) => getDrillTypeTags(drill)),
  );
  const filteredDrillRows =
    activeTypes.length > 0
      ? drillRows.filter((drill) => {
          const drillTypesForRow = getDrillTypeTags(drill);
          return activeTypes.every((type) => drillTypesForRow.includes(type));
        })
      : drillRows;

  const drillGroups = Array.from(
    filteredDrillRows.reduce((map, drill) => {
      const key = formatDrillGroupLabel(drill);
      const current = map.get(key) ?? [];
      current.push(drill);
      map.set(key, current);
      return map;
    }, new Map<string, typeof drillRows>()),
  ).sort((left, right) => left[0].localeCompare(right[0]));

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Drills</p>
          <h2>Practice Drill Library</h2>
          <p>Review teaching clips, setup details, and instructions before building practice plans.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} extras={[{ href: "/admin/drills", label: "Manage Drills", variant: "secondary" }]} />
        </ResponsivePageActions>
      </header>

      <section className="table-grid">
        <article className="table-card">
          <DrillTypeFilterControls activeTypes={activeTypes} drillTypes={drillTypes} />
        </article>
      </section>

      {drillGroups.length === 0 ? (
        <section className="table-grid">
          <article className="card">
            <h2>No drills match this filter</h2>
            <p>
              {activeTypes.length > 0
                ? `No active drills found for ${activeTypes.join(", ")}.`
                : "Add drills in admin to start building out the coach library."}
            </p>
          </article>
        </section>
      ) : null}

      {drillGroups.map(([type, drills]) => (
        <section key={type} className="table-grid">
          <article className="table-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow-label">Drill Type</p>
                <h3>{type}</h3>
              </div>
              <span className="pill alt">{drills.length} drills</span>
            </div>

            <div className="playbook-list">
              {drills.map((drill) => {
                const iframeSrc = toYouTubeEmbedSrc(drill.videoUrl);

                return (
                  <article key={drill.id} className="playbook-card drill-card">
                    <div className="playbook-card-head">
                      <div>
                        <p className="eyebrow-label">{drill.playType || "Drill"}</p>
                        <h4>{drill.title}</h4>
                      </div>
                      <div className="pill-row">
                        {drill.tags.map((tag) => (
                          <span key={tag} className="pill">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {drill.description ? <p className="meta pre-line-copy">{drill.description}</p> : null}
                    {drill.instructions ? (
                      <div className="drill-copy-block">
                        <p className="eyebrow-label">Instructions</p>
                        <p className="meta pre-line-copy">{drill.instructions}</p>
                      </div>
                    ) : null}
                    {drill.notes ? (
                      <div className="drill-copy-block">
                        <p className="eyebrow-label">Coach Notes</p>
                        <p className="meta pre-line-copy">{drill.notes}</p>
                      </div>
                    ) : null}
                    {iframeSrc || drill.imageUrl ? (
                      <div className="action-row">
                        {iframeSrc ? (
                          <PlayEmbedButton
                            iframeSrc={iframeSrc}
                            title={`${drill.title} video`}
                            buttonClassName="secondary video-button"
                          />
                        ) : null}
                        {drill.imageUrl ? (
                          <a href={drill.imageUrl} target="_blank" rel="noreferrer" className="button-link ghost">
                            Open Diagram
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </article>
        </section>
      ))}
    </main>
  );
}
