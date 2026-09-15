import type { ReactNode } from "react";
import Link from "next/link";
import { FramedImage } from "@/components/ui/FramedImage";
import { ConstellationMark } from "@/components/ui/ConstellationMark";
import { Mark } from "@/components/ui/Mark";
import styles from "./ReadingOverview.module.css";

type ReadingSummary = {
  nameMystical: string;
  /** Frozen `diagnosisText`/`ritualText` — clamped to 2 lines via CSS, not
   * truncated server-side (no new column needed). */
  teaser: string;
  /** Filename under `public/images/{diagnoses,treatments}/`, or undefined
   * when the linked content has no image in its pool (see
   * `FramedImage`'s decorative-fallback doc comment). */
  image?: string;
  imageDir: "diagnoses" | "treatments";
};

type ReadingOverviewProps = {
  catName: string;
  /** `/results/{id}` or `/share/{shareSlug}` — each row links to
   * `${basePath}/diagnosis` or `${basePath}/treatment`. */
  basePath: string;
  diagnosis: ReadingSummary;
  treatment: ReadingSummary;
  /** Page-specific actions below the rows (e.g. "Save this Reading" +
   * share link on the authenticated page; nothing on the public share
   * page). */
  actions?: ReactNode;
};

function Chevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      className={styles.chevron}
      aria-hidden="true"
    >
      <path
        d="M6 3L11 8L6 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReadingRow({
  href,
  eyebrow,
  summary,
}: {
  href: string;
  eyebrow: string;
  summary: ReadingSummary;
}) {
  return (
    <Link href={href} className={styles.row}>
      <FramedImage
        variant="medallion-sm"
        src={
          summary.image
            ? `/images/${summary.imageDir}/${summary.image}`
            : undefined
        }
        alt=""
        label={`View ${eyebrow.toLowerCase()}`}
        width={144}
        height={180}
        sizes="72px"
        className={styles.medallion}
      />
      <div className={styles.rowText}>
        <p className={styles.rowEyebrow}>{eyebrow}</p>
        <h2 className={styles.rowName}>{summary.nameMystical}</h2>
        <p className={styles.rowTeaser}>{summary.teaser}</p>
      </div>
      <Chevron />
    </Link>
  );
}

/** The results/share family's new landing tier (Phase 23) — replaces
 * `DiagnosisCard`'s single combined scroll with two tappable summary rows
 * (medallion thumbnail + name + 2-line teaser + chevron), each navigating
 * into its own full-view sub-route. Shared by both `/results/[id]` and
 * `/share/[shareSlug]` — same visual, two data sources, same reason
 * `DiagnosisCard` was shared before it. */
export function ReadingOverview({
  catName,
  basePath,
  diagnosis,
  treatment,
  actions,
}: ReadingOverviewProps) {
  return (
    <div className={`${styles.panel} animate-fade-in`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a tiny
          decorative SVG stamp; next/image's optimizer doesn't apply to it. */}
      <img
        src="/icons/seal-of-completion.svg"
        alt=""
        aria-hidden="true"
        className={styles.seal}
      />
      <ConstellationMark className={styles.constellation} />
      <p className={styles.eyebrow}>
        <Mark size={20} />
        Spiritual Reading
      </p>
      <h1 className={styles.catName}>{catName}&apos;s spiritual reading</h1>
      <div className={styles.rows}>
        <ReadingRow
          href={`${basePath}/diagnosis`}
          eyebrow="Your diagnosis"
          summary={diagnosis}
        />
        <ReadingRow
          href={`${basePath}/treatment`}
          eyebrow="Prescribed ritual"
          summary={treatment}
        />
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
