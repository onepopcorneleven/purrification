import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { getOwnedDiagnosis } from "@/lib/diagnosis/loadOwnedDiagnosis";
import { TreatmentReveal } from "@/components/diagnosis/TreatmentReveal";
import { PageShell } from "@/components/ui/PageShell";
import { pickStableImage } from "@/lib/diagnosis/engine";

export default async function ResultTreatmentPage({
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

  return (
    <PageShell user={user}>
      <TreatmentReveal
        catName={diagnosis.quizAttempt.cat.name}
        nameMystical={diagnosis.treatment.nameMystical}
        typicalDuration={diagnosis.treatment.typicalDuration}
        text={diagnosis.ritualText}
        image={pickStableImage(
          diagnosis.treatment.images.map((img) => img.path),
          diagnosis.id,
        )}
        backHref={`/results/${id}`}
      />
    </PageShell>
  );
}
