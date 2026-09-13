# Phase 10 — Design system & UI implementation (R-LAND-1, R-TONE-1, R-TONE-2)

Extended notes for `docs/workplan.md`'s Phase 10 entry.

## Context

Retrofits a real, flexible visual design onto the functional layer built in
Phases 2–7, which shipped with only inline styles and no shared layout. No
functional/behavior changes — UI only.

**Supersedes the open palette/type decision.** `docs/design-system.md` (the
plan this phase originally executed) left the palette, typography, and
light/dark scope deliberately open, pending a "style tile" exploration step.
`docs/design/purrification-brand-guidelines.md` — plus its companion
`design-tokens.json` and `tailwind.config.snippet.ts` — now answers all of
that directly: a dark-only, jewel-tone-and-gold "antique fortune-teller
machine meets tarot deck" identity, Cinzel Decorative/Cinzel/EB Garamond
typography, and concrete token values. The style-tile step is dropped; the
brand doc is now the authoritative source for anything it covers, ahead of
`design-system.md`.

## Execution notes

- Reconciled `design-system.md`'s placeholder token/typography/dark-mode
  sections against `purrification-brand-guidelines.md` (dark-only — dropped
  the `prefers-color-scheme` light variant it assumed; the actual color
  roles, font roles, radius, and shadow/glow values from
  `design-tokens.json`; its "Open items" section no longer applies). Kept
  `design-system.md`'s parts the brand doc doesn't cover (component-to-route
  inventory, the UI gaps survey, responsive rules).
- Set up Tailwind CSS v4 (`@tailwindcss/postcss`, this Next.js version's own
  recommended default) and ported `design-tokens.json`'s values into a
  Tailwind v4 `@theme` block in `globals.css`. `tailwind.config.snippet.ts`
  is written for classic JS-config Tailwind (`theme.extend` in
  `tailwind.config.ts`) — that shape needed translating to v4's CSS-native
  `@theme` syntax, not dropped in as-is.
- Loaded the three brand fonts (Cinzel Decorative, Cinzel, EB Garamond) via
  `next/font/google` per the three-tier system in
  `purrification-brand-guidelines.md` §5 (display/heading/body).
- Logo design pass — none existed yet
  (`purrification-brand-guidelines.md` §3/§11): a cat-silhouette-plus-
  otherworldly-sight mark (third eye / crescent moon / constellation),
  engraved-seal quality, gold-on-dark. Needed variants: full lockup, a
  simplified icon-only mark that stays legible at 16px (for the favicon), a
  single-color gold-on-dark version, and a "seal of completion" variant for
  a finished ritual. Stored source/exports in `docs/design/`; shipped the
  icon-only mark as the site favicon in `public/icons/` (replacing the
  default Next.js favicon) and confirmed `layout.tsx`'s metadata reflects
  the identity. Hand-authored SVG, not AI-generated — this sandbox's
  `codex` CLI didn't expose the image-generation subcommand the
  `openai-imagegen` skill documents (bug filed); a vector mark suits the
  16px-legibility requirement better than a rasterized illustration anyway.
  Full lockup deferred to the `PageShell` primitive as a live component
  rather than a flattened export, so it stays crisp/responsive in the
  header.
- Built the shared primitives (`src/components/ui/`) per
  `design-system.md`'s route-mapped inventory (`PageShell`, `Button`,
  `Card`, `Field`, `EmptyState`), styled per the brand doc's §7/§9 guidance
  (rounded-full/rounded-lg buttons with gold border or fill and
  glow-on-hover, spacious/airy density, soft gold/purple glow instead of
  hard drop shadows, mobile-first).
- Added a `Modal`/`Dialog` primitive per the brand doc's v1 component scope
  (§9) and used it for the cat-deletion confirmation (R-CAT-5), replacing
  the bare `window.confirm`.
- Added a toast/notification primitive per the brand doc's v1 component
  scope (§9) — its suggested "glowing candle" motif — for signup/login/
  quiz-submission errors and successes, replacing ad hoc inline error text.
- Built `DiagnosisCard`, the bespoke shareable result component
  (`src/components/diagnosis/`), and wired it into both `results/[id]` and
  `share/[shareSlug]` (same component, two contexts — R-DIAG-3/R-DIAG-4).
  Applied the brand doc's motion guidance (§8): slow/dreamy fade-and-drift
  entrance, glow-pulse reserved for this kind of single focal moment, not
  ambient decoration.
- Per §6's AI-imagery rules, confirmed the existing landing-page header
  image (`public/images/header-fortune-cat.png`, duplicated for reference
  at `docs/design/header-fortune-cat.png`) matches the reusable prompt
  template; used the same template for any new imagery this phase added.
- Retrofit every existing page onto the new primitives/tokens, removing
  inline styles: landing (`page.tsx`), signup/login, cats dashboard
  (`cats/page.tsx`, `AddCatForm`, `CatList`, `LogoutButton`), quiz flow
  (`QuizFlow.tsx` + a new progress indicator, using the brand doc's
  restrained-clarity guidance for anything table-like), history
  (`cats/[id]/history/page.tsx`). Added the `PageShell` nav/footer these
  pages had been missing (see `design-system.md`'s "Gaps found").
- Responsive pass (375px / 768px / 1280px, mobile-first per §7) and an
  accessibility pass: `:focus-visible` states, plus the color-on-color
  contrast check `purrification-brand-guidelines.md` §11.3 explicitly
  flagged as unverified (e.g. a burgundy button on an emerald background)
  now that real screens existed, alongside the already-verified
  parchment-on-near-black text contrast. Found and fixed a real failure
  (`--color-error` text) — see `design-system.md`'s accessibility rules.
  Verified via computed contrast ratios and a mobile-first, no-fixed-widths
  code audit, not literal screenshots — this sandbox has no usable headless
  browser (see Phase 9/earlier notes); a from-scratch responsive/visual
  check is worth a real pass once someone can view it in an actual browser.
- Visual QA via the `run` skill against the dev server (mobile + desktop —
  dark-only, so no light-mode pass needed) for every route before
  considering this phase done. No literal screenshot was possible (no
  usable headless browser in this sandbox — missing system libs, no root to
  install them, confirmed via the `run` skill's own fallback path).
  Substituted the strongest verification available without one: full
  authenticated end-to-end runs (signup → add cat → quiz → results → share
  → history → delete-with-cascade) against the real tunneled database,
  checking every expected string renders and the server log has zero
  errors, plus confirming every new Tailwind utility actually compiled into
  the served CSS rather than silently no-oping on a typo.
- `npm run lint` / `format:check` clean; deployed via the established
  Phase 9 pipeline once verified. Deployed 2026-09-08 via the repeat-deploy
  (`git pull`) script from `vps-runbook.md` step 12 — build succeeded clean
  on the server, no pending migrations, service restarted, and a full
  production smoke test (same golden path as above) run directly against
  `https://purrification.com` confirmed no errors in the systemd journal
  and the cascade-delete/share-404 behavior still correct in the live
  standalone build.
