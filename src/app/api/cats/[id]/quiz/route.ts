import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { getDiagnosis, type QuizAnswer } from "@/lib/diagnosis/getDiagnosis";

async function parseAnswers(body: unknown): Promise<QuizAnswer[] | null> {
  const answers = (body as { answers?: unknown })?.answers;
  if (!Array.isArray(answers)) return null;

  // R-CONTENT-1: validate against active DB-backed Question/AnswerOption
  // rows, not the old static content/quiz.ts import.
  const activeQuestions = await prisma.question.findMany({
    where: { isActive: true },
    select: { id: true, answers: { select: { id: true } } },
  });
  if (answers.length !== activeQuestions.length) return null;

  const byQuestionId = new Map(
    answers.map((a) => [
      (a as { questionId?: unknown })?.questionId,
      (a as { optionId?: unknown })?.optionId,
    ]),
  );
  const validated: QuizAnswer[] = [];
  for (const question of activeQuestions) {
    const optionId = byQuestionId.get(question.id);
    const validOption = question.answers.some((o) => o.id === optionId);
    if (!validOption || typeof optionId !== "string") return null;
    validated.push({ questionId: question.id, optionId });
  }
  return validated;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: catId } = await params;
  const cat = await findOwnedCat(catId, user.id);
  if (!cat) {
    return NextResponse.json({ error: "Cat not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const answers = await parseAnswers(body);
  if (!answers) {
    return NextResponse.json(
      { error: "Answer every question before submitting." },
      { status: 400 },
    );
  }

  // R-DIAG-2/5 unchanged: rule-based (no LLM), and QuizAttempt + Diagnosis
  // are created together, or not at all. getDiagnosis is now DB-backed
  // (docs/content/content-storage-architecture.md §9), so it's called
  // inside the same transaction as before.
  const diagnosis = await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: { catId, answers: answers as unknown as Prisma.InputJsonValue },
    });
    const result = await getDiagnosis(cat.name, answers);
    return tx.diagnosis.create({
      data: {
        quizAttemptId: attempt.id,
        diagnosisDefId: result.diagnosisDefId,
        treatmentId: result.treatmentId,
        ritualId: result.ritualId,
        tagTotalsSnapshot:
          result.tagTotalsSnapshot as unknown as Prisma.InputJsonValue,
        severityLabel: result.severityLabel,
        diagnosisText: result.diagnosisText,
        ritualText: result.ritualText,
      },
    });
  });

  return NextResponse.json({ diagnosis }, { status: 201 });
}
