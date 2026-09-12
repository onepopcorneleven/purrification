// Content seed pipeline (docs/content/content-storage-architecture.md §8,
// docs/workplan.md Phase 13). Content is still edited by committing files to
// this repo (R-CONTENT-2) — this script is the only thing that changes how
// those files reach the running app (files -> Postgres, not a compiled
// bundle). Idempotent upsert-by-stable-id: safe to run on every deploy.
//
// The very first version of this content (mirrored 1:1 into this
// directory's JSON files) was already inserted directly by migration
// 20260908130000_add_content_model, because production already had real
// Diagnosis rows that needed backfilling in the same transaction as that
// insert — see that migration's header comment. Running this script
// afterward is a no-op against identical values; it only starts doing real
// work once these JSON files are edited (Phase 14+).
import { Prisma, QuestionInputType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import {
  extractTemplateSlots,
  type SeverityBand,
  type TriggerRule,
} from "@/lib/diagnosis/engine";
import tagsJson from "./content/tags.json";
import topicsJson from "./content/topics.json";
import questionsJson from "./content/questions.json";
import treatmentsJson from "./content/treatments.json";
import diagnosesJson from "./content/diagnoses.json";
import ritualsJson from "./content/rituals.json";

interface RawTag {
  id: string;
  description?: string;
}
interface RawTopic {
  id: string;
  name: string;
  sort_order: number;
}
interface RawAnswer {
  id: string;
  label_mystical: string;
  label_plain: string;
  sort_order: number;
  tag_effects: Record<string, number>;
}
interface RawQuestion {
  id: string;
  topic_id: string;
  prompt_mystical: string;
  prompt_plain: string;
  input_type: "single_select" | "multi_select" | "scale";
  sort_order: number;
  answers: RawAnswer[];
}
interface RawTreatment {
  id: string;
  name_mystical: string;
  name_plain: string;
  philosophy: string;
  material_categories: string[];
  typical_duration: string;
  contraindications: string[];
}
interface RawDiagnosisDef {
  id: string;
  name_mystical: string;
  name_plain: string;
  trigger_rule: TriggerRule;
  priority: number;
  severity_bands: SeverityBand[];
  description_template: string;
  description_slots: string[];
  symptom_callback_pool: string[];
  is_catch_all: boolean;
  image_paths?: string[];
  linked_treatments: string[];
}
interface RawRitual {
  id: string;
  parent_treatment_id: string;
  selection_conditions: { severity_band?: string[] };
  priority: number;
  title_template: string;
  materials: string[];
  steps_template: string[];
  incantation_template: string | null;
  aftercare_note: string;
  personalization_slots: string[];
}

const tags = tagsJson as unknown as RawTag[];
const topics = topicsJson as unknown as RawTopic[];
const questions = questionsJson as unknown as RawQuestion[];
const treatments = treatmentsJson as unknown as RawTreatment[];
const diagnosisDefs = diagnosesJson as unknown as RawDiagnosisDef[];
const rituals = ritualsJson as unknown as RawRitual[];

// AnswerOption.id is a *global* Prisma primary key, but authors naturally
// want to write short, question-local answer ids (a1, a2, ...). Deriving
// the DB id from (questionId, localId) guarantees global uniqueness by
// construction instead of relying on author discipline — see
// board/content-id-integrity-fix.md (Phase 16) for the incident this fixes:
// reused local ids across questions previously caused later questions'
// upserts to silently overwrite earlier questions' AnswerOption rows.
function answerOptionId(questionId: string, localId: string): string {
  return `${questionId}::${localId}`;
}

function assertUniqueIds(errors: string[], label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      errors.push(`Duplicate ${label} id "${id}"`);
    }
    seen.add(id);
  }
}

