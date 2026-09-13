"use client";

import { useState } from "react";
import Link from "next/link";
import { FramedImage } from "@/components/ui/FramedImage";
import { TextLightbox } from "@/components/ui/TextLightbox";
import { CrescentMark } from "@/components/ui/CrescentMark";
import { Button } from "@/components/ui/Button";
import styles from "./DiagnosisReveal.module.css";

type DiagnosisRevealProps = {
  catName: string;
  nameMystical: string;
  text: string;
  /** Filename under `public/images/diagnoses/`, or undefined for the rare
   * content row with an empty image pool. */
  image?: string;
  backHref: string;
};

function FlameIcon() {
  return (
    <span className="toast-flame" aria-hidden="true">
      <svg width="9" height="12" viewBox="0 0 12 16" fill="none">
        <path
          d="M6 0C6 0 1.5 5.5 1.5 9.2C1.5 11.9 3.5 14 6 14C8.5 14 10.5 11.9 10.5 9.2C10.5 5.5 6 0 6 0Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

/** The diagnosis full view (Phase 23) — reached by tapping the results
 * overview's diagnosis summary row. Shows the "Tarot Reveal" framed hero
 * image, the diagnosis's mystical name, and its full frozen
 * `diagnosisText`, plus a "Read in full screen" affordance into
 * `TextLightbox` (the image's own click-to-expand into `Lightbox` is
 * already built into `FramedImage`, so there's no separate button for
 * that). Shared by `/results/[id]/diagnosis` and
 * `/share/[shareSlug]/diagnosis`. */
export function DiagnosisReveal({
  catName,
  nameMystical,
  text,
  image,
  backHref,
}: DiagnosisRevealProps) {
  const [textOpen, setTextOpen] = useState(false);

  return (
    <div className={`${styles.wrap} animate-fade-in`}>
      <Link
        href={backHref}
        className="w-fit font-ui text-sm text-gold-300 hover:underline"
      >
        ← Back to {catName}&apos;s reading
      </Link>
      <FramedImage
        variant="tarot"
        src={image ? `/images/diagnoses/${image}` : undefined}
        alt=""
        label={`View larger illustration for ${catName}'s diagnosis`}
        width={896}
        height={1120}
        sizes="(min-width: 640px) 420px, 90vw"
        className={styles.hero}
        ribbonLabel="Your Diagnosis"
        ribbonIcon={<FlameIcon />}
        caption={nameMystical}
      />
      <h1 className={styles.name}>{nameMystical}</h1>
      <div className={styles.textBlock}>
        <CrescentMark size={20} className={styles.crescent} />
        <p className={styles.text}>{text}</p>
      </div>
      <div className={styles.affordances}>
        <Button variant="secondary" onClick={() => setTextOpen(true)}>
          Read in full screen
        </Button>
      </div>
      <TextLightbox
        open={textOpen}
        onClose={() => setTextOpen(false)}
        heading={nameMystical}
        text={text}
      />
    </div>
  );
}
