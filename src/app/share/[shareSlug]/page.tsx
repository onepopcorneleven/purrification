import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { PageShell } from "@/components/ui/PageShell";

// Public, unauthenticated route (R-DIAG-3/4) — keyed on shareSlug, not the
// row id, so links can't be guessed from sequential ids. Only ever select
// diagnosis/ritual/cat-name/image fields here; never the owning user's data.
export default async function SharePage({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;
  const diagnosis = await prisma.diagnosis.findUnique({
    where: { shareSlug },
    select: {
      diagnosisText: true,
      ritualText: true,
      quizAttempt: { select: { cat: { select: { name: true } } } },
      diagnosisDef: { select: { imagePath: true } },
    },
  });
  if (!diagnosis) {
    notFound();
  }

  return (
    <PageShell>
      <div className="hero-fog rounded-lg">
        <DiagnosisCard
          catName={diagnosis.quizAttempt.cat.name}
          diagnosisText={diagnosis.diagnosisText}
          ritualText={diagnosis.ritualText}
          image={diagnosis.diagnosisDef.imagePath ?? undefined}
        />
      </div>
    </PageShell>
  );
}
