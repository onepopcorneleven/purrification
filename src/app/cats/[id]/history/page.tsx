import { redirect, notFound } from "next/navigation";
import { TextLink } from "@/components/ui/TextLink";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { prisma } from "@/lib/db/client";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

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
      <h1 className="mb-6 font-heading text-2xl">
        {cat.name}&apos;s spiritual journey
      </h1>
      {attempts.length === 0 ? (
        <EmptyState
          illustrated
          title="No readings yet"
          description="Take the quiz to get the first one."
          action={<Button href={`/cats/${cat.id}/quiz`}>Take the quiz</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {attempts.map((attempt) => (
            <Card key={attempt.id}>
              <p className="text-sm text-text-muted">
                {attempt.createdAt.toLocaleDateString()}
              </p>
              {attempt.diagnosis && (
                <>
                  <p className="my-1.5 text-text-primary">
                    {attempt.diagnosis.diagnosisText}
                  </p>
                  <TextLink
                    href={`/results/${attempt.diagnosis.id}`}
                    className="font-ui text-sm text-gold-300 hover:underline"
                  >
                    View full reading
                  </TextLink>
                </>
              )}
            </Card>
          ))}
        </div>
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
