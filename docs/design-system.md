# Purrification — Design System

Derived from `product-brief.md`'s tone/voice guardrails, `requirements.md`
(`R-LAND-1`, `R-TONE-1`, `R-TONE-2`, `R-DIAG-3`/`R-DIAG-4`'s "shareable
card"), `architecture.md`'s page/component inventory, and — for the visual
identity itself — `docs/design/purrification-brand-guidelines.md` (the
authoritative source for palette, typography, imagery, and motion; its
companion `design-tokens.json` is the source-of-truth token *values*).
This doc describes *how the UI is built* on top of that identity —
component architecture, the route-to-component mapping, and conventions
the brand doc doesn't cover — the same role `architecture.md` plays for
the backend. `docs/workplan.md`'s Phase 10 sequences applying it.

## Scope

Applies to every route that already exists and is live in production
(Phases 2–7 of `workplan.md`): landing, signup/login, cats dashboard, quiz
flow, results + public share page, history. This is a visual/UX retrofit
onto a functional layer that's already correct and deployed — no functional
behavior changes.

## Brand identity summary

Full detail lives in `purrification-brand-guidelines.md` — this is the
short version so this doc doesn't drift out of sync with it:

- **Concept**: "antique fortune-teller machine meets tarot deck." Dark-only
  — no light theme; the dark background is part of the concept, not a
  `prefers-color-scheme` fallback.
- **Palette**: near-black-plum background, jewel-tone scales (burgundy,
  emerald, midnight blue) for surfaces/accents, gold as a sparing
  "spotlight" (borders, icons, glow) rather than a fill, warm-parchment
  text.
- **Type**: three-tier — Cinzel Decorative (display, sparingly), Cinzel
  (headings), EB Garamond (body/UI/labels/buttons) — all Google Fonts.
- **Shape/depth**: soft rounded corners throughout (deliberately not a
  sharp antique-frame look), no hard drop shadows — soft gold/purple glow
  stands in for elevation. Spacious/airy density. Mobile-first.
- **Motion**: slow, dreamy fades/glow-ins, not snappy or bouncy; glow-pulse
  reserved for one focal element at a time.
- **Imagery**: all AI-generated, via one reusable prompt template (brand
  doc §6) so every image reads as part of the same "tarot deck" — painterly
  and atmospheric, cats and ambiguous robed/veiled figures, no real people.
- **Logo/mark**: not designed yet — see `workplan.md` Phase 10's logo step.

## Styling approach

- **Tailwind CSS v4** (`@tailwindcss/postcss`) — this Next.js version's own
  docs (`node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`)
  recommend it as the default styling approach.
- Tailwind v4 defines its theme in CSS via an `@theme` block in
  `globals.css` rather than a JS config file. `design-tokens.json`'s values
  get ported into that block as the actual source of truth Tailwind reads;
  `tailwind.config.snippet.ts` (delivered alongside the brand doc) is
  written for *classic* JS-config Tailwind and needs translating to v4's
  CSS-native syntax rather than dropped in as-is — tracked as its own
  workplan step. Once ported, every token (`--color-*`, `--font-*`,
  `--radius-*`, `--shadow-*`) is simultaneously a Tailwind utility
  generator (`bg-gold-500`, `font-display`) and a plain CSS custom
  property usable anywhere Tailwind utilities don't reach (bespoke
  component CSS, computed styles). One source of truth, no drift between
  "the tokens" and "what Tailwind generates."
- CSS Modules for the few genuinely bespoke, highly custom components (the
  diagnosis/ritual result card; the quiz progress indicator) where Tailwind
  utility soup would be unreadable. Everything else is Tailwind utility
  classes directly in JSX — no CSS-in-JS.
