import type { ReactNode } from "react";
import Image from "next/image";
import { Mark } from "@/components/ui/Mark";
import styles from "./DiagnosisCard.module.css";

type DiagnosisCardProps = {
  catName: string;
  diagnosisText: string;
  ritualText: string;
  /** Filename under public/images/diagnoses/ — see getDiagnosisImage.ts.
   * Optional so the component still renders (purely typographic, as it
   * always has) for any diagnosisText that doesn't resolve to one. */
  image?: string;
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
  children,
}: DiagnosisCardProps) {
  return (
    <div className={`${styles.card} animate-fade-in`}>
      {image && (
        <Image
          src={`/images/diagnoses/${image}`}
          alt=""
          width={896}
          height={1120}
          className={styles.illustration}
        />
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
        {children}
      </div>
    </div>
  );
}
