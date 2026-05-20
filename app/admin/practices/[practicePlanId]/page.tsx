import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createPracticePlanItemAction,
  deletePracticePlanAction,
  deletePracticePlanItemAction,
  importPracticePlanItemsAction,
  updatePracticePlanAction,
  updatePracticePlanItemAction,
} from "@/app/admin/actions";
import { EventRsvpSummary } from "@/components/event-rsvp-summary";
import { AdminTeamSeasonMultiSelect } from "@/components/admin-team-season-multi-select";
import { PracticeBreakdownCharts } from "@/components/practice-breakdown-charts";
import { PracticePlanItemFields } from "@/components/practice-plan-item-fields";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import {
  getPracticePlanById,
  listDrillLibraryRows,
  listEventAttendanceRows,
  listPracticePlanRows,
  listSeasonSummaries,
  listTeamSeasonRows,
} from "@/lib/admin-repository";
import { listCoachPracticeSuggestions } from "@/lib/program-alerts";
import { formatCompactDate, formatCompactTime, formatPracticeClockTime } from "@/lib/date-format";
import {
  getPracticeBreakdown,
  getPracticeComputedEndTime,
  getPracticeItemTitle,
  buildPracticeSchedule,
} from "@/lib/practice-plan-utils";
import { formatTeamSeasonOptionLabel } from "@/lib/team-season-selection";

const ratingOptions = [
  { value: "bad", label: "Bad" },
  { value: "ok", label: "OK" },
  { value: "good", label: "Good" },
  { value: "amazing", label: "Amazing" },
] as const;

function circuitItemsToText(
  circuitItems: Array<{ title: string; durationMinutes: number; focusTags: string[] }>,
) {
  return circuitItems
    .map((item) => `${item.title} | ${item.durationMinutes} | ${item.focusTags.join(", ")}`)
    .join("\n");
}

