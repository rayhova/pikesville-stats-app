"use client";

import { useState } from "react";

export function SharePageButton({
  label = "Share",
  className = "button-link ghost",
}: Readonly<{
  label?: string;
  className?: string;
}>) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  async function handleShare() {
    const url = window.location.href;
    const title = document.title || "Pikesville MBB";

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 1800);
      } catch {
        setStatus("idle");
      }
    }
  }

  return (
    <button type="button" className={className} onClick={handleShare}>
      {status === "copied" ? "Copied" : label}
    </button>
  );
}
