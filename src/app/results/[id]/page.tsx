import { redirect, notFound } from "next/navigation";
import { TextLink } from "@/components/ui/TextLink";
import { getCurrentUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/client";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { PageShell } from "@/components/ui/PageShell";
import { pickStableImage } from "@/lib/diagnosis/engine";

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
    include: {
      quizAttempt: { include: { cat: true } },
      diagnosisDef: { include: { images: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!diagnosis || diagnosis.quizAttempt.cat.userId !== user.id) {
    notFound();
  }

  return (
    <PageShell user={user}>
      <div className="hero-fog rounded-lg">
        <DiagnosisCard
          catName={diagnosis.quizAttempt.cat.name}
          diagnosisText={diagnosis.diagnosisText}
          ritualText={diagnosis.ritualText}
          image={pickStableImage(
            diagnosis.diagnosisDef.images.map((img) => img.path),
            diagnosis.id,
          )}
        >
          <p className="mt-6">
            <TextLink
              href={`/share/${diagnosis.shareSlug}`}
              className="font-ui text-sm text-gold-300 hover:underline"
            >
              Share this reading
            </TextLink>
          </p>
        </DiagnosisCard>
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
