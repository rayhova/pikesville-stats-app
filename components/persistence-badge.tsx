export function PersistenceBadge({
  mode,
}: Readonly<{
  mode: "mock" | "supabase";
}>) {
  if (mode === "supabase") {
    return null;
  }

  return (
    <div className="notice">
      Supabase is not configured yet. Reads are using mock data and form actions will not persist.
    </div>
  );
}
