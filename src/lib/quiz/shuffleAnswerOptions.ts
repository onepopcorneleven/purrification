import type { QuestionInputType } from "@/generated/prisma/client";

// Some input types encode meaning in their option order (SCALE's 1..5 is a
// position, not just a label) and must never be shuffled; others (e.g.
// SINGLE_SELECT, MULTI_SELECT) are nominal — each option stands alone, so
// display order is just presentation. Keying off this set, rather than
// hardcoding specific question ids, is what lets this apply automatically
// to any future quiz and to any future nominal answer-set type; a future
// ordinal type just needs adding here.
const ORDER_PRESERVING_TYPES = new Set<QuestionInputType>(["SCALE"]);

/** Randomizes option display order for nominal input types, to avoid a
 * fixed on-screen position correlating with a specific tag effect for
 * anyone clicking through without reading each option (see docs/workplan.md
 * Phase 19). Ordinal types are returned in their original order, unchanged. */
export function shuffleAnswerOptions<T>(
  inputType: QuestionInputType,
  options: T[],
): T[] {
  if (ORDER_PRESERVING_TYPES.has(inputType)) return options;
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
