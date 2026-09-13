# Phase 21 — Image enrichment: responsive previews & click-to-expand

Extended notes for `docs/workplan.md`'s Phase 21 entry. **Proposed, pending
approval — nothing below is implemented yet.** Concept and design worked
out with the user 2026-09-13, including several explicit design/scope
decisions (recorded below) before any code is written. **Revised the same
day** after a pre-implementation review (requested by the user before any
code was written) found that the original `ClickableImage` mechanical
design would fight the existing codebase — see "Revision history" at the
bottom for exactly what changed and why.

## Context

Three separate problems, all found during research for this phase:

- **No preview sizing exists anywhere.** Every `next/image` call site
  (`src/app/page.tsx`, `login/page.tsx`, `signup/page.tsx`,
  `cats/page.tsx`, `EmptyState.tsx`, `DiagnosisCard.tsx`) is given a fixed
  `width`/`height` with no `sizes` prop. Without `sizes`, this Next.js
  version's optimizer emits only a 1x/2x density `srcset` bucketed off the
  declared `width` (not literally "full original resolution" — see the
  Revision history note on this), which is still far larger than these
  small render contexts need: a 96px-tall `EmptyState` illustration
  (`width={200}`) and a 220px-wide `DiagnosisCard` illustration
  (`width={896}`) both currently bucket to a ~640–1080px-wide optimized
  image. Diagnosis PNGs are ~2.2–3.0MB at full source resolution. The only
  place in the codebase doing real responsive `next/image` delivery
  (`fill` + a proper `sizes` prop) is the throwaway Phase 20 `/allimages`
  debug gallery.
- **Nothing is clickable to full size.** No production image anywhere has
  a click-to-expand affordance — not the page heroes, not the diagnosis
  illustration. The only working lightbox pattern in the repo is that same
  `/allimages/ImageGallery.tsx` debug page (a scroll-snap, multi-image
  fullscreen viewer), explicitly documented in `docs/workplan.md`'s Phase
  20 entry as temporary, "meant to be deleted."
- **Only diagnoses have any image support at all.** `DiagnosisDef` has a
  one-to-many `DiagnosisDefImage` pool (Phase 15) with a deterministic
  per-result picker, `pickStableImage(images, seed)` in
  `src/lib/diagnosis/engine.ts`, seeded on `Diagnosis.id` so a result shows
  the same pooled image on every reload and its public share link. Every
  other content type — `Treatment`, `Ritual`, `Question`, `AnswerOption`,
  `Tag`, `QuestionTopic` — has zero image fields, and neither the quiz
  flow nor the cat history timeline shows any image today.

## Decisions (confirmed with the user before drafting this design)

1. **Retrofit scope**: every existing image on the site (landing header,
   login/signup/dashboard heroes, the `EmptyState` illustration, the
   `DiagnosisCard` illustration) gets the new preview-sizing +
   click-to-expand treatment, not just newly-added images. The user framed
   "working with original size images everywhere" as a site-wide problem.
2. **New content types this round**: `Treatment` and `QuestionTopic`.
   `Ritual` images and reusing a diagnosis's own image as a history-
   timeline thumbnail were both discussed and explicitly **not** selected
   for this phase — don't scope-creep into them without asking again.
3. **Preview delivery mechanism**: Next.js's built-in on-demand image
   optimization (the `/_next/image` resizing route, driven by a real
   `sizes` prop on every call site) — not a separate pre-generated
   thumbnail-file pipeline. No new files to generate/commit/manage; the
   optimizer resizes and caches derivatives from the existing full-
   resolution sources on demand.
4. **Treatment image shape**: a one-to-many **pool** (`TreatmentImage`),
   mirroring `DiagnosisDef`/`DiagnosisDefImage` exactly — the user chose
   this over a simpler single-image-per-row field, for consistency with
   the existing precedent.
5. **Topic image shape**: a single scalar field (`QuestionTopic.imagePath
   String?`), not a pool — one illustration per topic (5 total), not
   per-question (20), shown consistently across all of that topic's
   questions during the quiz.
