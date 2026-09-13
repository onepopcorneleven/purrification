import { redirect, notFound } from "next/navigation";
import { TextLink } from "@/components/ui/TextLink";
import { getCurrentUser } from "@/lib/auth/guard";
import { getOwnedDiagnosis } from "@/lib/diagnosis/loadOwnedDiagnosis";
import { ReadingOverview } from "@/components/diagnosis/ReadingOverview";
import { PageShell } from "@/components/ui/PageShell";
import { pickStableImage } from "@/lib/diagnosis/engine";
import { SaveReadingButton } from "./SaveReadingButton";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const diagnosis = await getOwnedDiagnosis(id, user.id);
  if (!diagnosis) {
    notFound();
  }

  const basePath = `/results/${id}`;

  return (
    <PageShell user={user}>
      <div className="hero-fog rounded-lg">
        <ReadingOverview
          catName={diagnosis.quizAttempt.cat.name}
          basePath={basePath}
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
          actions={
            <>
              <SaveReadingButton />
              <TextLink
                href={`/share/${diagnosis.shareSlug}`}
                className="font-ui text-sm text-gold-300 hover:underline"
              >
                Share this reading
              </TextLink>
            </>
          }
        />
      </div>
      <p className="mt-6">
        <TextLink
          href="/cats"
          className="font-ui text-sm text-gold-300 hover:underline"
        >
          Back to your cats
        </TextLink>
      </p>
    </PageShell>
  );
}