- Reusable primitives live in `src/components/ui/` (`PageShell.tsx`,
  `Button.tsx`, `Card.tsx`, `Field.tsx`, `EmptyState.tsx`, `Modal.tsx`,
  `Toast.tsx`, and Phase 23's `FramedImage.tsx`/`OverlayChrome.tsx`) —
  plain React components wrapping Tailwind classes, not a separate
  styling abstraction or component library dependency. The genuinely
  bespoke, CSS-Modules components live in their own
  `src/components/diagnosis/` folder instead: originally just
  `DiagnosisCard`, now (Phase 23) `ReadingOverview`/`DiagnosisReveal`/
  `TreatmentReveal` in its place, plus `ReadingQuickView` (a `Modal`
  consumer, styled with Tailwind utilities rather than its own module).
- Branded favicon/icon assets go in `public/icons/`, separate from
  `public/images/`'s existing photographic/illustration assets. Working
  design-process artifacts (the brand doc, its tokens/config snippet,
  logo exports) live in `docs/design/`, separate from this narrative doc.

## Design tokens

Values are defined once, in `docs/design/design-tokens.json` (the brand
doc's stated source of truth) — this section maps *roles* to that file's
keys rather than repeating literal hex/px values, so there's exactly one
place to update them.

- **Color**: `color.background.{base,raised,elevated,overlay}`,
  `color.brand.{burgundy,emerald,midnight,gold}` (each a 50/300/500/700/900
  scale), `color.text.{primary,secondary,muted,onGold,inverse}`,
  `color.semantic.{success,error,warning,info}`,
  `color.border.{hairline,hairlineStrong,subtle}`. Dark-only — there is no
  light variant to maintain.
- **Type**: `typography.fontFamily.{display,heading,body,ui}` (Cinzel
  Decorative / Cinzel / EB Garamond / EB Garamond) and a `typography.scale`
  running `xs`→`5xl`, each with its own size/line-height/letter-spacing.
- **Spacing/radius/shadow**: `spacing` (an explicit `0`–`24` step scale in
  px, not Tailwind's default multiplier), `radius.{sm,md,lg,full}`, and
  `shadow.{glowGoldSm,glowGoldMd,glowGoldLg,glowPurple,elevation1,
  elevation2}` — glow, not hard shadow, is this product's elevation
  language (brand doc §7).
- **Motion**: `motion.duration.{fast,base,slow}`,
  `motion.easing.{standard,dreamy}`, and named patterns —
  `fadeIn` (opacity + 8px upward drift, `duration.slow` + `easing.dreamy`),
  `glowPulse` (oscillates between `shadow.glowGoldSm`/`glowGoldMd` on a
  4200ms loop, retuned from 2400ms in Phase 23, reserved for one
  focal/active element, never ambient), `glowPulseLg` (Phase 23: the same
  4200ms loop, sized and dual-toned for a full illustration —
  `FramedImage`'s Portal/Tarot/large-Medallion variants and `Lightbox`),
  `fogDrift` (Phase 23: a 32s ambient background drift behind one hero
  moment at a time — `.hero-fog`/`.lightbox-fog`), `flameFlicker` (a
  2100ms flame-glyph wobble — `Toast`, and Phase 23's `DiagnosisReveal`),
  `questionShift` (Phase 24: `duration.questionShift`, the quiz's
  in-place transition between a confirmed non-final answer and the next
  question, as three independently-staggered blocks rather than one
  shared shift), `markConfirmSpin` (Phase 24: a confirmed option's
  diamond mark spinning once), and `spiritualReception` (Phase 18:
  `duration.divinationFinal`, the last question's longer, held pause
  before the diagnosis appears — see `QuizFlow.tsx` below).

## Component inventory

Maps 1:1 onto the routes that already exist, plus the two additions the
brand doc's v1 component scope (§9) calls for that didn't exist in the
original plan:

| Component | Used by |
|---|---|
| `PageShell` (header w/ wordmark + auth-aware nav, footer w/ the persistent "just for fun, see a vet" disclaimer) | every page — **new**; no shared shell exists today |
| `Button` (primary / secondary / danger variants) | forms, quiz nav, delete action |
| `Card` | cats dashboard grid, history list items |
| `Field` (label + input + error text) | signup, login, `AddCatForm` |
| `Modal` (raised surface, soft glow shadow, generous padding — brand doc §9) | cat-deletion confirmation (replaces the current bare `window.confirm`), and (Phase 23) hosts `ReadingQuickView` |
| `Toast` (brand doc §9 suggests a "glowing candle" motif rather than a generic bar) | signup/login/quiz-submission errors and successes (replaces ad hoc inline error text) |
| `QuizProgress` + quiz-option button states | `QuizFlow.tsx` |
| `EmptyState` | cats dashboard with zero cats, history with zero attempts |
| `Expandable` (Phase 21, children-based click-to-expand overlay — wraps a host's existing, untouched image markup rather than replacing `next/image`) | every image site-wide — directly on login/signup/dashboard heroes and `EmptyState`, and (Phase 23) internally within `FramedImage` |
| `FramedImage` (Phase 23, one shared primitive for the three frame weights — `portal`/`tarot`/`medallion-sm`/`medallion-lg` — wrapping `Expandable`; renders a decorative fallback glyph, never a broken image, when the linked content's image pool is empty) | the quiz's topic image (`portal`), `DiagnosisReveal`/`TreatmentReveal`'s hero images (`tarot`/`medallion-lg`), `ReadingOverview`/`ReadingQuickView`'s summary-row thumbnails (`medallion-sm`) |
| `ReadingOverview` (Phase 23, replaces `DiagnosisCard`'s single combined scroll — two tappable summary rows: medallion + eyebrow + name + teaser + chevron) | `/results/[id]` and `/share/[shareSlug]` — each row links into the full-view sub-routes below |
| `DiagnosisReveal` (Phase 23, the "Tarot Reveal" full diagnosis view — framed hero image, full text, expand-image and read-in-full-screen affordances) | `/results/[id]/diagnosis` and `/share/[shareSlug]/diagnosis` |
| `TreatmentReveal` (Phase 23, the enlarged "Medallion" full treatment/ritual view, same affordances as `DiagnosisReveal`) | `/results/[id]/treatment` and `/share/[shareSlug]/treatment` |
| `ReadingQuickView` (Phase 23, a condensed diagnosis+treatment summary rendered inside `Modal`, fetched on demand from `GET /api/diagnoses/[id]/quick-view`) | the per-cat history list, opened per row in place of linking straight into the full overview |
| `Lightbox` (Phase 21, full-bleed click-to-expand image viewer; Phase 23 fixed its original no-discoverable-exit bug via the new shared `OverlayChrome`) | opened by `Expandable`/`FramedImage`; also reached from `DiagnosisReveal`/`TreatmentReveal`'s expand-image affordance |
| `TextLightbox` (Phase 23, `Lightbox`'s sibling — same `OverlayChrome`, a Cinzel heading + larger-than-body `EB Garamond` copy instead of an image) | `DiagnosisReveal`/`TreatmentReveal`'s "Read in full screen" affordance |
| `OverlayChrome` (Phase 23, the drag-handle hint, top-right close icon, and persistent labeled bottom "Close" bar shared by both full-screen overlay modes) | internal to `Lightbox`/`TextLightbox`, not used directly by pages |
| `ConstellationMark` / `CrescentMark` / `FlourishMark` (Phase 23's decorative gold "chapter mark" glyph family, alongside the already-shipped `OrnamentalRule`) | `ConstellationMark` above eyebrows/headlines, `CrescentMark` at the start of `DiagnosisReveal`/`TreatmentReveal`'s long-form text, `FlourishMark` at `FramedImage`'s corners and beside standalone section headings |

**`QuizFlow.tsx`'s interaction model (Phase 18, `docs/workplan.md`):** a
click selects an option (today's glow-pulse highlight); a second click on
that *same*, already-selected option confirms it — a further, more
emphatic gold-filled look, plus a one-shot spin+glow on its diamond mark
(`.mark-confirm-spin`, Phase 24) — and is the advance action itself,
replacing the old separate "Next" button entirely. On a non-final
question, confirming slides the picture, prompt, and answers out
right-to-left (and the next question's versions of each in left-to-right
— the opposite sweep direction, Phase 27) as three separate blocks, each
with its own slightly different duration and start delay
(`.quiz-block`/`--leaving`/`--pending`/`--picture`/`--prompt`/`--answers`
in `globals.css`) rather than one shared shift — Phase 24's lighter
replacement for Phase 18's full-screen mid-quiz "divining" overlay — with
a themed flavor line briefly shown inline in place of the usual "Tap an
answer…" hint. The last question's confirm still triggers
the longer, more elaborate "spiritual reception" variant
(`.divining-overlay`/`--final`, unchanged since Phase 18, with an early,
dimmer preview of the `seal-of-completion.svg` motif) that gates the real
diagnosis request underneath it, so navigation to the result never comes
before both the animation's minimum duration and the real fetch have
resolved. Back is unaffected — still a single, immediate click.

**Table**, also listed in the brand doc's v1 scope ("likely used for
behavior-analysis data — keep the most restrained/legible part of the
UI"), doesn't map onto any route that exists today — nothing currently
presents tabular data. Not built in this retrofit; noted here so a future
data view reaches for this component rather than reinventing table
styling from scratch.

## Gaps found while surveying the current UI

Worth recording here because they're real UX gaps the retrofit fixes, not
just missing polish:

- No shared header/nav exists anywhere — every page is an island. There's
  no way to get from the quiz or a result page back to the cats dashboard
  without the browser back button, and the logout control only exists on
  `/cats`. `PageShell` fixes this as part of the retrofit, not as added
  scope.
- No logo/mark or branded favicon exists yet — the brand doc gives
  direction (§3) but the actual design pass hasn't happened; still the
  default Next.js favicon today.
- No responsive handling beyond a couple of fixed `maxWidth` inline
  styles; nothing has been checked at a phone-width viewport.
- No visible focus state beyond the browser default on any interactive
  element.
- Delete confirmation (`CatList`) uses a bare `window.confirm`, and form
  errors are ad hoc inline text — both get real components (`Modal`,
  `Toast`) per the brand doc's v1 component scope rather than staying as
  browser-default/inline treatments.

## Responsive & accessibility rules

- Mobile-first: base styles target ~375px width, Tailwind's `sm`/`md`
  breakpoints layer up from there. Every page gets checked at 375px,
  768px, and 1280px. Dark-only means one token set to check, not two.
- The brand doc (§4) already verified parchment-text-on-near-black-
  background contrast (~14:1, well past WCAG AA). It explicitly leaves
  **color-on-color combinations unverified** (e.g. a burgundy button on an
  emerald background) "once real screens exist" (§11.3) — this retrofit is
  those real screens, so every such combination gets a contrast check as
  it's built, not assumed safe by analogy to the text-on-background check.
- A visible `:focus-visible` treatment (a ring using the gold accent) on
  every interactive element — buttons, links, form inputs, quiz-option
  buttons.
- That contrast check found a real failure: `color.semantic.error`
  (`#C1443A`) is only 3.89:1 on `--color-bg-base` and 3.25:1 on
  `--color-bg-elevated` — enough for the 3:1 non-text threshold (borders,
  small decorative dots) but short of the 4.5:1 small-text threshold.
  `globals.css` adds two tokens `design-tokens.json` doesn't have —
  `--color-error-text` (`#D97066`, 6.04:1 / 5.05:1) for actual error text,
  and `--color-error-hover` (`#A83B32`) for the danger button's hover
  background, since `--color-text-primary` on the base `--color-error`
  only reaches 4.2:1 there. `--color-error` itself is unchanged and still
  used for borders/backgrounds/decorative dots.
- Every custom clickable control that wraps meaningful visible text and
  isn't a plain `<button>` (an `<a>`/`<Link>`, or the quiz's `<label>`)
  gets `globals.css`'s `.no-text-select` (Phase 25) — a native `<button>`
  gets `user-select: none` for free from the browser, those don't, and a
  rapid double-click/tap on one otherwise reads as "select this word"
  instead of a click, surfacing the browser's selection toolbar or iOS's
  long-press callout menu. `Button`, `TextLink`, `ReadingOverview`'s row
  link, `DiagnosisReveal`/`TreatmentReveal`'s back links, and the quiz
  answer `<label>` all carry it; a plain `<button>` with only an icon or
  short label doesn't need it.

## Open items

Phase 10 is complete and deployed (see `workplan.md`) — the logo/mark and
the palette/type decisions that were open when this doc was first written
are resolved. What's still genuinely open, for whoever picks this up next:

- `DiagnosisCard` originally shipped purely typographic; this is now moot
  — it's retired (Phase 23), and its `ReadingOverview`/`DiagnosisReveal`/
  `TreatmentReveal` replacements all carry real, illustration-driven
  `FramedImage`s (Phase 15/17/21/22's diagnosis/treatment image pools),
  following the brand doc's reusable prompt template (§6).
- The brand doc's `Table` component (§9, v1 scope) was never built —
  nothing in the current app needs tabular data. Build it if/when a future
  feature (e.g. the "behavior-analysis data" the brand doc anticipates)
  actually needs one, rather than pre-building it speculatively.
- Everything in this doc was verified functionally (curl content checks,
  computed WCAG contrast ratios, a live production smoke test), never
  visually — no sandbox this project has run in so far has had a usable
  headless browser (see `CLAUDE.md`'s "Current state"). A real look at
  `purrification.com` in an actual browser is worth doing when convenient;
  treat anything reported here as "should look right," not "confirmed to
  look right."
