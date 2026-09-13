import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { getOwnedDiagnosis } from "@/lib/diagnosis/loadOwnedDiagnosis";
import { DiagnosisReveal } from "@/components/diagnosis/DiagnosisReveal";
import { PageShell } from "@/components/ui/PageShell";
import { pickStableImage } from "@/lib/diagnosis/engine";

export default async function ResultDiagnosisPage({
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
      <DiagnosisReveal
        catName={diagnosis.quizAttempt.cat.name}
        nameMystical={diagnosis.diagnosisDef.nameMystical}
        text={diagnosis.diagnosisText}
        image={pickStableImage(
          diagnosis.diagnosisDef.images.map((img) => img.path),
          diagnosis.id,
        )}
        backHref={`/results/${id}`}
      />
    </PageShell>
  );
}
