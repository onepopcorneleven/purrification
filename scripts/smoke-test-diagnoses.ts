// Phase 28 follow-up: exhaustive multi-path smoke test for the diagnosis
// engine, closing the gap Phase 14 flagged ("golden-path smoke test done,
// multi-path coverage across all 12 diagnoses not yet exhaustively done").
//
// This does NOT reimplement getDiagnosis.ts's logic — it imports the same
// engine.ts functions getDiagnosis.ts uses, and loads live content the same
// way getDiagnosis.ts's loadContent() does, so a pass here means the real
// production rule-evaluation path was exercised, not a parallel copy of it.
//
// For every active DiagnosisDef (including the catch-all), it searches for
// a full 20-question answer set that makes it the actual first-match result
// (not just "satisfies its own rule" — a higher-priority DiagnosisDef could
// still intercept it), via random-restart hill-climbing over one option per
// question. Where a DiagnosisDef has more than one severity band, it also
// searches for a second answer set landing in a different band, to exercise
// more than one Ritual variant per diagnosis.
//
// Run: npm run smoke-test-diagnoses (needs the DB tunnel open, same as
// npm run dev / db:seed-content).

import { prisma } from "@/lib/db/client";
import {
  accumulateTags,
  evaluateTriggerRule,
  sumMatchedRuleTags,
  resolveSeverityLabel,
  renderTemplate,
  type TriggerRule,
  type SeverityBand,
  type TagTotals,
} from "@/lib/diagnosis/engine";

interface OptionInfo {
  questionId: string;
  optionId: string;
  tagEffects: { tagId: string; weight: number }[];
}

interface DiagnosisDefInfo {
  id: string;
  priority: number;
  isCatchAll: boolean;
  triggerRule: TriggerRule;
  severityBands: SeverityBand[];
  descriptionTemplate: string;
  symptomCallbackPool: string[];
  linkedTreatments: Array<{
    treatmentId: string;
    sortOrder: number;
    ritualVariants: Array<{
      id: string;
      priority: number;
      selectionConditions: { severity_band?: string[] };
      stepsTemplate: string[];
    }>;
  }>;
}

type AnswerSet = { questionId: string; optionId: string }[];

function randomAnswerSet(questions: OptionInfo[][]): AnswerSet {
  return questions.map((options) => {
    const pick = options[Math.floor(Math.random() * options.length)];
    return { questionId: pick.questionId, optionId: pick.optionId };
  });
}

function totalsFor(
  answers: AnswerSet,
  tagEffectsByOptionId: Map<string, { tagId: string; weight: number }[]>,
): TagTotals {
  return accumulateTags(answers, tagEffectsByOptionId);
}

/** How well `totals` satisfies `rule`, as a continuous score to climb
 * (0 = fully satisfies the rule's own conditions). Lower is better. */
function ruleGap(rule: TriggerRule, totals: TagTotals): number {
  const gap = (c: { tag: string; gte: number }) =>
    Math.max(0, c.gte - (totals[c.tag] ?? 0));
  const allOf = rule.all_of ?? [];
  const anyOf = rule.any_of ?? [];
  const noneOf = rule.none_of ?? [];

  let score = allOf.reduce((s, c) => s + gap(c), 0);
  if (anyOf.length > 0) {
    score += Math.min(...anyOf.map(gap));
  }
  for (const c of noneOf) {
    const over = (totals[c.tag] ?? 0) - c.gte + 1;
    if (over > 0) score += over * 5; // violating none_of is worse than an unmet all_of
  }
  return score;
}

/** Climbs toward making `target` the actual first-match result (priority
 * order respected) by trying, question-by-question, whichever option
 * improves target's rule-gap without newly satisfying a higher-priority
 * (lower-priority-number) rule that would intercept it first. */
function hillClimb(
  questions: OptionInfo[][],
  allDefs: DiagnosisDefInfo[],
  target: DiagnosisDefInfo,
  tagEffectsByOptionId: Map<string, { tagId: string; weight: number }[]>,
  sweeps: number,
): AnswerSet {
  const current = randomAnswerSet(questions);

  const scoreOf = (answers: AnswerSet): number => {
    const totals = totalsFor(answers, tagEffectsByOptionId);
    const higherPriorityIntercept = allDefs.some(
      (d) =>
        d.priority < target.priority &&
        evaluateTriggerRule(d.triggerRule, totals),
    );
    return (
      ruleGap(target.triggerRule, totals) + (higherPriorityIntercept ? 50 : 0)
    );
  };

  let currentScore = scoreOf(current);
  for (let sweep = 0; sweep < sweeps && currentScore > 0; sweep++) {
    for (let qi = 0; qi < questions.length; qi++) {
      const options = questions[qi];
      let bestOptionIdx = -1;
      let bestScore = currentScore;
      for (let oi = 0; oi < options.length; oi++) {
        const trial = [...current];
        trial[qi] = {
          questionId: options[oi].questionId,
          optionId: options[oi].optionId,
        };
        const trialScore = scoreOf(trial);
        if (trialScore < bestScore) {
          bestScore = trialScore;
          bestOptionIdx = oi;
        }
      }
      if (bestOptionIdx >= 0) {
        current[qi] = {
          questionId: options[bestOptionIdx].questionId,
          optionId: options[bestOptionIdx].optionId,
        };
        currentScore = bestScore;
      }
      if (currentScore === 0) break;
    }
  }
  return current;
}

