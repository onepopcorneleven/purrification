# `docs/design/`

The brand's source material — the authoritative visual identity that
`docs/design-system.md` implements and `docs/workplan.md` Phase 10
executed. See `design-system.md`'s "Brand identity summary" for the short
version, or `CLAUDE.md`'s docs list for how this fits with the other docs.

- `purrification-brand-guidelines.md` — the brand doc itself: personality,
  logo direction, color, typography, imagery rules, motion, and the v1
  component list. Authoritative for anything it covers, ahead of
  `design-system.md`.
- `design-tokens.json` — the literal token values (colors, type scale,
  spacing, radius, shadow, motion) the brand doc calls its source of
  truth. Ported into a Tailwind v4 `@theme` block in `src/app/globals.css`
  — that's the shipped copy; this file is the reference.
- `tailwind.config.snippet.ts` — the same tokens shaped for classic
  JS-config Tailwind (`theme.extend`). Not used directly — the app runs
  Tailwind v4, whose config lives in `globals.css`'s `@theme` block
  instead — kept here only as the brand doc's original companion file.
- `header-fortune-cat.png` — reference copy of the landing page's header
  image (shipped copy: `public/images/header-fortune-cat.png`), regenerated
  during Phase 10 to actually match the brand doc's §6 AI-imagery prompt
  template (the original, pre-brand-doc version ran warm/sepia and had no
  emerald; see `workplan.md` Phase 10 for detail).
- `logo-concepts/mark.svg` — source of the icon-only brand mark (shipped:
  `public/icons/favicon.svg`; the "seal of completion" variant is
  `public/icons/seal-of-completion.svg`). Hand-authored SVG, not
  AI-generated — see `design-system.md`'s logo section for why.
