import { prisma } from "@/lib/db/client";

/** Single shared ownership check + data shape for every authenticated
 * results route (Phase 23: `/results/[id]`, `/results/[id]/diagnosis`,
 * `/results/[id]/treatment`, and the history quick-view API route) — see
 * docs/workplan/phase-23-image-experience-redesign.md's "Data loading and
 * ownership checks". Splitting one page into three (plus the quick-view
 * endpoint) multiplies the places the `quizAttempt.cat.userId !== user.id`
 * check could be gotten wrong or forgotten; this is the one place it's
 * actually written.
 *
 * Deliberately returns `null` rather than calling `redirect`/`notFound` —
 * those are Next.js page/layout-only behaviors, not safe to call from the
 * route handler this is also used from. Callers decide what "not found"
 * means for their own context. */
export async function getOwnedDiagnosis(id: string, userId: string) {
  const diagnosis = await prisma.diagnosis.findUnique({
    where: { id },
    include: {
      quizAttempt: { include: { cat: true } },
      diagnosisDef: { include: { images: { orderBy: { sortOrder: "asc" } } } },
      treatment: { include: { images: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!diagnosis || diagnosis.quizAttempt.cat.userId !== userId) {
    return null;
  }
  return diagnosis;
}

export type OwnedDiagnosis = NonNullable<
  Awaited<ReturnType<typeof getOwnedDiagnosis>>
>;
