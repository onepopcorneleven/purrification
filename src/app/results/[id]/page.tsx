import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/client";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";

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
  const diagnosis = await prisma.diagnosis.findUnique({
    where: { id },
    include: { quizAttempt: { include: { cat: true } } },
  });
  if (!diagnosis || diagnosis.quizAttempt.cat.userId !== user.id) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <DiagnosisCard
        catName={diagnosis.quizAttempt.cat.name}
        diagnosisText={diagnosis.diagnosisText}
        ritualText={diagnosis.ritualText}
      >
        <p style={{ marginTop: "1.5rem" }}>
          <Link href={`/share/${diagnosis.shareSlug}`}>Share this reading</Link>
        </p>
      </DiagnosisCard>
      <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "1rem" }}>
        For fun only — not real medical or behavioral advice. If your cat is
        genuinely unwell, please see a vet.
      </p>
      <p>
        <Link href="/cats">Back to your cats</Link>
      </p>
    </main>
  );
}
