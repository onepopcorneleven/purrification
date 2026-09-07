import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/client";

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
      <h1>{diagnosis.quizAttempt.cat.name}&apos;s spiritual reading</h1>
      <p>{diagnosis.diagnosisText}</p>
      <h2>Prescribed ritual</h2>
      <p>{diagnosis.ritualText}</p>
      <p style={{ color: "#666", fontSize: "0.875rem" }}>
        For fun only — not real medical or behavioral advice. If your cat is
        genuinely unwell, please see a vet.
      </p>
      <p>
        <Link href={`/share/${diagnosis.shareSlug}`}>Share this reading</Link>
      </p>
      <p>
        <Link href="/cats">Back to your cats</Link>
      </p>
    </main>
  );
}