function validate(): void {
  const errors: string[] = [];
  const tagIds = new Set(tags.map((t) => t.id));
  const topicIds = new Set(topics.map((t) => t.id));
  const treatmentIds = new Set(treatments.map((t) => t.id));

  // Id-uniqueness (R-CONTENT-2 follow-up, Phase 16): every content class's
  // ids must be unique within that class, since upsert-by-id silently
  // overwrites rather than erroring on a collision. AnswerOption ids are
  // checked per-question (local ids are *expected* to repeat across
  // questions — that's what answerOptionId() above is for) plus a final
  // global check on the derived id as a belt-and-suspenders sanity check.
  assertUniqueIds(errors, "Tag", tags.map((t) => t.id));
  assertUniqueIds(errors, "QuestionTopic", topics.map((t) => t.id));
  assertUniqueIds(errors, "Question", questions.map((q) => q.id));
  assertUniqueIds(errors, "Treatment", treatments.map((t) => t.id));
  assertUniqueIds(errors, "DiagnosisDef", diagnosisDefs.map((d) => d.id));
  assertUniqueIds(errors, "Ritual", rituals.map((r) => r.id));
  for (const q of questions) {
    assertUniqueIds(
      errors,
      `AnswerOption (within question ${q.id})`,
      q.answers.map((a) => a.id),
    );
  }
  assertUniqueIds(
    errors,
    "AnswerOption (derived global id)",
    questions.flatMap((q) => q.answers.map((a) => answerOptionId(q.id, a.id))),
  );

  for (const q of questions) {
    if (!topicIds.has(q.topic_id)) {
      errors.push(
        `Question ${q.id} references unknown topic_id "${q.topic_id}"`,
      );
    }
    for (const a of q.answers) {
      const effectTagIds = Object.keys(a.tag_effects);
      if (effectTagIds.length === 0) {
        errors.push(
          `Question ${q.id} answer ${a.id} has no tag_effects — every answer option must carry >=1`,
        );
      }
      for (const tagId of effectTagIds) {
        if (!tagIds.has(tagId)) {
          errors.push(
            `Question ${q.id} answer ${a.id} references unknown tag "${tagId}"`,
          );
        }
      }
    }
  }

  for (const d of diagnosisDefs) {
    const refs = [
      ...(d.trigger_rule.all_of ?? []),
      ...(d.trigger_rule.any_of ?? []),
      ...(d.trigger_rule.none_of ?? []),
    ];
    for (const c of refs) {
      if (!tagIds.has(c.tag)) {
        errors.push(
          `DiagnosisDef ${d.id} trigger_rule references unknown tag "${c.tag}"`,
        );
      }
    }
    for (const tid of d.linked_treatments) {
      if (!treatmentIds.has(tid)) {
        errors.push(
          `DiagnosisDef ${d.id} linked_treatments references unknown treatment "${tid}"`,
        );
      }
    }
    const used = extractTemplateSlots(d.description_template);
    const declared = new Set(d.description_slots);
    for (const slot of used) {
      if (!declared.has(slot)) {
        errors.push(
          `DiagnosisDef ${d.id} description_template uses {${slot}} not listed in description_slots`,
        );
      }
    }
    for (const slot of declared) {
      if (!used.has(slot)) {
        errors.push(
          `DiagnosisDef ${d.id} description_slots lists "${slot}" not used in description_template`,
        );
      }
    }
  }

  // Totality guarantee (R-CONTENT-4): exactly one catch-all, unique
  // priorities, catch-all strictly highest.
  const catchAlls = diagnosisDefs.filter((d) => d.is_catch_all);
  if (catchAlls.length !== 1) {
    errors.push(
      `Expected exactly one is_catch_all DiagnosisDef, found ${catchAlls.length}`,
    );
  }
  const priorities = diagnosisDefs.map((d) => d.priority);
  if (new Set(priorities).size !== priorities.length) {
    errors.push("DiagnosisDef priorities are not unique");
  }
  if (
    catchAlls.length === 1 &&
    catchAlls[0].priority !== Math.max(...priorities)
  ) {
    errors.push(
      "Catch-all DiagnosisDef does not have the strictly highest priority",
    );
  }

  // severity_bands non-overlapping and gapless.
  for (const d of diagnosisDefs) {
    const sorted = [...d.severity_bands].sort((a, b) => a.min - b.min);
    for (let i = 0; i < sorted.length - 1; i++) {
      const band = sorted[i];
      const next = sorted[i + 1];
      if (band.max === null || band.max + 1 !== next.min) {
        errors.push(
          `DiagnosisDef ${d.id} severity_bands has a gap or overlap between "${band.label}" and "${next.label}"`,
        );
      }
    }
  }

  for (const t of treatments) {
    if (t.contraindications.length === 0) {
      errors.push(`Treatment ${t.id} has empty contraindications`);
    }
  }

  for (const r of rituals) {
    if (r.steps_template.length < 3) {
      errors.push(`Ritual ${r.id} has fewer than 3 steps_template entries`);
    }
    if (!treatmentIds.has(r.parent_treatment_id)) {
      errors.push(
        `Ritual ${r.id} references unknown parent_treatment_id "${r.parent_treatment_id}"`,
      );
    }
    const used = new Set<string>();
    for (const step of r.steps_template) {
      for (const slot of extractTemplateSlots(step)) used.add(slot);
    }
    for (const slot of extractTemplateSlots(r.title_template)) used.add(slot);
    const declared = new Set(r.personalization_slots);
    for (const slot of used) {
      if (!declared.has(slot)) {
        errors.push(
          `Ritual ${r.id} templates use {${slot}} not listed in personalization_slots`,
        );
      }
    }
    for (const slot of declared) {
      if (!used.has(slot)) {
        errors.push(
          `Ritual ${r.id} personalization_slots lists "${slot}" not used in any template`,
        );
      }
    }
  }

  // Sibling rituals under one treatment: mutually exclusive severity_band,
  // or explicitly priority-ordered (differing priority resolves ambiguity).
  const byTreatment = new Map<string, RawRitual[]>();
  for (const r of rituals) {
    const list = byTreatment.get(r.parent_treatment_id) ?? [];
    list.push(r);
    byTreatment.set(r.parent_treatment_id, list);
  }
  for (const [treatmentId, siblings] of byTreatment) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i];
        const b = siblings[j];
        if (a.priority !== b.priority) continue;
        const aBands = a.selection_conditions.severity_band ?? [];
        const bBands = b.selection_conditions.severity_band ?? [];
        const overlaps =
          aBands.length === 0 ||
          bBands.length === 0 ||
          aBands.some((band) => bBands.includes(band));
        if (overlaps) {
          errors.push(
            `Treatment ${treatmentId} rituals ${a.id}/${b.id} have equal priority and overlapping (or unbounded) selection_conditions — must be mutually exclusive or priority-ordered`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Content seed validation failed:\n- ${errors.join("\n- ")}`,
    );
  }
}

async function upsertContent(): Promise<void> {
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { id: t.id },
      create: { id: t.id, description: t.description ?? null },
      update: { description: t.description ?? null },
    });
  }

  for (const t of topics) {
    await prisma.questionTopic.upsert({
      where: { id: t.id },
      create: { id: t.id, name: t.name, sortOrder: t.sort_order },
      update: { name: t.name, sortOrder: t.sort_order },
    });
  }

  for (const q of questions) {
    const inputType = q.input_type.toUpperCase() as QuestionInputType;
    await prisma.question.upsert({
      where: { id: q.id },
      create: {
        id: q.id,
        topicId: q.topic_id,
        promptMystical: q.prompt_mystical,
        promptPlain: q.prompt_plain,
        inputType,
        sortOrder: q.sort_order,
      },
      update: {
        topicId: q.topic_id,
        promptMystical: q.prompt_mystical,
        promptPlain: q.prompt_plain,
        inputType,
        sortOrder: q.sort_order,
      },
    });
    for (const a of q.answers) {
      const optionId = answerOptionId(q.id, a.id);
      await prisma.answerOption.upsert({
        where: { id: optionId },
        create: {
          id: optionId,
          questionId: q.id,
          labelMystical: a.label_mystical,
          labelPlain: a.label_plain,
          sortOrder: a.sort_order,
        },
        update: {
          questionId: q.id,
          labelMystical: a.label_mystical,
          labelPlain: a.label_plain,
          sortOrder: a.sort_order,
        },
      });
      const currentTagIds = Object.keys(a.tag_effects);
      for (const [tagId, weight] of Object.entries(a.tag_effects)) {
        await prisma.answerOptionTagEffect.upsert({
          where: {
            answerOptionId_tagId: { answerOptionId: optionId, tagId },
          },
          create: { answerOptionId: optionId, tagId, weight },
          update: { weight },
        });
      }
      // Sync, don't just add: a tag removed from this answer's tag_effects
      // in a future content edit must not leave a stale row silently still
      // contributing to totals (Phase 16 — the same upsert-only pattern
      // that let AnswerOptionTagEffect rows accumulate a jumbled union of
      // effects from multiple colliding answers before this fix).
      await prisma.answerOptionTagEffect.deleteMany({
        where: { answerOptionId: optionId, tagId: { notIn: currentTagIds } },
      });
    }
  }

  for (const t of treatments) {
    await prisma.treatment.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        nameMystical: t.name_mystical,
        namePlain: t.name_plain,
        philosophy: t.philosophy,
        materialCategories: t.material_categories,
        typicalDuration: t.typical_duration,
        contraindications: t.contraindications,
      },
      update: {
        nameMystical: t.name_mystical,
        namePlain: t.name_plain,
        philosophy: t.philosophy,
        materialCategories: t.material_categories,
        typicalDuration: t.typical_duration,
        contraindications: t.contraindications,
      },
    });
  }

  for (const d of diagnosisDefs) {
    await prisma.diagnosisDef.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        nameMystical: d.name_mystical,
        namePlain: d.name_plain,
        triggerRule: d.trigger_rule as unknown as Prisma.InputJsonValue,
        priority: d.priority,
        severityBands: d.severity_bands as unknown as Prisma.InputJsonValue,
        descriptionTemplate: d.description_template,
        descriptionSlots: d.description_slots,
        symptomCallbackPool: d.symptom_callback_pool,
        isCatchAll: d.is_catch_all,
      },
      update: {
        nameMystical: d.name_mystical,
        namePlain: d.name_plain,
        triggerRule: d.trigger_rule as unknown as Prisma.InputJsonValue,
        priority: d.priority,
        severityBands: d.severity_bands as unknown as Prisma.InputJsonValue,
        descriptionTemplate: d.description_template,
        descriptionSlots: d.description_slots,
        symptomCallbackPool: d.symptom_callback_pool,
        isCatchAll: d.is_catch_all,
      },
    });
    // DiagnosisDefImage rows have no identity of their own outside this
    // array (like AnswerOptionTagEffect above) — delete-then-recreate per
    // diagnosisDefId rather than a bare upsert loop, so a shortened
    // image_paths list actually drops the trailing rows instead of leaving
    // them behind (content-storage-architecture.md §8).
    await prisma.diagnosisDefImage.deleteMany({
      where: { diagnosisDefId: d.id },
    });
    const imagePaths = d.image_paths ?? [];
    if (imagePaths.length > 0) {
      await prisma.diagnosisDefImage.createMany({
        data: imagePaths.map((path, i) => ({
          diagnosisDefId: d.id,
          path,
          sortOrder: i,
        })),
      });
    }
    for (let i = 0; i < d.linked_treatments.length; i++) {
      await prisma.diagnosisDefTreatment.upsert({
        where: {
          diagnosisDefId_treatmentId: {
            diagnosisDefId: d.id,
            treatmentId: d.linked_treatments[i],
          },
        },
        create: {
          diagnosisDefId: d.id,
          treatmentId: d.linked_treatments[i],
          sortOrder: i,
        },
        update: { sortOrder: i },
      });
    }
  }

  for (const r of rituals) {
    await prisma.ritual.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        parentTreatmentId: r.parent_treatment_id,
        selectionConditions:
          r.selection_conditions as unknown as Prisma.InputJsonValue,
        priority: r.priority,
        titleTemplate: r.title_template,
        materials: r.materials,
        stepsTemplate: r.steps_template,
        incantationTemplate: r.incantation_template,
        aftercareNote: r.aftercare_note,
        personalizationSlots: r.personalization_slots,
      },
      update: {
        parentTreatmentId: r.parent_treatment_id,
        selectionConditions:
          r.selection_conditions as unknown as Prisma.InputJsonValue,
        priority: r.priority,
        titleTemplate: r.title_template,
        materials: r.materials,
        stepsTemplate: r.steps_template,
        incantationTemplate: r.incantation_template,
        aftercareNote: r.aftercare_note,
        personalizationSlots: r.personalization_slots,
      },
    });
  }
}

/** Never deletes — a stable id present in the DB but absent from the
 * current seed files is reported so a human can hand-edit it to
 * isActive: false, preserving FK integrity for any historical Diagnosis
 * row that may still reference it (§8). */
async function reportStale(): Promise<void> {
  const [
    dbTags,
    dbTopics,
    dbQuestions,
    dbTreatments,
    dbDiagnosisDefs,
    dbRituals,
  ] = await Promise.all([
    prisma.tag.findMany({ select: { id: true } }),
    prisma.questionTopic.findMany({ select: { id: true } }),
    prisma.question.findMany({ select: { id: true } }),
    prisma.treatment.findMany({ select: { id: true } }),
    prisma.diagnosisDef.findMany({ select: { id: true } }),
    prisma.ritual.findMany({ select: { id: true } }),
  ]);
  const check = (
    label: string,
    rows: { id: string }[],
    seedIds: Set<string>,
  ) => {
    const stale = rows.map((r) => r.id).filter((id) => !seedIds.has(id));
    if (stale.length > 0) {
      console.warn(
        `[db:seed-content] stale ${label} id(s) in DB but not in seed files (consider isActive: false): ${stale.join(", ")}`,
      );
    }
  };
  check("Tag", dbTags, new Set(tags.map((t) => t.id)));
  check("QuestionTopic", dbTopics, new Set(topics.map((t) => t.id)));
  check("Question", dbQuestions, new Set(questions.map((q) => q.id)));
  check("Treatment", dbTreatments, new Set(treatments.map((t) => t.id)));
  check(
    "DiagnosisDef",
    dbDiagnosisDefs,
    new Set(diagnosisDefs.map((d) => d.id)),
  );
  check("Ritual", dbRituals, new Set(rituals.map((r) => r.id)));
}

async function main(): Promise<void> {
  validate();
  await upsertContent();
  await reportStale();
  console.log(
    `[db:seed-content] Upserted ${tags.length} tags, ${topics.length} topics, ${questions.length} questions, ${treatments.length} treatments, ${diagnosisDefs.length} diagnosis defs, ${rituals.length} rituals.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
