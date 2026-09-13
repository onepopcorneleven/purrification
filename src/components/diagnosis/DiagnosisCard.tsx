import type { ReactNode } from "react";
import Image from "next/image";
import { Mark } from "@/components/ui/Mark";
import { Expandable } from "@/components/ui/Expandable";
import styles from "./DiagnosisCard.module.css";

type DiagnosisCardProps = {
  catName: string;
  diagnosisText: string;
  ritualText: string;
  /** Filename under public/images/diagnoses/ — picked via
   * pickStableImage(diagnosis.diagnosisDef.images, diagnosis.id)
   * (R-CONTENT-5, Phase 15). Optional so the component still renders
   * (purely typographic, as it always has) if a DiagnosisDef has no images
   * in its pool. */
  image?: string;
  /** Filename under public/images/treatments/ — picked via
   * pickStableImage(diagnosis.treatment.images, diagnosis.id) (Phase 22),
   * mirroring `image` above exactly but for the linked Treatment's own
   * image pool. Shown as a small illustration beside the ritual text.
   * Optional so the card still renders unchanged if a Treatment has no
   * images in its pool. */
  treatmentImage?: string;
  /** Page-specific actions below the card (e.g. a share link) — the
   * logged-in results page and the public share page pass different
   * children, or none. */
  children?: ReactNode;
};

/** The bespoke, shareable hero component — used by both the logged-in
 * results page and the public share page (R-DIAG-3/R-DIAG-4). CSS Modules
 * rather than Tailwind utilities, per docs/design-system.md, since the
 * engraved-seal double-border treatment isn't a good fit for utility
 * classes. WP2 (docs/design-upgrade-round-2.md) adds the per-archetype
 * illustration and a "seal of completion" stamp — see that doc for why
 * both were previously missing. */
export function DiagnosisCard({
  catName,
  diagnosisText,
  ritualText,
  image,
  treatmentImage,
  children,
}: DiagnosisCardProps) {
  return (
    <div className={`${styles.card} animate-fade-in`}>
      {image && (
        <Expandable
          label={`View larger illustration for ${catName}'s reading`}
          src={`/images/diagnoses/${image}`}
          alt=""
          className={styles.illustrationFrame}
        >
          <Image
            src={`/images/diagnoses/${image}`}
            alt=""
            width={896}
            height={1120}
            sizes="(min-width: 640px) 220px, 55vw"
            className={styles.illustration}
          />
        </Expandable>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny
          decorative SVG stamp; next/image's optimizer doesn't apply to it. */}
      <img
        src="/icons/seal-of-completion.svg"
        alt=""
        aria-hidden="true"
        className={styles.seal}
      />
      <div className={styles.content}>
        <p className={styles.eyebrow}>
          <Mark size={20} />
          Spiritual Reading
        </p>
        <h1 className={styles.catName}>{catName}&apos;s spiritual reading</h1>
        <p className={styles.diagnosisText}>{diagnosisText}</p>
        <div className={styles.divider} />
        <h2 className={styles.ritualLabel}>Prescribed ritual</h2>
        <p className={styles.ritualText}>{ritualText}</p>
        {treatmentImage && (
          <Expandable
            label={`View larger illustration for ${catName}'s prescribed ritual`}
            src={`/images/treatments/${treatmentImage}`}
            alt=""
            className={styles.ritualIllustrationFrame}
          >
            <Image
              src={`/images/treatments/${treatmentImage}`}
              alt=""
              width={448}
              height={560}
              sizes="140px"
              className={styles.ritualIllustration}
            />
          </Expandable>
        )}
        {children}
      </div>
    </div>
  );
}
