# Phase 25 — Clickable-text selection fix

Extended notes for `docs/workplan.md`'s Phase 25 entry. Requested and
implemented 2026-09-18, after the owner reported a real GUI bug found
while using the quiz.

## Context

**The bug, as reported:** confirming a quiz answer (the Phase 18 gesture:
click once to select, click the same option again to confirm) sometimes
selected the answer's text like a word, and the browser's native
selection UI (the Copy/Search/Select all toolbar, or on iOS the
long-press "callout" menu) popped up over the button instead of the
confirm registering cleanly.

**Root cause:** the quiz's answer control is a `<label>` element (chosen
deliberately back in Phase 18 for native label→input click-forwarding —
see the long comment in `QuizFlow.tsx` about the double-fire bug that
shipped when this was first built) wrapping visible text. A native
`<button>` gets `user-select: none` for free from every browser's
default stylesheet; a `<label>` (or an `<a>`/`<Link>`) does not. The
quiz's confirm-by-second-click gesture is literally two rapid clicks on
the same spot — exactly what a browser's "double-click selects the word
under the cursor" heuristic is built to detect — so without explicit
`user-select: none`, the browser reads it as a text-selection gesture
instead of two button activations.

**Scope, per the owner's request to "treat this as a general rule for
all clickable items":** a research pass (see the execution log) mapped
every custom clickable control in the app that isn't a plain native
`<button>` with only icon/short-label children, since those are the only
ones actually vulnerable — `<button>` already gets this treatment,
`<a>`/`<Link>` and `<label>` do not. Five real spots found; everything
else (icon-only overlay buttons, native `<button>`s with no `href`, a
plain form-field `<label>` with no click-to-act behavior) was already
safe or has no meaningful text to accidentally select.

## Execution notes

- `src/app/globals.css`: added `.no-text-select` — `user-select: none`,
  `-webkit-user-select: none`, and `-webkit-touch-callout: none` (the
  iOS-specific long-press callout menu, a separate mechanism from
  `user-select` that isn't fully covered by it on iOS Safari).
- Applied `no-text-select` at five call sites, chosen to hit shared
  components once rather than every individual usage where possible:
  - `src/components/ui/Button.tsx` — added to the shared `base` class
    string, so both the `<button>` and the `<Link>`-based (`href` prop)
    output get it. This covers every `Button` usage app-wide in one
    change, including the four call sites that pass `href` (the only
    ones actually at risk, since the plain `<button>` output was already
    safe by default).
  - `src/components/ui/TextLink.tsx` — added to its single `<a>` output,
    covering every inline text link site-wide (nav links, "Take the
    quiz"/"History" on the cats dashboard, login/signup cross-links,
    etc.) in one change.
  - `src/components/diagnosis/ReadingOverview.tsx` — the `ReadingRow`
    `<Link>` (used for both the diagnosis and treatment summary rows).
  - `src/components/diagnosis/DiagnosisReveal.tsx` and
    `TreatmentReveal.tsx` — their raw `<Link>` "back to reading" links
    (these don't go through `TextLink`, so needed their own edit).
  - `src/app/cats/[id]/quiz/QuizFlow.tsx` — the quiz answer `<label>`
    itself, the originally-reported bug.
- Left untouched (confirmed not vulnerable): `Expandable`'s overlay
  trigger and `OverlayChrome`'s icon-only close button (native
  `<button>`s with no text content of their own — nothing to select),
  `OverlayChrome`'s "Close" bar and `HistoryList`'s "View full reading"
  trigger (native `<button>`s with visible text, but already
  `user-select: none` by default), every no-`href` `Button` usage
  (already a plain `<button>`), and `Field.tsx`'s form-field `<label>`
  (not a click-to-act control — clicking it just focuses its input, no
  click handler, not part of any double-click gesture).

## Testable deliverables

- [x] Double-clicking/double-tapping a quiz answer option no longer
      selects its text or opens the browser's selection toolbar / iOS
      callout menu — it registers as select-then-confirm as intended.
- [x] The same protection applies to every `Button`/`TextLink` usage,
      `ReadingOverview`'s summary rows, and
      `DiagnosisReveal`/`TreatmentReveal`'s back links.
- [x] No native `<button>` was needlessly touched beyond `Button.tsx`'s
      shared base class (harmless there, since native buttons are
      already unaffected by `user-select`).
- [x] `npm run build`, `eslint`, and `prettier --check` all clean on
      every changed file.

## Execution log — 2026-09-18

A research pass (an Explore subagent) grepped every `onClick` handler
and every `<label>`/`<a>`/`<Link>` in `src/` and reported back the
element type and text content for each, confirming the fix's scope
above. Implemented as described, verified with `npm run build` (clean),
`eslint` on every changed file (clean), and `prettier --check` on every
changed file (clean, no reformatting needed).
