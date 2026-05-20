"use client";

import { useEffect, useState } from "react";

export function PracticeItemPreviewButton({
  title,
  iframeSrc,
  imageUrls,
  description,
  instructions,
}: Readonly<{
  title: string;
  iframeSrc?: string;
  imageUrls: string[];
  description?: string;
  instructions?: string;
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
      <button className="button-link ghost practice-preview-button" type="button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">↗</span>
        <span className="practice-preview-button-label">Open Example</span>
      </button>
      {open ? (
        <div className="play-embed-modal" role="dialog" aria-modal="true" aria-label={title}>
          <div className="play-embed-modal-card practice-preview-modal-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow-label">Practice Item</p>
                <h3>{title}</h3>
              </div>
              <button className="button-link ghost" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            {iframeSrc ? (
              <div className="play-embed-modal-frame practice-preview-modal-frame">
                <iframe
                  src={iframeSrc}
                  title={title}
                  loading="lazy"
                  allow="fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              </div>
            ) : null}
            {imageUrls.length > 0 ? (
              <div className="practice-preview-gallery practice-preview-modal-gallery">
                {imageUrls.map((imageUrl) => (
                  <img key={imageUrl} src={imageUrl} alt={title} />
                ))}
              </div>
            ) : null}
            {description ? (
              <div className="drill-copy-block practice-preview-copy-block">
                <p className="eyebrow-label">Description</p>
                <p className="meta pre-line-copy">{description}</p>
              </div>
            ) : null}
            {instructions ? (
              <div className="drill-copy-block practice-preview-copy-block">
                <p className="eyebrow-label">Instructions</p>
                <p className="meta pre-line-copy">{instructions}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
