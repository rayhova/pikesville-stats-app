import Link from "next/link";
import { notFound } from "next/navigation";
import { savePracticeItemLogAction, submitCoachPracticeSuggestionAction } from "@/app/practices/actions";
import { EventRsvpSummary } from "@/components/event-rsvp-summary";
import { PracticeBreakdownCharts } from "@/components/practice-breakdown-charts";
import { PracticeItemPreviewButton } from "@/components/practice-item-preview-button";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { SharePageButton } from "@/components/share-page-button";
import { requireAccessRole } from "@/lib/access-control";
import { getPracticePlanById, listDrillLibraryRows, listEventAttendanceRows } from "@/lib/admin-repository";
import { formatPracticeClockTime, formatPracticeDate } from "@/lib/date-format";
import {
  buildPracticeSchedule,
  getPracticeBreakdown,
  getPracticeComputedEndTime,
} from "@/lib/practice-plan-utils";

function toEmbedSrc(value?: string) {
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

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

export default async function PracticePlanPage({
  params,
}: {
  params: Promise<{ practicePlanId: string }>;
}) {
  const session = await requireAccessRole(["admin", "coach"]);
  const { practicePlanId } = await params;
  const [practicePlan, drillRows, attendanceRows] = await Promise.all([
    getPracticePlanById(practicePlanId),
    listDrillLibraryRows(),
    listEventAttendanceRows(),
  ]);

  if (!practicePlan) {
    notFound();
  }

  const activeDrillRows = drillRows.filter((drill) => drill.isActive);
  const scheduleRows = buildPracticeSchedule(practicePlan.startTime, practicePlan.items, activeDrillRows);
  const practiceBreakdown = getPracticeBreakdown(practicePlan.items, activeDrillRows);

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Practice Plan</p>
          <h2>{practicePlan.title}</h2>
          <p>
            {practicePlan.team} · {practicePlan.teamSeasonLabel} · {practicePlan.season}
          </p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <SharePageButton />
          <Link href="/practices" className="button-link ghost">
            Back To Practices
          </Link>
          <Link href="/drills" className="button-link ghost">
            Drill Library
          </Link>
          {session.role === "admin" ? (
            <Link href={`/admin/practices/${practicePlan.id}`} className="button-link secondary">
              Manage Plan
            </Link>
          ) : null}
        </ResponsivePageActions>
      </header>

      <section className="card-grid">
        <article className="card">
          <h2>{formatPracticeDate(practicePlan)}</h2>
          <p className="player-profile-emphasis">
            {scheduleRows[0]?.startLabel ?? formatPracticeClockTime(practicePlan.startTime)} -{" "}
            {getPracticeComputedEndTime(
              practicePlan.startTime,
              practicePlan.items,
              activeDrillRows,
              practicePlan.lengthMinutes,
            )}
          </p>
          <p className="meta">{practicePlan.lengthMinutes} minutes</p>
        </article>
        <article className="card">
          <h2>Practice Goal</h2>
          <p className="meta pre-line-copy">{practicePlan.practiceGoal || "No goal saved yet."}</p>
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Practice Attendance</p>
          <h3>{practicePlan.attendanceMode === "voluntary" ? "Who's In" : "Who's Out"}</h3>
          <EventRsvpSummary
            eventKind="practice"
            eventId={practicePlan.id}
            attendanceMode={practicePlan.attendanceMode}
            capacity={practicePlan.capacity}
            rows={attendanceRows}
            viewerRole={session.role}
          />
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Practice Schedule</p>
          <h3>Run Of Show</h3>
          <div className="practice-plan-list">
            {scheduleRows.map((row) => {
              const previewIframe = toEmbedSrc(firstNonEmpty(row.item.videoUrl, row.drill?.videoUrl));
              const previewImages =
                row.item.imageUrls.length > 0
                  ? row.item.imageUrls
                  : row.drill?.imageUrl
                    ? [row.drill.imageUrl]
                    : [];
              const previewDescription = firstNonEmpty(row.item.description, row.drill?.description);
              const previewInstructions = firstNonEmpty(row.item.instructions, row.drill?.instructions);
              const hasPreview =
                Boolean(previewIframe) ||
                previewImages.length > 0 ||
                Boolean(previewDescription) ||
                Boolean(previewInstructions);

              return (
                <div key={row.item.id} className="practice-plan-sequence">
                <article className="practice-plan-card">
                  <div className="section-heading-row">
                    <div>
                      <p className="eyebrow-label">
                        {row.startLabel} - {row.endLabel}
                      </p>
                      <h3>{row.title}</h3>
                    </div>
                    <div className="action-row">
                      <span className="pill alt">{row.item.durationMinutes} min</span>
                      {hasPreview ? (
                        <PracticeItemPreviewButton
                          title={row.title}
                          iframeSrc={previewIframe}
                          imageUrls={previewImages}
                          description={previewDescription}
                          instructions={previewInstructions}
                        />
                      ) : null}
                    </div>
                  </div>

                  {row.focusTags.length > 0 ? (
                    <div className="pill-row">
                      {row.focusTags.map((tag) => (
                        <span key={`${row.item.id}-${tag}`} className="pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {row.item.goal ? (
                    <div className="drill-copy-block">
                      <p className="eyebrow-label">Drill Goal / Focus</p>
                      <p className="meta pre-line-copy">{row.item.goal}</p>
                    </div>
                  ) : null}

                  {row.item.sets || row.item.reps ? (
                    <div className="pill-row">
                      {row.item.sets ? <span className="pill alt">Sets: {row.item.sets}</span> : null}
                      {row.item.reps ? <span className="pill alt">Reps: {row.item.reps}</span> : null}
                    </div>
                  ) : null}

                  {row.item.itemType === "circuit" && row.item.circuitItems.length > 0 ? (
                    <div className="drill-copy-block">
                      <p className="eyebrow-label">Circuit Stations</p>
                      <div className="practice-station-list">
                        {row.item.circuitItems.map((station) => (
                          <div key={station.id} className="practice-station-row">
                            <div>
                              <strong>{station.title}</strong>
                              {station.focusTags.length > 0 ? (
                                <div className="pill-row">
                                  {station.focusTags.map((tag) => (
                                    <span key={`${station.id}-${tag}`} className="pill">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <span className="pill alt">{station.durationMinutes} min</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <form action={savePracticeItemLogAction} className="management-card practice-log-card">
                    <input type="hidden" name="practicePlanId" value={practicePlan.id} />
                    <input type="hidden" name="itemId" value={row.item.id} />
                    <div className="management-grid">
                      <div className="field-group field-span-2">
                        <label htmlFor={`practice-notes-${row.item.id}`}>Drill Notes</label>
                        <textarea
                          id={`practice-notes-${row.item.id}`}
                          name="notes"
                          defaultValue={row.item.notes ?? ""}
                          placeholder="Coaching notes from this block"
                        />
                      </div>
                      <div className="field-group field-span-2">
                        <label htmlFor={`practice-results-${row.item.id}`}>Drill Results</label>
                        <textarea
                          id={`practice-results-${row.item.id}`}
                          name="results"
                          defaultValue={row.item.results ?? ""}
                          placeholder="Results, winners, score, or key takeaways"
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor={`practice-rating-${row.item.id}`}>Drill Rating</label>
                        <select id={`practice-rating-${row.item.id}`} name="rating" defaultValue={row.item.rating}>
                          <option value="bad">Bad</option>
                          <option value="ok">OK</option>
                          <option value="good">Good</option>
                          <option value="amazing">Amazing</option>
                        </select>
                      </div>
                      <label className="checkbox-inline">
                        <input name="isFinished" type="checkbox" defaultChecked={row.item.isFinished} />
                        Finish Drill
                      </label>
                    </div>
                    <div className="action-row">
                      <button className="button-link secondary" type="submit">
                        Save Coaching Log
                      </button>
                    </div>
                  </form>
                </article>
                {row.breakAfterMinutes > 0 ? (
                  <article className="practice-plan-card practice-water-break-card">
                    <div className="section-heading-row">
                      <div>
                        <p className="eyebrow-label">
                          {row.breakAfterStartLabel} - {row.breakAfterEndLabel}
                        </p>
                        <h3>Water Break</h3>
                      </div>
                      <span className="pill alt">{row.breakAfterMinutes} min</span>
                    </div>
                    <p className="meta">Hydrate, reset, and get ready for the next block.</p>
                  </article>
                ) : null}
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <PracticeBreakdownCharts data={practiceBreakdown} />
      {session.role === "coach" ? (
        <section className="table-grid">
          <article className="panel-card">
            <p className="eyebrow-label">Coach Input</p>
            <h3>Suggest A Practice Item</h3>
            <form action={submitCoachPracticeSuggestionAction} className="form-grid">
              <input type="hidden" name="practicePlanId" value={practicePlan.id} />
              <div className="field-group field-span-2">
                <label htmlFor="coach-practice-suggestion">Practice Suggestion</label>
                <textarea
                  id="coach-practice-suggestion"
                  name="note"
                  placeholder="Suggest a drill, emphasis, teaching point, or adjustment for admin to review."
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
