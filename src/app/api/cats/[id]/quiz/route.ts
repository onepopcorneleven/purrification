import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/guard";
import { findOwnedCat } from "@/lib/cats/findOwnedCat";
import { quizQuestions } from "@/content/quiz";
import { getDiagnosis, type QuizAnswer } from "@/lib/diagnosis/getDiagnosis";

function parseAnswers(body: unknown): QuizAnswer[] | null {
  const answers = (body as { answers?: unknown })?.answers;
  if (!Array.isArray(answers) || answers.length !== quizQuestions.length) {
    return null;
  }

  const byQuestionId = new Map(
    answers.map((a) => [a?.questionId, a?.optionId]),
  );
  const validated: QuizAnswer[] = [];
  for (const question of quizQuestions) {
    const optionId = byQuestionId.get(question.id);
    const validOption = question.options.some((o) => o.id === optionId);
    if (!validOption) return null;
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
  const answers = parseAnswers(body);
  if (!answers) {
    return NextResponse.json(
      { error: "Answer every question before submitting." },
      { status: 400 },
    );
  }

  // R-DIAG-5: QuizAttempt and its Diagnosis are created together, or not at
  // all — a QuizAttempt is never left without a Diagnosis.
  const diagnosis = await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: { catId, answers: answers as unknown as Prisma.InputJsonValue },
    });
    const { diagnosisText, ritualText } = getDiagnosis(answers);
    return tx.diagnosis.create({
      data: { quizAttemptId: attempt.id, diagnosisText, ritualText },
    });
  });

  return NextResponse.json({ diagnosis }, { status: 201 });
}
