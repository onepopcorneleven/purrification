import { notFound } from "next/navigation";
import { getSharedDiagnosis } from "@/lib/diagnosis/loadSharedDiagnosis";
import { TreatmentReveal } from "@/components/diagnosis/TreatmentReveal";
import { PageShell } from "@/components/ui/PageShell";
import { pickStableImage } from "@/lib/diagnosis/engine";

// Public, unauthenticated route (R-DIAG-3/4) — see the overview route's
// comment for the shareSlug/field-allowlist rationale, shared here via
// getSharedDiagnosis.
export default async function ShareTreatmentPage({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;
  const diagnosis = await getSharedDiagnosis(shareSlug);
  if (!diagnosis) {
    notFound();
  }

  return (
    <PageShell>
      <TreatmentReveal
        catName={diagnosis.quizAttempt.cat.name}
        nameMystical={diagnosis.treatment.nameMystical}
        typicalDuration={diagnosis.treatment.typicalDuration}
        text={diagnosis.ritualText}
        image={pickStableImage(
          diagnosis.treatment.images.map((img) => img.path),
          diagnosis.id,
        )}
        backHref={`/share/${shareSlug}`}
      />
    </PageShell>
  );
}
