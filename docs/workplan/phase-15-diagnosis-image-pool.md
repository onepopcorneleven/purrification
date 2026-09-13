# Phase 15 — Diagnosis image pool (R-CONTENT-5 extension)

Extended notes for `docs/workplan.md`'s Phase 15 entry.

## Context

Approved and started 2026-09-12 ("start Phase 15"); independent of Phase 14
(doesn't need real content authored first). **Goal:** change Phase 13's
one-image-per-`DiagnosisDef` model (`imagePath String?`) to a one-to-many
pool of candidate images, so future content authoring can attach multiple
illustrations to a single diagnosis for visual variety, while keeping the
"one illustration shown per result" UX. The image shown for a given result
is picked randomly from its `DiagnosisDef`'s pool, but **stable per
`Diagnosis` row** — the same result shows the same image on every repeat
view and every viewing of its public share link — computed deterministically
from that row's id rather than stored on it (consistent with `imagePath`
already being live-joined content, not R-CONTENT-6 frozen output like
`diagnosisText`/`ritualText`; the one accepted tradeoff is that a result's
picked image can shift if its `DiagnosisDef`'s image pool is edited later,
the same live-content behavior `imagePath` already had).

## Execution notes

- Added a `DiagnosisDefImage` child table to `prisma/schema.prisma`
  (composite `@@id([diagnosisDefId, sortOrder])`, no independent
  `isActive`/lifecycle — same shape as the existing `DiagnosisDefTreatment`
  link table), with `DiagnosisDef.images DiagnosisDefImage[]`; removed
  `DiagnosisDef.imagePath`.
- Hand-wrote the migration in the same expand → backfill → contract,
  single-transaction style as Phase 13's `20260908130000_add_content_model`
  (cited in `CLAUDE.md`): create `DiagnosisDefImage`, backfill one row per
  existing non-null `imagePath` at `sortOrder 0`, then drop the old column.
  Applied via `npm run db:migrate` against the VPS DB.
- Updated the seed pipeline: `prisma/seed/content/diagnoses.json`'s
  `RawDiagnosisDef.image_path: string|null` became an optional
  `image_paths?: string[]`; `prisma/seed/index.ts`'s `upsertContent()`
  syncs each diagnosis's `DiagnosisDefImage` rows by delete-then-recreate
  per `diagnosisDefId` — these child rows have no identity of their own
  outside the array, unlike top-level content types, so this is a
  deliberate, documented exception to the seed pipeline's usual "upsert,
  never delete" rule.
- Added a `pickStableImage(images, seed)` helper to
  `src/lib/diagnosis/engine.ts` (alongside the existing
  `pickSymptomCallbacks`): a pure deterministic hash of a seed string (the
  `Diagnosis.id`) into an index into the ordered image list.
- Updated `src/app/results/[id]/page.tsx` and
  `src/app/share/[shareSlug]/page.tsx` to `include`/`select`
  `diagnosisDef.images` (ordered by `sortOrder`) instead of
  `diagnosisDef.imagePath`, and call `pickStableImage(...)` with the
  diagnosis's own id as the seed before passing the result into
  `DiagnosisCard` (unchanged — it still just takes one filename).
- Updated `docs/content/content-storage-architecture.md`'s schema mirror
  and R-CONTENT-5 description to describe the one-to-many table and the
  deterministic-per-result pick, replacing the single-FK description.

## Testable deliverables

- After migration + reseed, `DiagnosisDef.imagePath` no longer exists in
  the schema. **Correction to this deliverable's original premise:** it
  assumed all 10 pre-Phase-14 `DiagnosisDef` rows had a non-null
  `imagePath` that would backfill 1:1 into the new table. In fact (see
  Phase 17), Phase 14 replaced those 10 rows with 12 new, differently-id'd
  diagnoses that were seeded with no image assignment at all — so the 12
  *active* rows backfilled zero `DiagnosisDefImage` rows each, confirmed
  via a direct query post-migration. The backfill did correctly carry
  forward one `DiagnosisDefImage` row (`sortOrder 0`) for each of the **10
  retired (`isActive: false`) placeholder rows** that still had their
  original `imagePath` set — that's the migration working exactly as
  intended over all rows regardless of `isActive`, not a bug. Assigning
  images to the 12 active diagnoses was Phase 17's job, not this one.
