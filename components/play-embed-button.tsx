"use client";

import { useEffect, useState } from "react";

export function PlayEmbedButton({
  iframeSrc,
  title,
  buttonClassName = "ghost",
}: Readonly<{
  iframeSrc: string;
  title: string;
  buttonClassName?: string;
}>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <>
      <button className={`button-link ${buttonClassName}`.trim()} type="button" onClick={() => setOpen(true)}>
        Open Video
      </button>
      {open ? (
        <div className="play-embed-modal" role="dialog" aria-modal="true" aria-label={title}>
          <div className="play-embed-modal-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow-label">Play Video</p>
                <h3>{title}</h3>
              </div>
              <button className="button-link ghost" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="play-embed-modal-frame">
              <iframe
                src={iframeSrc}
                title={title}
                loading="lazy"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
