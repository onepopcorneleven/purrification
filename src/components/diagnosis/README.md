# `src/components/diagnosis/`

The bespoke, shareable `DiagnosisCard` component — per
`docs/design-system.md`, this is custom enough (CSS Modules, not just
Tailwind utilities) to warrant its own component and its own folder
rather than living in `src/components/ui/`.

Used by both `src/app/results/[id]/page.tsx` (logged-in view) and
`src/app/share/[shareSlug]/page.tsx` (public view) — same component, two
contexts.
