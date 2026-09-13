# Phase 17 — Diagnosis image gap (Phase 14 regression)

Extended notes for `docs/workplan.md`'s Phase 17 entry.

## Context

Found during a status review on 2026-09-12; approved and implemented the
same day ("phase 17 approved. go and implement"). Independent of Phase 15
and Phase 16, both already shipped by the time this started, so images were
authored directly into Phase 15's `DiagnosisDefImage` pool (`image_paths`),
not the earlier single-`imagePath` shape.

**The gap:** all 12 live `DiagnosisDef` rows (Phase 14's real content bank)
had `imagePath = null`. `prisma/seed/content/diagnoses.json`'s 12 entries
carried no `image_path` field at all — Phase 14's rewrite of the content
bank replaced the old 10 placeholder diagnoses' ids, names, and text but
never carried over image assignments to the new ones. Meanwhile the
visual-richness pass's 10 illustrations still sat in
`public/images/diagnoses/` (`ceremonial-fast.png`, `chaos-spirit-box.png`,
`houseguest-aura.png`, `meditative-aloofness.png`, `mercury-retrograde.png`,
`moon-phase-whiskers.png`, `static-corner.png`, `sunbeam-schedule.png`,
`three-am-zoomies.png`, `vacuum-residue.png`) — orphaned, since they were
matched to the old placeholder diagnoses' text via the now-deleted
`getDiagnosisImage()` text-equality lookup and had no relationship to the
new 12 diagnoses' ids or content.

Not a crash: `DiagnosisCard`'s `image` prop is optional, and the component
renders correctly (just without an illustration) when `imagePath` is null.
But it was a live regression from Phase 13's shipped behavior — every
result page (`/results/[id]`) and every public share page
(`/share/[shareSlug]`) rendered with no diagnosis illustration, silently,
for every user.

**Relationship to Phase 15:** an independent problem. Phase 15 (one-to-many
image pool) changed the schema shape but didn't by itself supply any
`image_path`s — a diagnosis with an empty pool renders the same as one with
`imagePath: null`. Whichever phase actually authored new image(s) needed to
decide what to do with the 10 orphaned files, since none of the new
diagnosis identities map onto them 1:1.

## Execution notes

- Decided the disposition of the 10 orphaned files in
  `public/images/diagnoses/` per new diagnosis: **regenerated** — none of
  the 12 new diagnoses' themes mapped closely enough onto the 10 old
  placeholder themes (mercury retrograde, vacuum residue, etc.) to justify
  reuse, so all 12 got new, purpose-matched illustrations instead. The 10
  old files were **retired in place, not deleted**: a direct query found 22
  real historical `Diagnosis` rows still referencing the old, retired
  `DiagnosisDef` ids (pre-Phase-14 usage), so deleting those files would
  have broken their `/results`/`/share` pages' images.
- Sequencing against Phase 15: **moot by the time this started** — Phase 15
  had already shipped, so images were authored directly into `image_paths`
  (plural), no intermediate single-`imagePath` step needed.
- Generated all 12 images via `codex exec` (per this project's memory on
  image generation), one per diagnosis, following the brand doc's reusable
  prompt template (§6) — same painterly tarot-card style,
  jewel-tone-and-gold palette, 4:5 portrait aspect ratio (1122×1402,
  matching the existing 10 exactly) as the original visual-richness pass.
  Each `[SUBJECT]` was written to match its diagnosis's specific
  description (e.g. `separation-static.png`: a cat watching a dissolving
  hooded figure through a closing door; `equilibrium.png`, the catch-all: a
  cat resting calm and undisturbed in candlelight — deliberately the one
  non-distressed image in the set).
- Authored `image_paths: [<filename>.png]` for all 12 diagnoses in
  `prisma/seed/content/diagnoses.json` via targeted per-entry edits (not a
  full-file rewrite, which would have reformatted the whole file's JSON and
  produced a huge noisy diff) — a clean 12-line diff.
- Reseeded (`npm run db:seed-content`) against the live VPS DB and verified
  via a direct query: all 12 active `DiagnosisDef` rows now have exactly
  one `DiagnosisDefImage` row.
- Confirmed live: a real signup → cat → quiz flow run three times
  (different answer sets) produced two distinct diagnoses
  (`diag_boundary_erosion`, `diag_equilibrium`); both `/results/[id]` and
  `/share/[shareSlug]` rendered the correct, diagnosis-specific image
  (confirmed by inspecting the rendered `next/image` URL, and by fetching
  the underlying file directly for a `200`); test data cleaned up after.
- The 10 old files were **kept, not removed** — see the disposition bullet
  above; they are not dead weight, they're still live for anyone viewing a
  pre-Phase-14 historical result.

## Testable deliverables

- Every active `DiagnosisDef` row has at least one image reference —
  confirmed via direct query (12/12).
- No result or share page renders without an illustration — confirmed for
  two distinct diagnoses via a live functional check; every other active
  diagnosis has exactly one image in its pool by construction (same
  seed-pipeline code path), so this generalizes without needing to
  individually click through all 12.
- `npm run build` and `npm run lint` both pass.

## Execution log — 2026-09-12

- Generated 12 images (~2.2–3.0MB PNG each, all 1122×1402) via `codex exec`
  — the documented `codex image generate` skill command still doesn't exist
  in this environment (per the standing memory on this); each image was
  produced by codex's agentic `image_gen` tool, then copied out of
  `~/.codex/generated_images/<session>/` into `public/images/diagnoses/`
  since codex's own sandboxed shell still can't write inside the repo here.
- `prisma/seed/content/diagnoses.json` diff: exactly 12 lines added (one
  `image_paths` array per diagnosis), no reformatting.
- Reseed ran clean against the live DB — same pre-existing Phase 14
  stale-placeholder warnings as every prior reseed, no new errors.
- `npm run build`/`npm run lint` both passed clean.
- Live check: confirmed 22 historical `Diagnosis` rows still reference the
  10 retired placeholder `DiagnosisDef`s, which is why those old image
  files were kept rather than deleted.
- Shipped via PR, merged to `main`. The content reseed was already applied
  directly against the shared VPS DB during testing (dev/prod share one
  Postgres instance, per `CLAUDE.md`) — unlike Phase 15, this is pure
  content data with no schema change, and the `results`/`share` pages'
  live, uncached per-request query (not the cached `getDiagnosis` content
  graph) means the new images were already visible in production before
  any deploy. Deployed anyway via the standard step-12 pipeline for
  consistency, confirmed `active (running)` with clean logs post-restart.
