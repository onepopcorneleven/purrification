"use client";

import { useState } from "react";
import Link from "next/link";
import { FramedImage } from "@/components/ui/FramedImage";
import { TextLightbox } from "@/components/ui/TextLightbox";
import { CrescentMark } from "@/components/ui/CrescentMark";
import { Button } from "@/components/ui/Button";
import styles from "./TreatmentReveal.module.css";

type TreatmentRevealProps = {
  catName: string;
  nameMystical: string;
  typicalDuration: string;
  text: string;
  /** Filename under `public/images/treatments/`, or undefined for a
   * pre-Phase-21 retired Treatment with an empty image pool — renders
   * `FramedImage`'s decorative fallback glyph instead (see
   * docs/workplan/phase-23-image-experience-redesign.md's execution log). */
  image?: string;
  backHref: string;
};

/** The treatment full view (Phase 23) — reached by tapping the results
 * overview's treatment summary row. Shows the enlarged "Medallion" framed
 * hero image (dashed ring + tick marks), the treatment's mystical name and
 * typical duration, and its full frozen `ritualText`, plus a
 * "Read in full screen" affordance into `TextLightbox`. Shared by
 * `/results/[id]/treatment` and `/share/[shareSlug]/treatment`. */
export function TreatmentReveal({
  catName,
  nameMystical,
  typicalDuration,
  text,
  image,
  backHref,
}: TreatmentRevealProps) {
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
        variant="medallion-lg"
        src={image ? `/images/treatments/${image}` : undefined}
        alt=""
        label={`View larger illustration for ${catName}'s prescribed ritual`}
        width={448}
        height={560}
        sizes="(min-width: 640px) 240px, 60vw"
        className={styles.hero}
        caption={nameMystical}
      />
      <div>
        <h1 className={styles.name}>{nameMystical}</h1>
        <p className={styles.duration}>{typicalDuration}</p>
      </div>
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
