import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";

// Public, unauthenticated route (R-DIAG-3/4) — keyed on shareSlug, not the
// row id, so links can't be guessed from sequential ids. Only ever select
// diagnosis/ritual/cat-name fields here; never the owning user's data.
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
    },
  });
  if (!diagnosis) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <DiagnosisCard
        catName={diagnosis.quizAttempt.cat.name}
        diagnosisText={diagnosis.diagnosisText}
        ritualText={diagnosis.ritualText}
      />
      <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "1rem" }}>
        For fun only — not real medical or behavioral advice. If your cat is
        genuinely unwell, please see a vet.
      </p>
    </main>
  );
}
