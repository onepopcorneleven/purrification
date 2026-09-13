# Phase 12 — Visual richness pass (design upgrade round 2)

Extended notes for `docs/workplan.md`'s Phase 12 entry.

## Context

`docs/design-upgrade-round-2.md` is the full plan: it evaluates the
then-current live UI (only one AI-generated image existed anywhere in the
product, `DiagnosisCard` shipped purely typographic, the already-designed
`seal-of-completion.svg` was unused, every route was an identical flat
column, the background had no atmosphere beyond a flat fill) and proposes
four work packages to close that gap. No change to brand palette/type/
tokens — this uses the existing identity more fully, it doesn't change it.

## Execution notes

- **WP1 — Atmosphere**: background vignette/texture/fog treatment and an
  engraved-frame language for `PageShell` and shared surfaces (see
  `design-upgrade-round-2.md`'s WP1). Shipped as a single fixed
  `.app-atmosphere` layer (globals.css) rendered once in `layout.tsx` — a
  soft jewel-tone corner glow plus a static SVG feTurbulence grain texture,
  no binary asset — behind every page; a `.hero-fog` utility (slow-drifting
  blurred gradient, `prefers-reduced-motion`-gated) on the landing hero and
  both `DiagnosisCard` contexts; and a new `OrnamentalRule` primitive
  (hairline + centered gold diamond) replacing `PageShell`'s plain
  header/footer borders. No token changes. Verified: `npm run
  lint`/`build` clean, dev-server curl checks confirm the new classes
  render on `/`, `/login`, `/signup`; contrast reasoning documented inline
  in `globals.css` (glow opacity low enough, and concentrated away from the
  centered text column, that the ~14:1 text-on-`bg-base` contrast Phase 10
  verified isn't meaningfully affected). No visual/screenshot check
  possible — see `CLAUDE.md`'s "Current state" on this sandbox's lack of a
  headless browser.
- **WP2 — Imagery**: a full image set through the brand doc's reusable
  prompt template — one illustration per diagnosis archetype, the unused
  seal wired into a completion moment, and imagery for signup/login/
  dashboard/empty states (see WP2). Shipped 14 images, all via `codex exec`
  per this project's memory on image generation (the documented
  save-to-path step failed with a sandbox error every time; worked around
  by locating each PNG under `~/.codex/generated_images/` and copying it
  into the repo directly — worth updating that memory) — one per
  `diagnosisPool` entry (`public/images/diagnoses/`, 4:5, "card thumbnail"
  per the brand doc's aspect-ratio table) wired into `DiagnosisCard` via a
  new `getDiagnosisImage()` helper that matches a stored `diagnosisText`
  back to its content-pool entry (no schema change — the pool is static and
  `diagnosisText` is always written verbatim); the already-designed
  `seal-of-completion.svg` wired in as an animated stamp on the same card;
  and four `public/images/pages/` illustrations (16:9 hero/banner) for
  signup, login, the cats dashboard, and a shared 1:1 `EmptyState`
  illustration (zero-cats, zero-history). Verified: `npm run lint`/`build`
  clean; a full authenticated curl run (signup → add cat → quiz → results →
  share → history → delete) confirmed every new image URL and the seal
  actually render on each page, with zero errors in the dev server log.
- **WP3 — Theatrical component detail**: tarot-card-style quiz options, a
  literal glowing-candle `Toast`, `DiagnosisCard`'s double-border treatment
  extended to `Card`, a history "reading log" timeline (see WP3). Also
  finally implemented `--animate-glow-pulse` (named in `design-tokens.json`
  since Phase 10 but never actually built until now) for the
  selected-quiz-option state and a one-time `wordmark-glow` on `PageShell`'s
  mark; nav links/logout got a `.nav-link` engraved-underline hover
  treatment. Verified: `npm run lint`/`build` clean; an authenticated curl
  run confirmed the new option-card markup, `nav-link`/`wordmark-glow`/
  `Card`'s inset border, and the history timeline's connecting `border-l`
  thread all render, with zero errors in the dev server log.
- **WP4 — Motion & rhythm**: break the uniform column for hero moments,
  staggered entrances, a themed quiz-submit loading state, hover/press
  micro-interactions, a full `prefers-reduced-motion` audit (see WP4).
  Scope note: only the landing page got the wider treatment (a new
  `PageShell` `wide` prop, `max-w-4xl` with an inner `max-w-2xl` text
  column so prose doesn't over-stretch) — on review, widening
  `DiagnosisCard` itself would have fought its portrait "tarot card"
  identity rather than added breathing room, so that one stays at the
  standard width, and its "hero moment" quality comes from WP2's
  illustration/seal instead. The "ink-stamp press" bullet was already
  delivered by WP2's `seal-stamp` keyframe (a real impact animation, not
  just a fade), so nothing new was added there. Also closed a pre-existing
  gap while auditing reduced-motion: `.animate-fade-in` itself (used since
  Phase 10) had never been gated — now is, since WP4 puts it to much wider
  use (staggered list/card entrances). Verified: `npm run lint`/`build`
  clean; curl checks confirm the wide layout, staggered list markup, and
  dashboard hover classes render; a full authenticated run (2 cats, quiz,
  delete-with-cascade) again showed zero dev-server errors.
