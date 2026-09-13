import { redirect, notFound } from "next/navigation";
import { TextLink } from "@/components/ui/TextLink";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { prisma } from "@/lib/db/client";
import { PageShell } from "@/components/ui/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { OrnamentalRule } from "@/components/ui/OrnamentalRule";
import { HistoryList } from "./HistoryList";

export default async function CatHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const cat = await findOwnedCat(id, user.id);
  if (!cat) {
    notFound();
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { catId: id },
    orderBy: { createdAt: "desc" },
    include: { diagnosis: true },
  });

  return (
    <PageShell user={user}>
      <h1 className="mb-4 font-heading text-2xl">
        {cat.name}&apos;s spiritual journey
      </h1>
      <OrnamentalRule className="mb-6" />
      {attempts.length === 0 ? (
        <EmptyState
          illustrated
          title="No readings yet"
          description="Take the quiz to get the first one."
          action={<Button href={`/cats/${cat.id}/quiz`}>Take the quiz</Button>}
        />
      ) : (
        <HistoryList
          attempts={attempts.map((attempt) => ({
            id: attempt.id,
            createdAt: attempt.createdAt,
            diagnosis: attempt.diagnosis
              ? {
                  id: attempt.diagnosis.id,
                  diagnosisText: attempt.diagnosis.diagnosisText,
                }
              : null,
          }))}
        />
      )}
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
