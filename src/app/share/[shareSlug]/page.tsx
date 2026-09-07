import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";

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
      <h1>{diagnosis.quizAttempt.cat.name}&apos;s spiritual reading</h1>
      <p>{diagnosis.diagnosisText}</p>
      <h2>Prescribed ritual</h2>
      <p>{diagnosis.ritualText}</p>
      <p style={{ color: "#666", fontSize: "0.875rem" }}>
        For fun only — not real medical or behavioral advice. If your cat is
        genuinely unwell, please see a vet.
      </p>
    </main>
  );
}