export default async function AdminPracticePlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ practicePlanId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { practicePlanId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [practicePlan, drillRows, seasonRows, teamRows, suggestions, attendanceRows, practiceRows] = await Promise.all([
    getPracticePlanById(practicePlanId),
    listDrillLibraryRows(),
    listSeasonSummaries(),
    listTeamSeasonRows(),
    listCoachPracticeSuggestions(practicePlanId),
    listEventAttendanceRows(),
    listPracticePlanRows(),
  ]);

  if (!practicePlan) {
    notFound();
  }

  const activeDrillRows = drillRows.filter((drill) => drill.isActive);
  const practiceDrillOptions = activeDrillRows.map((drill) => ({
    id: drill.id,
    title: drill.title,
    drillType: drill.drillType,
    tags: drill.tags,
  }));
  const ourTeamRows = teamRows.filter((team) => team.type === "ours");
  const teamSeasonOptions = ourTeamRows.map((team) => ({
    value: team.id,
    label: formatTeamSeasonOptionLabel(team),
  }));
  const scheduleRows = buildPracticeSchedule(practicePlan.startTime, practicePlan.items, activeDrillRows);
  const practiceBreakdown = getPracticeBreakdown(practicePlan.items, activeDrillRows);
  const importSourceRows = practiceRows.filter((row) => row.id !== practicePlan.id);
  const saved = resolvedSearchParams.saved === "imported";

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Practices</p>
          <h2>{practicePlan.title}</h2>
          <p>
            {practicePlan.team} · {practicePlan.teamSeasonLabel} · {practicePlan.season}
          </p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <Link href="/admin/practices" className="button-link ghost">
            Back To Practices
          </Link>
          <Link href={`/practices/${practicePlan.id}`} className="button-link ghost">
            Open Coach View
          </Link>
        </ResponsivePageActions>
      </header>

      {saved ? <p className="form-success">Practice blocks imported.</p> : null}

      <section className="table-grid">
        <article className="table-card">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow-label">Practice Details</p>
              <h3>Plan Setup</h3>
            </div>
            <span className="pill alt">
              {scheduleRows[0]?.startLabel ?? formatPracticeClockTime(practicePlan.startTime)} -{" "}
              {getPracticeComputedEndTime(
                practicePlan.startTime,
                practicePlan.items,
                activeDrillRows,
                practicePlan.lengthMinutes,
              )}
            </span>
          </div>
          <form action={updatePracticePlanAction} className="management-card">
            <input type="hidden" name="practicePlanId" value={practicePlan.id} />
            <div className="management-grid">
              <div className="field-group">
                <label htmlFor="practice-title">Title</label>
                <input id="practice-title" name="title" defaultValue={practicePlan.title} />
              </div>
              <div className="field-group">
                <label htmlFor="practice-season">Season</label>
                <select id="practice-season" name="seasonId" defaultValue={practicePlan.seasonId}>
                  {seasonRows.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label>Teams</label>
                <AdminTeamSeasonMultiSelect
                  label="Practice Teams"
                  name="teamSeasonIds"
                  options={teamSeasonOptions}
                  defaultValues={practicePlan.teamSeasonIds.length ? practicePlan.teamSeasonIds : [practicePlan.teamSeasonId]}
                />
              </div>
              <div className="field-group">
                <label htmlFor="practice-date">Date</label>
                <input id="practice-date" name="practiceDate" type="date" defaultValue={practicePlan.practiceDate} />
              </div>
              <div className="field-group">
                <label htmlFor="practice-start">Start Time</label>
                <input id="practice-start" name="startTime" type="time" defaultValue={practicePlan.startTime} />
              </div>
              <div className="field-group">
                <label htmlFor="practice-length">Length (min)</label>
                <input
                  id="practice-length"
                  name="lengthMinutes"
                  type="number"
                  min="1"
                  defaultValue={practicePlan.lengthMinutes}
                />
              </div>
              <div className="field-group">
                <label htmlFor="practice-attendance-mode">Attendance</label>
                <select
                  id="practice-attendance-mode"
                  name="attendanceMode"
                  defaultValue={practicePlan.attendanceMode}
                >
                  <option value="mandatory">Mandatory</option>
                  <option value="voluntary">Voluntary</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="practice-capacity">Capacity</label>
                <input
                  id="practice-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  defaultValue={practicePlan.capacity ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div className="field-group field-span-2">
                <label htmlFor="practice-goal">Practice Goal</label>
                <textarea id="practice-goal" name="practiceGoal" defaultValue={practicePlan.practiceGoal ?? ""} />
              </div>
            </div>
            <div className="management-actions">
              <button className="button-link secondary" type="submit">
                Save Practice Details
              </button>
              <button className="button-link ghost danger" type="submit" formAction={deletePracticePlanAction}>
                Delete Practice Plan
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Practice RSVPs</p>
          <h3>{practicePlan.attendanceMode === "voluntary" ? "Who's In" : "Who's Out"}</h3>
          <EventRsvpSummary
            eventKind="practice"
            eventId={practicePlan.id}
            attendanceMode={practicePlan.attendanceMode}
            capacity={practicePlan.capacity}
            rows={attendanceRows}
            viewerRole="admin"
          />
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Coach Suggestions</p>
          <h3>Practice Ideas From Coaches</h3>
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
            <p className="meta">No coach practice suggestions yet.</p>
          )}
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Import Practice Plan</p>
          <h3>Bring In Previous Blocks</h3>
          <p className="meta">
            Import copies the practice blocks into this event only. Existing RSVPs for this practice stay attached.
          </p>
          {importSourceRows.length > 0 ? (
            <form action={importPracticePlanItemsAction} className="form-grid">
              <input type="hidden" name="targetPracticePlanId" value={practicePlan.id} />
              <div className="field-group field-span-2">
                <label htmlFor="source-practice-plan">Previous Plan</label>
                <select id="source-practice-plan" name="sourcePracticePlanId" required>
                  <option value="">Choose a practice plan</option>
                  {importSourceRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title} · {formatCompactDate(row.practiceDate)} {formatCompactTime(row.startTimeValue)} ·{" "}
                      {row.teamSeasonLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="practice-import-mode">Import Mode</label>
                <select id="practice-import-mode" name="importMode" defaultValue="replace">
                  <option value="replace">Replace current blocks</option>
                  <option value="append">Append after current blocks</option>
                </select>
              </div>
              <div className="action-row field-span-2">
                <button className="button-link secondary" type="submit">
                  Import Blocks
                </button>
              </div>
            </form>
          ) : (
            <p className="meta">Create another practice plan first, then it can be imported here.</p>
          )}
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Schedule Preview</p>
          <h3>Run Of Show</h3>
          <div className="practice-schedule-preview">
            {scheduleRows.map((row) => (
              <div key={row.item.id} className="practice-schedule-preview-row">
                <div>
                  <strong>{row.title}</strong>
                  <p className="meta">
                    {row.startLabel} - {row.endLabel}
                  </p>
                  {row.breakAfterMinutes > 0 ? (
                    <p className="meta">
                      Water break: {row.breakAfterStartLabel} - {row.breakAfterEndLabel}
                    </p>
                  ) : null}
                </div>
                <div className="pill-row">
                  {row.focusTags.map((tag) => (
                    <span key={`${row.item.id}-${tag}`} className="pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Practice Blocks</p>
          <h3>Edit Schedule Blocks</h3>
          <div className="practice-editor-list">
            {practicePlan.items.map((item) => (
              <form key={item.id} action={updatePracticePlanItemAction} className="management-card">
                <input type="hidden" name="practicePlanId" value={practicePlan.id} />
                <input type="hidden" name="itemId" value={item.id} />
                <div className="management-card-header">
                  <div>
                    <p className="eyebrow-label">{item.itemType.replaceAll("_", " ")}</p>
                    <h4>{getPracticeItemTitle(item, activeDrillRows)}</h4>
                  </div>
                  <div className="management-actions">
                    <button className="button-link secondary" type="submit">
                      Save Block
                    </button>
                    <button className="button-link ghost danger" type="submit" formAction={deletePracticePlanItemAction}>
                      Delete Block
                    </button>
                  </div>
                </div>
                <div className="management-grid">
                  <div className="field-group">
                    <label htmlFor={`item-order-${item.id}`}>Order</label>
                    <input id={`item-order-${item.id}`} name="order" type="number" min="1" defaultValue={item.order} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`item-duration-${item.id}`}>Duration (min)</label>
                    <input
                      id={`item-duration-${item.id}`}
                      name="durationMinutes"
                      type="number"
                      min="1"
                      defaultValue={item.durationMinutes}
                    />
                  </div>
                  <PracticePlanItemFields
                    fieldIdPrefix={`item-${item.id}`}
                    drills={practiceDrillOptions}
                    initialItemType={item.itemType}
                    initialDrillLibraryId={item.drillLibraryId}
                    initialTitle={item.title}
                    initialFocusTags={item.focusTags.join(", ")}
                    initialCircuitItems={circuitItemsToText(item.circuitItems)}
                  />
                  <div className="field-group">
                    <label htmlFor={`item-sets-${item.id}`}>Sets</label>
                    <input id={`item-sets-${item.id}`} name="sets" defaultValue={item.sets ?? ""} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`item-reps-${item.id}`}>Reps</label>
                    <input id={`item-reps-${item.id}`} name="reps" defaultValue={item.reps ?? ""} />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`item-rating-${item.id}`}>Default Rating</label>
                    <select id={`item-rating-${item.id}`} name="rating" defaultValue={item.rating}>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`item-video-${item.id}`}>Video URL</label>
                    <input id={`item-video-${item.id}`} name="videoUrl" defaultValue={item.videoUrl ?? ""} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`item-goal-${item.id}`}>Goal / Focus</label>
                    <textarea id={`item-goal-${item.id}`} name="goal" defaultValue={item.goal ?? ""} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`item-description-${item.id}`}>Description</label>
                    <textarea id={`item-description-${item.id}`} name="description" defaultValue={item.description ?? ""} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`item-instructions-${item.id}`}>Instructions</label>
                    <textarea id={`item-instructions-${item.id}`} name="instructions" defaultValue={item.instructions ?? ""} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`item-images-${item.id}`}>Image URLs</label>
                    <textarea
                      id={`item-images-${item.id}`}
                      name="imageUrls"
                      defaultValue={item.imageUrls.join("\n")}
                      placeholder="One image URL per line"
                    />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`item-notes-${item.id}`}>Notes</label>
                    <textarea id={`item-notes-${item.id}`} name="notes" defaultValue={item.notes ?? ""} />
                  </div>
                  <div className="field-group field-span-2">
                    <label htmlFor={`item-results-${item.id}`}>Results</label>
                    <textarea id={`item-results-${item.id}`} name="results" defaultValue={item.results ?? ""} />
                  </div>
                  <label className="checkbox-inline">
                    <input name="waterBreak" type="checkbox" defaultChecked={item.waterBreak} />
                    Water Break
                  </label>
                  <label className="checkbox-inline">
                    <input name="isFinished" type="checkbox" defaultChecked={item.isFinished} />
                    Mark Finished
                  </label>
                </div>
              </form>
            ))}
          </div>
        </article>
      </section>

      <section className="table-grid">
        <article className="panel-card admin-create-grid">
          <p className="eyebrow-label">Add Block</p>
          <h3>New Practice Block</h3>
          <form action={createPracticePlanItemAction} className="form-grid">
            <input type="hidden" name="practicePlanId" value={practicePlan.id} />
            <div className="field-group">
              <label htmlFor="new-order">Order</label>
              <input id="new-order" name="order" type="number" min="1" defaultValue={practicePlan.items.length + 1} />
            </div>
            <div className="field-group">
              <label htmlFor="new-duration">Duration (min)</label>
              <input id="new-duration" name="durationMinutes" type="number" min="1" defaultValue="10" />
            </div>
            <PracticePlanItemFields
              fieldIdPrefix="new-item"
              drills={practiceDrillOptions}
              initialItemType="library_drill"
              initialFocusTags=""
              initialCircuitItems=""
            />
            <div className="field-group">
              <label htmlFor="new-sets">Sets</label>
              <input id="new-sets" name="sets" />
            </div>
            <div className="field-group">
              <label htmlFor="new-reps">Reps</label>
              <input id="new-reps" name="reps" />
            </div>
            <div className="field-group">
              <label htmlFor="new-rating">Starting Rating</label>
              <select id="new-rating" name="rating" defaultValue="bad">
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="new-video">Video URL</label>
              <input id="new-video" name="videoUrl" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="new-goal">Goal / Focus</label>
              <textarea id="new-goal" name="goal" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="new-description">Description</label>
              <textarea id="new-description" name="description" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="new-instructions">Instructions</label>
              <textarea id="new-instructions" name="instructions" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="new-images">Image URLs</label>
              <textarea id="new-images" name="imageUrls" placeholder="One image URL per line" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="new-notes">Notes</label>
              <textarea id="new-notes" name="notes" />
            </div>
            <div className="field-group field-span-2">
              <label htmlFor="new-results">Results</label>
              <textarea id="new-results" name="results" />
            </div>
            <label className="checkbox-inline">
              <input name="waterBreak" type="checkbox" />
              Water Break
            </label>
            <label className="checkbox-inline">
              <input name="isFinished" type="checkbox" />
              Mark Finished
            </label>
            <div className="action-row field-span-2">
              <button className="button-link" type="submit">
                Add Practice Block
              </button>
            </div>
          </form>
        </article>
      </section>

      <PracticeBreakdownCharts data={practiceBreakdown} />
    </main>
  );
}
