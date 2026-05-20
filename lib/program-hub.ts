import type { AppRole } from "@/lib/access-config";
import type {
  ProgramAssignmentCompletionRow,
  ProgramAssignmentProofRow,
  ProgramAssignmentRow,
  WeekGoalRow,
} from "@/lib/admin-repository";

export const PROGRAM_ASSIGNMENT_TYPE_OPTIONS = [
  { value: "play_review", label: "Play Review" },
  { value: "shooting_goal", label: "Get Shots Up" },
  { value: "read_scouting_report", label: "Read Scouting Report" },
  { value: "watch_video", label: "Watch Video" },
  { value: "create_evaluation", label: "Create Evaluation" },
  { value: "create_development_plan", label: "Create Development Plan" },
  { value: "custom", label: "Custom Task" },
] as const;

function toDateOnlyValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
}

export function formatAssignmentTypeLabel(value: string) {
  return (
    PROGRAM_ASSIGNMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function extractEmbedSrc(embedCode?: string) {
  if (!embedCode) {
    return undefined;
  }

  const match = embedCode.match(/src=(["'])(.*?)\1/i);
  return match?.[2];
}

export function isWeekGoalVisible(goal: WeekGoalRow, role: AppRole | null, today = new Date()) {
  if (!goal.isActive) {
    return false;
  }

  const todayValue = today.toISOString().slice(0, 10);
  if (goal.startDate && goal.startDate > todayValue) {
    return false;
  }
  if (goal.endDate && goal.endDate < todayValue) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  return goal.targetRoles.length === 0 ? true : role ? goal.targetRoles.includes(role) : false;
}

export function isProgramAssignmentVisible(
  assignment: ProgramAssignmentRow,
  role: AppRole | null,
  playerRosterMembershipId: string | null,
  coachProfileId: string | null,
  managerProfileId: string | null,
) {
  if (!assignment.isActive) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  const roleMatch = assignment.targetRoles.length === 0 ? true : role ? assignment.targetRoles.includes(role) : false;
  if (!roleMatch) {
    return false;
  }

  if (role === "player" && assignment.targetRosterMembershipIds.length > 0) {
    return playerRosterMembershipId ? assignment.targetRosterMembershipIds.includes(playerRosterMembershipId) : false;
  }

  if (role === "coach" && assignment.targetCoachProfileIds.length > 0) {
    return coachProfileId ? assignment.targetCoachProfileIds.includes(coachProfileId) : false;
  }

  if (role === "manager" && assignment.targetManagerProfileIds.length > 0) {
    return managerProfileId ? assignment.targetManagerProfileIds.includes(managerProfileId) : false;
  }

  if (
    assignment.targetRosterMembershipIds.length > 0 &&
    role !== "player" &&
    (!role || !assignment.targetRoles.includes(role))
  ) {
    return false;
  }

  if (
    assignment.targetCoachProfileIds.length > 0 &&
    role !== "coach" &&
    (!role || !assignment.targetRoles.includes(role))
  ) {
    return false;
  }

  if (
    assignment.targetManagerProfileIds.length > 0 &&
    role !== "manager" &&
    (!role || !assignment.targetRoles.includes(role))
  ) {
    return false;
  }

  return true;
}

export function getAssignmentPrimaryHref(assignment: ProgramAssignmentRow) {
  const primaryPlayerId = assignment.relatedPlayerIds[0] ?? assignment.relatedPlayerId;
  switch (assignment.assignmentType) {
    case "play_review":
      return assignment.relatedPlayIds[0] ? `/playbook#play-${assignment.relatedPlayIds[0]}` : "/playbook";
    case "read_scouting_report":
      return assignment.relatedGameId ? `/scouting/${assignment.relatedGameId}` : "/scouting";
    case "create_evaluation":
      return primaryPlayerId ? `/stats/players/${primaryPlayerId}?tab=evaluations` : "/stats/players";
    case "create_development_plan":
      return primaryPlayerId ? `/stats/players/${primaryPlayerId}?tab=development` : "/stats/players";
    case "custom":
      return assignment.customUrl ?? `/tasks/${assignment.id}`;
    default:
      return `/tasks/${assignment.id}`;
  }
}

export function getAssignmentSummaryMeta(assignment: ProgramAssignmentRow) {
  if (assignment.assignmentType === "shooting_goal" && assignment.shotsTarget) {
    return `${assignment.shotsTarget} shots${assignment.proofRequired ? " · proof required" : ""}`;
  }

  if (assignment.assignmentType === "play_review" && assignment.relatedPlayNames.length > 0) {
    return assignment.relatedPlayNames.length === 1
      ? assignment.relatedPlayNames[0]
      : `${assignment.relatedPlayNames.length} plays`;
  }

  if (assignment.assignmentType === "read_scouting_report" && assignment.relatedGameTitle) {
    return assignment.relatedGameTitle;
  }

  if (
    (assignment.assignmentType === "create_evaluation" ||
      assignment.assignmentType === "create_development_plan") &&
    assignment.relatedPlayerNames.length > 0
  ) {
    return assignment.relatedPlayerNames.length === 1
      ? assignment.relatedPlayerNames[0]
      : `${assignment.relatedPlayerNames.length} players`;
  }

  return formatAssignmentTypeLabel(assignment.assignmentType);
}

export function formatDueLabel(value?: string) {
  if (!value) {
    return "No due date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isAssignmentOverdue(assignment: ProgramAssignmentRow, now = new Date()) {
  if (!assignment.dueAt) {
    return false;
  }

  const dueAt = new Date(assignment.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    return false;
  }

  return dueAt.getTime() < now.getTime();
}

export function getWeekGoalRangeLabel(goal: WeekGoalRow) {
  return `${toDateOnlyValue(goal.startDate)} - ${toDateOnlyValue(goal.endDate)}`;
}

export function doesProofBelongToViewer(
  proof: ProgramAssignmentProofRow,
  role: AppRole | null,
  playerRosterMembershipId: string | null,
  coachProfileId: string | null,
  managerProfileId: string | null,
) {
  if (role === "coach") {
    return proof.submittedByCoachProfileId === coachProfileId;
  }

  if (role === "manager") {
    return proof.submittedByManagerProfileId === managerProfileId;
  }

  if (role === "admin") {
    return proof.submittedByRole === "admin";
  }

  return proof.submittedByRosterMembershipId === playerRosterMembershipId;
}

export function getLatestProofForViewer(
  proofRows: ProgramAssignmentProofRow[],
  assignmentId: string,
  role: AppRole | null,
  playerRosterMembershipId: string | null,
  coachProfileId: string | null,
  managerProfileId: string | null,
) {
  return proofRows.find(
    (proof) =>
      proof.assignmentId === assignmentId &&
      doesProofBelongToViewer(
        proof,
        role,
        playerRosterMembershipId,
        coachProfileId,
        managerProfileId,
      ),
  ) ?? null;
}

export function doesAssignmentCompletionBelongToViewer(
  completion: ProgramAssignmentCompletionRow,
  role: AppRole | null,
  playerRosterMembershipId: string | null,
  coachProfileId: string | null,
  managerProfileId: string | null,
  adminAuthUserId: string | null,
) {
  if (role === "coach") {
    return completion.completedByCoachProfileId === coachProfileId;
  }

  if (role === "manager") {
    return completion.completedByManagerProfileId === managerProfileId;
  }

  if (role === "admin") {
    return completion.completedByAdminAuthUserId === adminAuthUserId;
  }

  return completion.completedByRosterMembershipId === playerRosterMembershipId;
}

export function getAssignmentCompletionForViewer(
  completionRows: ProgramAssignmentCompletionRow[],
  assignmentId: string,
  role: AppRole | null,
  playerRosterMembershipId: string | null,
  coachProfileId: string | null,
  managerProfileId: string | null,
  adminAuthUserId: string | null,
) {
  return (
    completionRows.find(
      (completion) =>
        completion.assignmentId === assignmentId &&
        doesAssignmentCompletionBelongToViewer(
          completion,
          role,
          playerRosterMembershipId,
          coachProfileId,
          managerProfileId,
          adminAuthUserId,
        ),
    ) ?? null
  );
}