- Verified via a real quiz submission against the VPS DB (throwaway signup
  → cat → quiz → `/results/[id]` → `/share/[shareSlug]`, all cleaned up
  after): both pages render 200 with the correct cat name/diagnosis/ritual
  text and no broken/missing image reference, confirming `pickStableImage`
  returning `undefined` for an empty pool is handled the same graceful way
  `DiagnosisCard` always handled a missing image. Could not verify the
  "shows an actual illustration, identical across reloads" half of this
  deliverable end-to-end, since no active diagnosis had any images yet
  (Phase 17) — that half was covered by the mechanism test below instead.
- Mechanism test (temporary, reverted): added a two-element `image_paths`
  to one diagnosis in `prisma/seed/content/diagnoses.json`, reseeded —
  confirmed exactly two `DiagnosisDefImage` rows (`sortOrder` 0/1) — then
  called `pickStableImage` directly with several seed strings, confirming
  the same seed always returns the same path and different seeds can
  return different paths. Reverted the JSON and reseeded again — confirmed
  the two rows collapsed back to zero (this diagnosis has no images in the
  committed content).
- `npm run build` and `npm run lint` both pass.

## Execution log — 2026-09-12

- Schema/migration: `prisma migrate diff` (live DB → target schema)
  produced byte-identical `CREATE TABLE`/`ADD CONSTRAINT` SQL to the
  hand-written migration (same cross-check approach as Phase 16's index
  migration), confirming the DDL was correct before applying. Applied via
  `npm run db:migrate` against the VPS DB; `prisma migrate status`
  confirmed clean afterward.
- Reseed (`npm run db:seed-content`) ran cleanly against the live DB — same
  pre-existing Phase 14 stale-placeholder warnings as every prior reseed,
  no new errors. Directly queried `DiagnosisDefImage` post-reseed: 0 rows
  for any of the 12 active diagnoses, 10 rows (one each, `sortOrder 0`) for
  the retired Phase-13 placeholder diagnoses — see the corrected
  testable-deliverable note above for why that's the correct outcome, not
  a bug.
- Mechanism test: temporarily added `image_paths` to one diagnosis,
  reseeded, verified two rows + deterministic `pickStableImage` behavior
  directly against the DB, then reverted and reseeded again to confirm
  cleanup — see deliverables above.
- Live functional check: real signup → add cat → submit quiz →
  `/results/[id]` → `/share/[shareSlug]`, run against a local production
  build pointed at the VPS DB (test user/cat deleted after, cascading to
  its quiz attempt/diagnosis). Both pages returned 200 with correct content
  and no broken image reference.
- `npm run build` and `npm run lint` both passed clean.
- Shipped via PR #27, merged to `main`. Deployed the same session via the
  standard step-12 repeat-deploy script (`git pull` → `npm ci` → `npm run
  build` → static-asset copy → `prisma migrate deploy` — reported "No
  pending migrations to apply", correctly a no-op since the migration was
  already applied directly during testing — → `db:seed-content` —
  idempotent re-confirmation, same pre-existing stale-placeholder warnings
  as every prior reseed — → `sudo systemctl restart purrification`). This
  closed a real window where production's DB schema (already migrated
  during testing, since dev/prod share one Postgres instance) had briefly
  outrun the still-running old code that queried the now-dropped
  `imagePath` column.
- Live verification: `systemctl status` showed `active (running)`
  immediately post-restart; `journalctl` since the restart showed a clean
  startup with no errors; `https://purrification.com/` returned `200`
  (following its `307` HTTP→HTTPS redirect).
