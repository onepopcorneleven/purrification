# Phase 16 — Content-model id integrity fix

Extended notes for `docs/workplan.md`'s Phase 16 entry. Full plan:
`board/content-id-integrity-fix.md` (gitignored, local planning board per
`board/README.md` — this file is a self-contained summary since that board
file doesn't travel with the repo). Implemented, deployed, and verified live
2026-09-12.

## The bug

Found post-Phase-14-deploy: 18 of the 20 live quiz questions rendered with
zero selectable answers — a user starting the quiz got stuck on question 1.

Root cause: `AnswerOption.id` is a *global* Prisma primary key, but
`prisma/seed/content/questions.json` authors every question's answers with
the same 5 short, question-local-looking ids (`a1`–`a5`) reused across all
20 questions. `prisma/seed/index.ts`'s upsert-by-id logic silently
overwrites the same 5 physical rows as the seed loop walks each question, so
only the *last* question to touch each id ends up owning it — the other 18
questions end up with zero related `AnswerOption` rows. Worse, the
surviving 5 rows' `AnswerOptionTagEffect` data was also corrupted: because
that join table is only ever upserted, never pruned, each surviving id had
accumulated a jumbled union of tag effects from every question that touched
it (confirmed live: id `a1` alone carried 17 tag-effect rows spanning nearly
the entire tag vocabulary).

The same investigation also found two independent, adjacent issues:
`prisma/seed/index.ts`'s `validate()` never checked id uniqueness for any
content class (so this shipped through validation cleanly), and **no
foreign-key column anywhere in the schema had a database index** (Postgres
doesn't auto-index the referencing side of an FK) — invisible at that row
count, a real query-performance risk once `Cat`/`QuizAttempt`/`Diagnosis`
accumulate real usage.

## The fix

Derived `AnswerOption`'s DB id from `` `${questionId}::${localId}` `` inside
the seed script (structural fix — global uniqueness by construction, not
author discipline), changed the `AnswerOptionTagEffect` sync from blind
upsert to delete-then-recreate per answer (closing the staleness risk for
good, not just this one incident — mirrors the same pattern Phase 15's
`DiagnosisDefImage` plan independently proposed), added a global
id-uniqueness check to `validate()` for every content class as
defense-in-depth, repaired the live data (deleted the 5 corrupted
`AnswerOption` rows and reseeded — safe, since `Diagnosis` has no FK into
`AnswerOption`, unlike its `Restrict`-protected FKs into
`DiagnosisDef`/`Treatment`/`Ritual`), and added the missing `@@index`
declarations via one new migration.

## Execution notes

- Confirmed the proposed solution with the user before starting — the
  board file's implementation instructions cover the exact sequence.
- `prisma/seed/index.ts`: derived `AnswerOption.id` as
  `${questionId}::${localId}`.
- `prisma/seed/index.ts`: synced `AnswerOptionTagEffect` by
  delete-then-recreate, not blind upsert.
- `prisma/seed/index.ts`: added per-content-class id-uniqueness checks to
  `validate()`.
- Repaired live data: deleted the 5 corrupted `AnswerOption` rows, reseeded.
- Added `@@index` for every unindexed FK column (see board file for the
  full list); hand-wrote and applied the migration.
- Updated `docs/content/content-storage-architecture.md` and `CLAUDE.md`
  with the id-uniqueness-by-construction and delete-then-recreate rules as
  standing decisions.
- Full 20-question quiz walk confirmed every question has selectable
  answers; multi-path `getDiagnosis` smoke test (distinct answer
  combinations, not the single-path shortcut that missed this the first
  time) confirmed correct tag totals and results.

## Execution log — 2026-09-12

- Implemented and unit-verified locally: negative test (temporarily
  reintroduced duplicate question/answer ids) confirmed the new
  `validate()` checks throw with clear messages before any DB write; real
  content reseeded cleanly with the fixed pipeline.
- Data repair applied directly against the live DB (via the standard SSH
  tunnel): all 85 answers recreated under derived ids, verified 0
  mismatches between each answer's DB tag effects and its source JSON; the
  5 legacy corrupted rows (`a1`–`a5`) confirmed referenced by zero
  historical `QuizAttempt` rows, then deleted.
- Index migration applied and cross-checked: `prisma migrate diff` against
  the schema change produced byte-identical `CREATE INDEX` statements to
  the hand-written migration; all 10 expected indexes confirmed present via
  `pg_indexes` post-apply.
- Shipped via PR #24, merged to `main`; deployed through the standard
  step-12 pipeline (build, `prisma migrate deploy` — index migration
  already applied, correctly reported as a no-op — `npm run db:seed-content`
  — idempotent re-confirmation, correctly reported as a no-op beyond the
  expected pre-existing Phase 14 stale-placeholder warnings — then
  `systemctl restart`).
- Live verification: `journalctl` clean post-restart; homepage/`/login`
  respond correctly; a real signup → add cat → fetch quiz page walk (via
  authenticated curl, then cleaned up — test cat deleted after) confirmed
  all 20 questions render their correct answer count (4 or 5, matching the
  source content exactly) in the live rendered page, with derived ids
  (`q_0NN::aN`) visible in the payload — not just the first question this
  time. Multi-path `getDiagnosis` smoke test (4 distinct answer-index
  combinations, not the flawed single-path shortcut that missed this bug
  originally) produced correct, varying results with no totality-guard
  errors.