6. **Phase split**: this phase ships schema + seed pipeline + UI plumbing
   only, with **zero new images actually seeded** — `Treatment`/
   `QuestionTopic` render gracefully with no image, exactly as
   `DiagnosisDef` did between Phase 15 (pool plumbing) and Phase 17
   (real illustrations authored). Generating and authoring the actual
   Treatment/Topic illustrations is intentionally deferred to a fast
   follow-up phase once this one's plumbing is proven live.

## Schema changes (`prisma/schema.prisma`)

- New `TreatmentImage` child table, shaped identically to the existing
  `DiagnosisDefImage`:
  ```prisma
  model TreatmentImage {
    treatmentId String
    treatment   Treatment @relation(fields: [treatmentId], references: [id])
    path        String
    sortOrder   Int

    @@id([treatmentId, sortOrder])
  }
  ```
  Add `Treatment.images TreatmentImage[]`. No independent `isActive` or
  lifecycle field, matching `DiagnosisDefImage`'s precedent (these rows
  have no identity of their own outside the array they belong to).
- `QuestionTopic.imagePath String?` — a plain nullable scalar column
  added directly to `QuestionTopic`, not a child table.
- **Migration**: hand-written, single transaction, and — unlike Phase 13
  and Phase 15's migrations — purely additive: a new table and a new
  nullable column, nothing existing to backfill or contract, since no
  prior column is being replaced. Still cross-check with
  `prisma migrate diff` against the target schema before applying, per
  this project's standing convention (see `phase-15-diagnosis-image-pool.md`
  and `phase-16-content-id-integrity-fix.md` for that cross-check
  precedent). Apply via `npm run db:migrate` against the VPS DB, same as
  every prior migration.

## Seed pipeline (`prisma/seed/`)

- `content/treatments.json`: add an optional `image_paths?: string[]`
  field per entry, mirroring `diagnoses.json`'s existing shape exactly.
  Left empty/omitted for every entry in this phase — populated by the
  follow-up authoring phase.
- `content/topics.json`: add an optional `image_path?: string` field per
  entry. Also left empty/omitted this phase.
- `seed/index.ts`'s `upsertContent()`:
  - Sync `TreatmentImage` rows by **delete-then-recreate** per
    `treatmentId`, the exact pattern already used for `DiagnosisDefImage`
    (`prisma.treatmentImage.deleteMany({ where: { treatmentId } })` then
    `createMany` from the current `image_paths` array) — the documented,
    deliberate exception to this pipeline's usual "upsert, never delete"
    rule, justified the same way it was for `DiagnosisDefImage`: these
    child rows have no stable identity outside their position in the
    authored array.
  - `QuestionTopic.imagePath` is just another scalar field on the normal
    topic upsert — no special sync logic needed.
- No new `validate()` checks are required — this matches the existing
  diagnosis-image precedent of not validating path format or on-disk
  existence at seed time.

## Engine/query changes

- Reuse `pickStableImage` (`src/lib/diagnosis/engine.ts`) unchanged for
  the `Treatment` image pool — it's already fully generic
  (`(images: string[], seed: string) => string | undefined`). Call it with
  the owning `Diagnosis.id` as the seed, the same convention already used
  for the diagnosis image itself, so a given result's treatment
  illustration is stable across reloads and its share link.
- `src/app/results/[id]/page.tsx` and `src/app/share/[shareSlug]/page.tsx`:
  additionally `include`/`select` `treatment.images` (ordered by
  `sortOrder`, same as `diagnosisDef.images` today) and compute the picked
  treatment image path the same way the diagnosis image is computed,
  passing it to wherever the treatment is displayed on those pages.
