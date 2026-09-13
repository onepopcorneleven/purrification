"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

function filenameOf(src: string): string {
  return src.split("/").pop() ?? src;
}

export default function ImageGallery({ images }: { images: string[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep the fullscreen viewer scrolled to whichever image was tapped.
  useEffect(() => {
    if (openIndex === null) return;
    slideRefs.current[openIndex]?.scrollIntoView({ block: "start" });
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex]);

  if (images.length === 0) {
    return <p>No images found.</p>;
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setOpenIndex(i)}
            style={{
              padding: 0,
              border: "1px solid var(--color-border, #444)",
              borderRadius: "0.5rem",
              overflow: "hidden",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4 / 5",
              }}
            >
              <Image
                src={src}
                alt={filenameOf(src)}
                fill
                sizes="(max-width: 600px) 45vw, 200px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <span
              style={{
                fontSize: "0.65rem",
                padding: "0.25rem",
                color: "var(--color-text-primary)",
                opacity: 0.7,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {filenameOf(src)}
            </span>
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 1000,
            overflowY: "auto",
            scrollSnapType: "y mandatory",
          }}
        >
          <button
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            style={{
              position: "fixed",
              top: "0.75rem",
              right: "0.75rem",
              zIndex: 1001,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "999px",
              width: "2.5rem",
              height: "2.5rem",
              fontSize: "1.25rem",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
          {images.map((src, i) => (
            <div
              key={src}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              style={{
                minHeight: "100vh",
                scrollSnapAlign: "start",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem 0.5rem 1rem",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "min(90vw, 640px)",
                  aspectRatio: "4 / 5",
                }}
              >
                <Image
                  src={src}
                  alt={filenameOf(src)}
                  fill
                  sizes="90vw"
                  style={{ objectFit: "contain" }}
                  priority={i === openIndex}
                />
              </div>
              <span
                style={{
                  color: "#fff",
                  opacity: 0.8,
                  fontSize: "0.8rem",
                  marginTop: "0.5rem",
                }}
              >
                {i + 1} / {images.length} — {filenameOf(src)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
