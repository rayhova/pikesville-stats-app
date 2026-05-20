import type { PracticePlanItemRecord } from "@/lib/admin-domain";
import type { DrillLibraryRow } from "@/lib/admin-repository";

export interface PracticeScheduleRow {
  item: PracticePlanItemRecord;
  title: string;
  startLabel: string;
  endLabel: string;
  breakAfterMinutes: number;
  breakAfterStartLabel?: string;
  breakAfterEndLabel?: string;
  focusTags: string[];
  drill?: DrillLibraryRow;
}

const WATER_BREAK_MINUTES = 5;

function toMinutes(time: string) {
  const [hoursString = "0", minutesString = "0"] = time.split(":");
  const hours = Number.parseInt(hoursString, 10) || 0;
  const minutes = Number.parseInt(minutesString, 10) || 0;
  return hours * 60 + minutes;
}

export function formatTimeLabel(totalMinutes: number) {
  const normalizedHours = Math.floor(totalMinutes / 60) % 24;
  const normalizedMinutes = totalMinutes % 60;
  const suffix = normalizedHours >= 12 ? "PM" : "AM";
  const hours = normalizedHours % 12 || 12;
  return `${hours}:${normalizedMinutes.toString().padStart(2, "0")} ${suffix}`;
}

export function getPracticeItemDrill(item: PracticePlanItemRecord, drillRows: DrillLibraryRow[]) {
  return item.drillLibraryId
    ? drillRows.find((drill) => drill.id === item.drillLibraryId)
    : undefined;
}

export function getPracticeItemTitle(item: PracticePlanItemRecord, drillRows: DrillLibraryRow[]) {
  return item.title?.trim() || getPracticeItemDrill(item, drillRows)?.title || "Untitled Block";
}

export function getPracticeItemFocusTags(item: PracticePlanItemRecord, drillRows: DrillLibraryRow[]) {
  if (item.focusTags.length > 0) {
    return item.focusTags;
  }

  const drill = getPracticeItemDrill(item, drillRows);
  if (drill?.tags.length) {
    return drill.tags;
  }

  if (item.itemType === "circuit") {
    return [...new Set(item.circuitItems.flatMap((circuitItem) => circuitItem.focusTags))];
  }

  return [];
}

export function buildPracticeSchedule(
  startTime: string,
  items: PracticePlanItemRecord[],
  drillRows: DrillLibraryRow[],
): PracticeScheduleRow[] {
  let cursor = toMinutes(startTime);

  return [...items]
    .sort((left, right) => left.order - right.order)
    .map((item) => {
      const startLabel = formatTimeLabel(cursor);
      cursor += item.durationMinutes;
      const endLabel = formatTimeLabel(cursor);
      const drill = getPracticeItemDrill(item, drillRows);
      const breakAfterMinutes = item.waterBreak ? WATER_BREAK_MINUTES : 0;
      const breakAfterStartLabel = breakAfterMinutes > 0 ? endLabel : undefined;
      if (breakAfterMinutes > 0) {
        cursor += breakAfterMinutes;
      }
      const breakAfterEndLabel = breakAfterMinutes > 0 ? formatTimeLabel(cursor) : undefined;

      return {
        item,
        title: getPracticeItemTitle(item, drillRows),
        startLabel,
        endLabel,
        breakAfterMinutes,
        breakAfterStartLabel,
        breakAfterEndLabel,
        focusTags: getPracticeItemFocusTags(item, drillRows),
        drill,
      };
    });
}

export function getPracticeEndTime(startTime: string, lengthMinutes: number) {
  return formatTimeLabel(toMinutes(startTime) + lengthMinutes);
}

export function getPracticeComputedEndTime(
  startTime: string,
  items: PracticePlanItemRecord[],
  drillRows: DrillLibraryRow[],
  fallbackLengthMinutes = 0,
) {
  const schedule = buildPracticeSchedule(startTime, items, drillRows);
  const lastRow = schedule[schedule.length - 1];

  if (!lastRow) {
    return getPracticeEndTime(startTime, fallbackLengthMinutes);
  }

  return lastRow.breakAfterEndLabel ?? lastRow.endLabel;
}

export function getPracticeBreakdown(
  items: PracticePlanItemRecord[],
  drillRows: DrillLibraryRow[],
) {
  const totals = new Map<string, number>();

  for (const item of items) {
    if (item.itemType === "circuit" && item.circuitItems.length > 0) {
      for (const circuitItem of item.circuitItems) {
        const tags = circuitItem.focusTags.length > 0 ? circuitItem.focusTags : ["General"];
        for (const tag of tags) {
          totals.set(tag, (totals.get(tag) ?? 0) + circuitItem.durationMinutes);
        }
      }
      continue;
    }

    const tags = getPracticeItemFocusTags(item, drillRows);
    const effectiveTags = tags.length > 0 ? tags : ["General"];
    for (const tag of effectiveTags) {
      totals.set(tag, (totals.get(tag) ?? 0) + item.durationMinutes);
    }
  }

  return [...totals.entries()]
    .map(([label, minutes]) => ({ label, minutes }))
    .sort((left, right) => right.minutes - left.minutes);
}