- `src/app/cats/[id]/quiz/page.tsx`: select `topic.imagePath` alongside
  the question data already fetched, and pass it down to whatever renders
  the topic/question header so it can show a consistent per-topic image.
  **Still an open placement decision, not yet resolved** (added by the
  2026-09-13 revision — see below): today's `QuizFlow.tsx` has no
  "topic/question header" concept at all — it renders a bare
  `<h2>{question.prompt}</h2>` per question, and the current Prisma query
  in `quiz/page.tsx` doesn't select topic data at all. Since no topic
  images are seeded this phase, shipping this line item as inert plumbing
  (schema column + seed field + query field, nothing rendering it) would
  be harmless but pointless. Before implementing this bullet specifically,
  decide where a topic image would actually appear in the quiz UI (e.g.
  a small image beside `QuizProgress`, or inline with the question `<h2>`)
  — don't wire the query field through until there's a real consumer for
  it, or drop this bullet from this phase and let the follow-up
  authoring phase (which will need a real answer anyway) decide it instead.

## New shared UI components (`src/components/ui/`)

**Revised 2026-09-13** — see "Revision history" below for why this
replaces the original `ClickableImage`-wraps-`next/image` design.

- **`Lightbox.tsx`** — unchanged from the original design: a controlled,
  full-bleed, dark-overlay image viewer: `{ open, onClose, src, alt }`.
  Adapted from the Phase 20 `ImageGallery.tsx`'s single-slide viewer
  pattern (`role="dialog" aria-modal="true"`, Escape-key close,
  click-outside-to-close, `next/image` with `fill` + `sizes="90vw"` +
  `object-fit: contain`), but generalized: no hardcoded aspect ratio (the
  debug gallery hardcodes 4:5), and single-image only — browsing an
  entire image pool inside one lightbox view is explicitly out of scope
  (see Decisions above). Kept separate from `Modal.tsx` rather than
  extending it, since `Modal` is deliberately small and form-dialog-shaped
  (`max-w-sm`, used for the cat-deletion confirmation) — a full-bleed
  image viewer needs a fundamentally different shape and z-index/overlay
  treatment. `fill` is safe here because `Lightbox` renders into its own
  fresh, purpose-built full-bleed container — unlike the inline thumbnails
  below, there's no existing sizing/CSS to reconcile it with.
- **`Expandable.tsx`** (replaces the original plan's `ClickableImage.tsx`)
  — a **children-based overlay wrapper**, not a props-forwarding `Image`
  replacement: `{ label: string; className?: string; children: ReactNode }`.
  Renders `children` (the host's existing, completely untouched `<Image>`
  markup and its surrounding element) inside a wrapper that gets
  `position: relative` if the host doesn't already provide it, then layers
  a transparent, full-cover `<button aria-label={label} className="absolute
  inset-0 cursor-zoom-in">` on top that opens a `Lightbox` (state managed
  internally, matching how `Toast`/`Modal` are used today — no lifted
  state, each instance independent). Clicking anywhere on the image clicks
  through to this overlay button; the underlying `<Image>` is never
  wrapped, re-parented, or prop-forwarded.
  - Why not wrap `<Image>` in a `<button>` directly (the original design):
    every current image call site applies its sizing/fit/frame CSS
    *directly to the `<Image>` element* — `DiagnosisCard.module.css`'s
    `.illustration` sets `object-fit: cover`, `aspect-ratio`, `width`,
    `margin`, `border-radius`, and `box-shadow` on it, and depends on it
    being the direct CSS-grid item in `.card`'s `220px 1fr` layout at
    ≥640px; the page heroes apply `className="w-full rounded-lg
    shadow-glow-purple"` the same way. A native `<button>` carries its own
    border/background/padding/cursor and is not a replaced element, so
    `object-fit` has no effect on it at all — wrapping would require
    migrating every one of those rules off the `<Image>` onto some other
    element, plus an explicit style reset on the button
    (`appearance: none; border: 0; background: none; padding: 0`) to avoid
    visible native button chrome around every image site-wide. The overlay
    approach sidesteps all of it: nothing about any existing `<Image>`'s
    props or CSS changes, so there is no per-site CSS migration and no
    "does object-fit still crop right" risk.
  - This also resolves the `width`/`height`-vs-`fill` sizing-mode question
    the original design left open: since `Expandable` never touches the
    host's own `<Image>`, every call site simply keeps using `width`/
    `height` (intrinsic sizing) exactly as it does today — no site needs a
    new `position: relative` + explicitly-sized wrapper just to switch to
    `fill`. Only `Lightbox`'s own fresh container uses `fill`.
  - Accessibility: the overlay button's `aria-label` (required prop, not
    optional) is the one and only place an accessible name has to be
    supplied, instead of being an easy-to-forget detail on every retrofit
    site. This also directly fixes the accessibility gap the original
    design would have introduced: `EmptyState`'s and `DiagnosisCard`'s
    illustrations are currently correctly `alt=""` (decorative); making
    them focusable click targets with **no** accessible name would be a
    real WCAG 4.1.2 (Name, Role, Value) regression, not a nitpick.
    `Expandable`'s required `label` prop closes that gap by construction.
