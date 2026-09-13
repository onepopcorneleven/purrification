# Phase 13 — Content storage foundation (R-CONTENT-1..6, R-DATA-1, R-DATA-2)

Extended notes for `docs/workplan.md`'s Phase 13 entry.
Full spec: `docs/content/content-storage-architecture.md`.

## Context

Pure storage/engine plumbing, no editorial judgment: moved quiz/diagnosis
content from the static `src/content/{quiz,diagnoses}.ts` files into
PostgreSQL, structured to fully support `docs/content/content-framework.md`'s
Question→Tag→Diagnosis→Treatment→Ritual pipeline. Migrated *at the time*
existing 5 questions and 10 diagnosis/ritual entries into the new shape as
placeholder content (minimal tag scaffolding — one dedicated tag per answer
option; 9 of the 10 `DiagnosisDef` rows trigger on a single signature tag,
the 10th is the catch-all; no personalization slots used, preserving the old
un-personalized copy verbatim) so live app behavior was unchanged. Deployed
and verified live 2026-09-09 — see the notes and Execution log below.
Authoring a real, rich content bank (real tag vocabulary, real trigger
rules, real diagnoses/treatments/rituals) was separate, later, gated work —
done as Phase 14.

## Execution notes

- Added the new content-model tables to `prisma/schema.prisma` per
  `content-storage-architecture.md` §7: `Tag`, `QuestionTopic`, `Question`,
  `AnswerOption`, `AnswerOptionTagEffect`, `Treatment`, `DiagnosisDef`,
  `DiagnosisDefTreatment`, `Ritual` — stable authored string ids, `Json` for
  `triggerRule`/`severityBands`/`selectionConditions`, native Postgres
  arrays for list fields, `isActive` flags (content is retired, never
  hard-deleted).
- Amended the existing `Diagnosis` model: added `diagnosisDefId`/
  `treatmentId`/`ritualId` FKs (`onDelete: Restrict`), `tagTotalsSnapshot`,
  `severityLabel`; kept `diagnosisText`/`ritualText` as frozen rendered
  output (R-CONTENT-6).
- Generated and ran the migration against the VPS Postgres instance per the
  existing `db:migrate` workflow; confirmed `prisma migrate status` clean.
  No shadow-database privileges on this role, so the migration was
  hand-written rather than generated via `migrate diff --from-migrations`
  (which needs one) — cross-checked against a `migrate diff --from-empty`
  dump of the target schema for exact column/constraint syntax. Production
  already had 16 real `Diagnosis` rows, so the new FK/JSON columns couldn't
  just be declared `NOT NULL` in one step; the migration follows expand →
  backfill → contract in a single atomic transaction (create the content
  tables, insert this phase's placeholder content, add the new columns
  nullable, backfill every existing row by matching its `diagnosisText` to
  the `DiagnosisDef` it originated from, then tighten to `NOT NULL` and add
  the FK constraints) — see the migration file's own header comment for the
  full reasoning. Applied cleanly 2026-09-09: `prisma migrate deploy`
  succeeded on the first try, and a follow-up query confirmed 0 of the (by
  then) 20 `Diagnosis` rows were left with a null `diagnosisDefId` — every
  row matched.
- Built the seed pipeline (`prisma/seed/content/*.json`,
  `prisma/seed/index.ts`) per §8: idempotent upsert-by-stable-id, with the
  authoring-rule validations the spec describes (tag references resolve,
  exactly one active catch-all `DiagnosisDef`, personalization slots match
  templates, non-empty `contraindications`/`stepsTemplate`, non-overlapping
  severity bands, mutually-exclusive or priority-ordered sibling ritual
  variants). Added `npm run db:seed-content` (via `tsx`, a new dev
  dependency, since this script runs outside Next.js). Deliberately does
  *not* itself contain the legacy-row backfill logic above — that's a
  one-time data migration, correctly scoped to the migration.sql that
  needed it, not the ongoing content-authoring script. Run for real against
  production immediately after the migration: upserted cleanly with zero
  validation errors and zero stale-content warnings (expected — its input
  mirrors exactly what the migration had already inserted).
- Migrated the then-current 5 questions and 10 diagnosis/ritual entries
  into the new seed JSON as placeholder content (see Context above).
  Verified programmatically before writing the migration that every
  placeholder `description_template` matches the original `diagnosisText`
  strings byte-for-byte (the backfill migration's JOIN depends on exact
  equality) — all 10 matched on the first check.
