# Phase 23 — Image & Results Experience Redesign

Extended notes for `docs/workplan.md`'s Phase 23 entry. **Proposed,
pending approval — nothing below is implemented yet.** This is a
translation of a look-and-feel design pass (worked out with the user as a
Claude Design canvas, seven mobile-first artboards, iterated live over
several rounds of feedback) into a concrete technical change plan. No code,
schema, or content changes have been made — this document is the
instruction for a future implementation session.

## Context

Phase 22 gave `Treatment` and `QuestionTopic` real illustrations and wired
them into the UI for the first time, but purely as a functional proof —
"just enough to show the images exist." Three problems came out of using
that in practice:

1. **The quiz topic image is nearly invisible.** It renders as a
   112×112px square-cropped thumbnail (`QuizFlow.tsx`) above the question
   text — a portrait-oriented (4:5, 1122×1402) painterly illustration
   reduced to a tiny cropped icon, nowhere near the "peek into a hidden
   layer of reality" feeling the brand doc describes.
2. **The expanded (lightbox) image view has no way to exit.** `Lightbox`
   (`src/components/ui/Lightbox.tsx`) relies on tapping outside the image
   or pressing Escape — on mobile, the image effectively fills the tap
   target, so there is no discoverable, thumb-reachable way to close it.
3. **The results page conflates two different things into one scroll.**
   `DiagnosisCard` shows the diagnosis image + full diagnosis text + the
   treatment's companion image + full ritual text all in one continuous
   card, with no way to view either image at a meaningful size without
   fighting the small inline crop.

The user asked for a from-scratch look-and-feel redesign, explicitly
ignoring current implementation, staying inside the existing brand
identity (`docs/design/purrification-brand-guidelines.md` — dark-only,
jewel-tone-and-gold, "antique fortune-teller machine meets tarot deck
meets old-style circus"). The result was reviewed and iterated as a
published design canvas (mobile-first mockups, real brand tokens, real
illustration assets from the live content bank) and **accepted**. This
document turns that accepted design into an implementation plan.

## Decisions confirmed during the design review

1. **The results page splits into three tiers**, replacing today's single
   combined `DiagnosisCard` scroll:
   - An **overview** showing both the diagnosis and the treatment/ritual
     as short summaries (small circular "medallion" thumbnail, name,
     2-line teaser of the frozen `diagnosisText`/`ritualText`, a
     tap-to-expand affordance).
   - A **diagnosis full view** (image + full text) reached by tapping the
     diagnosis summary.
   - A **treatment full view** (image + full text) reached by tapping the
     treatment summary.
2. **Each full view can expand further, into one of two full-screen
   modes**: a full-screen **image** viewer (replacing the current broken
   `Lightbox`) or a full-screen **text** reading mode — a new sibling
   surface, built to the same chrome as the image viewer (same top
   drag-handle hint, same top-right secondary close icon, same bottom
   "Close" action bar), just presenting distraction-free, larger-type
   copy instead of an image.
3. **Every image gets a shared "framed illustration" treatment** instead
   of an unadorned `<Image>`: a gold-hairline border, a mirrored
   corner-flourish motif (small SVG curl-and-dot glyph, reused at all four
   corners via CSS transform), and a soft ambient glow. Three weights of
   the same system, matched to context:
   - **Portal** — large rectangular frame with a bottom gradient scrim
     dissolving into the page below it. Used for the quiz's topic image.
   - **Tarot Reveal** — rectangular, ribboned ("Your Diagnosis" tab),
     double gold border. Used for the diagnosis full view.
   - **Medallion** — circular, thin gold ring. Used small (as the
     overview's thumbnails) and large (as the treatment full view's hero
     image, with an added dashed ring + radial tick marks for a
     sigil/astrological feel).
4. **Motion is added in four places**, all as slow, ambient loops (not
   interaction feedback) — see "Motion changes" below for exact values.
5. **No new illustration assets are needed.** This phase is
   presentation-layer and routing only. It reuses the exact
   `DiagnosisDefImage` / `TreatmentImage` / `QuestionTopic.imagePath` pools
   Phase 15/21/22 already populated — the redesign changes how those
   existing images are framed, sized, and laid out, not which images
   exist. The only new visual assets are small decorative glyphs (corner
   flourish, a candle-flame glyph, expand/close/chevron icons) and those
   are inline SVG drawn directly in component markup, the same way
   `Toast`'s existing flame icon already is — they do not go through the
   `codex exec` illustration pipeline (`docs/workplan.md` Phase 17/22's
   process), and nothing needs generating.
6. **No content-model / schema changes are needed.** The overview's
   teaser text is a truncated view of the already-stored, already-frozen
   `Diagnosis.diagnosisText` / `Diagnosis.ritualText` snapshot fields — no
   new column. (This is narrower than "no query changes at all" — see
   "Data loading and ownership checks" below for the one query that does
   need to grow.)
7. **Resolved (gap review, 2026-09-13): every new name shown in the UI is
   `nameMystical`, never `namePlain`.** Both `DiagnosisDef` and `Treatment`
   carry two name fields (`nameMystical`, `namePlain`), and this phase is
   the first time either is shown in the product at all —
   today's `DiagnosisCard` shows neither, only the rendered
   `diagnosisText`/`ritualText` body copy. `nameMystical` is the one
   written in-voice with the rest of the site's copy (and with the brand
   doc's "antique fortune-teller machine" register this whole redesign is
   built around); `namePlain` remains what it already is — internal
   authoring/seed metadata, there so a human editing
   `prisma/seed/content/*.json` can tell entries apart at a glance — and
   stays unrendered. Every "Cinzel name" / "full diagnosis name" / "ritual
   name" reference elsewhere in this document means `nameMystical`.

