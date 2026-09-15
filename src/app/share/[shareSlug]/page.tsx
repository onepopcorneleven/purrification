import { notFound } from "next/navigation";
import { getSharedDiagnosis } from "@/lib/diagnosis/loadSharedDiagnosis";
import { ReadingOverview } from "@/components/diagnosis/ReadingOverview";
import { PageShell } from "@/components/ui/PageShell";
import { pickStableImage } from "@/lib/diagnosis/engine";

// Public, unauthenticated route (R-DIAG-3/4) — keyed on shareSlug, not the
// row id, so links can't be guessed from sequential ids. All data comes
// from getSharedDiagnosis's explicit field allowlist — never the owning
// user's data.
export default async function SharePage({
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
      <div className="hero-fog rounded-lg">
        <ReadingOverview
          catName={diagnosis.quizAttempt.cat.name}
          basePath={`/share/${shareSlug}`}
          diagnosis={{
            nameMystical: diagnosis.diagnosisDef.nameMystical,
            teaser: diagnosis.diagnosisText,
            image: pickStableImage(
              diagnosis.diagnosisDef.images.map((img) => img.path),
              diagnosis.id,
            ),
            imageDir: "diagnoses",
          }}
          treatment={{
            nameMystical: diagnosis.treatment.nameMystical,
            teaser: diagnosis.ritualText,
            image: pickStableImage(
              diagnosis.treatment.images.map((img) => img.path),
              diagnosis.id,
            ),
            imageDir: "treatments",
          }}
        />
      </div>
    </PageShell>
  );
}
