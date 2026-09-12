import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { prisma } from "@/lib/db/client";
import { PageShell } from "@/components/ui/PageShell";
import { shuffleAnswerOptions } from "@/lib/quiz/shuffleAnswerOptions";
import { QuizFlow } from "./QuizFlow";

export default async function QuizPage({
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

  // R-CONTENT-1: quiz content now lives in Postgres, not content/quiz.ts —
  // read active questions in author-defined order (topic sortOrder, then
  // question sortOrder within it).
  const activeQuestions = await prisma.question.findMany({
    where: { isActive: true },
    orderBy: [{ topic: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      id: true,
      promptMystical: true,
      inputType: true,
      answers: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, labelMystical: true },
      },
    },
  });
  const questions = activeQuestions.map((q) => ({
    id: q.id,
    prompt: q.promptMystical,
    // Phase 19: randomize nominal (non-SCALE) answer order per page load so
    // a fixed screen position doesn't correlate with a specific tag effect
    // for anyone clicking through without reading each option.
    options: shuffleAnswerOptions(
      q.inputType,
      q.answers.map((a) => ({ id: a.id, label: a.labelMystical })),
    ),
  }));

  return (
    <PageShell user={user}>
      <h1 className="mb-6 font-heading text-2xl">
        How&apos;s {cat.name} doing?
      </h1>
      <QuizFlow catId={cat.id} questions={questions} />
    </PageShell>
  );
}
