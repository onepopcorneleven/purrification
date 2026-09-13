"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FramedImage } from "@/components/ui/FramedImage";
import { Button } from "@/components/ui/Button";

type QuickViewData = {
  catName: string;
  diagnosis: { nameMystical: string; teaser: string; image?: string };
  treatment: { nameMystical: string; teaser: string; image?: string };
};

type ReadingQuickViewProps = {
  /** The diagnosis id to preview, or null when the quick view is closed —
   * this component is always mounted once by its host list, not
   * re-mounted per row. */
  diagnosisId: string | null;
  onClose: () => void;
};

/** A condensed, single-modal preview of a past reading (Phase 23) — opened
 * from each row of the per-cat history list (Phase 6), distinct from the
 * full overview/full-view/full-screen experience at `/results/[id]`: one
 * combined summary (both the diagnosis's and the treatment's medallion +
 * name + teaser), with a single "View full reading" action into the real
 * overview. Fetches its data on demand from
 * `GET /api/diagnoses/[id]/quick-view` the moment it opens, rather than the
 * history list eagerly joining treatment/diagnosisDef data onto every row
 * — see that route's doc comment for why. */
export function ReadingQuickView({
  diagnosisId,
  onClose,
}: ReadingQuickViewProps) {
  // Keyed by id rather than reset-on-close, so closing never needs a
  // synchronous setState inside the effect body (only a fetch response
  // ever writes state) — stale data for a since-closed/changed id is
  // simply not rendered, via the `result.id === diagnosisId` check below.
  const [result, setResult] = useState<{
    id: string;
    data: QuickViewData;
  } | null>(null);

  useEffect(() => {
    if (!diagnosisId) return;
    let cancelled = false;
    fetch(`/api/diagnoses/${diagnosisId}/quick-view`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setResult({ id: diagnosisId, data: json });
      });
    return () => {
      cancelled = true;
    };
  }, [diagnosisId]);

  const data = result && result.id === diagnosisId ? result.data : null;

  return (
    <Modal
      open={diagnosisId !== null}
      onClose={onClose}
      title={data ? `${data.catName}'s reading` : "Reading"}
    >
      {!data && (
        <p className="text-sm text-text-muted">Consulting the record…</p>
      )}
      {data && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <FramedImage
              variant="medallion-sm"
              src={
                data.diagnosis.image
                  ? `/images/diagnoses/${data.diagnosis.image}`
                  : undefined
              }
              alt=""
              label="View diagnosis illustration"
              width={96}
              height={120}
              sizes="48px"
              className="h-12 w-12"
            />
            <div className="min-w-0">
              <p className="font-heading text-base text-text-primary">
                {data.diagnosis.nameMystical}
              </p>
              <p className="truncate text-sm text-text-secondary">
                {data.diagnosis.teaser}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FramedImage
              variant="medallion-sm"
              src={
                data.treatment.image
                  ? `/images/treatments/${data.treatment.image}`
                  : undefined
              }
              alt=""
              label="View treatment illustration"
              width={96}
              height={120}
              sizes="48px"
              className="h-12 w-12"
            />
            <div className="min-w-0">
              <p className="font-heading text-base text-text-primary">
                {data.treatment.nameMystical}
              </p>
              <p className="truncate text-sm text-text-secondary">
                {data.treatment.teaser}
              </p>
            </div>
          </div>
          <Button href={`/results/${diagnosisId}`} className="self-start">
            View full reading
          </Button>
        </div>
      )}
    </Modal>
  );
}
