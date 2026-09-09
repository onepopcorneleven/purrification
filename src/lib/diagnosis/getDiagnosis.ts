import { prisma } from "@/lib/db/client";
import {
  accumulateTags,
  evaluateTriggerRule,
  sumMatchedRuleTags,
  resolveSeverityLabel,
  renderTemplate,
  pickSymptomCallbacks,
  type TriggerRule,
  type SeverityBand,
  type TagTotals,
} from "./engine";

export interface QuizAnswer {
  questionId: string;
  optionId: string;
}

export interface DiagnosisResult {
  diagnosisDefId: string;
  treatmentId: string;
  ritualId: string;
  tagTotalsSnapshot: TagTotals;
  severityLabel: string;
  diagnosisText: string;
  ritualText: string;
}

interface LoadedRitual {
  id: string;
  priority: number;
  selectionConditions: { severity_band?: string[] };
  stepsTemplate: string[];
  personalizationSlots: string[];
}

interface LoadedDiagnosisDef {
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
    ritualVariants: LoadedRitual[];
  }>;
}

interface LoadedContent {
  tagEffectsByOptionId: Map<string, { tagId: string; weight: number }[]>;
  diagnosisDefs: LoadedDiagnosisDef[];
}

// Content only changes via redeploy + reseed + systemctl restart (every
// deploy already does this), so a module-level singleton loaded once per
// process lifetime is safe — see content-storage-architecture.md §9.9.
let cachedContent: LoadedContent | null = null;

async function loadContent(): Promise<LoadedContent> {
  if (cachedContent) return cachedContent;

  const [answerOptions, diagnosisDefs] = await Promise.all([
    prisma.answerOption.findMany({
      where: { question: { isActive: true } },
      select: {
        id: true,
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

  // R-CONTENT-4, extends R-DIAG-5: defense-in-depth totality guard — the
  // authoritative check is the seed-time validator (prisma/seed/index.ts).
  // Mirrors the role today's diagnosisPool.length === 0 startup assertion
  // played, but can only run at first DB-backed use, not at module load —
  // see content-storage-architecture.md §9.3 for why this is a weaker
  // guarantee than the old hash-bucket approach.
  const catchAlls = diagnosisDefs.filter((d) => d.isCatchAll);
  if (catchAlls.length !== 1) {
    throw new Error(
      `Expected exactly one active catch-all DiagnosisDef, found ${catchAlls.length} (R-CONTENT-4)`,
    );
  }
  const priorities = diagnosisDefs.map((d) => d.priority);
  if (new Set(priorities).size !== priorities.length) {
    throw new Error(
      "Active DiagnosisDef priorities are not unique (R-CONTENT-4)",
    );
  }
  if (catchAlls[0].priority !== Math.max(...priorities)) {
    throw new Error(
      "Catch-all DiagnosisDef does not have the strictly highest priority (R-CONTENT-4)",
    );
  }

  const content: LoadedContent = {
    tagEffectsByOptionId: new Map(
      answerOptions.map((o) => [o.id, o.tagEffects]),
    ),
    diagnosisDefs: diagnosisDefs.map((d) => ({
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
          personalizationSlots: r.personalizationSlots,
        })),
      })),
    })),
  };
  cachedContent = content;
  return content;
}

/** Invalidates the cached content graph — call after prisma/seed/index.ts
 * reseeds content within the same process (not needed in production, where
 * every reseed is followed by a systemctl restart, but keeps this module
 * honest for any future in-process caller, e.g. a test suite). */
export function clearDiagnosisContentCache(): void {
  cachedContent = null;
}

export async function getDiagnosis(
  catName: string,
  answers: QuizAnswer[],
): Promise<DiagnosisResult> {
  const content = await loadContent();
  const tagTotals = accumulateTags(answers, content.tagEffectsByOptionId);

  // §9.2: active DiagnosisDefs ordered by priority ascending (most-specific
  // first); first full match wins. The totality guard above guarantees the
  // catch-all (always-true, highest priority) is reachable as a last resort.
  const matched = content.diagnosisDefs.find((d) =>
    evaluateTriggerRule(d.triggerRule, tagTotals),
  );
  if (!matched) {
    throw new Error(
      "No DiagnosisDef matched, including the catch-all — should be unreachable given the totality guard (R-CONTENT-4)",
    );
  }

  const matchedTotal = sumMatchedRuleTags(matched.triggerRule, tagTotals);
  const severityLabel = resolveSeverityLabel(
    matchedTotal,
    matched.severityBands,
  );

  // §9.5: always the default (sortOrder 0) treatment this round.
  const defaultLink =
    matched.linkedTreatments.find((lt) => lt.sortOrder === 0) ??
    matched.linkedTreatments[0];
  if (!defaultLink) {
    throw new Error(`DiagnosisDef ${matched.id} has no linked treatments`);
  }

  // §9.6: filter by severity_band, lowest priority among matches wins. Only
  // severity is evaluated this round (household/cat-trait conditions are
  // out of scope — R-CAT-3/R-DIAG-2).
  const ritualCandidates = defaultLink.ritualVariants
    .filter((r) => {
      const bands = r.selectionConditions?.severity_band;
      return !bands || bands.includes(severityLabel);
    })
    .sort((a, b) => a.priority - b.priority);
  const ritual = ritualCandidates[0];
  if (!ritual) {
    throw new Error(
      `No Ritual variant matched severity "${severityLabel}" for treatment ${defaultLink.treatmentId}`,
    );
  }

  // §9.7: cat_name is the only slot the intake flow can supply this round.
  const slots: Record<string, string> = { cat_name: catName };
  const callbackLines = pickSymptomCallbacks(matched.symptomCallbackPool).map(
    (line) => renderTemplate(line, slots),
  );
  const diagnosisText = [
    renderTemplate(matched.descriptionTemplate, slots),
    ...callbackLines,
  ].join(" ");
  const ritualText = ritual.stepsTemplate
    .map((step) => renderTemplate(step, slots))
    .join(" ");

  return {
    diagnosisDefId: matched.id,
    treatmentId: defaultLink.treatmentId,
    ritualId: ritual.id,
    tagTotalsSnapshot: tagTotals,
    severityLabel,
    diagnosisText,
    ritualText,
  };
}
