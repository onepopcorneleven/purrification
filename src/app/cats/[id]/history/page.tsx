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
        // A reading log, not a plain list — each entry sits on a connecting
        // gold thread with a small sigil marker, per WP3
        // (docs/design-upgrade-round-2.md): "a record of rituals performed"
        // rather than a table of rows. The border-left on each row *is*
        // that row's segment of thread; rows abut with no gap (pb-6 instead
        // of a flex gap) so consecutive segments read as one continuous
        // line, and the last row drops its segment so the thread doesn't
        // dangle past the final entry.
        <div className="flex flex-col">
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className="relative border-l border-border-hairline pb-6 pl-6 last:border-transparent last:pb-0"
            >
              <span
                aria-hidden="true"
                className="absolute top-1 -left-[7px] h-3.5 w-3.5 rounded-full border border-gold-500 bg-bg-base shadow-glow-gold-sm"
              />
              <Card>
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
            </div>
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