- Rewrote `getDiagnosis` to the DB-backed engine per §9: cached
  active-content load, tag accumulation, priority-ordered trigger-rule
  evaluation with first-match-wins, severity banding, default-treatment +
  severity-matched-ritual selection, fail-loud slot-validated template
  rendering — called from within the existing `POST /api/cats/:id/quiz`
  transaction (R-DIAG-5 unchanged). Shared DB-access-free rule logic
  factored into `src/lib/diagnosis/engine.ts`, imported by both this and
  the seed script's slot validation.
- Replaced `getDiagnosisImage`'s text-equality lookup with a direct
  `diagnosis.diagnosisDef.imagePath` FK read (R-CONTENT-5).
  `getDiagnosisImage.ts` deleted entirely — `results/[id]` and
  `share/[shareSlug]` now `include`/`select` `diagnosisDef.imagePath`
  directly and pass it straight to `DiagnosisCard`.
- Updated `POST /api/cats/:id/quiz`'s answer validation and the quiz UI to
  read active `Question`/`AnswerOption` rows from the DB instead of the
  static `content/quiz.ts` import.
- Added the boot-time totality guard (an active catch-all `DiagnosisDef`
  exists) as defense-in-depth alongside seed-time validation (R-CONTENT-4).
  Necessarily a first-use check now (`loadContent`'s first call), not a
  true module-load-time one, since it needs a DB round-trip — see
  `getDiagnosis.ts`'s comment on why this is a deliberately weaker
  guarantee than the old hash-bucket approach.
- Deleted `src/content/quiz.ts` and `src/content/diagnoses.ts` once the
  DB-backed path was fully wired and verified.
- Updated `CLAUDE.md` and `docs/architecture.md`'s Data model/Content
  storage sections to describe the shipped (not just planned) schema and
  engine. Added `npm run db:seed-content` as a deploy step in
  `vps-runbook.md` step 12.
- Full golden-path smoke test (signup → add cat → quiz → diagnosis → share
  → history → delete-cascade), confirming identical observable behavior to
  the pre-migration app. Run for real against `https://purrification.com`
  2026-09-09 — see the Execution log below for the full account, including
  two separate quiz submissions to exercise both a specific rule match and
  the catch-all fallback.

## Execution log — 2026-09-09

- Deployed from `main` after merging PR #16 (not from the feature branch
  directly — an earlier attempt to build/deploy the unmerged branch on the
  live server was blocked by this session's own safety tooling, which
  reads as a deliberate signal to keep to this project's documented
  `git pull origin main`-based deploy convention rather than deviate from
  it, even temporarily, for validation). Took a fresh manual `pg_dump`
  backup (`scripts/backup-db.sh`, Phase 11) immediately before running the
  migration, on top of that night's already-successful cron backup.
- `npm ci && npm run build` succeeded clean on the server. `prisma migrate
  deploy` applied the new migration in one shot — the fact that it
  succeeded at all confirms the backfill JOIN matched every existing row (a
  failed match would have surfaced as a `NOT NULL` constraint violation and
  rolled back the whole transaction). `npm run db:seed-content` then
  confirmed idempotency: zero validation errors, zero stale-content
  warnings. `sudo systemctl restart purrification` came back
  `active (running)` immediately.
- Full smoke test via `curl` against the live site: signup → add cat →
  submit quiz with answers chosen to trigger `diag_mercury_retrograde`
  (`mood: aloof`) — confirmed the returned `diagnosisDefId`/`treatmentId`/
  `ritualId`, a `tagTotalsSnapshot` with all 5 submitted tags at weight 3
  each, `severityLabel: "present"`, and correctly slot-rendered
  `diagnosisText`/`ritualText` (no leftover `{slot}` literals) — then a
  second submission with answers chosen to match *no* diagnosis's signature
  tag, confirming it fell through to the `diag_meditative_aloofness`
  catch-all exactly as designed. Confirmed the results page and the public
  share page both render the correct `diagnosisDef.imagePath`-sourced image
  (R-CONTENT-5's direct FK read, not the old text-equality lookup).
  Confirmed the history API returns both attempts. Deleted the test cat —
  cascade-deleted both `QuizAttempt`/`Diagnosis` rows, confirmed by the
  second attempt's share link 404ing immediately after. `journalctl -u
  purrification` showed zero errors/warnings across the whole test window
  (excluding the pre-existing, unrelated bot-scanner noise on Next.js
  server actions documented in `vps-runbook.md`'s Phase 11 Execution log).
  Test data cleanup: the test cat and its history were deleted via the API
  (cascade delete verified as a side effect, as above); the throwaway test
  `User` row was left in place, consistent with every prior phase's smoke
  test (no delete-account endpoint exists).
