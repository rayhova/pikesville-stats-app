import Link from "next/link";
import { listGameDayCoachAssignmentRows } from "@/lib/admin-repository";

export async function CoachGameDayTaskStrip({
  gameId,
  role,
  coachProfileId,
  className,
}: Readonly<{
  gameId: string;
  role: "admin" | "coach" | "manager" | "player";
  coachProfileId?: string | null;
  className?: string;
}>) {
  if (role !== "coach") {
    return null;
  }

  const rows = (await listGameDayCoachAssignmentRows({
    role,
    coachProfileId,
  })).filter((row) => row.gameId === gameId);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className={["coach-task-strip", className].filter(Boolean).join(" ")}>
      {rows.map((row) => (
        <Link key={row.id} href={row.href} className="coach-task-chip">
          {row.responsibilityLabel}
        </Link>
      ))}
    </div>
  );
}
