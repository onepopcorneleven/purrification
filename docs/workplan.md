# Purrification — Workplan

Sequenced build plan derived from `docs/product-brief.md`, `docs/requirements.md`,
`docs/architecture.md`, and `docs/vps-runbook.md`. Phases are ordered by
dependency (each assumes the previous phases are done); within a phase, tasks
can generally happen in any order. Requirement IDs are referenced for
traceability back to `requirements.md`.

## How to use this file

This file is the **index**: for each phase it gives a one-line status, at
most a sentence or two of context, and a checklist of tasks in *short* form
(what was done, not how it was verified, what broke, or how it was
deployed). Keep entries short even when a phase turns out to be
complicated — that complexity belongs in a side file, not here.

- **Extended material goes in `docs/workplan/phase-<NN>-<slug>.md`** — one
  file per phase that needs it (`<NN>` zero-padded to two digits, `<slug>`
  matching the phase title). That's where execution logs, verification
  narratives, incident write-ups, deploy call-outs, and "why X over Y"
  reasoning belong. A phase with nothing beyond its short checklist doesn't
  need a side file (see Phases 0–7 and 20 below).
- **Link it from the phase heading in this file**: add a line
  `Full details: docs/workplan/phase-<NN>-<slug>.md` right under the
  heading (or its one-line context sentence) once a side file exists for
  that phase.
- **When you finish a task**, update the checklist line here to `[x]` with
  a short clause — not a paragraph. If there's anything worth recording
  about *how* it went (what was investigated, what broke, how it was
  verified, deploy specifics), put that in the phase's side file, creating
  it under `docs/workplan/` if it doesn't exist yet (copy the shape of an
  existing one).
- **Keep "Current status" below up to date.** It's the first thing a new
  agent should read to know what's live, what's mid-flight, and what's
  proposed-but-not-yet-approved. Update it whenever a phase starts or
  finishes.
- Don't let this file's per-phase entries creep back into narrative — if
  you're about to write more than a clause per checklist item, that
  sentence belongs in the side file instead.

## Current status

All of Phases 0–29 are **done and live in production** at
`purrification.com`. Phase 28 (below) closed out the three follow-ups this
section used to track — the tone/content review, the multi-path diagnosis
smoke test, and the Phase 23 retired-`Treatment`-image backfill. Phase 29
shortened the quiz from 20 to 10 questions (content/seed only). Both
shipped in one deploy on 2026-09-21 (PRs #41 and #42): the seed retired the
12 dropped questions, the service restarted right after, and the 10 new
treatment PNGs from Phase 28 now serve 200, so the ~22 affected historical
results have their images. Confirmed live: 10 active questions (2 per
topic), the live quiz page ships exactly the 10 new question ids and none
of the retired ones, and `npm run smoke-test-diagnoses` reaches all 12
diagnoses. **The one open item is owner-only:** click through the shorter
quiz once in a real browser (no headless browser exists in the sandbox) —
see Phase 29 below.

Phase 20's `/allimages` debug gallery is temporary and unlinked. Phase 21
mistakenly deleted it on its own initiative reading that as license to do
so; it was restored per the owner's correction (see Phase 20's entry
below) and stays in place until the owner explicitly asks for its
removal.

See `CLAUDE.md`'s "Current state" section for the fuller architectural
summary of what's shipped.

## Phase 0 — Project scaffolding — done
- [x] Init Next.js (TypeScript, App Router) project per `architecture.md`.
- [x] Set up Prisma and point it at Postgres (Prisma chosen over Drizzle —
      see "Resolved decisions" below).
- [x] Add basic project tooling: linter, formatter, `.env.example`.
- [x] Update root `CLAUDE.md`'s "Current state" section.

