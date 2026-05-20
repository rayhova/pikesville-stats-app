import { redirect } from "next/navigation";
import { requireAccessRole } from "@/lib/access-control";
import { listPlayerRosterRows } from "@/lib/admin-repository";

export default async function ProfileRedirectPage() {
  const session = await requireAccessRole(["player", "coach", "admin"]);

  if (session.role === "coach" || session.role === "admin") {
    redirect("/staff-profile");
  }

  if (!session.playerRosterMembershipId) {
    redirect("/");
  }

  const playerRows = await listPlayerRosterRows();
  const playerRow = playerRows.find((row) => row.id === session.playerRosterMembershipId);

  if (!playerRow) {
    redirect("/");
  }

  redirect(`/stats/players/${playerRow.playerId}?tab=development`);
}
