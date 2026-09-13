import Image from "next/image";
import type { ReactNode } from "react";
import { Expandable } from "./Expandable";
import { FlourishMark } from "./FlourishMark";
import { Mark } from "./Mark";
import styles from "./FramedImage.module.css";

export type FramedImageVariant =
  "portal" | "tarot" | "medallion-sm" | "medallion-lg";

type FramedImageProps = {
  variant: FramedImageVariant;
  /** Full image path (e.g. `/images/treatments/xyz.png`), or undefined when
   * the underlying content has nothing in its image pool — a real,
   * documented case for the pre-Phase-21 retired Treatments that ~22
   * historical Diagnosis rows still reference (see
   * docs/workplan/phase-23-image-experience-redesign.md's execution log).
   * Renders a decorative fallback instead of a broken image. */
  src?: string;
  alt: string;
  /** Expandable's accessible label — only used when `src` is set. */
  label: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  /** Tarot variant only — the ribboned tab text (e.g. "Your Diagnosis"). */
  ribbonLabel?: string;
  /** Tarot variant only — a small icon shown beside `ribbonLabel` inside the
   * ribbon pill (e.g. `DiagnosisReveal`'s candle-flame glyph). Purely
   * decorative; the caller is responsible for its own `aria-hidden`. */
  ribbonIcon?: ReactNode;
  /** Caption shown in the full-screen Lightbox under the image. */
  caption?: string;
};

/** One gold hairline flourish, mirrored into all four corners — shown only
 * on the two rectangular variants (Portal, Tarot); a circular Medallion has
 * no corners for it to sit in, and gets its ring/ticks instead. Every
 * instance is `pointer-events-none` (on top of `FlourishMark`'s own
 * `aria-hidden`) so it can never steal a click meant for `Expandable`'s
 * overlay button underneath. */
function CornerFlourishes() {
  return (
    <>
      <FlourishMark
        size={18}
        className={`${styles.corner} ${styles.cornerTL}`}
      />
      <FlourishMark
        size={18}
        className={`${styles.corner} ${styles.cornerTR}`}
      />
      <FlourishMark
        size={18}
        className={`${styles.corner} ${styles.cornerBL}`}
      />
      <FlourishMark
        size={18}
        className={`${styles.corner} ${styles.cornerBR}`}
      />
    </>
  );
}

/** Twelve short radial tick marks around the large Medallion variant, for a
 * sigil/astrological feel — a static SVG overlay, not a separate reusable
 * mark (unlike Flourish/Constellation/Crescent, this shape only ever
 * appears here). */
function MedallionTicks() {
  const angles = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg
      viewBox="0 0 100 100"
      className={styles.medallionTicks}
      aria-hidden="true"
    >
      {angles.map((angle) => (
        <line
          key={angle}
          x1="50"
          y1="3"
          x2="50"
          y2="9"
          stroke="var(--color-gold-500)"
          strokeWidth="1"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
    </svg>
  );
}

/** Shared "framed illustration" primitive (Phase 23) — a gold-hairline
 * border and soft ambient glow around any image site-wide, in one of three
 * weights matched to context: Portal (large rectangular, bottom gradient
 * scrim — the quiz topic image), Tarot Reveal (rectangular, ribboned,
 * double gold border — the diagnosis full view), Medallion (circular, thin
 * gold ring; the large variant adds a dashed ring + tick marks — the
 * overview thumbnails and the treatment full view hero). See
 * docs/workplan/phase-23-image-experience-redesign.md's "Component
 * changes" for the full spec.
 *
 * `sizes`/`width`/`height` are required, not internal constants — every
 * call site renders this at a substantially different size (a 72px
 * overview thumbnail vs. a full-bleed quiz Portal), the same discipline
 * `Expandable` already requires of its callers (Phase 21).
 *
 * The large Medallion variant's overflow-hidden crop lives on an *inner*
 * element, not the outer box `Expandable` sizes its click target against —
 * its dashed ring/ticks extend past the image circle itself, and would be
 * clipped by the same box that crops the image. */
export function FramedImage({
  variant,
  src,
  alt,
  label,
  width,
  height,
  sizes,
  className,
  ribbonLabel,
  ribbonIcon,
  caption,
}: FramedImageProps) {
  const isMedallionLg = variant === "medallion-lg";
  const showCorners = variant === "portal" || variant === "tarot";
  const variantClass =
    variant === "portal"
      ? styles.portal
      : variant === "tarot"
        ? styles.tarot
        : variant === "medallion-sm"
          ? styles.medallionSm
          : styles.medallionLgOuter;
  const outerClass = `${variantClass} ${className ?? ""}`.trim();
  const frameClass = isMedallionLg
    ? outerClass
    : `${styles.frame} ${outerClass}`;

  const decorations = (
    <>
      {showCorners && <CornerFlourishes />}
      {variant === "portal" && (
        <div className={styles.portalScrim} aria-hidden="true" />
      )}
      {variant === "tarot" && ribbonLabel && (
        <div className={styles.ribbon} aria-hidden="true">
          {ribbonIcon}
          {ribbonLabel}
        </div>
      )}
      {isMedallionLg && (
        <>
          <div className={styles.medallionRing} aria-hidden="true" />
          <MedallionTicks />
        </>
      )}
    </>
  );

  if (!src) {
    return (
      <div className={frameClass}>
        {isMedallionLg ? (
          <div className={styles.medallionInner}>
            <div className={styles.fallback}>
              <Mark size={56} className={styles.fallbackGlyph} />
            </div>
          </div>
        ) : (
          <div className={styles.fallback}>
            <Mark
              size={variant === "medallion-sm" ? 28 : 56}
              className={styles.fallbackGlyph}
            />
          </div>
        )}
        {decorations}
      </div>
    );
  }

  const image = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={styles.image}
    />
  );

  return (
    <Expandable
      label={label}
      src={src}
      alt={alt}
      caption={caption}
      className={frameClass}
    >
      {isMedallionLg ? (
        <div className={styles.medallionInner}>{image}</div>
      ) : (
        image
      )}
      {decorations}
    </Expandable>
  );
}
