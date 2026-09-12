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
  `Toast.tsx`) — plain React components wrapping Tailwind classes, not a
  separate styling abstraction or component library dependency. The one
  bespoke component, `DiagnosisCard`, lives in its own
  `src/components/diagnosis/` folder instead, since it's CSS Modules
  rather than a Tailwind-utility primitive.
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
  2400ms loop, reserved for one focal/active element, never ambient), and
  `divination` (Phase 18: `duration.divination`/`duration.divinationFinal`,
  the quiz's one-shot themed pause between a confirmed answer and the next
  question/diagnosis — see `QuizFlow.tsx` below).

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
| `Modal` (raised surface, soft glow shadow, generous padding — brand doc §9) | cat-deletion confirmation (replaces the current bare `window.confirm`) |
| `Toast` (brand doc §9 suggests a "glowing candle" motif rather than a generic bar) | signup/login/quiz-submission errors and successes (replaces ad hoc inline error text) |
| `QuizProgress` + quiz-option button states | `QuizFlow.tsx` |
| `DiagnosisCard` (the bespoke, shareable hero component) | `results/[id]` and `share/[shareSlug]` — same component, two contexts |
| `EmptyState` | cats dashboard with zero cats, history with zero attempts |

**`QuizFlow.tsx`'s interaction model (Phase 18, `docs/workplan.md`):** a
click selects an option (today's glow-pulse highlight); a second click on
that *same*, already-selected option confirms it — a further, more
emphatic gold-filled look — and is the advance action itself, replacing
the old separate "Next" button entirely. Confirming triggers a themed
"divining" pause (`.divining-overlay` in `globals.css`, reusing
`.toast-flame`'s flicker) before the next question fades in; the last
question's confirm triggers a longer, more elaborate "spiritual
reception" variant (`.divining-overlay--final`, with an early, dimmer
preview of the `seal-of-completion.svg` motif) that gates the real
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

## Open items

Phase 10 is complete and deployed (see `workplan.md`) — the logo/mark and
the palette/type decisions that were open when this doc was first written
are resolved. What's still genuinely open, for whoever picks this up next:

- `DiagnosisCard` shipped purely typographic (no illustration/icon beyond
  the mark in its eyebrow label) — a deliberate choice during
  implementation, not an oversight, but revisitable. If it ever gains
  illustration, that image must follow the brand doc's reusable prompt
  template (§6), not be generated ad hoc.
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