- **Retrofit every existing image call site**: unlike the original design,
  this is now two fully independent edits per site, not one combined
  component migration:
  1. Add a real, tuned `sizes` value directly to the existing `<Image>`
     call — page heroes at their container's real max width, the
     empty-state illustration at its fixed 96px (`h-24 w-24`),
     `DiagnosisCard`'s at its existing 200px (mobile) / 220px (≥640px)
     breakpoints — replacing today's absent `sizes` prop. No other prop
     on these `<Image>` calls changes.
  2. Wrap the existing image markup (the `<Image>` plus whatever div
     already frames it) in `<Expandable label="…">…</Expandable>` to add
     the click-to-expand affordance. Nothing inside changes.
  - While touching `src/app/page.tsx`'s hero (the one call site using the
    `priority` prop today): note that **this Next.js version deprecates
    `priority` in favor of `preload`** (confirmed in
    `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`:
    "Starting with Next.js 16, the `priority` property has been deprecated
    in favor of the `preload` property"). Since this phase already touches
    that exact call site, switch it to `preload` while retrofitting rather
    than carrying the deprecated prop forward — consistent with this
    repo's standing "heed deprecation notices" rule for this Next.js
    version (see `CLAUDE.md`'s "This is NOT the Next.js you know" note).

## Cleanup

- ~~Delete `src/app/allimages/` entirely (`page.tsx` + `ImageGallery.tsx`).
  Phase 20 already documented this page as "meant to be deleted once the
  manual image review it exists for is done," and the new site-wide
  `Lightbox` fully supersedes its one purpose (spot-checking images
  without a headless browser) — any future ad hoc image review can just
  use the real click-to-expand affordance on the live pages.~~

  **Correction, 2026-09-13: this was wrong and was reverted.** This plan
  itself over-read Phase 20's "meant to be deleted" description as
  authorization to actually delete the page during this phase. The owner
  never instructed its removal, was never asked, and corrected this
  explicitly after finding `/allimages` 404ing in production: "meant to be
  deleted" describes the page's eventual, owner-decided disposition, not a
  standing green light for an agent to act on unprompted. `Lightbox`
  superseding the page's *purpose* doesn't make its *removal* authorized.
  `src/app/allimages/` was restored byte-for-byte and stays in place,
  unlinked and untouched, until the owner explicitly instructs its
  removal — see `docs/workplan.md`'s Phase 20 entry for the standing
  rule.

## Dependency change

- Add `sharp` to `package.json` as an **explicit** dependency. It's
  currently only an implicit transitive dependency of `next` (confirmed
  present in `node_modules` at `0.35.4`, via `next`'s own
  `optionalDependencies`, not declared by this project), which is a
  latent risk on the VPS's `npm ci`-based deploy: if a future install
  strategy skips optional transitive dependencies, `next/image`'s
  server-side optimizer degrades or falls back silently. This phase leans
  on that optimizer far more heavily (every image site, not just one), so
  it's worth pinning directly rather than continuing to rely on it
  arriving by chance.

## Docs to update

- `docs/content/content-storage-architecture.md` — schema mirror for
  `TreatmentImage` and `QuestionTopic.imagePath`, following the precedent
  `phase-15-diagnosis-image-pool.md` set when `DiagnosisDefImage` was
  documented there.
- `CLAUDE.md` — Structure section (new table/column, `sharp` as a direct
  dependency) and Current-state summary once shipped.
- `docs/design-system.md` — add `Expandable`/`Lightbox` to the component
  inventory alongside `Modal`/`Toast`/etc.

## Explicitly deferred (do not scope-creep into these without asking)

- Actually generating/authoring the Treatment and Topic illustrations —
  planned as a fast follow-up phase once this plumbing is live, mirroring
  Phase 15 → Phase 17.
- `Ritual` images.
- Reusing a diagnosis's image as a cat-history-timeline thumbnail.
- Any multi-image, pool-browsing gallery view inside the lightbox — the
  lightbox shows the single currently-displayed image at full size, it
  does not let a viewer page through a `DiagnosisDef`'s or `Treatment`'s
  whole pool.

## Testable deliverables

- Every current and new image on the site is wrapped in `Expandable`
  (verifiable by its presence in the rendered markup / the shared
  component being imported at each call site) and has a real `sizes`
  value tuned to its actual render context.
- Clicking any image opens `Lightbox`; Escape and clicking outside the
  image both close it; the overlay button has a non-empty `aria-label` in
  every instance (verifiable via the rendered markup / an accessibility
  check).
- The optimizer serves visibly reduced byte sizes for small render
  contexts — verifiable via the `/_next/image?url=...&w=...` route's
  `Content-Length` compared against the raw source file's size for a
  representative small-width request.
- `Treatment`/`QuestionTopic` rows with zero images render with no broken
  image and no crash (same graceful-empty-pool behavior
  `pickStableImage`/`DiagnosisCard` already have).
- `npm run build` and `npm run lint` both pass.
- A fresh `npm ci` installs `sharp` as a direct dependency (visible in
  `package-lock.json`), and the app does not log a "sharp missing, using
  fallback" warning.
- ~~`/allimages` returns 404.~~ **No longer a deliverable of this phase —
  reverted 2026-09-13, see "Cleanup" above. `/allimages` is expected to
  keep working indefinitely.**
- The homepage hero uses `preload`, not the deprecated `priority` prop.
- Full golden-path smoke test (signup → add cat → quiz → results → share →
  history → delete-cascade) shows no regression — every image (including
  the pre-existing diagnosis illustration) still renders correctly and
  identically to today, now additionally wrapped in `Expandable`.

## Revision history

- **2026-09-13, initial draft**: `ClickableImage.tsx` wraps `next/image`
  directly in a `<button>` and takes over its `src`/`alt`/`sizes`/framing
  props.
- **2026-09-13, revised** after the user asked for a review before any
  code was written. The review found the original design would fight the
  existing codebase in several concrete ways: (1) every image site frames
  its `<Image>` with CSS applied directly to that element, which doesn't
  survive being moved onto a `<button>` (`object-fit` has no effect on a
  button; native button chrome needs an explicit reset); (2) it left the
  `width`/`height`-vs-`fill` sizing mode undecided, which changes how big
  the retrofit actually is; (3) it would have made previously-decorative
  (`alt=""`) images into focusable controls with no accessible name
  (WCAG 4.1.2); (4) it didn't account for this Next.js version's
  `priority`→`preload` deprecation on the one call site (the homepage
  hero) that uses it today. Replaced `ClickableImage` with `Expandable`, a
  children-based overlay wrapper that never touches the host's existing
  `<Image>` markup/props at all — see "New shared UI components" above for
  the full reasoning. No other part of the phase (schema, seed pipeline,
  `Lightbox` itself, dependency change, phase split) changed.
