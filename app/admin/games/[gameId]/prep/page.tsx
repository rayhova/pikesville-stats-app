import { redirect } from "next/navigation";

export default async function GamePrepIndexPage({
  params,
}: Readonly<{
  params: Promise<{ gameId: string }>;
}>) {
  const { gameId } = await params;
  redirect(`/admin/games/${gameId}/prep/scouting`);
}
