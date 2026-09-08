# Purrification — Design System

Derived from `product-brief.md`'s tone/voice guardrails, `requirements.md`
(`R-LAND-1`, `R-TONE-1`, `R-TONE-2`, `R-DIAG-3`/`R-DIAG-4`'s "shareable
card"), and `architecture.md`'s page/component inventory. This describes
*how the UI will look and behave* — visual language, tokens, and component
conventions — the same role `architecture.md` plays for the backend.
`docs/workplan.md`'s Phase 10 sequences applying it.

## Scope

Applies to every route that already exists and is live in production
(Phases 2–7 of `workplan.md`): landing, signup/login, cats dashboard, quiz
flow, results + public share page, history. This is a visual/UX retrofit
onto a functional layer that's already correct and deployed — no functional
behavior changes.

## Styling approach

- **Tailwind CSS v4** (`@tailwindcss/postcss`) — this Next.js version's own
  docs (`node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`)
  recommend it as the default styling approach.
- Tailwind v4 defines its theme in CSS via an `@theme` block in
  `globals.css` rather than a JS config file. That block *is* the design
  token layer: every token (`--color-*`, `--font-*`, `--radius-*`,
  `--shadow-*`, `--space-*`) is simultaneously a Tailwind utility generator
  (`bg-accent`, `text-display`) and a plain CSS custom property usable
  anywhere Tailwind utilities don't reach (bespoke component CSS, computed
  styles). One source of truth for tokens, no drift between "the tokens"
  and "what Tailwind generates."
- CSS Modules for the few genuinely bespoke, highly custom components (the
  diagnosis/ritual result card; the quiz progress indicator) where Tailwind
  utility soup would be unreadable. Everything else is Tailwind utility
  classes directly in JSX — no CSS-in-JS.
- Reusable primitives live in `src/components/ui/` (`PageShell.tsx`,
  `Button.tsx`, `Card.tsx`, `Field.tsx`, `EmptyState.tsx`) — plain React
  components wrapping Tailwind classes, not a separate styling abstraction
  or component library dependency. The one bespoke component,
  `DiagnosisCard`, lives in its own `src/components/diagnosis/` folder
  instead, since it's CSS Modules rather than a Tailwind-utility primitive.
- Branded favicon/icon assets go in `public/icons/`, separate from
  `public/images/`'s existing photographic/illustration assets. Working
  design-process artifacts (style-tile exports, palette decision notes)
  go in `docs/design/`, separate from this narrative doc.

## Design tokens

Token *roles* (names + purpose) are fixed now; actual palette/type values
are chosen in `workplan.md` Phase 10's "style tile" step and then recorded
here once locked.

- **Color roles**: `--color-bg`, `--color-surface`, `--color-surface-raised`
  (cards), `--color-text`, `--color-text-muted`, `--color-accent`
  (primary CTA / brand), `--color-accent-2` (secondary/mystical highlight —
  reserved for the diagnosis card, not used everywhere), `--color-border`,
  `--color-danger` (delete/error states), `--color-success`. Each has a
  light and dark value; dark mode stays driven by `prefers-color-scheme`
  (no manual toggle — nothing in `requirements.md` calls for one this
  round).
- **Type roles**: `--font-body` (UI chrome, forms, body copy — quiet and
  legible) and `--font-display` (`h1`/`h2`, quiz question prompts, the
  diagnosis card's diagnosis text — where the "cozy horoscope" personality
  from `R-TONE-1`/`R-TONE-2` actually shows up visually). A modular type
  scale (`--text-xs` … `--text-3xl`) replaces today's one-off inline
  `fontSize` values.
- **Spacing/radius/shadow**: an 8px-based spacing scale, two radii
  (`--radius-md` for controls, `--radius-lg` for cards), and a soft shadow
  token for raised cards (`--shadow-card`), replacing today's one-off
  inline `borderRadius`/`padding` values.
- **Motion**: `--duration-fast` / `--duration-base` plus one standard
  easing, used for quiz step transitions and hover/press states. Subtle,
  not flashy — the tone guardrail is cozy, not gimmicky.

## Component inventory

Maps 1:1 onto the routes that already exist:

| Component | Used by |
|---|---|
| `PageShell` (header w/ wordmark + auth-aware nav, footer w/ the persistent "just for fun, see a vet" disclaimer) | every page — **new**; no shared shell exists today |
| `Button` (primary / secondary / danger variants) | forms, quiz nav, delete action |
| `Card` | cats dashboard grid, history list items |
| `Field` (label + input + error text) | signup, login, `AddCatForm` |
| `QuizProgress` + quiz-option button states | `QuizFlow.tsx` |
| `DiagnosisCard` (the bespoke, shareable hero component) | `results/[id]` and `share/[shareSlug]` — same component, two contexts |
| `EmptyState` | cats dashboard with zero cats, history with zero attempts |

## Gaps found while surveying the current UI

Worth recording here because they're real UX gaps the retrofit fixes, not
just missing polish:

- No shared header/nav exists anywhere — every page is an island. There's
  no way to get from the quiz or a result page back to the cats dashboard
  without the browser back button, and the logout control only exists on
  `/cats`. `PageShell` fixes this as part of the retrofit, not as added
  scope.
- The favicon is still the default Next.js icon — no branded favicon
  exists yet.
- No responsive handling beyond a couple of fixed `maxWidth` inline
  styles; nothing has been checked at a phone-width viewport.
- No visible focus state beyond the browser default on any interactive
  element.

## Responsive & accessibility rules

- Mobile-first: base styles target ~375px width, Tailwind's `sm`/`md`
  breakpoints layer up from there. Every page gets checked at 375px,
  768px, and 1280px.
- WCAG AA contrast (4.5:1 body text, 3:1 large text/UI) checked for both
  light and dark token sets before the palette is locked.
- A visible `:focus-visible` treatment (a ring using `--color-accent`) on
  every interactive element — buttons, links, form inputs, quiz-option
  buttons.

## Open items, resolved during `workplan.md` Phase 10

- [ ] Final palette + font pairing (the "style tile" step) — deliberately
      left open rather than decided here; see Phase 10 step 2.
- [ ] Whether the diagnosis card gets illustration/iconography (via the
      `openai-imagegen` skill) beyond the existing landing-page header
      image, or stays purely typographic.
