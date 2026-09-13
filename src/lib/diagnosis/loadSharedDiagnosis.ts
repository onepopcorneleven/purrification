import { prisma } from "@/lib/db/client";

/** Single shared field allowlist for every public share route (Phase 23:
 * `/share/[shareSlug]`, `/share/[shareSlug]/diagnosis`,
 * `/share/[shareSlug]/treatment`) — see
 * docs/workplan/phase-23-image-experience-redesign.md's "Data loading and
 * ownership checks". No ownership check needed here by design (keyed on
 * `shareSlug`, not the row id — R-DIAG-3/4), but still one explicit,
 * shared `select` rather than three hand-written selects drifting apart
 * over time.
 *
 * This deliberately `select`s a narrow allowlist rather than `include`ing
 * full rows — never expose the owning user's data here. `nameMystical`
 * (both `diagnosisDef` and `treatment`) and `treatment.typicalDuration` are
 * a reviewed, deliberate widening for this phase's `DiagnosisReveal`/
 * `TreatmentReveal` full views: content-table display copy, not user
 * data, added field by field rather than swapped for a blanket
 * `include`. */
export async function getSharedDiagnosis(shareSlug: string) {
  return prisma.diagnosis.findUnique({
    where: { shareSlug },
    select: {
      id: true,
      diagnosisText: true,
      ritualText: true,
      quizAttempt: { select: { cat: { select: { name: true } } } },
      diagnosisDef: {
        select: {
          nameMystical: true,
          images: { orderBy: { sortOrder: "asc" }, select: { path: true } },
        },
      },
      treatment: {
        select: {
          nameMystical: true,
          typicalDuration: true,
          images: { orderBy: { sortOrder: "asc" }, select: { path: true } },
        },
      },
    },
  });
}

export type SharedDiagnosis = NonNullable<
  Awaited<ReturnType<typeof getSharedDiagnosis>>
>;
