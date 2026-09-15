"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ReadingQuickView } from "@/components/diagnosis/ReadingQuickView";

type Attempt = {
  id: string;
  createdAt: Date;
  diagnosis: { id: string; diagnosisText: string } | null;
};

/** Client half of the per-cat history page (Phase 6's log; Phase 23 adds
 * the quick view) — a Server Component (`page.tsx`) fetches `attempts` and
 * hands them here, the same server/client split `PageShell`'s doc comment
 * describes for pages needing local state. Each row opens
 * `ReadingQuickView` instead of linking straight into `/results/[id]`. */
export function HistoryList({ attempts }: { attempts: Attempt[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      {/* A reading log, not a plain list — each entry sits on a connecting
          gold thread with a small sigil marker, per WP3
          (docs/design-upgrade-round-2.md). */}
      <div className="flex flex-col">
        {attempts.map((attempt) => (
          <div
            key={attempt.id}
            className="relative border-l border-border-hairline pb-6 pl-6 last:border-transparent last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-1 -left-[7px] h-3.5 w-3.5 rounded-full border border-gold-500 bg-bg-base shadow-glow-gold-sm"
            />
            <Card>
              <p className="text-sm text-text-muted">
                {attempt.createdAt.toLocaleDateString()}
              </p>
              {attempt.diagnosis && (
                <>
                  <p className="my-1.5 text-text-primary">
                    {attempt.diagnosis.diagnosisText}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenId(attempt.diagnosis!.id)}
                    className="font-ui text-sm text-gold-300 hover:underline"
                  >
                    View full reading
                  </button>
                </>
              )}
            </Card>
          </div>
        ))}
      </div>
      <ReadingQuickView diagnosisId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