## Proposed page/route structure

Both `/results/[id]` (authenticated) and `/share/[shareSlug]` (public,
unauthenticated) need the same three-tier structure — they already share
`DiagnosisCard` today for exactly this reason (one visual, two data
sources), and should keep sharing components under this redesign.

Proposed routing (real navigation for the three tiers, not client-only
view-state toggling — this gives native browser back-button support for
"back to reading," and each tier a real, linkable URL):

- `/results/[id]` — the new **overview** (today's route, new content).
- `/results/[id]/diagnosis` — the diagnosis **full view**.
- `/results/[id]/treatment` — the treatment **full view**.
- `/share/[shareSlug]` — the same overview, public.
- `/share/[shareSlug]/diagnosis`, `/share/[shareSlug]/treatment` — same
  full views, public.

The two **full-screen modes** (image / text) are *not* separate routes —
they stay client-side overlays opened from a full-view page and dismissed
via their "Close" affordance, the same architecture `Lightbox` already
uses today (a boolean `open` state toggled by `Expandable`). This matches
how the design canvas presents them (a modal-like takeover, not a page
navigation) and avoids needing shareable URLs for a transient zoomed-in
state.

**Resolved**: cat-history list entries (Phase 6's per-cat history view,
`docs/workplan.md`) get their **own** quick view, distinct from the
overview — a history list is a scan-many-at-a-glance context, and even the
overview's two-summary-row layout is a full page navigation away from it.
Proposed shape: each history row opens the existing `Modal` component
(`src/components/ui/Modal.tsx`) as an in-place quick view — a single,
more condensed combined summary (both the diagnosis's and the treatment's
medallion + name + teaser, not the overview's two full-width rows) — with
one primary action, "View full reading," linking into `/results/[id]`
for anyone who wants the complete overview → full-view → full-screen
experience. The quick view stays a client-side modal with no route of its
own (consistent with how `Lightbox`/`TextLightbox` are overlays, not
pages); it does not replace the overview, it sits in front of the history
list as a faster preview.

### Data loading and ownership checks

**Resolved (gap review, 2026-09-13).** Splitting one page into three per
route family multiplies the places the ownership check can be gotten
wrong or forgotten — `results/[id]/page.tsx` today does that check inline
(`diagnosis.quizAttempt.cat.userId !== user.id`, then `notFound()`), and
that logic must not be re-typed three (or, counting the share family and
the quick-view endpoint below, more) separate times.

- Add `src/lib/diagnosis/loadOwnedDiagnosis.ts`, exporting a single pure
  function `getOwnedDiagnosis(id: string, userId: string)` that runs the
  `prisma.diagnosis.findUnique` with the full `include` the authenticated
  routes need (`diagnosisDef` + its images, `treatment` + its images) and
  returns the diagnosis only if `quizAttempt.cat.userId === userId`,
  otherwise `null`. No `redirect`/`notFound` calls inside it — those are
  Next.js page/layout-only behaviors, not safe to call from the route
  handler this function will also be used from (see the quick-view
  endpoint below) — callers decide what "not found" means for their
  context.
- `src/app/results/[id]/page.tsx`, `.../diagnosis/page.tsx`, and
  `.../treatment/page.tsx` each call `getCurrentUser()` (redirecting to
  `/login` if absent) then `getOwnedDiagnosis()` (calling `notFound()` if
  it returns `null`) — three thin, identical wrappers around one shared
  check, not three independent re-derivations of it.
- Add the equivalent `src/lib/diagnosis/loadSharedDiagnosis.ts` for the
  public family (`getSharedDiagnosis(shareSlug: string)`) — no ownership
  check needed there by design (per `share/[shareSlug]/page.tsx`'s
  existing comment), but still one shared, explicit field `select` used
  by all three public routes instead of three hand-written selects
  drifting apart from each other over time.
- **`getSharedDiagnosis`'s `select` needs to grow by three fields it
  doesn't fetch today**: `diagnosisDef.nameMystical` and
  `treatment.{nameMystical, typicalDuration}` (needed by the public
  `DiagnosisReveal`/`TreatmentReveal` full views — see "Component
  changes" below). Today's `share/[shareSlug]/page.tsx` deliberately
  `select`s a narrow allowlist rather than `include`ing full rows,
  per its own comment ("only ever select diagnosis/ritual/cat-name/image
  fields here; never the owning user's data"). Adding these three fields
  is a deliberate, reviewed widening, not a casualty of refactoring: they
  are content-table display copy, not user data, so they don't violate
  that rule — but the allowlist should be extended explicitly, field by
  field, rather than swapped for a blanket `include` (which would
  silently start exposing every future column added to `DiagnosisDef`/
  `Treatment`, including ones never meant for the public route).
- **Resolved (gap review, 2026-09-13): `ReadingQuickView`'s data is
  fetched on demand, not eagerly joined onto the history list.**
  `CatHistoryPage`'s current query
  (`prisma.quizAttempt.findMany({ include: { diagnosis: true } })`) has no
  `treatment`/`diagnosisDef`/image relations at all, and `ReadingQuickView`
  needs both. Joining all of that onto every row of what can be an
  arbitrarily long history list, just so a modal opened for at most one
  row at a time has data ready, is real, avoidable over-fetching. Instead:
  add `GET /api/diagnoses/[id]/quick-view`, a small authenticated route
  handler that calls `getOwnedDiagnosis()` above (returning a 404 JSON
  body if it comes back `null`) and responds with only the condensed
  fields `ReadingQuickView` renders (both `nameMystical`s, both truncated
  teasers, both picked image paths) for that one diagnosis id — already
  available as `attempt.diagnosis.id` from the history list's existing
  query. `ReadingQuickView` fetches from it the moment its row's modal
  opens, not on page load. The history list page itself keeps its current,
  cheap query unchanged — it never needs treatment/diagnosisDef data of
  its own, since each row's own always-visible summary already only shows
  `attempt.diagnosis.diagnosisText`.

## Component changes

- **Retire** `DiagnosisCard`'s combined rendering of diagnosis + treatment
  in one card (`src/components/diagnosis/DiagnosisCard.tsx`). Its
  CSS-module styling (the engraved-seal double border, the seal-of-
  completion stamp) should be preserved and redistributed into the new
  components below, not deleted outright — the "seal of completion" stamp
  in particular has no replacement in the new design and needs a home
  (the overview page is the natural fit, as today).
- **New `ReadingOverview` component** (or similar; exact name TBD at
  implementation time) rendering the two summary rows (medallion + eyebrow
  label + Cinzel name + 2-line clamped teaser + chevron) plus the existing
  page-level actions (save/share link). Both rows navigate to their
  respective full-view route.
- **New `DiagnosisReveal` component** — the "Tarot Reveal" framed image,
  full diagnosis name, full diagnosis text, an expand-image affordance,
  and a "Read in full screen" affordance. A back affordance returns to the
  overview route.
- **New `TreatmentReveal` component** — the enlarged "Medallion" framed
  image (with dashed ring + tick marks), ritual name + duration meta, full
  ritual text, the same two expand affordances, same back affordance.
- **New shared `FramedImage` (or similarly named) UI primitive**
  (`src/components/ui/`) implementing the three frame weights (portal /
  card / medallion) as one component with a `variant` prop, so the
  corner-flourish markup, glow class, and border treatment are defined
  once rather than duplicated at each of the (at least four) call sites.
  Should wrap `Expandable` internally the same way today's per-page markup
  does.
  - **Resolved (gap review, 2026-09-13): decorative layering must not
    steal `Expandable`'s hit target.** `Expandable` already layers one
    full-`inset-0` transparent `<button>` over the image as its
    click-to-expand target; `FramedImage` now layers a second set of
    decorative elements (corner-flourish SVGs, the Portal's gradient
    scrim, the Medallion's dashed ring/tick marks) over that same image.
    Every one of those decorative elements gets `pointer-events-none`
    (on top of the `aria-hidden="true"` they already need) so they can
    sit visually above the image without ever intercepting a click meant
    for `Expandable`'s button underneath. Worth stating explicitly:
    `Expandable`'s own doc comment already records one closely-related
    trap it hit once — wrapping the `<Image>` itself in a `<button>` broke
    every site's per-image CSS — and `FramedImage` must not reintroduce a
    variant of that same class of bug via its own new decorative markup.
  - **Resolved (gap review, 2026-09-13): every call site tunes its own
    `sizes`/dimensions — `FramedImage` must not hardcode one default.**
    Phase 21 deliberately tuned a real `sizes` prop per image site
    project-wide; `FramedImage` changes rendered size substantially per
    variant and call site (112px quiz thumbnail → large Portal frame;
    small overview Medallion thumbnail → large Treatment-reveal
    Medallion hero), so `FramedImage` takes `sizes` (and `width`/`height`,
    or an aspect-ratio box for the `fill` cases) as required props, not
    internal constants, exactly as `Expandable` already requires callers
    to size and frame their own `<Image>` children. Starting points to
    verify against the design canvas's own artboards at implementation
    time (none of these are load-bearing on this document — they're a
    starting point, not a spec, since the canvas's own measurements are
    the actual source of truth):
    - **Portal** (quiz topic image, full question-card width): roughly
      `sizes="(min-width: 640px) 480px, 100vw"`.
    - **Tarot Reveal** (diagnosis full-view hero): roughly
      `sizes="(min-width: 640px) 420px, 90vw"`.
    - **Medallion, small** (overview thumbnail row): a fixed small circle,
      roughly `sizes="72px"`.
    - **Medallion, large** (treatment full-view hero): roughly
      `sizes="(min-width: 640px) 240px, 60vw"`.
    - **Lightbox/full-screen image**: unchanged, already `sizes="90vw"`.
- **Fix `Lightbox`** (`src/components/ui/Lightbox.tsx`): add the
  persistent bottom action bar with a large (≥52px), labeled "Close"
  button — the actual bug fix — plus the drag-handle hint, the secondary
  top-right close icon, a caption label, and the new ambient glow/fog
  treatment described below. This becomes the "full-screen image" mode.
- **New `TextLightbox` component**, a sibling to `Lightbox` sharing its
  chrome (drag handle, top-right close icon, bottom "Close" bar) but
  rendering a Cinzel heading + larger-than-body-size `EB Garamond` copy
  instead of an `<Image>`. This becomes the "full-screen text" mode.
- **New `ReadingQuickView` component** (or similar) rendered inside the
  existing `Modal` primitive, opened from each row of the per-cat history
  list (Phase 6). A single condensed summary combining both the
  diagnosis's and the treatment's medallion + name + teaser, plus one
  "View full reading" action linking into `/results/[id]`. No route of
  its own — a client-side overlay over the history list, the same
  architecture as `Lightbox`/`TextLightbox`.

## Decorative gold marks ("chapter marks")

The design canvas scattered a few small, purely decorative gold glyphs
around the mockups (e.g. the flourish glyph sitting to the left of the
Framed Illustration System sheet's closing caption, "One gold hairline
flourish, mirrored into all four corners…"). The user asked for this
treated as its own small addon: design a few more of these, in the same
family, and place them at appropriate spots across the site — not just the
pages this phase already touches.

**This isn't starting from zero — one of these already exists in
production.** `OrnamentalRule` (`src/components/ui/OrnamentalRule.tsx`) is
already exactly this kind of mark (a hairline with a centered gold
diamond), but is only ever used inside `PageShell`'s header/footer today.
The mark family for this phase is:

1. **Flourish** (already designed, in the mockups) — a small curl-and-dot
   glyph, already used mirrored at all four corners of every `FramedImage`
   variant, and standalone next to a caption. Needs componentizing (e.g.
   `FlourishMark`) since it currently only exists as inline SVG duplicated
   across the mockup's `.dc.html` files.
2. **Constellation** (already designed, in the mockups) — three dots
   joined by thin lines, used above the "Spiritual Reading" eyebrow on the
   results overview. Also needs componentizing (e.g. `ConstellationMark`).
3. **Diamond-on-a-rule** — **already shipped**, reuse `OrnamentalRule`
   as-is. Its use should simply extend beyond `PageShell`: anywhere a page
   currently separates two content blocks with a plain `border-t`/
   `border-b` hairline or nothing at all (candidates to check at
   implementation time: `/cats`'s boundary between the "add a cat" form
   and the cat list; between a history list and its per-cat empty state).
4. **New: Crescent** — a simple thin gold crescent-moon outline, the one
   genuinely new glyph this phase adds. The brand doc's own logo-direction
   section (§3) names "a third eye, a crescent moon, a constellation
   pattern" as the mark's territory — flourish and constellation are
   already spoken for above, crescent is the one left unused as a
   decorative accent. This is the glyph proposed for the "beginning of
   long text" placement below.

All four are small, single-color gold SVGs (stroke-based, matching the
existing flourish/constellation/diamond style — never filled illustration,
never emoji), `aria-hidden="true"` like every other purely decorative mark
in this codebase (`OrnamentalRule`, `DiagnosisCard`'s seal-of-completion
stamp).

**Proposed placements:**
- Constellation mark: above the results overview's "Spiritual Reading"
  eyebrow (per the mockup) — and newly, above the login and signup pages'
  headline text, which today is plain, unornamented copy despite being a
  first-impression moment for the brand.
- Flourish mark: standalone next to a section heading that introduces a
  content block with no adjacent image to frame — e.g. `/cats`'s "Your
  cats" heading, and `EmptyState`'s title text.
- Diamond-on-a-rule (`OrnamentalRule`): as described above, wherever a
  plain content-block boundary exists outside `PageShell`.
- **Crescent mark: at the start of a long-form text block** —
  specifically the diagnosis text on `DiagnosisReveal` and the ritual text
  on `TreatmentReveal`. This was the user's own example case.

**On the user's motion suggestion for the crescent mark (their words:
"you decide if that is a good idea")**: yes, but as a one-shot entrance,
not a continuous loop. Both `DiagnosisReveal` and `TreatmentReveal`
already carry one continuous ambient animation each (the candle-flicker
on the diagnosis ribbon, the glow-pulse on the large image) — adding a
second, independent continuous loop right next to the body text risks
tipping a page whose whole point is a calm, focused read (it's also the
gateway into the distraction-free `TextLightbox`) into visual competition
between two looping things at once, which cuts against this project's own
"one focal animated element at a time" discipline. Instead: apply the
project's existing one-shot `fade-in` pattern (`--animate-fade-in` /
`.animate-fade-in`, already used everywhere — `DiagnosisCard`, `QuizFlow`
question transitions, `PageShell`'s wordmark) to the crescent mark, so it
fades and drifts in once when the page/section mounts, then sits still.
No new keyframe needed — it's the existing entrance treatment applied to
a new small element, not new motion.

## Motion changes (`src/app/globals.css`, `docs/design/design-tokens.json`)

All four values below are the versions the user confirmed as correct
after several rounds of live iteration in the design canvas (too subtle →
too hectic → this).

- **Retune the existing `glow-pulse` pattern from 2400ms to 4200ms.**
  Today's `--animate-glow-pulse: glow-pulse 2400ms ease-in-out infinite;`
  (`globals.css`) and `design-tokens.json`'s `motion.patterns.glowPulse`
  description ("2400ms loop") should both change to 4200ms — the existing
  2400ms read as noticeably more urgent/hectic once applied to a
  confirmed quiz answer and a primary CTA button in the same session that
  reviewed this redesign. Apply this new pace to: a confirmed/selected
  quiz answer option (new; today's confirmed-answer state has a static
  glow, not a pulse), and the overview page's primary "Save this Reading"
  button (new).
- **Add a new, larger-radius glow-pulse variant for large images** — a
  distinct utility (e.g. `--animate-glow-pulse-lg` / an `.image-glow`
  class), same 4200ms timing as above but a bigger, dual-tone (gold +
  burgundy) box-shadow spread, sized for a large illustration rather than
  a button or a form-sized card. Apply to: the quiz portal image, the
  diagnosis reveal's Tarot Reveal frame, the treatment reveal's enlarged
  medallion, and the `Lightbox`/full-screen image's framed art.
- **Reuse the existing `fog-drift` pattern/keyframe** (`globals.css`'s
  `.hero-fog`/`.app-atmosphere`, currently a 32s loop) for two new
  surfaces — the overview page's background and the full-screen
  image/text viewers' background — rather than defining a near-duplicate
  keyframe. Tune only the opacity per surface, not the timing or the
  keyframe shape.
- **Reuse the existing `flame-flicker` pattern exactly as-is** (2100ms,
  already shipped on `Toast`'s flame glyph) for a new, small candle-flame
  icon beside the diagnosis reveal's "Your Diagnosis" ribbon tab. No
  timing change — this one was correct in the canvas from the first pass.
- All four keep the project's existing
  `@media (prefers-reduced-motion: reduce)` discipline — every animated
  element gets a `reduce`-mode fallback to its static end-state, matching
  every other animation already in `globals.css`.
- **Resolved (gap review, 2026-09-13): backfill `design-tokens.json`'s
  missing `fog-drift`/`flame-flicker` entries while this section is
  already touching that file.** `design-tokens.json`'s
  `motion.patterns` today documents only `fadeIn`, `glowPulse`, and
  `divination` — `fog-drift` (32s, `.hero-fog`/`.app-atmosphere`) and
  `flame-flicker` (2100ms, already shipped on `Toast`'s flame glyph) both
  exist in `globals.css` and are being reused as-is (not invented) by
  this phase, but were never added to the token doc when they first
  shipped. Since this phase already edits `design-tokens.json` for the
  `glowPulse` retune, add `fogDrift` and `flameFlicker` entries in the
  same edit, described in the same one-line style as the existing three
  (visual behavior + loop duration + real use sites) — a pre-existing
  doc/code drift this phase would otherwise brush past without fixing.

## Accessibility notes

- Every new tap target (chevron rows on the overview, back buttons,
  expand-image icons, "Read in full screen," the `Lightbox`/`TextLightbox`
  close controls) needs a real `aria-label` — none of them carry visible
  text alone (the "Close" button does have a visible label; the secondary
  top-right icon and the corner expand icons do not, and need one).
- `Lightbox`'s bottom "Close" button must be at least 44px tall (mockup
  used 52px) — this is the actual fix for the "no exit" bug, not
  incidental sizing.
- Corner-flourish and other purely decorative SVGs should be
  `aria-hidden="true"`, matching the existing `seal-of-completion.svg`
  pattern in `DiagnosisCard`.

## Explicitly out of scope for this phase

- No changes to `getDiagnosis` or any diagnosis-derivation logic.
- No changes to the Phase 18/19 quiz confirm/divine interaction timing —
  the quiz portal image is purely additive to the existing
  `transition === "none"` branch, same constraint Phase 22 already
  respected.
- No new `codex exec` illustration generation (see "Decisions" above).
- No admin/CMS authoring changes — content editing remains
  commit-to-`prisma/seed/content/*.json`, unaffected by this phase.

## Definition of done (for whoever implements this)

- `/results/[id]` and `/share/[shareSlug]` show the new overview; tapping
  either summary navigates to its full view; the full view's back
  affordance returns to the overview.
- Both full views' expand-image affordance opens the fixed `Lightbox`
  (with its persistent, thumb-reachable "Close" button); both full views'
  "Read in full screen" affordance opens `TextLightbox`.
- The quiz's topic image renders as the large "Portal" frame, not the
  current 112×112 thumbnail.
- Each per-cat history list row opens the `ReadingQuickView` modal,
  fetching its data on open from `GET /api/diagnoses/[id]/quick-view`
  (not eagerly joined onto the history list's own query); its
  "View full reading" action navigates into `/results/[id]`.
- All six of `/results/[id]`, `/results/[id]/diagnosis`,
  `/results/[id]/treatment`, `/share/[shareSlug]`,
  `/share/[shareSlug]/diagnosis`, `/share/[shareSlug]/treatment` route
  through the shared `getOwnedDiagnosis`/`getSharedDiagnosis` loaders —
  no route re-derives the ownership check or the share route's field
  allowlist independently.
- Every `FramedImage` instance passes its own tuned `sizes` (and
  `width`/`height` or aspect-ratio); every decorative element inside
  `FramedImage` (corner flourishes, scrim, dashed ring/tick marks) is
  both `aria-hidden="true"` and `pointer-events-none`, verified by
  actually tapping/clicking through them onto `Expandable`'s expand
  button underneath.
- `design-tokens.json`'s `motion.patterns` includes `fogDrift` and
  `flameFlicker` entries alongside the retuned `glowPulse`.
- `FlourishMark`/`ConstellationMark`/new `CrescentMark` components exist
  and are placed per "Decorative gold marks" above; `OrnamentalRule`'s
  usage is extended beyond `PageShell`; the crescent mark before
  diagnosis/ritual text uses the existing one-shot `fade-in`, not a new
  continuous loop.
- All four motion additions are present, timed as specified above, and
  each has a working `prefers-reduced-motion` fallback.
- `npm run build` and scoped `lint`/`prettier` pass clean on every changed
  file.
- Full golden-path functional smoke test (signup → cat → quiz → overview
  → diagnosis full view → image full-screen → text full-screen →
  treatment full view → share link, both authenticated and public) —
  functional/HTML-content verification only, per this project's standing
  no-headless-browser limitation (`CLAUDE.md`).