## Phase 1 — Data layer (R-DATA-1, R-DATA-2) — done
- [x] Write the Prisma schema: `User`, `Cat`, `QuizAttempt`, `Diagnosis`.
- [x] Generate and run the first migration, applied against the VPS's
      Postgres instance over an SSH tunnel (see `CLAUDE.md`'s "Current
      state" for why this project has no separate local dev Postgres).
- [x] Add typed data-access helpers (`src/lib/db/client.ts`).

## Phase 2 — Auth (R-AUTH-1, R-AUTH-2, R-AUTH-3, R-AUTH-4) — done
- [x] Password hashing/verification helper (`src/lib/auth/password.ts`,
      bcryptjs).
- [x] `POST /api/signup`, `/api/login`, `/api/logout` routes.
- [x] Stateless HMAC-signed cookie session issuance
      (`src/lib/auth/session.ts`).
- [x] Signup and login pages/forms.
- [x] Auth guard for protected routes/pages (`src/lib/auth/guard.ts`).
- [x] No "forgot password" UI — confirmed no dead link exists (R-AUTH-4).

## Phase 3 — Cat management (R-CAT-1..5) — done
- [x] `POST/GET /api/cats`, `PATCH/DELETE /api/cats/:id` — delete cascades
      to that cat's history; all routes guarded and ownership-checked.
- [x] "Add a cat" form (name + optional, display-only traits).
- [x] Cat list/dashboard view with a delete confirmation step.

## Phase 4 — Quiz content & flow (R-QUIZ-1..3) — done
Built together with Phase 5 in one pass (not sequentially), since
`POST /api/cats/:id/quiz` only exists once and must always produce both a
`QuizAttempt` and its `Diagnosis` (R-DIAG-5).
- [x] Author the quiz question bank as seed/config data (superseded by
      Phase 13's DB-backed content model).
- [x] Quiz UI: multi-step multiple-choice flow for a selected cat.
- [x] `POST /api/cats/:id/quiz` to record a `QuizAttempt`.

## Phase 5 — Diagnosis engine & content pool (R-DIAG-1..5, R-TONE-1, R-TONE-2) — done
Content pool and hash-based engine both superseded by Phase 13's DB-backed
rule engine; the atomic-transaction and share-page shape below are still
current.
- [x] Author the diagnosis/ritual content pool (superseded by Phase 13/14).
- [x] Implement `getDiagnosis(answers)` as a total function (later rewritten
      in Phase 13).
- [x] Wire `POST /api/cats/:id/quiz` to create `QuizAttempt` + `Diagnosis`
      atomically, with a generated `shareSlug`.
- [x] Build the logged-in result page (`results/[id]`).
- [x] Build the public, unauthenticated share page (`share/[shareSlug]`).

## Phase 6 — History & dashboard (R-HIST-1, R-HIST-2) — done
- [x] `GET /api/cats/:id/history` route.
- [x] Per-cat history view listing past diagnoses chronologically.

## Phase 7 — Landing page (R-LAND-1) — done
- [x] Marketing/landing page for signed-out visitors, linking into signup;
      signed-in visitors redirect to `/cats`.

## Phase 8 — VPS provisioning (R-INFRA-1, R-INFRA-2, R-INFRA-4) — done
Full details: `docs/workplan/phase-08-vps-provisioning.md`
- [x] Execute `vps-runbook.md` steps 1–10 (SSH hardening, firewall,
      fail2ban, automatic updates, Node/Postgres/Nginx, TLS).
- [x] Confirm Nginx rate limiting on `/api/login`/`/api/signup` is
      configured.
- [x] Run through the runbook's verification checklist.
- [x] Provision the production Postgres database and store its connection
      string in `.env.production` on the server.

## Phase 9 — Deploy pipeline & launch (R-INFRA-3) — done
Full details: `docs/workplan/phase-09-deploy-pipeline-launch.md`
- [x] Stand up the systemd service on the VPS per the runbook.
- [x] Wire the first-deploy and repeat-deploy scripts from
      `vps-runbook.md` step 12.
- [x] Do a full first deploy: build, migrate, restart, verify over HTTPS.
- [x] Confirm the Nginx rate limit is actually enforced live.
- [x] Smoke-test the golden path end-to-end in production.

## Phase 10 — Design system & UI implementation (R-LAND-1, R-TONE-1, R-TONE-2) — done
Full details: `docs/workplan/phase-10-design-system.md`
Retrofits a real, flexible visual design onto the functional layer from
Phases 2–7. `docs/design/purrification-brand-guidelines.md` (dark-only,
jewel-tone-and-gold identity) supersedes `design-system.md`'s open
palette/type questions.
- [x] Reconcile `design-system.md` against the brand guidelines/tokens.
- [x] Set up Tailwind CSS v4 and port design tokens into a `@theme` block.
- [x] Load the three brand fonts via `next/font/google`.
- [x] Logo design pass (hand-authored SVG mark, favicon, lockup).
- [x] Build shared primitives (`PageShell`, `Button`, `Card`, `Field`,
      `EmptyState`).
- [x] Add a `Modal`/`Dialog` primitive; use it for cat-deletion confirmation.
- [x] Add a toast/notification primitive.
- [x] Build `DiagnosisCard`, wired into both `results/[id]` and
      `share/[shareSlug]`.
- [x] Confirm/regenerate the landing-page header image against the brand
      prompt template.
- [x] Retrofit every existing page onto the new primitives/tokens.
- [x] Responsive pass (375/768/1280px) and an accessibility/contrast pass.
- [x] Visual QA across every route (functional verification only — no
      headless browser available in this sandbox; see `CLAUDE.md`).
- [x] Lint/format clean; deploy via the Phase 9 pipeline.

## Phase 11 — Hardening pass / polish — done
Full details: `docs/workplan/phase-11-hardening-pass.md`
- [x] Review the Nginx rate-limit values against real traffic — investigated,
      left unchanged (not enough real traffic yet to tune against).
- [x] Add a nightly `pg_dump` backup job (`scripts/backup-db.sh`).
- [x] Review all shipped diagnosis/ritual content against R-TONE-1/R-TONE-2.

## Phase 12 — Visual richness pass (design upgrade round 2) — done
Full details: `docs/workplan/phase-12-visual-richness-pass.md`
Full plan: `docs/design-upgrade-round-2.md`. No change to brand
palette/type/tokens — uses the existing identity more fully.
- [x] WP1 — Atmosphere: background vignette/texture/fog, engraved-frame
      language for `PageShell`/shared surfaces.
- [x] WP2 — Imagery: one illustration per diagnosis archetype, the
      completion seal wired in, imagery for signup/login/dashboard/empty
      states.
- [x] WP3 — Theatrical component detail: tarot-card quiz options, a
      glowing-candle `Toast`, `Card`'s double-border treatment, a history
      timeline.
- [x] WP4 — Motion & rhythm: wider landing-page layout, staggered
      entrances, loading/hover/press states, a `prefers-reduced-motion`
      audit.

## Phase 13 — Content storage foundation (R-CONTENT-1..6, R-DATA-1, R-DATA-2) — done
Full details: `docs/workplan/phase-13-content-storage-foundation.md`
Full spec: `docs/content/content-storage-architecture.md`. Pure
storage/engine plumbing: moved quiz/diagnosis content from static
`src/content/*.ts` files into PostgreSQL (`Tag`/`Question`/`DiagnosisDef`/
`Treatment`/`Ritual`), migrating the then-existing 5 questions/10 diagnoses
in as placeholder content so live behavior was unchanged. Deployed and
verified live 2026-09-09.
- [x] Add the content-model tables to `prisma/schema.prisma`.
- [x] Amend `Diagnosis` with FKs into the new content tables + frozen
      rendered-output fields.
- [x] Generate and run the migration (expand → backfill → contract) against
      the VPS DB.
- [x] Build the seed pipeline (`prisma/seed/content/*.json`,
      `npm run db:seed-content`) with authoring-rule validations.
- [x] Migrate the existing 5 questions/10 diagnoses into seed JSON as
      placeholder content.
- [x] Rewrite `getDiagnosis` to the DB-backed rule engine
      (`src/lib/diagnosis/engine.ts` + `getDiagnosis.ts`).
- [x] Replace `getDiagnosisImage`'s text lookup with a direct FK read.
- [x] Update quiz route/UI to read `Question`/`AnswerOption` from the DB.
- [x] Add the boot-time totality guard (an active catch-all `DiagnosisDef`
      exists).
- [x] Delete `src/content/quiz.ts` and `src/content/diagnoses.ts`.
- [x] Update `CLAUDE.md`/`architecture.md` to describe the shipped schema.
- [x] Full golden-path smoke test in production.

## Phase 14 — Rich content authoring pass — done
Full details: `docs/workplan/phase-14-rich-content-authoring.md`
The editorial content-design work `docs/content/content-framework.md` was
written to drive. Authored outside the repo, validated, committed, deployed
live 2026-09-09: 17 tags, 5 topics, 20 questions/85 answers, 10 treatments,
12 diagnoses (11 pattern-based + 1 catch-all), 19 rituals. The Phase 13
placeholder content was retired via `isActive: false`, never deleted (real
`Diagnosis` rows reference it via `Restrict` FKs).
- [x] Define the canonical tag vocabulary up front.
- [x] Author the full question bank with real tag effects per answer.
- [x] Author `DiagnosisDef` entries with real trigger rules.
- [x] Author `Treatment` entries with real, evaluable contraindications.
- [x] Author `Ritual` variants selected by severity band.
- [x] Full tone/content review of every new entry against
      R-TONE-1/R-TONE-2 — done in Phase 28.
- [x] Re-run `npm run db:seed-content` and re-verify seed-time invariants
      at real scale.
- [x] Golden-path smoke test through `getDiagnosis` against live data.
      Multi-path coverage across all 12 diagnoses — done in Phase 28.

## Phase 15 — Diagnosis image pool (R-CONTENT-5 extension) — done
Full details: `docs/workplan/phase-15-diagnosis-image-pool.md`
Changed Phase 13's one-image-per-`DiagnosisDef` model to a one-to-many pool
(`DiagnosisDefImage`), picked deterministically per `Diagnosis` row
(`pickStableImage`, `src/lib/diagnosis/engine.ts`) so a result shows the
same image on every reload and its share link.
- [x] Add `DiagnosisDefImage` child table; remove `DiagnosisDef.imagePath`.
- [x] Hand-write the expand → backfill → contract migration; apply to the
      VPS DB.
- [x] Update the seed pipeline to sync `DiagnosisDefImage` rows by
      delete-then-recreate.
- [x] Add `pickStableImage(images, seed)` to `engine.ts`.
- [x] Update `results/[id]`/`share/[shareSlug]` to select the image pool
      and call `pickStableImage`.
- [x] Update `content-storage-architecture.md`'s schema mirror.

## Phase 16 — Content-model id integrity fix — done
Full details: `docs/workplan/phase-16-content-id-integrity-fix.md`
**Bug found post-Phase-14-deploy:** 18 of 20 live quiz questions had zero
selectable answers, because `AnswerOption.id` reused short ids (`a1`–`a5`)
across all 20 questions and the seed script's upsert-by-id logic silently
collapsed them onto 5 physical rows. Fixed, repaired live data, deployed,
verified 2026-09-12.
- [x] Derive `AnswerOption.id` as `${questionId}::${localId}`.
- [x] Sync `AnswerOptionTagEffect` by delete-then-recreate, not upsert.
- [x] Add per-content-class id-uniqueness checks to `validate()`.
- [x] Repair live data: delete the 5 corrupted rows, reseed.
- [x] Add `@@index` for every unindexed FK column; apply the migration.
- [x] Update `content-storage-architecture.md`/`CLAUDE.md` with the new
      standing rules.
- [x] Full 20-question quiz walk + multi-path `getDiagnosis` smoke test.

## Phase 17 — Diagnosis image gap (Phase 14 regression) — done
Full details: `docs/workplan/phase-17-diagnosis-image-gap.md`
**The gap:** Phase 14's 12 real diagnoses all had `imagePath = null` —
Phase 14 never carried image assignments over from the old placeholder
content, leaving every result/share page without an illustration.
- [x] Decide disposition of the 10 orphaned placeholder images: kept
      in place (22 historical `Diagnosis` rows still reference them),
      not reused for the new diagnoses.
- [x] Generate 12 new illustrations via `codex exec`, one per diagnosis,
      per the brand doc's prompt template.
- [x] Author `image_paths` for all 12 diagnoses in
      `prisma/seed/content/diagnoses.json`.
- [x] Reseed against the live DB; verify all 12 active diagnoses have an
      image.
- [x] Confirm live via a real quiz flow that result/share pages render the
      correct image.

## Phase 18 — Quiz confirm-and-divine interaction — done
Full details: `docs/workplan/phase-18-quiz-confirm-and-divine.md`
Requested and implemented 2026-09-12. Replaced the select-then-click-"Next"
quiz flow with a two-click confirm gesture per option, followed by a themed
"divining" transition before the next question, and a longer "spiritual
reception" variant on the last question that gates the real diagnosis
request. Back is unchanged.
- [x] Add a `confirmed` selection state and wire the two-click gesture.
- [x] Add the `confirmed` visual state to the option card.
- [x] Build the mid-quiz divining transition overlay.
- [x] Build the longer final "spiritual reception" moment, gating
      navigation on both its animation and the real request.
- [x] Add `prefers-reduced-motion` handling for both new animations.
- [x] Add the two new duration tokens (`divination`/`divinationFinal`).
- [x] Update `design-system.md`'s `QuizFlow` description.
- [x] Post-deploy fix: the confirm click was silently dropped (radio
      `onChange` doesn't fire on a second click of an already-checked
      option) — moved the handler to the input's `onClick`.
- [x] Tuning: shortened the mid-quiz divining pause from 3000ms to 2000ms
      per user feedback; the final moment's 5000ms is unchanged.

## Phase 19 — Quiz answer-order randomization (anti-catch-all bias fix) — done
Full details: `docs/workplan/phase-19-quiz-answer-shuffle.md`
Requested and implemented 2026-09-12. Careless test-clicking overwhelmingly
produced the catch-all diagnosis (~56% vs. an ~18% simulated true-random
rate) because answer options render in a fixed order and several questions
place their most dismissive option at a consistent index. Fixed by
randomizing nominal (non-`SCALE`) answer-option display order per page
load, rather than touching trigger-rule content/thresholds.
- [x] Add `shuffleAnswerOptions(inputType, options)`
      (`src/lib/quiz/shuffleAnswerOptions.ts`), excluding ordinal
      (`SCALE`) question types.
- [x] Wire it into the quiz page's option list before handing it to
      `QuizFlow`.
- [x] Confirm a full quiz submission still produces a correct diagnosis.

## Phase 20 — `/allimages` debug gallery — done
Requested 2026-09-12: a temporary, unlinked debugging page
(`src/app/allimages/`) listing every image under
`public/images/diagnoses/*.png` in a phone-optimized lightbox viewer, for
visually spot-checking the Phase 17 illustration set without a working
headless browser in this sandbox. Reads the filesystem at request time (not
gated by auth or `isActive` content flags), so it also shows the 10 retired
placeholder images. Originally described here as "meant to be deleted"
once its one-time manual image review was done, since it isn't part of the
product.
- [x] Build the gallery page + lightbox component.
- [x] Verify via `npm run build`/`npm start` that it renders all current
      images (no headless-browser visual check possible in this sandbox).

**Correction, 2026-09-13:** Phase 21 read the "meant to be deleted" line
above as authorization and deleted `src/app/allimages/` on its own
initiative, without being asked. That was wrong — the owner never
instructed its removal and was never asked whether it should go. "Meant to
be deleted [eventually]" describes this page's eventual, owner-decided
disposition, not a standing green light for an agent to delete it
unprompted just because it's labeled temporary/throwaway/debug. Restored
in full (`src/app/allimages/page.tsx` + `ImageGallery.tsx`, byte-for-byte
from before the Phase 21 deletion) and redeployed. **Standing rule: this
page stays exactly as it is, unlinked and untouched, until the owner
explicitly instructs its removal — no future session should delete or
modify it on its own judgment, regardless of how "temporary" or
"superseded" it may look.**

## Phase 21 — Image enrichment: responsive previews & click-to-expand — done (partial scope)
Implemented 2026-09-13. Full details: `docs/workplan/phase-21-image-enrichment.md`
(**revised 2026-09-13** after a pre-implementation review found the
original `ClickableImage` design would fight the existing codebase — see
that doc's "Revision history" section).

Every image on the site today renders at full source resolution (no
`sizes` prop anywhere, diagnosis PNGs are ~2.2–3.0MB shown as small as
96px) with no way to view it larger, and only `DiagnosisDef` has any image
support at all. This phase adds a shared preview-sizing + click-to-expand
pattern site-wide and extends image support to `Treatment` (as an image
pool, mirroring `DiagnosisDefImage`) and `QuestionTopic` (a single image).
Schema/pipeline/UI plumbing only — real image authoring is a deliberate,
separate follow-up phase, mirroring the Phase 15 → Phase 17 precedent.
- [x] Add a `TreatmentImage` pool table (mirrors `DiagnosisDefImage`) and
      a `QuestionTopic.imagePath` scalar column; hand-write the (purely
      additive) migration. Cross-checked with `prisma migrate diff`
      (live DB → schema) before applying; applied cleanly.
- [x] Update the seed pipeline: `image_paths`/`image_path` fields on
      `treatments.json`/`topics.json`, delete-then-recreate sync for
      `TreatmentImage`. Reseeded live — clean, only the already-known
      Phase 13 placeholder-retirement stale-id warnings.
- [x] Add `sharp` as an explicit dependency (was only an implicit
      transitive one via `next`).
- [x] Build a shared `Lightbox` (full-bleed click-to-expand viewer) and
      `Expandable` (`src/components/ui/`) — `Expandable` is a
      children-based overlay wrapper, not a props-forwarding `Image`
      replacement: it renders the host's existing, untouched image markup
      as `children` and layers a transparent, labeled overlay button on
      top to open `Lightbox`, so no site's existing `<Image>` props/CSS
      (e.g. `DiagnosisCard`'s gold double border) had to change.
- [x] Retrofit every existing image (landing/login/signup/dashboard
      heroes, `EmptyState`, `DiagnosisCard`): added a real, tuned `sizes`
      value directly to its existing `<Image>` call, and wrapped its
      existing markup in `<Expandable>`. `DiagnosisCard`'s CSS module
      split `.illustration` into `.illustrationFrame` (the new grid-item
      wrapper — layout/box rules) + `.illustration` (just `object-fit` on
      the `<Image>` itself), since `object-fit`/grid-item sizing can't
      live on `Expandable`'s wrapper without knowing the host's box model.
      The homepage hero's deprecated-in-this-Next.js-version `priority`
      prop is now `preload`.
- [ ] **Not done — deferred, not silently dropped.** Wiring the two new
      content types' images into pages: implementation found that neither
      `Treatment` nor `QuestionTopic` content is rendered *anywhere* on
      `results`/`share`/quiz pages today (only the frozen `diagnosisText`/
      `ritualText` strings are shown) — so there is no existing UI to
      attach either image to, not just Topic as the phase doc originally
      flagged. Inventing new visible UI sections for this wasn't part of
      what was asked, so it was left for a follow-up decision rather than
      guessed at. Schema/seed-pipeline support for both is fully in place
      and ships images gracefully (`Treatment.images`/
      `QuestionTopic.imagePath` both null/empty for every row right now)
      whenever that follow-up happens.
- [x] ~~Delete the now-fully-superseded `/allimages` debug page (Phase
      20).~~ **Reverted 2026-09-13 — this was done without being asked; see
      Phase 20's entry above.** The page was restored and must stay in
      place until the owner explicitly instructs otherwise.
- [x] Update `content-storage-architecture.md`, `design-system.md` for the
      new fields/components; `CLAUDE.md`'s Current-state summary.
- [x] Verify: `npm run build`/`npm run lint` clean (scoped lint check —
      six pre-existing, unrelated stale worktrees under
      `.claude/worktrees/` with their own uncommitted `.next` build output
      make a bare `npm run lint` report ~30k unrelated problems; not
      touched, out of scope for this phase); the optimizer serves visibly
      reduced byte sizes for small render contexts — measured directly via
      `/_next/image?...&w=96` against `empty-vessel.png`: 4,866 bytes vs.
      the 2,282,716-byte raw source, a ~469x reduction; zero-image
      Treatments/Topics render with no broken image (schema ships
      null/empty everywhere this phase); `sharp` installs as a direct
      dependency; migration applied and content reseeded cleanly against
      the live VPS DB; deployed and verified live.

## Phase 22 — Treatment/Topic image authoring, and UI wiring — done
Full details: `docs/workplan/phase-22-treatment-topic-image-authoring.md`
Requested 2026-09-13, in two steps: first scoped to "author image creation
only" (the Phase 21 → follow-up this project's docs already flagged:
generate real illustrations for the 10 `Treatment`/5 `QuestionTopic`
entries Phase 21 shipped with empty image pools), then extended mid-task
to also design and wire up display UI for both — explicitly authorized by
the user ("implement a UI wiring afterwords according to your
preferences... go full automode"), which is what actually makes the new
images visible anywhere (Phase 21 had left both content types unrendered
on every page).
- [x] Generate 10 Treatment + 5 Topic illustrations via `codex exec`, same
      brand-doc prompt template and 4:5 aspect ratio as every prior
      illustration pass.
- [x] Author `image_paths`/`image_path` into
      `prisma/seed/content/treatments.json`/`topics.json` via clean,
      targeted per-entry diffs.
- [x] Reseed against the live VPS DB; verify all 10 Treatments/5 Topics
      have an image.
- [x] Add a `treatmentImage` prop to `DiagnosisCard`, wired through
      `results/[id]` and `share/[shareSlug]`, showing a small companion
      illustration for the linked `Treatment` beside the ritual text.
- [x] Add a `topicImage` field to `QuizFlow`'s per-question shape, wired
      through `quiz/page.tsx`, showing each question's topic illustration
      above its prompt — purely additive, no changes to the Phase 18/19
      confirm/divine interaction logic.
- [x] Full golden-path functional smoke test against a real production
      build (signup → cat → quiz → results → share), confirming both new
      image types render with the correct file per page.
- [x] `npm run build` clean; scoped lint/prettier clean on every changed
      file.
- [x] Merging the PR and running the live VPS deploy
      (`purrification-deploy` restart): left for the user to trigger
      manually (blocked from an agent turn by this harness's own
      "Production Deploy" safety classifier) — since done. Verified
      2026-09-13: the VPS checkout is at commit `4dbe557` with a same-day
      build, the systemd service is running it, and the live site serves
      both new image types (confirmed via the quiz page's `topicImage`
      data and direct `/images/treatments/`, `/images/topics/` fetches).

## Phase 23 — Image & Results Experience Redesign — done
Full details: `docs/workplan/phase-23-image-experience-redesign.md`

Requested 2026-09-13 as a from-scratch look-and-feel pass (explicitly
ignoring current implementation), worked out and iterated with the user as
a published design canvas, then accepted. This document translates that
accepted design into a technical plan. A same-day gap review found and
closed 7 open implementation questions the first pass had left implicit
(shared ownership-check loaders for the new sub-routes, the public share
route's field-selection widening, which name field to display, on-demand
vs. eager data fetching for the history quick view, `FramedImage`'s
decorative-layer hit-target safety, per-call-site image sizing, and
backfilling `design-tokens.json`'s missing motion-pattern entries) — see
the side doc's "Resolved (gap review, 2026-09-13)" notes. Before
implementation began, a pre-coding review surfaced one further, real gap
neither prior pass had caught (see "Known follow-up" below) — resolved with
the user's explicit direction before writing any code.
- [x] Split `/results/[id]` and `/share/[shareSlug]` into a three-tier
      structure: an overview (both diagnosis + treatment summarized) plus
      a `/diagnosis` and `/treatment` full-view sub-route each, all
      routing through new shared `getOwnedDiagnosis`/`getSharedDiagnosis`
      loaders (`src/lib/diagnosis/loadOwnedDiagnosis.ts`/
      `loadSharedDiagnosis.ts`).
- [x] Build a shared `FramedImage` primitive (portal / tarot / medallion-sm
      / medallion-lg variants, `src/components/ui/FramedImage.tsx`) and
      retire `DiagnosisCard`'s combined rendering (deleted) in favor of new
      `ReadingOverview`/`DiagnosisReveal`/`TreatmentReveal` components
      (`src/components/diagnosis/`).
- [x] Retrofit the quiz's topic image from a 112×112 thumbnail to the
      large "Portal" frame treatment (`QuizFlow.tsx`).
- [x] Give the per-cat history list its own condensed `Modal`-based quick
      view (`ReadingQuickView`, combined diagnosis+treatment summary),
      distinct from the overview, fetching on demand from the new
      `GET /api/diagnoses/[id]/quick-view`, with a "View full reading" link
      into `/results/[id]`.
- [x] Fix `Lightbox`'s missing-exit bug (a real, thumb-reachable "Close"
      bar, plus a drag-handle hint and secondary top-right close icon —
      `OverlayChrome.tsx`, shared with the new sibling `TextLightbox` for
      full-screen reading).
- [x] Add a small family of decorative gold "chapter mark" glyphs
      (`FlourishMark`, `ConstellationMark`, `CrescentMark`; extend the
      already-shipped `OrnamentalRule` beyond `PageShell`) placed across
      the site: the results/share overview's eyebrow, login/signup
      headlines, `/cats`'s heading and its boundary before "Add a cat",
      `EmptyState`'s title, the history page's heading boundary, and
      before the diagnosis/ritual text on the two full views.
- [x] Retune the `glow-pulse` motion token from 2400ms to 4200ms (applied
      to a confirmed quiz answer and the overview's new "Save this
      Reading" button), add a new large-image `glow-pulse-lg` variant
      (Portal/Tarot/large-Medallion frames, the Lightbox's framed art), and
      reuse (not duplicate) the existing `fog-drift`/`flame-flicker`
      patterns on the new surfaces (`.lightbox-fog`; `DiagnosisReveal`'s
      candle icon). `design-tokens.json`'s `motion.patterns` backfilled
      with `fogDrift`/`flameFlicker`/`glowPulseLg` entries alongside the
      retuned `glowPulse`.
- [x] No new illustration assets, schema, or content-model changes needed
      — presentation/routing layer only. Confirmed true: this phase touched
      no `prisma/schema.prisma`, no migration, no seed content.

**Known follow-up — deliberately deferred, not silently dropped; resolved
in Phase 28.** Before coding began, cross-checking the plan against the actual
migration history surfaced a real gap neither the original plan nor its
gap-review pass had caught: `TreatmentImage` (Phase 21's migration) was
purely additive with no backfill, unlike `DiagnosisDefImage` (Phase 15),
which backfilled from a pre-existing single-column `imagePath`. That means
the ~10 pre-Phase-14 retired placeholder `Treatment` rows — still
referenced by roughly 22 historical `Diagnosis` records via the
`onDelete: Restrict` FK — have an empty `TreatmentImage` pool, with nothing
for `TreatmentReveal`'s hero (or the overview's treatment medallion
thumbnail) to show for those specific historical results. Asked how to
handle it, the user chose to ship a decorative fallback now (`FramedImage`
renders a centered, dimmed `Mark` glyph on the brand's radial-gold
background instead of a broken image whenever `src` is undefined) rather
than block this phase on generating real images for retired content, and
asked for the gap to be documented here for a later session to pick up.
**Follow-up for a future phase:** generate real illustrations (the same
`codex exec`/brand-doc pipeline as Phase 17/22) for the ~10 retired
placeholder `Treatment` rows, and author them into a seed update, so the
~22 affected historical results get a real image instead of the
decorative fallback. Done in Phase 28 — see that entry.

## Phase 24 — Quiz question-shift transition — done
Full details: `docs/workplan/phase-24-quiz-transition-crossfade.md`
Requested 2026-09-15 as a from-scratch look at the quiz's
question-to-question pacing: two directions (a lighter slide-crossfade
vs. a full tarot card-flip) were designed and compared as an interactive
Artifact mockup before this phase was written, and the crossfade was
chosen. Replaces Phase 18's full-screen mid-quiz "divining" overlay (held
2000ms per question, ~38s total across a 20-question quiz) with a lighter
in-place transition; the final question's longer "spiritual reception"
pause is unchanged.
- [x] Replace the mid-quiz `.divining-overlay` swap with an in-place
      slide-crossfade (`.quiz-question`/`--leaving`/`--enter` in
      `globals.css`), ~380ms, `ease-dreamy`.
- [x] Surface the flavor line inline in the existing hint paragraph
      during the outgoing half, instead of behind a blocking overlay.
- [x] Add a one-shot spin+glow on the confirmed option's diamond mark
      (`.mark-confirm-spin`) as a small tarot-flavored nod.
- [x] Add `prefers-reduced-motion` handling for all three new animations.
- [x] Retire the now-unused `--duration-divination` token; add
      `--duration-question-shift`; leave `--duration-divination-final`
      (the reception moment) unchanged.
- [x] Update `design-tokens.json`'s `motion.patterns` and
      `design-system.md`'s `QuizFlow` description.
- [x] `npm run build`/`format:check` clean; `eslint` scoped to the
      changed file clean (bare `npm run lint` is already noisy
      repo-wide for unrelated reasons, per Phase 21's note).
- [x] Merging the PR: blocked from an agent turn by this harness's
      "Merge Without Review" safety classifier (a different, earlier
      gate than Phase 22's — that one blocked the deploy restart itself;
      this one blocks merging the PR before the deploy can even start) —
      the owner merged PR #40 manually. Since main had moved forward
      with Phase 23 (PR #39) in the meantime, this needed a real conflict
      resolution (`QuizFlow.tsx`, `design-tokens.json`,
      `design-system.md`) — the resolution that landed left main's build
      broken and silently dropped content in two docs; fixed directly on
      `main` in a same-day hotfix commit (`20269b1`) once caught. See the
      Phase 24 side doc's execution log for the full incident.
- [x] Running the live VPS deploy: done — verified via the service being
      `active` and `https://purrification.com/` responding.
- [x] Same-day refinement: split the single shared transition into three
      independently-staggered blocks (picture/prompt/answers, each its
      own duration/start delay) after the owner found the deployed
      version still shifted as one full-page block, unlike the
      comparison mockup. See the side doc's "Refinement" entry. Deployed.
- [x] Same-day bugfix: the exit direction wasn't animating at all (an
      `animation-fill-mode: both` entrance fighting a `transition`-based
      exit on the same element) — fixed by using a plain CSS transition
      symmetrically for both directions. Confirmed across desktop
      Firefox and two Android phones; the one phone with no animation
      has `prefers-reduced-motion: reduce` on, which is correct,
      by-design behavior, not a bug. See the side doc's "Bugfix",
      "Mobile debug readout", and "Debug cleanup" entries. Deployed.

## Phase 25 — Clickable-text selection fix — done
Full details: `docs/workplan/phase-25-clickable-text-select-fix.md`
Requested 2026-09-18 after the owner found that confirming a quiz answer
(the Phase 18 two-click gesture) could select the answer's text like a
word and pop the browser's native selection toolbar / iOS callout menu
instead of registering the click — a native `<button>` gets
`user-select: none` for free from the browser, but the quiz's answer
`<label>` (and any `<a>`/`<Link>`-based control) does not. Treated as a
general rule per the owner's request: a research pass mapped every
custom clickable control in the app, found five real spots (the quiz's
`<label>`, `Button`'s `<Link>` branch, `TextLink`, `ReadingOverview`'s
row link, and `DiagnosisReveal`/`TreatmentReveal`'s raw back links), and
confirmed everything else (icon-only overlay buttons, plain `<button>`s,
a non-interactive form-field `<label>`) was already safe.
- [x] Add a shared `.no-text-select` class (`user-select: none` +
      `-webkit-touch-callout: none` for iOS) to `globals.css`.
- [x] Apply it to `Button.tsx`'s shared base class (covers both its
      `<button>` and `<Link>` output app-wide in one change).
- [x] Apply it to `TextLink.tsx` (covers every inline text link
      app-wide in one change).
- [x] Apply it to `ReadingOverview`'s row link and
      `DiagnosisReveal`/`TreatmentReveal`'s raw back links.
- [x] Apply it to the quiz answer `<label>` — the originally-reported
      bug.
- [x] `npm run build`/`eslint`/`prettier --check` clean on every
      changed file.

## Phase 26 — Quiz transition timing boost — done
Full details: `docs/workplan/phase-26-quiz-transition-timing-boost.md`
Requested 2026-09-18 as a same-family follow-up to Phase 24's per-block
cascade: the mechanism was confirmed correct (Phase 24's bugfix/debug
history), but the owner asked for longer fades and a wider gap between
when each block starts moving, to make the cascade read more strongly.
Pacing only — no change to the three-block mechanism, the
`--leaving`/`--pending` transition approach, or Phase 25's fix.
- [x] `--duration-question-shift` (picture block base) 300ms → 450ms.
- [x] `.quiz-block--prompt` 330ms/40ms delay → 500ms/60ms delay.
- [x] `.quiz-block--answers` 360ms/80ms delay → 550ms/120ms delay.
- [x] `QuizFlow.tsx`'s `QUESTION_SHIFT_MS` 440ms → 670ms to match.
- [x] Update `design-tokens.json`'s `questionShift` duration/patterns
      and `CLAUDE.md`'s Phase 24 paragraph with the new numbers.
- [x] `npm run build`/`eslint`/`prettier --check` clean on every
      changed file.

## Phase 27 — Quiz transition entrance-direction fix — done
Full details: `docs/workplan/phase-27-quiz-transition-direction-fix.md`
Requested 2026-09-18: the owner noticed exit and entrance swept the same
visual direction (both right-to-left) instead of opposite directions.
Root cause: `.quiz-block--pending`'s pre-entrance offset was on the
opposite *side* from `--leaving`'s end state, but animating from there
back to center was still a right-to-left sweep — the fix flips its
`translateX` sign so entrance genuinely sweeps left-to-right instead.
- [x] Flip `.quiz-block--pending`'s `transform` from `translateX(18px)`
      to `translateX(-18px)` — one rule, applies to all three blocks.
- [x] Fix stale `.quiz-block--enter` references (renamed to `--pending`
      in Phase 24's bugfix) in `design-tokens.json`/`design-system.md`.
- [x] `npm run build`/`prettier --check` clean.

## Phase 28 — Follow-up cleanup pass (tone review, smoke test, image backfill) — done
Requested 2026-09-18: the owner asked to resolve every open, non-future-scope
follow-up still on the books — the Phase 14 tone/content review, the Phase 14
multi-path diagnosis smoke test, and the Phase 23 retired-`Treatment`-image
backfill — plus refresh this file's stale "Current status" section (it still
said "Phases 0–22" after five more phases had shipped), working
autonomously and documenting each judgment call.

**Branching note:** this phase's image-generation step needs `codex exec`,
whose sandbox trust (`~/.codex/config.toml`) is keyed to the exact absolute
path `/home/coder/code/purrification` — a git worktree necessarily lives at
a different path and breaks that trust (the same `bwrap` failure Phase 17
and Phase 22 already hit and documented). Rather than re-hit that, all
`codex exec` calls ran with the main checkout as `cwd` (codex's own file
write still fails there under this sandbox, same as Phase 17/22 — the real
PNG lands under `~/.codex/generated_images/<session>/` and gets `cp`'d out),
while every actual file edit happened inside a worktree as this harness
requires. Two isolated concerns, two different execution contexts for the
same phase.

- [x] **Tone/content review (R-TONE-1/R-TONE-2).** Read all 12 diagnoses,
      10 treatments, 19 rituals, and 20 questions/85 answers in full (not a
      sample). R-TONE-2 (persistent disclaimer) was already satisfied —
      `PageShell`'s footer renders it on every user-facing route, including
      the quiz and both share views. R-TONE-1 surfaced 10 real findings, all
      confined to `treatments.json` contraindications (4 entries) and
      `rituals.json` steps/aftercare text (5 entries, 6 lines): places where
      the copy had drifted from the app's whimsical "spiritual ritual" voice
      into literal veterinary/behaviorist language — named real medical
      conditions ("thyroid, cognitive, pain"), clinical triage phrasing
      ("rule out a medical cause"), and real operant-conditioning
      terminology ("extinction burst"). **Judgment call:** every safety-
      relevant "see a vet" nudge was kept, not deleted — removing them would
      have been an actual safety regression, and R-TONE-2's whole premise is
      that concerning symptoms should prompt a vet visit. The fix was
      narrower: reword each into the brand's whimsical voice while
      preserving the same underlying guidance (e.g. "rule out a medical
      cause (thyroid, cognitive, pain) before treating this as purely
      behavioral" → "that's a vet-first situation, not a ritual-first one").
      No diagnoses, questions, or answer copy needed changes.
- [x] **Multi-path diagnosis smoke test.** Added `scripts/smoke-test-
      diagnoses.ts` (`npm run smoke-test-diagnoses`), which imports the same
      `engine.ts` functions `getDiagnosis.ts` uses (not a reimplementation)
      and loads live content the same way, then uses random-restart
      hill-climbing to search for a full answer path (one option per
      active question — 20 at the time, 10 since Phase 29) that makes each
      active `DiagnosisDef` the actual first-match result (respecting
      priority order, not just "satisfies its own rule in isolation").
      Confirmed **all 12/12 active `DiagnosisDef`s** (11 pattern-based + the
      `diag_equilibrium` catch-all) reachable, each rendering a diagnosis +
      ritual with no missing template slots; for diagnoses with more than
      one severity band, it also searches for a second path landing in a
      different band, and found one for 4/11 within its search budget (the
      rest only reached "mild" — a search-heuristic budget limit, not a
      diagnosed content defect; the script's exit code still reflects only
      real failures, i.e. an unreachable diagnosis or a rendering error).
- [x] **Retired-`Treatment` image backfill (Phase 23's known follow-up).**
      Queried the live DB directly: exactly 10 `isActive: false` `Treatment`
      rows (the pre-Phase-14 placeholder set), referenced by 22 historical
      `Diagnosis` rows total, all with empty `TreatmentImage` pools —
      matching the Phase 23 doc's estimate exactly. Generated one real
      illustration per row via `codex exec` (same brand-doc prompt template
      and 4:5 aspect ratio as Phase 17/22), each subject written to match
      the treatment's own mystical name/philosophy. Re-added all 10 rows to
      `prisma/seed/content/treatments.json` with their existing field values
      reproduced exactly (verified against a live DB dump before editing)
      plus the new `image_paths` — safe because `prisma/seed/index.ts`'s
      treatment upsert only ever `UPDATE`s an existing id and never touches
      `isActive`, so re-listing an inactive row cannot reactivate it (a code
      comment was added at the upsert call site to make this explicit for
      the next person editing that loop).
- [x] **Applied to the live DB, 2026-09-21.** The first attempt was
      refused by this harness's auto-mode classifier as a production-DB
      write; the owner (who had never touched the DB by hand) then
      explicitly told the agent to find how earlier phases did it and run
      it itself. Method, same as Phase 15/17/22: SSH tunnel open
      (`ssh -f -N -L 5432:localhost:5432 purrification-deploy`), then
      `node --env-file=.env --import tsx prisma/seed/index.ts` from this
      branch (equivalent to `npm run db:seed-content` with `.env` loaded —
      plain `tsx` doesn't auto-load `.env`; a fresh worktree also needs
      `.env` copied in and `npx prisma generate` run). Output: only the
      known Phase 13 stale-placeholder warnings (no `Treatment` ones any
      more), "Upserted 17 tags, 5 topics, 20 questions, 20 treatments, 12
      diagnosis defs, 19 rituals." Verified by direct query: 10 active + 10
      inactive `Treatment` rows each with exactly one `TreatmentImage`, all
      10 retired rows still `isActive: false`, reworded tone text present
      in `Treatment`/`Ritual` rows, and 0 historical `Diagnosis` rows left
      pointing at an image-less treatment.
- [x] **Merged PR #41 and deployed the app**, 2026-09-21, together with
      Phase 29's deploy (one repeat-deploy run shipped both). The 10 new
      PNGs now exist on the VPS and serve 200, so the ~22 historical
      results have their treatment image; the deploy's `systemctl restart`
      also refreshed `getDiagnosis`'s per-process content cache, so the
      reworded ritual text reaches new diagnoses.
- [x] Refreshed this file's stale "Current status" section (see above) and
      closed out the two Phase 14 checklist items and the Phase 23 "Known
      follow-up" note to point here.
- [x] `eslint`/`prettier --check` clean on every changed file. `npm run
      build` was **not** run — this phase's worktree has no local
      `node_modules` (nothing here touches `src/app`/`src/components`/
      `src/lib`, so a full Next.js build wasn't needed to validate it;
      `npx prisma generate` was run to exercise the DB-touching script and
      the seed script's own `validate()` step, which is the relevant check
      for JSON content changes).

## Phase 29 — Quiz shortening (20 → 10 questions) — done, live
Full details: `docs/workplan/phase-29-quiz-shortening.md`
Requested 2026-09-21: cut the quiz to 10 questions (2 per topic) while
keeping the diagnosis concept and the 12 diagnoses / 10 treatments / 19
rituals. Content and seed pipeline only — nothing in `src/` hardcodes the
quiz length (it's derived from the active `Question` rows), so no UI or
schema change. Merged (PR #42) and deployed 2026-09-21.
- [x] Design the 10-question set: keep 8 original questions (`q_001`,
      `q_005`, `q_007`, `q_009`, `q_010`, `q_013`, `q_014`, `q_017`), add 2
      merged questions (`q_021` territory watch, `q_022` solo-time), retire
      the other 12.
- [x] Re-tune every `DiagnosisDef` `trigger_rule`/`severity_bands`/
      `priority` to the halved evidence; text, images and treatment links
      untouched.
- [x] Add `prisma/seed/content/retired.json` + `retireContent()` so the
      seed deactivates (never deletes) the 12 dropped questions.
- [x] Seed `validate()`: severity bands must cover the rule's smallest
      reachable tag sum and end open-ended.
- [x] New `scripts/verify-quiz-content.ts` (`npm run
      verify-quiz-content`): exhaustive, DB-free enumeration of all
      1,638,400 answer combinations through the real engine — all 12
      diagnoses and 19/19 rituals reachable, no unmatched/out-of-band
      results.
- [x] `lint`/`tsc`/`build`/`prettier --check` clean.
- [x] Deployed 2026-09-21 via the runbook's repeat-deploy: the seed
      retired the 12 questions (`Retired 12 question(s)`), no pending
      migrations, service restarted right after (active, 0 restarts).
- [x] Verified live: 10 active questions, 2 per topic, in the production
      DB; the live quiz page (`GET /cats/<id>/quiz`, 200) ships exactly the
      10 new question ids and none of the 12 retired ones; `npm run
      smoke-test-diagnoses` against the live DB reached 12/12 diagnoses,
      with a second severity path for 10 of the 11 pattern diagnoses
      (Nocturnal Unrest is moderate-only by design).
- [ ] **Owner-only:** click through the shorter quiz once in a real
      browser and confirm the transitions/progress bar read right at 10
      questions. Not done by an agent — no usable headless browser exists
      in the sandbox (see `CLAUDE.md`), and nothing in the UI is
      length-specific, so this is a confidence check, not a known risk.

## Explicitly not planned this round
Carried from `requirements.md`'s Out of scope: payments/subscriptions,
physical fulfillment, social sharing integrations, admin CMS.

## Resolved decisions
- Prisma vs. Drizzle: Prisma (Phase 0) — see `CLAUDE.md`'s "Key decisions to
  know" for why.
- Stateless vs. DB-backed sessions: stateless signed cookie, no session
  table (Phase 2) — `src/lib/auth/session.ts`.
- Exact quiz length and content-pool size: 5 questions and 10
  diagnosis/ritual entries at launch (Phase 4/5), since superseded by
  Phase 13/14's DB-backed content (20 questions, 12 diagnoses).