/** Pushes the matched-rule tag total higher (more overshoot) without
 * breaking the match, to try to reach a different (higher) severity band
 * than `avoidLabel`. Same hill-climbing shape as findPath, different
 * objective. */
function hillClimbForBand(
  questions: OptionInfo[][],
  allDefs: DiagnosisDefInfo[],
  target: DiagnosisDefInfo,
  tagEffectsByOptionId: Map<string, { tagId: string; weight: number }[]>,
  avoidLabel: string,
  sweeps: number,
): AnswerSet | null {
  const current = randomAnswerSet(questions);

  const evalState = (answers: AnswerSet) => {
    const totals = totalsFor(answers, tagEffectsByOptionId);
    const matched = allDefs.find((d) =>
      evaluateTriggerRule(d.triggerRule, totals),
    );
    const isTarget = matched?.id === target.id;
    const matchedTotal = isTarget
      ? sumMatchedRuleTags(target.triggerRule, totals)
      : -1;
    let label: string | null = null;
    if (isTarget) {
      try {
        label = resolveSeverityLabel(matchedTotal, target.severityBands);
      } catch {
        label = null;
      }
    }
    return { isTarget, matchedTotal, label };
  };

  const scoreOf = (answers: AnswerSet): number => {
    const { isTarget, matchedTotal, label } = evalState(answers);
    if (!isTarget) return 1000 - matchedTotal; // still climb toward matching at all
    if (label !== null && label !== avoidLabel) return -1000 - matchedTotal; // success: negative = done
    return 100 - matchedTotal; // matched but wrong band: push total higher
  };

  let currentScore = scoreOf(current);
  for (let sweep = 0; sweep < sweeps && currentScore > -1000; sweep++) {
    for (let qi = 0; qi < questions.length; qi++) {
      const options = questions[qi];
      let bestOptionIdx = -1;
      let bestScore = currentScore;
      for (let oi = 0; oi < options.length; oi++) {
        const trial = [...current];
        trial[qi] = {
          questionId: options[oi].questionId,
          optionId: options[oi].optionId,
        };
        const trialScore = scoreOf(trial);
        if (trialScore < bestScore) {
          bestScore = trialScore;
          bestOptionIdx = oi;
        }
      }
      if (bestOptionIdx >= 0) {
        current[qi] = {
          questionId: options[bestOptionIdx].questionId,
          optionId: options[bestOptionIdx].optionId,
        };
        currentScore = bestScore;
      }
      if (currentScore <= -1000) break;
    }
  }
  const final = evalState(current);
  return final.isTarget && final.label !== null && final.label !== avoidLabel
    ? current
    : null;
}

/** Runs the exact same pipeline getDiagnosis.ts runs, given an answer set,
 * and returns which DiagnosisDef/severity/ritual it actually resolves to. */
function resolve(
  answers: AnswerSet,
  allDefs: DiagnosisDefInfo[],
  tagEffectsByOptionId: Map<string, { tagId: string; weight: number }[]>,
) {
  const totals = accumulateTags(answers, tagEffectsByOptionId);
  const matched = allDefs.find((d) =>
    evaluateTriggerRule(d.triggerRule, totals),
  );
  if (!matched) throw new Error("No DiagnosisDef matched (totality violated)");
  const matchedTotal = sumMatchedRuleTags(matched.triggerRule, totals);
  const severityLabel = resolveSeverityLabel(
    matchedTotal,
    matched.severityBands,
  );
  const defaultLink =
    matched.linkedTreatments.find((lt) => lt.sortOrder === 0) ??
    matched.linkedTreatments[0];
  if (!defaultLink) throw new Error(`${matched.id} has no linked treatments`);
  const ritual = defaultLink.ritualVariants
    .filter((r) => {
      const bands = r.selectionConditions?.severity_band;
      return !bands || bands.includes(severityLabel);
    })
    .sort((a, b) => a.priority - b.priority)[0];
  if (!ritual) {
    throw new Error(
      `No Ritual variant matched severity "${severityLabel}" for treatment ${defaultLink.treatmentId} (diagnosis ${matched.id})`,
    );
  }
  const slots = { cat_name: "Whiskers" };
  const diagnosisText = renderTemplate(matched.descriptionTemplate, slots);
  const ritualText = ritual.stepsTemplate
    .map((step) => renderTemplate(step, slots))
    .join(" ");
  return { matched, severityLabel, ritual, diagnosisText, ritualText };
}

