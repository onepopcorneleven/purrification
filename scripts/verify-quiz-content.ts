// Phase 29: DB-free, exhaustive check that the seed content in
// prisma/seed/content/*.json produces a working quiz, run before any reseed.
//
// scripts/smoke-test-diagnoses.ts proves the same thing against live DB rows
// but needs the SSH tunnel and only *searches* for answer sets. This script
// needs neither: the quiz is small enough (about 1.6M answer combinations at
// 10 questions) to enumerate every possible submission through the same
// engine.ts functions getDiagnosis.ts uses, and fails loudly on anything a
// real submission could trip over — a submission matching no diagnosis, a
// severity sum outside every band (resolveSeverityLabel would throw and the
// quiz submit would 500), or a severity with no ritual variant to select.
// It also reports which (diagnosis, severity band) pairs are reachable, so a
// ritual variant that no answer combination can ever select is visible
// instead of silently dead content.
//
// Run: npm run verify-quiz-content

import {
  accumulateTags,
  evaluateTriggerRule,
  resolveSeverityLabel,
  sumMatchedRuleTags,
  type SeverityBand,
  type TriggerRule,
} from "@/lib/diagnosis/engine";
import questionsJson from "../prisma/seed/content/questions.json";
import diagnosesJson from "../prisma/seed/content/diagnoses.json";
import ritualsJson from "../prisma/seed/content/rituals.json";
import retiredJson from "../prisma/seed/content/retired.json";

interface Question {
  id: string;
  topic_id: string;
  answers: { id: string; tag_effects: Record<string, number> }[];
}
interface DiagnosisDef {
  id: string;
  priority: number;
  is_catch_all: boolean;
  trigger_rule: TriggerRule;
  severity_bands: SeverityBand[];
  linked_treatments: string[];
}
interface Ritual {
  id: string;
  parent_treatment_id: string;
  priority: number;
  selection_conditions: { severity_band?: string[] };
}

const questions = questionsJson as unknown as Question[];
const diagnoses = (diagnosesJson as unknown as DiagnosisDef[])
  .slice()
  .sort((a, b) => a.priority - b.priority);
const rituals = ritualsJson as unknown as Ritual[];
const retired = (retiredJson as { questions: string[] }).questions;

const problems: string[] = [];
const warnings: string[] = [];

// ---- Quiz shape ----------------------------------------------------------
const perTopic = new Map<string, number>();
for (const q of questions) {
  perTopic.set(q.topic_id, (perTopic.get(q.topic_id) ?? 0) + 1);
}
console.log(
  `Quiz: ${questions.length} questions, ${questions.reduce((n, q) => n + q.answers.length, 0)} answers; per topic: ${[...perTopic].map(([t, n]) => `${t.replace("topic_", "")}=${n}`).join(", ")}`,
);
const stillListed = retired.filter((id) => questions.some((q) => q.id === id));
if (stillListed.length > 0) {
  problems.push(
    `retired ids still in questions.json: ${stillListed.join(", ")}`,
  );
}

// ---- Exhaustive enumeration ---------------------------------------------
const tagEffectsByOptionId = new Map<
  string,
  { tagId: string; weight: number }[]
>();
for (const q of questions) {
  for (const a of q.answers) {
    tagEffectsByOptionId.set(
      `${q.id}::${a.id}`,
      Object.entries(a.tag_effects).map(([tagId, weight]) => ({
        tagId,
        weight,
      })),
    );
  }
}

const reached = new Map<string, number>(); // "diagId|label" -> combos
const byDiagnosis = new Map<string, number>();
let total = 0;
let unmatched = 0;
let noBand = 0;
let noRitual = 0;
const noBandExamples: string[] = [];

const optionIds: string[][] = questions.map((q) =>
  q.answers.map((a) => `${q.id}::${a.id}`),
);
const picked: { optionId: string }[] = new Array(questions.length);

function visit(qi: number): void {
  if (qi === questions.length) {
    total++;
    const totals = accumulateTags(picked, tagEffectsByOptionId);
    const matched = diagnoses.find((d) =>
      evaluateTriggerRule(d.trigger_rule, totals),
    );
    if (!matched) {
      unmatched++;
      return;
    }
    let label: string;
    try {
      label = resolveSeverityLabel(
        sumMatchedRuleTags(matched.trigger_rule, totals),
        matched.severity_bands,
      );
    } catch {
      noBand++;
      if (noBandExamples.length < 3) {
        noBandExamples.push(
          `${matched.id} sum=${sumMatchedRuleTags(matched.trigger_rule, totals)}`,
        );
      }
      return;
    }
    const treatmentId = matched.linked_treatments[0];
    const hasRitual = rituals.some(
      (r) =>
        r.parent_treatment_id === treatmentId &&
        (!r.selection_conditions.severity_band ||
          r.selection_conditions.severity_band.includes(label)),
    );
    if (!hasRitual) noRitual++;
    const key = `${matched.id}|${label}`;
    reached.set(key, (reached.get(key) ?? 0) + 1);
    byDiagnosis.set(matched.id, (byDiagnosis.get(matched.id) ?? 0) + 1);
    return;
  }
  for (const optionId of optionIds[qi]) {
    picked[qi] = { optionId };
    visit(qi + 1);
  }
}
visit(0);

console.log(`\nEnumerated ${total.toLocaleString()} answer combinations.`);
if (unmatched > 0)
  problems.push(`${unmatched} combinations match no diagnosis`);
if (noBand > 0) {
  problems.push(
    `${noBand} combinations fall outside every severity band (e.g. ${noBandExamples.join("; ")})`,
  );
}
if (noRitual > 0) {
  problems.push(
    `${noRitual} combinations resolve to a severity with no ritual variant`,
  );
}

// ---- Reachability report -------------------------------------------------
console.log("\nDiagnosis reachability (uniform over all answer combinations):");
const reachableRitualKeys = new Set<string>();
for (const d of diagnoses) {
  const n = byDiagnosis.get(d.id) ?? 0;
  const share = ((100 * n) / total).toFixed(2).padStart(6);
  const bands = d.severity_bands.map((b) => {
    const c = reached.get(`${d.id}|${b.label}`) ?? 0;
    if (c === 0) {
      warnings.push(
        `${d.id}: severity band "${b.label}" is declared but unreachable`,
      );
    } else {
      reachableRitualKeys.add(`${d.linked_treatments[0]}|${b.label}`);
    }
    return `${b.label}=${((100 * c) / total).toFixed(2)}%`;
  });
  console.log(`  ${d.id.padEnd(30)} ${share}%   ${bands.join("  ")}`);
  if (n === 0)
    problems.push(`${d.id} is unreachable — no answer combination selects it`);
}

const unreachableRituals = rituals.filter(
  (r) =>
    !(r.selection_conditions.severity_band ?? []).some((label) =>
      reachableRitualKeys.has(`${r.parent_treatment_id}|${label}`),
    ),
);
console.log(
  `\nRitual variants reachable through the quiz: ${rituals.length - unreachableRituals.length} of ${rituals.length}`,
);
if (unreachableRituals.length > 0) {
  console.log(
    `  unreachable: ${unreachableRituals.map((r) => r.id).join(", ")}`,
  );
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length > 0) {
  console.error("\nFAILED:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  "\nOK: every answer combination resolves to a diagnosis, a severity band, and a ritual.",
);
