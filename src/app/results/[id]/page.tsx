import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/client";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { PageShell } from "@/components/ui/PageShell";

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
    <PageShell user={user}>
      <DiagnosisCard
        catName={diagnosis.quizAttempt.cat.name}
        diagnosisText={diagnosis.diagnosisText}
        ritualText={diagnosis.ritualText}
      >
        <p className="mt-6">
          <Link
            href={`/share/${diagnosis.shareSlug}`}
            className="font-ui text-sm text-gold-300 hover:underline"
          >
            Share this reading
          </Link>
        </p>
      </DiagnosisCard>
      <p className="mt-6">
        <Link
          href="/cats"
          className="font-ui text-sm text-gold-300 hover:underline"
        >
          Back to your cats
        </Link>
      </p>
    </PageShell>
  );
}
