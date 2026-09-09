// Shared, DB-access-free derivation logic for the content-storage-backed
// diagnosis engine (docs/content/content-storage-architecture.md §9).
// Used by both the runtime getDiagnosis.ts (Next.js) and
// prisma/seed/index.ts's legacy-row backfill (tsx, outside Next.js) — kept
// pure so both call sites can load their own content and reuse identical
// rule evaluation, rather than drifting between two copies.

export type TagTotals = Record<string, number>;

export interface TagCondition {
  tag: string;
  gte: number;
}

export interface TriggerRule {
  all_of?: TagCondition[];
  any_of?: TagCondition[];
  none_of?: TagCondition[];
}

export interface SeverityBand {
  min: number;
  max: number | null;
  label: string;
}

/** Sums AnswerOptionTagEffect weights across a set of submitted answers.
 * `tagEffectsByOptionId` maps AnswerOption.id -> its tag effects (as loaded
 * from the DB); an option missing from the map contributes nothing. */
export function accumulateTags(
  answers: { optionId: string }[],
  tagEffectsByOptionId: Map<string, { tagId: string; weight: number }[]>,
): TagTotals {
  const totals: TagTotals = {};
  for (const answer of answers) {
    const effects = tagEffectsByOptionId.get(answer.optionId) ?? [];
    for (const effect of effects) {
      totals[effect.tagId] = (totals[effect.tagId] ?? 0) + effect.weight;
    }
  }
  return totals;
}

/** all_of = AND, any_of = OR-at-least-one, none_of = AND-none — see
 * content-storage-architecture.md §9.2. An empty/absent all_of and absent
 * any_of/none_of is vacuously true — this is how a catch-all DiagnosisDef
 * encodes an always-true trigger_rule ({"all_of": []}). */
export function evaluateTriggerRule(
  rule: TriggerRule,
  totals: TagTotals,
): boolean {
  const meets = (c: TagCondition) => (totals[c.tag] ?? 0) >= c.gte;
  const allOf = rule.all_of ?? [];
  const anyOf = rule.any_of ?? [];
  const noneOf = rule.none_of ?? [];
  if (!allOf.every(meets)) return false;
  if (anyOf.length > 0 && !anyOf.some(meets)) return false;
  if (noneOf.some(meets)) return false;
  return true;
}

/** Severity banding (§9.4) sums only the tags referenced by the *matched*
 * rule's own all_of/any_of conditions (none_of tags don't contribute — they
 * only ever exclude), not the grand total across every tag in the quiz. */
export function sumMatchedRuleTags(
  rule: TriggerRule,
  totals: TagTotals,
): number {
  const tags = new Set(
    [...(rule.all_of ?? []), ...(rule.any_of ?? [])].map((c) => c.tag),
  );
  let sum = 0;
  for (const tag of tags) sum += totals[tag] ?? 0;
  return sum;
}

export function resolveSeverityLabel(
  total: number,
  bands: SeverityBand[],
): string {
  const band = bands.find(
    (b) => total >= b.min && (b.max === null || total <= b.max),
  );
  if (!band) {
    throw new Error(
      `No severity band matched tag total ${total} against bands ${JSON.stringify(bands)}`,
    );
  }
  return band.label;
}

/** Fills {slot}-style placeholders; throws rather than leak a literal
 * `{slot}` into rendered text (§9.7) if a referenced slot has no value. */
export function renderTemplate(
  template: string,
  slots: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = slots[key];
    if (value === undefined) {
      throw new Error(
        `Missing value for template slot {${key}} in "${template}"`,
      );
    }
    return value;
  });
}

/** Every {word} placeholder literally present in a template string. */
export function extractTemplateSlots(template: string): Set<string> {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    found.add(match[1]);
  }
  return found;
}

/** §9.7's simplified placeholder: pick up to `count` entries at random,
 * without replacement. Returns [] for an empty pool rather than erroring —
 * Phase 13's placeholder content ships empty pools on purpose (see
 * prisma/seed/content/diagnoses.json), deferring real callback lines to
 * Phase 14. */
export function pickSymptomCallbacks(pool: string[], count = 2): string[] {
  if (pool.length === 0) return [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}
