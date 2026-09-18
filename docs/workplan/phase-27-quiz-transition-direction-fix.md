# Phase 27 — Quiz transition entrance-direction fix

Extended notes for `docs/workplan.md`'s Phase 27 entry. Requested and
implemented 2026-09-18, a same-family follow-up to Phase 24/26's quiz
transition.

## Context

The owner noticed that exit and entrance swept in the same visual
direction — both right-to-left — rather than opposite directions, and
asked to flip entrance so it comes from the other side.

**Root cause:** `.quiz-block--leaving` ends at `translateX(-18px)`
(exits toward the left, a right-to-left sweep). `.quiz-block--pending`
(the pre-entrance offset, added in Phase 24's animation-vs-transition
bugfix) started at `translateX(18px)` and animated back to `0` —
positioned on the *opposite side* from `--leaving`'s end state, but
animating from `+18px` down to `0` is itself still a right-to-left
sweep. So entrance moved the same visual direction as exit; only its
absolute starting position differed, which doesn't read as "coming from
the other side" the way a genuinely opposite sweep direction would.

## Execution notes

- `src/app/globals.css`: `.quiz-block--pending`'s `transform` flipped
  from `translateX(18px)` to `translateX(-18px)` — now animates from a
  left offset back to `0`, a left-to-right sweep, genuinely opposite
  `--leaving`'s right-to-left sweep. One rule, shared by all three
  blocks (picture/prompt/answers), so this single change flips
  entrance direction everywhere at once.
- Updated the comment above `.quiz-block--pending` (which had
  incorrectly described the pre-fix behavior as already "opposite
  side" — true of the starting *position*, not the sweep *direction*)
  to explain the distinction and the fix.
- `docs/design/design-tokens.json`'s `questionShift` pattern
  description and `docs/design-system.md`'s `QuizFlow` interaction-model
  paragraph updated to describe the corrected left-to-right entrance,
  and their stale `.quiz-block--enter` references (leftover from before
  Phase 24's bugfix renamed it to `--pending`) fixed to match current
  code.
- No JS change needed — `QuizFlow.tsx`'s `pending` state/double-rAF
  mechanism is unaffected; only the CSS end-state value changed.

## Testable deliverables

- [x] Exit still sweeps right-to-left, unchanged.
- [x] Entrance now sweeps left-to-right — genuinely opposite exit,
      not just a different starting position.
- [x] `npm run build` and `prettier --check` clean; no JS/TS files
      touched, so no `eslint` diff to check beyond the existing pass.

## Execution log — 2026-09-18

Implemented as described above. `npm run build` compiled clean;
`prettier --check` clean on every changed file. Pure CSS value change
to an already-verified transition mechanism (Phase 24's bugfix), so
verified functionally (build passing, a read of the exact transform
values against the intended direction flip) rather than visually — the
owner should confirm the feel once deployed.
