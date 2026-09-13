import { notFound } from "next/navigation";
import { getSharedDiagnosis } from "@/lib/diagnosis/loadSharedDiagnosis";
import { DiagnosisReveal } from "@/components/diagnosis/DiagnosisReveal";
import { PageShell } from "@/components/ui/PageShell";
import { pickStableImage } from "@/lib/diagnosis/engine";

// Public, unauthenticated route (R-DIAG-3/4) — see the overview route's
// comment for the shareSlug/field-allowlist rationale, shared here via
// getSharedDiagnosis.
export default async function ShareDiagnosisPage({
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
      <DiagnosisReveal
        catName={diagnosis.quizAttempt.cat.name}
        nameMystical={diagnosis.diagnosisDef.nameMystical}
        text={diagnosis.diagnosisText}
        image={pickStableImage(
          diagnosis.diagnosisDef.images.map((img) => img.path),
          diagnosis.id,
        )}
        backHref={`/share/${shareSlug}`}
      />
    </PageShell>
  );
}
