import type { GameRow, PracticePlanRow } from "@/lib/admin-repository";

function toDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${month}-${day}-${year}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${month}-${day}-${year}`;
}

export function formatCompactDate(value: string) {
  return toDate(value) ?? value;
}

export function formatCompactTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/am|pm/i.test(trimmed)) {
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      const [, rawHours, rawMinutes, period] = match;
      let hours = Number.parseInt(rawHours, 10) % 12;
      if (period.toUpperCase() === "PM") {
        hours += 12;
      }
      return `${hours.toString().padStart(2, "0")}:${rawMinutes}`;
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

export function formatPracticeClockTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    const [rawHours = "0", rawMinutes = "00"] = trimmed.split(":");
    const hours = Number.parseInt(rawHours, 10) || 0;
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${rawMinutes} ${suffix}`;
  }

  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) {
    return trimmed.replace(/\s*(AM|PM)$/i, (match) => ` ${match.trim().toUpperCase()}`);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const suffix = parsed.getHours() >= 12 ? "PM" : "AM";
  const displayHours = parsed.getHours() % 12 || 12;
  return `${displayHours}:${String(parsed.getMinutes()).padStart(2, "0")} ${suffix}`;
}

export function formatGameRowDate(game: Pick<GameRow, "date">) {
  return formatCompactDate(game.date);
}

export function formatGameRowTime(game: Pick<GameRow, "startsAt" | "date">) {
  return formatCompactTime(game.startsAt ?? game.date);
}

export function formatPracticeDate(practice: Pick<PracticePlanRow, "practiceDate">) {
  return formatCompactDate(practice.practiceDate);
}

export function formatPracticeTime(practice: Pick<PracticePlanRow, "startTimeValue">) {
  return formatPracticeClockTime(practice.startTimeValue);
}

export function formatPracticeWindow(practice: Pick<PracticePlanRow, "startTimeValue" | "endTime">) {
  return `${formatPracticeClockTime(practice.startTimeValue)} - ${formatPracticeClockTime(practice.endTime)}`;
}
