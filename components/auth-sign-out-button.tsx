"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthSignOutButton({
  className = "button-link ghost",
}: Readonly<{
  className?: string;
}>) {
  const router = useRouter();

  async function handleClick() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    await fetch("/auth/logout", {
      method: "POST",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className={className} type="button" onClick={handleClick}>
      Log Out
    </button>
  );
}
