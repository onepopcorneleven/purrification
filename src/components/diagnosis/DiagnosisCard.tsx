import type { ReactNode } from "react";
import { Mark } from "@/components/ui/Mark";
import styles from "./DiagnosisCard.module.css";

type DiagnosisCardProps = {
  catName: string;
  diagnosisText: string;
  ritualText: string;
  /** Page-specific actions below the card (e.g. a share link) — the
   * logged-in results page and the public share page pass different
   * children, or none. */
  children?: ReactNode;
};

/** The bespoke, shareable hero component — used by both the logged-in
 * results page and the public share page (R-DIAG-3/R-DIAG-4). CSS Modules
 * rather than Tailwind utilities, per docs/design-system.md, since the
 * engraved-seal double-border treatment isn't a good fit for utility
 * classes. */
export function DiagnosisCard({
  catName,
  diagnosisText,
  ritualText,
  children,
}: DiagnosisCardProps) {
  return (
    <div className={`${styles.card} animate-fade-in`}>
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
  );
}