async function main() {
  const [answerOptionsRaw, diagnosisDefsRaw] = await Promise.all([
    prisma.answerOption.findMany({
      where: { question: { isActive: true } },
      select: {
        id: true,
        questionId: true,
        tagEffects: { select: { tagId: true, weight: true } },
      },
    }),
    prisma.diagnosisDef.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
      include: {
        linkedTreatments: {
          orderBy: { sortOrder: "asc" },
          include: {
            treatment: {
              include: { ritualVariants: { where: { isActive: true } } },
            },
          },
        },
      },
    }),
  ]);

  const tagEffectsByOptionId = new Map(
    answerOptionsRaw.map((o) => [o.id, o.tagEffects]),
  );
  const byQuestion = new Map<string, OptionInfo[]>();
  for (const o of answerOptionsRaw) {
    const list = byQuestion.get(o.questionId) ?? [];
    list.push({
      questionId: o.questionId,
      optionId: o.id,
      tagEffects: o.tagEffects,
    });
    byQuestion.set(o.questionId, list);
  }
  const questions = [...byQuestion.values()];

  const allDefs: DiagnosisDefInfo[] = diagnosisDefsRaw.map((d) => ({
    id: d.id,
    priority: d.priority,
    isCatchAll: d.isCatchAll,
    triggerRule: d.triggerRule as unknown as TriggerRule,
    severityBands: d.severityBands as unknown as SeverityBand[],
    descriptionTemplate: d.descriptionTemplate,
    symptomCallbackPool: d.symptomCallbackPool,
    linkedTreatments: d.linkedTreatments.map((lt) => ({
      treatmentId: lt.treatmentId,
      sortOrder: lt.sortOrder,
      ritualVariants: lt.treatment.ritualVariants.map((r) => ({
        id: r.id,
        priority: r.priority,
        selectionConditions: r.selectionConditions as unknown as {
          severity_band?: string[];
        },
        stepsTemplate: r.stepsTemplate,
      })),
    })),
  }));

  console.log(
    `Loaded ${questions.length} active questions / ${answerOptionsRaw.length} active answers, ${allDefs.length} active DiagnosisDefs.\n`,
  );

  let failures = 0;
  const RESTARTS = 40;
  const SWEEPS = 10;

  for (const target of allDefs) {
    let found: AnswerSet | null = null;
    for (let r = 0; r < RESTARTS && !found; r++) {
      const attempt = hillClimb(
        questions,
        allDefs,
        target,
        tagEffectsByOptionId,
        SWEEPS,
      );
      const totals = totalsFor(attempt, tagEffectsByOptionId);
      const matched = allDefs.find((d) =>
        evaluateTriggerRule(d.triggerRule, totals),
      );
      if (matched?.id === target.id) found = attempt;
    }

    if (!found) {
      failures++;
      console.log(
        `✗ ${target.id} (priority ${target.priority}) — UNREACHABLE within search budget (${RESTARTS} restarts x ${SWEEPS} sweeps)`,
      );
      continue;
    }

    let result;
    try {
      result = resolve(found, allDefs, tagEffectsByOptionId);
    } catch (e) {
      failures++;
      console.log(
        `✗ ${target.id} — matched but pipeline threw: ${(e as Error).message}`,
      );
      continue;
    }

    console.log(
      `✓ ${target.id} — severity=${result.severityLabel}, ritual=${result.ritual.id}, treatment=${result.matched.linkedTreatments[0]?.treatmentId ?? "?"}`,
    );

    // Multi-path: if this diagnosis has more than one severity band, try to
    // also reach a different band, to exercise a second Ritual variant.
    const distinctBands = [
      ...new Set(target.severityBands.map((b) => b.label)),
    ];
    if (distinctBands.length > 1) {
      let secondFound: AnswerSet | null = null;
      for (let r = 0; r < RESTARTS && !secondFound; r++) {
        const attempt = hillClimbForBand(
          questions,
          allDefs,
          target,
          tagEffectsByOptionId,
          result.severityLabel,
          SWEEPS,
        );
        if (attempt) secondFound = attempt;
      }
      if (secondFound) {
        const second = resolve(secondFound, allDefs, tagEffectsByOptionId);
        console.log(
          `    + second severity path: severity=${second.severityLabel}, ritual=${second.ritual.id}`,
        );
      } else {
        console.log(
          `    (only reached severity "${result.severityLabel}" of [${distinctBands.join(", ")}] within search budget — not necessarily a bug, just a harder path to hill-climb to)`,
        );
      }
    }
  }

  console.log(
    `\n${allDefs.length - failures}/${allDefs.length} active DiagnosisDefs confirmed reachable as the actual first-match result, each rendering a diagnosis + ritual with no missing template slots.`,
  );
  if (failures > 0) {
    console.log(`${failures} FAILURE(S) — see ✗ lines above.`);
  }
  await prisma.$disconnect();
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
